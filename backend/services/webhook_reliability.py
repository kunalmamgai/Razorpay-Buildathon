"""Webhook Reliability Infrastructure — Idempotency Deduplication, Exponential Backoff Retries, and Dead Letter Queue (DLQ).
"""
import json
import random
import time
import logging
import traceback
from typing import Callable, Any, Optional
from datetime import datetime

from backend.db import get_db, get_connection
from backend.ledger.ledger import log_entry

logger = logging.getLogger("marlin.webhook_reliability")


# ═══════════════════════════════════════════════════════════════════════
# 1. Idempotency Key Deduplication Engine
# ═══════════════════════════════════════════════════════════════════════

class DeduplicationEngine:
    @staticmethod
    def check_and_lock_event(
        event_id: str,
        merchant_id: str = "merchant_default",
        event_type: str = "webhook",
    ) -> tuple[bool, Optional[dict]]:
        """Check if an event_id was already processed.

        Returns:
            (is_duplicate, cached_response)
            - If is_duplicate is True and cached_response exists: return cached response.
            - If is_duplicate is True and cached_response is None: event is currently in-flight.
            - If is_duplicate is False: lock acquired, proceed with processing.
        """
        if not event_id:
            return False, None

        with get_db(merchant_id) as conn:
            existing = conn.execute(
                "SELECT status, response_json FROM webhook_idempotency WHERE event_id = ?",
                (event_id,),
            ).fetchone()

            if existing:
                row = dict(existing)
                status = row.get("status")
                if status == "processed" and row.get("response_json"):
                    try:
                        cached = json.loads(row["response_json"])
                        logger.info(f"Idempotency hit for event '{event_id}' (Merchant: {merchant_id})")
                        return True, cached
                    except Exception:
                        pass
                # In-flight processing or previously failed
                return True, {"status": "already_processed", "outcome": status or "in_flight"}

            # Lock event in processing state
            try:
                conn.execute(
                    """INSERT INTO webhook_idempotency
                       (event_id, merchant_id, event_type, status)
                       VALUES (?, ?, ?, 'processing')""",
                    (event_id, merchant_id, event_type),
                )
                return False, None
            except Exception as e:
                logger.warning(f"Idempotency race condition lock fail for '{event_id}': {e}")
                return True, {"status": "already_processed", "outcome": "in_flight"}

    @staticmethod
    def mark_event_processed(
        event_id: str,
        merchant_id: str = "merchant_default",
        response: Optional[dict] = None,
    ):
        """Mark an idempotency event as successfully processed."""
        if not event_id:
            return
        with get_db(merchant_id) as conn:
            conn.execute(
                """UPDATE webhook_idempotency
                   SET status = 'processed', response_json = ?, processed_at = CURRENT_TIMESTAMP
                   WHERE event_id = ?""",
                (json.dumps(response or {}), event_id),
            )

    @staticmethod
    def mark_event_failed(
        event_id: str,
        merchant_id: str = "merchant_default",
        error_msg: str = "",
    ):
        """Mark an idempotency event as failed/dlq."""
        if not event_id:
            return
        with get_db(merchant_id) as conn:
            conn.execute(
                """UPDATE webhook_idempotency
                   SET status = 'failed', error_message = ?, processed_at = CURRENT_TIMESTAMP
                   WHERE event_id = ?""",
                (error_msg, event_id),
            )


# ═══════════════════════════════════════════════════════════════════════
# 2. Exponential Backoff Retry Engine
# ═══════════════════════════════════════════════════════════════════════

class RetryEngine:
    @staticmethod
    def execute_with_retry(
        func: Callable[[], Any],
        max_retries: int = 3,
        base_delay_seconds: float = 0.1,
        backoff_factor: float = 2.0,
        max_delay_seconds: float = 2.0,
    ) -> Any:
        """Execute a function with exponential backoff and randomized jitter.

        Delay formula: min(max_delay, base_delay * (backoff_factor ** (attempt - 1)) + jitter)
        """
        last_exception = None

        for attempt in range(1, max_retries + 1):
            try:
                return func()
            except Exception as e:
                last_exception = e
                if attempt == max_retries:
                    logger.error(f"Function execution failed after {max_retries} attempts: {e}")
                    raise

                # Calculate exponential delay with jitter
                delay = min(max_delay_seconds, base_delay_seconds * (backoff_factor ** (attempt - 1)))
                jitter = random.uniform(0, 0.05)
                total_sleep = delay + jitter
                logger.warning(
                    f"Attempt {attempt}/{max_retries} failed with error '{e}'. Retrying in {total_sleep:.3f}s..."
                )
                time.sleep(total_sleep)

        raise last_exception


