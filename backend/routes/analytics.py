"""Analytics and Feedback Loop API Router — serve revenue lift, 5-stage conversion funnel,
AI anomaly alerts, and model fine-tuning dataset exporting.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
import os

from backend.services.analytics_service import (
    get_revenue_lift, get_conversion_funnel, detect_anomalies,
)
from backend.services.model_retraining_service import export_fine_tuning_dataset
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def get_analytics_overview(merchant_id: str = Depends(get_current_merchant_id)):
    """Get aggregated analytics dashboard metrics (revenue lift, funnel, anomalies)."""
    try:
        revenue_lift = get_revenue_lift(merchant_id)
        funnel = get_conversion_funnel(merchant_id)
        anomalies = detect_anomalies(merchant_id)
        return {
            "revenue_lift": revenue_lift,
            "conversion_funnel": funnel,
            "anomalies": anomalies,
            "merchant_id": merchant_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {e}")


@router.get("/revenue-lift")
def revenue_lift_endpoint(merchant_id: str = Depends(get_current_merchant_id)):
    """Get AI revenue lift vs baseline pricing for active merchant."""
    return get_revenue_lift(merchant_id)


@router.get("/funnel")
def conversion_funnel_endpoint(merchant_id: str = Depends(get_current_merchant_id)):
    """Get 5-stage conversion funnel metrics."""
    return get_conversion_funnel(merchant_id)


@router.get("/anomalies")
def anomalies_endpoint(merchant_id: str = Depends(get_current_merchant_id)):
    """Get active AI proposal anomalies and policy flags."""
    anomalies = detect_anomalies(merchant_id)
    return {"anomalies": anomalies, "count": len(anomalies), "merchant_id": merchant_id}


@router.post("/export-dataset")
def export_dataset_endpoint(merchant_id: str = Depends(get_current_merchant_id)):
    """Export high-converting audit ledger proposals into fine-tuning JSONL format."""
    try:
        result = export_fine_tuning_dataset(merchant_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset export failed: {e}")


@router.get("/download-dataset")
def download_dataset_endpoint(merchant_id: str = Depends(get_current_merchant_id)):
    """Download exported JSONL fine-tuning dataset file."""
    result = export_fine_tuning_dataset(merchant_id)
    file_path = result.get("file_path")
    if file_path and os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename=result["file_name"],
            media_type="application/x-ndjson",
        )
    raise HTTPException(status_code=404, detail="Dataset file not found")
