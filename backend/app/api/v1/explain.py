"""
Explanation API endpoint.

Endpoint:
- POST /explain - Get detailed explanation for a specific headphone match
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
import structlog

from app.config import settings
from app.core.exceptions import ValidationException, LLMException
from app.db.session import get_db
from app.schemas.recommendation import ExplainRequest, ExplainResponse
from app.services.recommendation_engine import RecommendationEngine

logger = structlog.get_logger()
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/explain", response_model=ExplainResponse)
@limiter.limit(f"{settings.rate_limit_explain}/minute")
async def explain_recommendation(
    request: ExplainRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate detailed explanation for a specific headphone recommendation.

    **Use Case:**
    - User wants more details about why a specific headphone was recommended
    - Comparison with other recommended headphones
    - In-depth analysis of match quality

    **Request Body:**
    - session_id: Recommendation session UUID
    - headphone_id: Specific headphone UUID to explain

    **Response:**
    - detailed_explanation: 4-5 sentence detailed explanation
    - comparison_points: List of comparison points vs alternatives

    **Rate Limit:** {settings.rate_limit_explain} requests/minute per IP
    """
    try:
        engine = RecommendationEngine(db)

        # Generate detailed explanation using LLM
        explanation = await engine.generate_detailed_explanation(
            session_id=request.session_id,
            headphone_id=request.headphone_id,
        )

        return ExplainResponse(
            detailed_explanation=explanation.get("detailed_explanation", ""),
            comparison_points=explanation.get("comparison_points", []),
        )

    except ValidationException as e:
        logger.error(
            "explain_validation_error",
            error=str(e),
            session_id=str(request.session_id),
            headphone_id=str(request.headphone_id),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    except LLMException as e:
        logger.error(
            "explain_llm_error",
            error=str(e),
            session_id=str(request.session_id),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Explanation service temporarily unavailable",
        )

    except Exception as e:
        logger.error(
            "explain_error",
            error=str(e),
            session_id=str(request.session_id),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate explanation",
        )
