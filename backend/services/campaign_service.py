"""Campaign service — orchestrates campaign Brain → Cage → Approval pipeline with merchant isolation.
"""
import json
import uuid
import logging
from datetime import datetime, timedelta
from backend.db import get_db
from backend.brain.gemini_agent import propose_campaign
from backend.cage.policy_engine import evaluate_campaign_proposal
from backend.merchant_manager import get_merchant
from backend.ledger.ledger import log_entry

logger = logging.getLogger("marlin.campaign_service")


def get_order_history(merchant_id: str = "merchant_default") -> list[dict]:
    """Load order history for a specific merchant."""
    import os
    history_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", f"order_history_{merchant_id}.json")
    if not os.path.exists(history_path):
        history_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "order_history_merchant_default.json")
    try:
        with open(history_path) as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def get_catalog(merchant_id: str = "merchant_default") -> list[dict]:
    """Fetch all products in active merchant database."""
    with get_db(merchant_id) as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return [dict(row) for row in rows]


def get_current_campaigns(merchant_id: str = "merchant_default") -> list[dict]:
    """Get active or pending campaigns in active merchant database."""
    with get_db(merchant_id) as conn:
        rows = conn.execute(
            "SELECT * FROM campaigns WHERE status IN ('active', 'pending') ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def review_and_propose(merchant_id: str = "merchant_default") -> dict:
    """The campaign orchestrator: Brain proposes → Cage evaluates against merchant policy → store for approval."""
    correlation_id = f"corr_camp_{uuid.uuid4().hex[:8]}"
    merchant_info = get_merchant(merchant_id)
    policy_config = merchant_info.get("policy_config", {})

    catalog = get_catalog(merchant_id)
    order_history = get_order_history(merchant_id)
    current_campaigns = get_current_campaigns(merchant_id)

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
            merchant_id=merchant_id,
        )
        return {"status": "no_campaign", "reasoning": proposal.get("reasoning"), "merchant_id": merchant_id}

    # Cage evaluates using merchant's policy parameters
    policy_result = evaluate_campaign_proposal(proposal, catalog, policy_config=policy_config)

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
    # Scripted demo proposals (no Gemini key configured) are labeled distinctly
    created_by = "brain-demo" if proposal.get("source") == "scripted_demo" else "brain"

    with get_db(merchant_id) as conn:
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
                created_by,
            ),
        )

    log_entry(
        correlation_id=correlation_id,
        event_type="campaign_proposal",
        actor="brain",
        trigger="scheduler",
        proposal=proposal,
        reasoning=proposal.get("reasoning", ""),
        policy_result=policy_result,
        outcome=decision,
        merchant_id=merchant_id,
    )

    return {
        "campaign_id": campaign_id,
        "status": campaign_status,
        "decision": decision,
        "proposal": proposal,
        "policy_result": policy_result,
        "merchant_id": merchant_id,
    }


def approve_campaign(campaign_id: str, merchant_id: str = "merchant_default") -> dict:
    """Approve a pending campaign in merchant database."""
    with get_db(merchant_id) as conn:
        campaign = conn.execute(
            "SELECT * FROM campaigns WHERE id = ?", (campaign_id,)
        ).fetchone()

        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found for merchant '{merchant_id}'")

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
        merchant_id=merchant_id,
    )

    return {"campaign_id": campaign_id, "status": "approved", "merchant_id": merchant_id}


def reject_campaign(campaign_id: str, merchant_id: str = "merchant_default") -> dict:
    """Reject a pending campaign in merchant database."""
    with get_db(merchant_id) as conn:
        campaign = conn.execute(
            "SELECT * FROM campaigns WHERE id = ?", (campaign_id,)
        ).fetchone()

        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found for merchant '{merchant_id}'")

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
        merchant_id=merchant_id,
    )

    return {"campaign_id": campaign_id, "status": "rejected", "merchant_id": merchant_id}


def list_campaigns(merchant_id: str = "merchant_default") -> list[dict]:
    """List all campaigns for active merchant."""
    with get_db(merchant_id) as conn:
        rows = conn.execute(
            "SELECT * FROM campaigns ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def create_manual_campaign(
    name: str,
    discount_pct: int,
    target_skus: list[str],
    duration_hours: int = 48,
    merchant_id: str = "merchant_default",
) -> dict:
    """Create a campaign manually in active merchant database."""
    merchant_info = get_merchant(merchant_id)
    policy_config = merchant_info.get("policy_config", {})
    catalog = get_catalog(merchant_id)

    proposal = {
        "action": "create_campaign",
        "name": name,
        "target_skus": target_skus,
        "discount_pct": discount_pct,
        "duration_hours": duration_hours,
        "reasoning": f"Manual campaign: {name}",
    }

    policy_result = evaluate_campaign_proposal(proposal, catalog, policy_config=policy_config)
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

    with get_db(merchant_id) as conn:
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
        merchant_id=merchant_id,
    )

    return {
        "campaign_id": campaign_id,
        "status": campaign_status,
        "decision": decision,
        "policy_result": policy_result,
        "merchant_id": merchant_id,
    }
