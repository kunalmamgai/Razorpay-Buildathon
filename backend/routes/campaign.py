"""Campaign routes — orchestrator, approval, manual creation."""
from fastapi import APIRouter, HTTPException
from backend.models import CampaignCreateRequest
from backend.services.campaign_service import (
    review_and_propose, approve_campaign, reject_campaign,
    list_campaigns, create_manual_campaign,
)

router = APIRouter(prefix="/api", tags=["campaigns"])


@router.post("/campaigns/review")
def campaign_review():
    """Trigger the campaign orchestrator: Brain proposes → Cage evaluates."""
    try:
        result = review_and_propose()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Campaign review failed: {e}")
    return result


@router.post("/campaigns")
def campaign_create(req: CampaignCreateRequest):
    """Create a campaign manually with Brain→Cage validation."""
    try:
        result = create_manual_campaign(
            name=req.name,
            discount_pct=req.discount_pct,
            target_skus=req.target_skus,
            duration_hours=req.duration_hours,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Campaign creation failed: {e}")
    return result


@router.get("/campaigns")
def campaign_list():
    """List all campaigns."""
    campaigns = list_campaigns()
    return {"campaigns": campaigns, "count": len(campaigns)}


@router.post("/campaigns/{campaign_id}/approve")
def campaign_approve(campaign_id: str):
    """Approve a pending campaign."""
    try:
        result = approve_campaign(campaign_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/campaigns/{campaign_id}/reject")
def campaign_reject(campaign_id: str):
    """Reject a pending campaign."""
    try:
        result = reject_campaign(campaign_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
