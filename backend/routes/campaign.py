"""Campaign routes — orchestrator, approval, manual creation with multi-tenant context."""
from fastapi import APIRouter, HTTPException, Depends
from backend.models import CampaignCreateRequest
from backend.services.campaign_service import (
    review_and_propose, approve_campaign, reject_campaign,
    list_campaigns, create_manual_campaign,
)
from backend.services import scheduler
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api", tags=["campaigns"])


@router.post("/campaigns/review")
def campaign_review(merchant_id: str = Depends(get_current_merchant_id)):
    """Trigger campaign orchestrator for active merchant DB."""
    try:
        result = review_and_propose(merchant_id=merchant_id)
        scheduler.record_manual_review()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Campaign review failed: {e}")
    return result


@router.get("/campaigns/schedule")
def campaign_schedule():
    """Orchestrator schedule info for the Agent Activity strip."""
    return scheduler.get_schedule_info()


@router.post("/campaigns")
def campaign_create(
    req: CampaignCreateRequest,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Create a campaign manually in active merchant database."""
    try:
        result = create_manual_campaign(
            name=req.name,
            discount_pct=req.discount_pct,
            target_skus=req.target_skus,
            duration_hours=req.duration_hours,
            merchant_id=merchant_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Campaign creation failed: {e}")
    return result


@router.get("/campaigns")
def campaign_list(merchant_id: str = Depends(get_current_merchant_id)):
    """List all campaigns for active merchant."""
    campaigns = list_campaigns(merchant_id=merchant_id)
    return {"campaigns": campaigns, "count": len(campaigns), "merchant_id": merchant_id}


@router.post("/campaigns/{campaign_id}/approve")
def campaign_approve(
    campaign_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Approve a pending campaign in active merchant DB."""
    try:
        result = approve_campaign(campaign_id, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/campaigns/{campaign_id}/reject")
def campaign_reject(
    campaign_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
):
    """Reject a pending campaign in active merchant DB."""
    try:
        result = reject_campaign(campaign_id, merchant_id=merchant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
