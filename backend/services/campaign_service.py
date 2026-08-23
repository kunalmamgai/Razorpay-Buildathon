"""Campaign service — orchestrates the campaign Brain → Cage → Approval pipeline."""
import json
import uuid
import logging
from datetime import datetime, timedelta
from backend.db import get_db
from backend.brain.gemini_agent import propose_campaign
from backend.cage.policy_engine import evaluate_campaign_proposal
from backend.ledger.ledger import log_entry, get_entry_by_id, update_approval

logger = logging.getLogger(__name__)


def get_order_history() -> list[dict]:
    """Load fake order history from the JSON file."""
    import os
    history_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "order_history.json")
    try:
        with open(history_path) as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def get_catalog() -> list[dict]:
    """Fetch all products."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return [dict(row) for row in rows]


def get_current_campaigns() -> list[dict]:
    """Get all active or pending campaigns."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM campaigns WHERE status IN ('active', 'pending') ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def review_and_propose() -> dict:
    """The orchestrator: Brain proposes → Cage evaluates → store for approval.

    Called by the scheduler or manually.
    """
    correlation_id = f"corr_camp_{uuid.uuid4().hex[:8]}"
    catalog = get_catalog()
    order_history = get_order_history()
    current_campaigns = get_current_campaigns()

    # Brain proposes
    proposal = propose_campaign(order_history, catalog, current_campaigns)

    if proposal.get("action") == "no_campaign":
        log_entry(
            correlation_id=correlation_id,
            event_type="campaign_proposal",
            actor="brain",
            trigger="scheduler",
            proposal=proposal,
            reasoning=proposal.get("reasoning", "No campaign opportunity identified."),
            outcome="no_campaign",
        )
        return {"status": "no_campaign", "reasoning": proposal.get("reasoning")}

    # Cage evaluates
    policy_result = evaluate_campaign_proposal(proposal, catalog)

    # Determine status
    decision = policy_result["decision"]
    campaign_status = "draft"
    if decision == "rejected":
        campaign_status = "rejected"
    elif decision in ("approved", "clamped"):
        campaign_status = "active"
    elif decision == "awaiting_approval":
        campaign_status = "pending"

    final_action = policy_result.get("final_action", {})
    now = datetime.utcnow()
    duration_hours = final_action.get("duration_hours", 48)
    expires_at = now + timedelta(hours=duration_hours)

    campaign_id = f"camp_{uuid.uuid4().hex[:8]}"

    # Store campaign
    with get_db() as conn:
        conn.execute(
            """INSERT INTO campaigns
               (id, name, discount_pct, target_skus_json, starts_at, expires_at,
                status, policy_decision, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                campaign_id,
                proposal.get("name", "Unnamed Campaign"),
                final_action.get("discount_pct", 0),
                json.dumps(final_action.get("target_skus", [])),
                now.isoformat(),
                expires_at.isoformat(),
                campaign_status,
                decision,
                "brain",
            ),
        )

    # Log to ledger
    log_entry(
        correlation_id=correlation_id,
        event_type="campaign_proposal",
        actor="brain",
        trigger="scheduler",
        proposal=proposal,
        reasoning=proposal.get("reasoning", ""),
        policy_result=policy_result,
        outcome=decision,
    )

    return {
        "campaign_id": campaign_id,
        "status": campaign_status,
        "decision": decision,
        "proposal": proposal,
        "policy_result": policy_result,
    }


def approve_campaign(campaign_id: str) -> dict:
    """Approve a pending campaign."""
    with get_db() as conn:
        campaign = conn.execute(
            "SELECT * FROM campaigns WHERE id = ?", (campaign_id,)
        ).fetchone()

        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        campaign_dict = dict(campaign)
        if campaign_dict["status"] != "pending":
            raise ValueError(
                f"Campaign {campaign_id} is not pending (current: {campaign_dict['status']})"
            )

        conn.execute(
            "UPDATE campaigns SET status = 'active' WHERE id = ?",
            (campaign_id,),
        )

    log_entry(
        correlation_id=f"corr_camp_{campaign_id}",
        event_type="campaign_approval",
        actor="merchant",
        trigger="approval",
        reasoning=f"Merchant approved campaign {campaign_id}",
        outcome="approved",
        approval_status="approved",
    )

    return {"campaign_id": campaign_id, "status": "approved"}


def reject_campaign(campaign_id: str) -> dict:
    """Reject a pending campaign."""
    with get_db() as conn:
        campaign = conn.execute(
            "SELECT * FROM campaigns WHERE id = ?", (campaign_id,)
        ).fetchone()

        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        campaign_dict = dict(campaign)
        if campaign_dict["status"] != "pending":
            raise ValueError(
                f"Campaign {campaign_id} is not pending (current: {campaign_dict['status']})"
            )

        conn.execute(
            "UPDATE campaigns SET status = 'rejected' WHERE id = ?",
            (campaign_id,),
        )

    log_entry(
        correlation_id=f"corr_camp_{campaign_id}",
        event_type="campaign_approval",
        actor="merchant",
        trigger="approval",
        reasoning=f"Merchant rejected campaign {campaign_id}",
        outcome="rejected",
        approval_status="rejected",
    )

    return {"campaign_id": campaign_id, "status": "rejected"}


def list_campaigns() -> list[dict]:
    """List all campaigns."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM campaigns ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def create_manual_campaign(name: str, discount_pct: int, target_skus: list[str],
                           duration_hours: int = 48) -> dict:
    """Create a campaign manually (not via Brain)."""
    catalog = get_catalog()
    proposal = {
        "action": "create_campaign",
        "name": name,
        "target_skus": target_skus,
        "discount_pct": discount_pct,
        "duration_hours": duration_hours,
        "reasoning": f"Manual campaign: {name}",
    }

    policy_result = evaluate_campaign_proposal(proposal, catalog)
    decision = policy_result["decision"]

    campaign_status = "draft"
    if decision == "rejected":
        campaign_status = "rejected"
    elif decision in ("approved", "clamped"):
        campaign_status = "active"
    elif decision == "awaiting_approval":
        campaign_status = "pending"

    final_action = policy_result.get("final_action", {})
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=final_action.get("duration_hours", duration_hours))
    campaign_id = f"camp_{uuid.uuid4().hex[:8]}"

    with get_db() as conn:
        conn.execute(
            """INSERT INTO campaigns
               (id, name, discount_pct, target_skus_json, starts_at, expires_at,
                status, policy_decision, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                campaign_id,
                name,
                final_action.get("discount_pct", discount_pct),
                json.dumps(final_action.get("target_skus", target_skus)),
                now.isoformat(),
                expires_at.isoformat(),
                campaign_status,
                decision,
                "merchant",
            ),
        )

    correlation_id = f"corr_camp_{campaign_id}"
    log_entry(
        correlation_id=correlation_id,
        event_type="campaign_manual",
        actor="merchant",
        trigger="manual",
        proposal=proposal,
        reasoning=proposal["reasoning"],
        policy_result=policy_result,
        outcome=decision,
    )

    return {
        "campaign_id": campaign_id,
        "status": campaign_status,
        "decision": decision,
        "policy_result": policy_result,
    }