# ═══════════════════════════════════════════════════════════════════════
# 3. Dead Letter Queue (DLQ) Service
# ═══════════════════════════════════════════════════════════════════════

class DLQService:
    @staticmethod
    def push_to_dlq(
        event_id: str,
        merchant_id: str,
        event_type: str,
        payload: dict | str,
        error_message: str,
        attempts: int = 3,
    ) -> int:
        """Push a failed webhook payload into the Dead Letter Queue (DLQ)."""
        raw_json = json.dumps(payload) if isinstance(payload, dict) else str(payload)

        with get_db(merchant_id) as conn:
            cursor = conn.execute(
                """INSERT INTO dlq_webhooks
                   (event_id, merchant_id, event_type, raw_payload_json, error_message, attempts, status)
                   VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
                (event_id, merchant_id, event_type, raw_json, error_message, attempts),
            )
            dlq_id = cursor.lastrowid

        DeduplicationEngine.mark_event_failed(event_id, merchant_id, error_message)

        # Log DLQ event to ledger for total auditability
        log_entry(
            correlation_id=f"corr_dlq_{event_id}",
            event_type="webhook_dlq_pushed",
            actor="system",
            trigger="webhook_retry_failure",
            reasoning=f"Webhook event '{event_id}' failed after {attempts} retries. Moved to DLQ (ID #{dlq_id}). Error: {error_message}",
            outcome="failed",
            error_code="DLQ_PUSHED",
            error_message=error_message,
            merchant_id=merchant_id,
        )

        logger.error(f"Pushed failed event '{event_id}' to DLQ #{dlq_id} for merchant '{merchant_id}'")
        return dlq_id

    @staticmethod
    def list_dlq_events(
        merchant_id: str = "merchant_default",
        status: str = "pending",
        limit: int = 50,
    ) -> list[dict]:
        """List dead-lettered events for inspection."""
        with get_db(merchant_id) as conn:
            if status == "all":
                rows = conn.execute(
                    "SELECT * FROM dlq_webhooks WHERE merchant_id = ? ORDER BY id DESC LIMIT ?",
                    (merchant_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM dlq_webhooks WHERE merchant_id = ? AND status = ? ORDER BY id DESC LIMIT ?",
                    (merchant_id, status, limit),
                ).fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    def replay_dlq_event(
        dlq_id: int,
        merchant_id: str = "merchant_default",
    ) -> dict:
        """Manually replay a dead-lettered webhook event."""
        with get_db(merchant_id) as conn:
            row = conn.execute(
                "SELECT * FROM dlq_webhooks WHERE id = ? AND merchant_id = ?",
                (dlq_id, merchant_id),
            ).fetchone()

            if not row:
                raise ValueError(f"DLQ record #{dlq_id} not found for merchant '{merchant_id}'")

            record = dict(row)

        try:
            payload = json.loads(record["raw_payload_json"])
        except Exception:
            payload = {}

        event_type = record.get("event_type") or payload.get("event", "payment.captured")

        from backend.services.payment_service import process_webhook
        result = process_webhook(
            event=event_type,
            payload=payload,
            merchant_id=merchant_id,
        )

        with get_db(merchant_id) as conn:
            conn.execute(
                """UPDATE dlq_webhooks
                   SET status = 'replayed', updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (dlq_id,),
            )

        log_entry(
            correlation_id=f"corr_dlq_replay_{dlq_id}",
            event_type="webhook_dlq_replayed",
            actor="admin",
            trigger="manual_dlq_replay",
            reasoning=f"Manually replayed DLQ record #{dlq_id} (Event: {record['event_id']})",
            outcome="replayed",
            merchant_id=merchant_id,
        )

        return {
            "status": "replayed",
            "dlq_id": dlq_id,
            "event_id": record["event_id"],
            "merchant_id": merchant_id,
            "result": result,
        }
