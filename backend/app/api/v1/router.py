"""
API v1 Router - Main router for all v1 endpoints.
"""
from fastapi import APIRouter

from app.api.v1 import recommendations, explain, headphones


router = APIRouter()


# Include all endpoint routers
router.include_router(
    recommendations.router,
    tags=["Recommendations"],
)

router.include_router(
    explain.router,
    tags=["Explain"],
)

router.include_router(
    headphones.router,
    tags=["Headphones"],
)


@router.get("/ping")
async def ping():
    """Simple ping endpoint to test API v1."""
    return {"message": "pong", "version": "1.0"}
