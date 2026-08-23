"""Campaign orchestrator — periodic review of order history.

Runs on APScheduler. Reviews recent orders, asks Brain for campaign proposals,
routes them through the Cage, and logs everything to the Ledger.
"""
from backend.brain.gemini_agent import propose_campaign
from backend.cage.policy_engine import evaluate_campaign_proposal
from backend.ledger.ledger import log_entry
from backend.db import get_db


def review_and_propose():
    """Scheduled job: review recent orders and propose a campaign if warranted."""
    # Fetch recent order history
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20"
        ).fetchall()
        order_history = [dict(r) for r in rows]

    if not order_history:
        return

    # Fetch catalog
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        catalog = [dict(r) for r in rows]

    # Ask Brain for a campaign proposal
    proposal = propose_campaign(order_history, catalog)

    if proposal.get("discount_pct", 0) == 0:
        return  # Brain had nothing to suggest

    # Route through Cage
    policy_result = evaluate_campaign_proposal(proposal)

    # Determine outcome
    if not policy_result["passed"]:
        outcome = "rejected"
    elif policy_result["needs_human_approval"]:
        outcome = "awaiting_approval"
    else:
        outcome = "approved"

    # Log to ledger
    log_entry(
        actor="brain",
        trigger="campaign",
        proposal=proposal,
        reasoning=proposal.get("reasoning", ""),
        policy_result=policy_result,
        outcome=outcome,
    )


# APScheduler job definition (will be registered in main.py)
JOB_ID = "campaign_orchestrator"
JOB_INTERVAL_MINUTES = 30
