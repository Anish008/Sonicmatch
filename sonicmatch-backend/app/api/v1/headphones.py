"""
Headphones catalog API endpoints.

Endpoints:
- GET /headphones - Browse headphone catalog with filtering
- GET /headphones/{id} - Get specific headphone details
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
import structlog

from app.config import settings
from app.core.cache import cache
from app.db.session import get_db
from app.models import Headphone, HeadphoneType, BackType, PriceTier
from app.schemas.headphone import HeadphoneResponse, HeadphoneFilterParams
from app.schemas.common import PaginatedResponse

logger = structlog.get_logger()
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/headphones", response_model=PaginatedResponse)
@limiter.limit(f"{settings.rate_limit_headphones}/minute")
async def list_headphones(
    request: Request,
    headphone_type: HeadphoneType | None = Query(None, description="Filter by type"),
    price_min: float | None = Query(None, ge=0, description="Minimum price"),
    price_max: float | None = Query(None, ge=0, description="Maximum price"),
    is_wireless: bool | None = Query(None, description="Filter wireless"),
    has_anc: bool | None = Query(None, description="Filter ANC"),
    price_tier: PriceTier | None = Query(None, description="Filter by price tier"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """
    Browse headphone catalog with optional filtering.

    **Query Parameters:**
    - headphone_type: Filter by headphone type (over_ear, on_ear, in_ear, earbuds)
    - price_min: Minimum price in USD
    - price_max: Maximum price in USD
    - is_wireless: Filter wireless headphones
    - has_anc: Filter headphones with ANC
    - price_tier: Filter by price tier (budget, mid_range, premium, flagship)
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)

    **Response:**
    - items: List of headphones
    - total: Total count matching filters
    - page: Current page
    - limit: Items per page
    - pages: Total pages

    **Caching:**
    - Results are cached for 10 minutes per filter combination

    **Rate Limit:** {settings.rate_limit_headphones} requests/minute per IP
    """
    try:
        # Build filter dict for caching
        filters = {
            "headphone_type": headphone_type.value if headphone_type else None,
            "price_min": price_min,
            "price_max": price_max,
            "is_wireless": is_wireless,
            "has_anc": has_anc,
            "price_tier": price_tier.value if price_tier else None,
            "page": page,
            "limit": limit,
        }

        # Check cache
        cached = await cache.get_cached_headphones(filters)
        if cached:
            logger.info("headphones_cache_hit", filters=filters)
            return cached

        # Build query
        query = select(Headphone)

        # Apply filters
        if headphone_type:
            query = query.where(Headphone.headphone_type == headphone_type)

        if price_min is not None:
            query = query.where(Headphone.price_usd >= price_min)

        if price_max is not None:
            query = query.where(Headphone.price_usd <= price_max)

        if is_wireless is not None:
            query = query.where(Headphone.is_wireless == is_wireless)

        if has_anc is not None:
            query = query.where(Headphone.has_anc == has_anc)

        if price_tier:
            query = query.where(Headphone.price_tier == price_tier)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        # Order by price
        query = query.order_by(Headphone.price_usd.asc())

        # Execute query
        result = await db.execute(query)
        headphones = result.scalars().all()

        # Build response
        items = [HeadphoneResponse.model_validate(h) for h in headphones]

        response = PaginatedResponse.create(
            items=items,
            total=total,
            page=page,
            limit=limit,
        )

        # Cache result
        await cache.cache_headphones(
            [item.model_dump(mode="json") for item in items],
            filters,
        )

        logger.info(
            "headphones_listed",
            count=len(items),
            total=total,
            page=page,
        )

        return response

    except Exception as e:
        logger.error("headphones_list_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve headphones",
        )


@router.get("/headphones/{headphone_id}", response_model=HeadphoneResponse)
async def get_headphone(
    headphone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information for a specific headphone.

    **Path Parameters:**
    - headphone_id: UUID of the headphone

    **Response:**
    - Complete headphone details
    """
    try:
        query = select(Headphone).where(Headphone.id == headphone_id)
        result = await db.execute(query)
        headphone = result.scalar_one_or_none()

        if not headphone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Headphone not found",
            )

        return HeadphoneResponse.model_validate(headphone)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            "headphone_get_error",
            error=str(e),
            headphone_id=str(headphone_id),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve headphone",
        )
