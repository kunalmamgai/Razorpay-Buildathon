"""Campaign orchestrator endpoints."""
import json
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter
from backend.models import CampaignCreate
from backend.brain.gemini_agent import propose_campaign
from backend.cage.policy_engine import evaluate_campaign_proposal
from backend.ledger.ledger import log_entry, get_entry_by_id
from backend.db import get_db

router = APIRouter(prefix="/api", tags=["campaigns"])


@router.post("/campaigns")
def create_campaign(req: CampaignCreate):
    """Create a campaign: Brain proposes -> Cage evaluates -> Store.

    If needs approval, status is 'pending'. Otherwise 'active'.
    """
    catalog = []
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        catalog = [dict(r) for r in rows]

    # Build a proposal from the request (or use Brain if no explicit values)
    proposal = {
        "name": req.name,
        "discount_pct": req.discount_pct,
        "target_skus": req.target_skus,
        "reasoning": f"Campaign targeting {len(req.target_skus)} SKUs with {req.discount_pct}% discount.",
        "duration_hours": req.duration_hours,
    }

    policy_result = evaluate_campaign_proposal(proposal)

    status = "active"
    if not policy_result["passed"]:
        status = "rejected"
    elif policy_result["needs_human_approval"]:
        status = "pending"

    final_action = policy_result["final_action"]
    now = datetime.utcnow()
    expires = now + timedelta(hours=final_action.get("duration_hours", 48))

    campaign_id = f"camp_{uuid.uuid4().hex[:8]}"

    with get_db() as conn:
        conn.execute(
            """INSERT INTO campaigns (id, name, discount_pct, target_skus_json,
               starts_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                campaign_id,
                proposal["name"],
                final_action["discount_pct"],
                json.dumps(final_action.get("target_skus", [])),
                now.isoformat(),
                expires.isoformat(),
                status,
            ),
        )

    log_entry(
        actor="brain",
        trigger="campaign",
        proposal=proposal,
        reasoning=proposal["reasoning"],
        policy_result=policy_result,
        outcome="approved" if status == "active" else status,
    )

    return {
        "campaign_id": campaign_id,
        "status": status,
        "proposal": proposal,
        "policy_result": policy_result,
    }


@router.get("/campaigns")
def list_campaigns():
    """List all campaigns."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM campaigns ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]


@router.post("/campaigns/{campaign_id}/approve")
def approve_campaign(campaign_id: str):
    """Approve a pending campaign."""
    with get_db() as conn:
        conn.execute(
            "UPDATE campaigns SET status = 'active' WHERE id = ? AND status = 'pending'",
            (campaign_id,),
        )
    log_entry(
        actor="merchant",
        trigger="approval",
        reasoning=f"Merchant approved campaign {campaign_id}",
        outcome="approved",
    )
    return {"status": "approved"}


@router.post("/campaigns/{campaign_id}/reject")
def reject_campaign(campaign_id: str):
    """Reject a pending campaign."""
    with get_db() as conn:
        conn.execute(
            "UPDATE campaigns SET status = 'rejected' WHERE id = ? AND status = 'pending'",
            (campaign_id,),
        )
    log_entry(
        actor="merchant",
        trigger="approval",
        reasoning=f"Merchant rejected campaign {campaign_id}",
        outcome="rejected",
    )
    return {"status": "rejected"}
