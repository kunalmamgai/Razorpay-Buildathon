"""In-process scheduler for the Campaign Orchestrator.

The orchestrator runs on its own periodic review cycle, independent of
per-checkout activity. The schedule state is exposed so the dashboard can
render an "Agent Activity" strip ("Next review in X min").
"""
import logging
from datetime import datetime, timedelta

from backend.config import CAMPAIGN_REVIEW_INTERVAL_MINUTES

logger = logging.getLogger(__name__)

try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ImportError:
    BackgroundScheduler = None

scheduler = None
_last_run: datetime | None = None
_next_run: datetime | None = None


def _scheduled_review() -> None:
    """Periodic job: run the Brain → Cage campaign review cycle."""
    global _last_run, _next_run
    from backend.services.campaign_service import review_and_propose

    logger.info("Scheduled campaign review starting...")
    try:
        result = review_and_propose()
        logger.info(f"Scheduled campaign review finished: {result.get('status')}")
    except Exception as e:
        # The scheduler must never die because a review failed
        logger.error(f"Scheduled campaign review failed: {e}")
    finally:
        _last_run = datetime.utcnow()
        _next_run = _last_run + timedelta(minutes=CAMPAIGN_REVIEW_INTERVAL_MINUTES)


def record_manual_review() -> None:
    """Keep the Agent Activity strip accurate when review is triggered manually."""
    global _last_run
    _last_run = datetime.utcnow()


def start_scheduler() -> bool:
    """Start the background review loop. Returns True if running."""
    global scheduler, _next_run

    if BackgroundScheduler is None:
        logger.warning("APScheduler not installed — orchestrator is manual-only")
        return False

    if scheduler is not None and scheduler.running:
        return True

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        _scheduled_review,
        trigger="interval",
        minutes=CAMPAIGN_REVIEW_INTERVAL_MINUTES,
        id="campaign_review",
        next_run_time=datetime.utcnow() + timedelta(minutes=CAMPAIGN_REVIEW_INTERVAL_MINUTES),
        replace_existing=True,
    )
    scheduler.start()
    _next_run = datetime.utcnow() + timedelta(minutes=CAMPAIGN_REVIEW_INTERVAL_MINUTES)
    logger.info(
        f"Campaign orchestrator scheduled every {CAMPAIGN_REVIEW_INTERVAL_MINUTES} min"
    )
    return True


def stop_scheduler() -> None:
    global scheduler
    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)
    scheduler = None


def get_schedule_info() -> dict:
    """Current orchestrator schedule for the Agent Activity strip."""
    running = scheduler is not None and scheduler.running
    next_run = _next_run if running else None
    last_run = _last_run
    return {
        "scheduler_running": running,
        "interval_minutes": CAMPAIGN_REVIEW_INTERVAL_MINUTES,
        "last_review_at": last_run.isoformat() + "Z" if last_run else None,
        "next_review_at": next_run.isoformat() + "Z" if next_run else None,
    }
