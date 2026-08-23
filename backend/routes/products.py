"""Products route — serve the catalog."""
from fastapi import APIRouter
from backend.db import get_db

router = APIRouter(prefix="/api", tags=["products"])


@router.get("/products")
def list_products():
    """List all products in the catalog."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM products").fetchall()
        return {"products": [dict(r) for r in rows]}
