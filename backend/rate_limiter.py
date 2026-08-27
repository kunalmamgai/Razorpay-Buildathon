"""Rate limiting middleware for FastAPI endpoints."""
import json
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response

from backend.config import CORS_ORIGINS


# Configure rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute", "1000/hour"]
)


def add_rate_limiting(app) -> None:
    """Add rate limiting to FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        lambda request, exc: Response(
            content=json.dumps({"detail": str(exc)}),
            status_code=exc.status_code,
            media_type="application/json",
        ),
    )