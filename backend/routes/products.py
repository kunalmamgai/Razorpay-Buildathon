"""Products route — serve merchant-isolated catalog."""
from fastapi import APIRouter, Depends
from backend.db import get_db
from backend.tenant_context import get_current_merchant_id

router = APIRouter(prefix="/api", tags=["products"])


@router.get("/products")
def list_products(merchant_id: str = Depends(get_current_merchant_id)):
    """List all products in the active merchant's catalog."""
    with get_db(merchant_id) as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return {"products": [dict(r) for r in rows]}
