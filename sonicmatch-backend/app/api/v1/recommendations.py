"""
Recommendations API endpoints.

Endpoints:
- POST /recommend - Generate new recommendations
- GET /recommendations/{session_id} - Retrieve recommendation session
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
import structlog

from app.config import settings
from app.core.cache import cache
from app.core.exceptions import ValidationException, LLMException
from app.db.session import get_db
from app.models import UserPreference, SessionStatus
from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationSessionResponse,
    HeadphoneMatchResponse,
)
from app.schemas.headphone import HeadphoneResponse
from app.services.recommendation_engine import RecommendationEngine

logger = structlog.get_logger()
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/recommend", response_model=RecommendationResponse)
@limiter.limit(f"{settings.rate_limit_recommend}/minute")
async def generate_recommendations(
    request: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate headphone recommendations based on user preferences.

    **Process:**
    1. Validate user preferences
    2. Save preferences to database
    3. Generate recommendations using LLM
    4. Return session with recommendations

    **Request Body:**
    - preferences: Complete user preference object
    - async: If true, process in background (TODO: Celery integration)

    **Response:**
    - session_id: Unique session identifier
    - status: Session status (complete or processing)
    - recommendations: List of recommended headphones (if sync mode)

    **Rate Limit:** {settings.rate_limit_recommend} requests/minute per IP
    """
    try:
        # Create user preference
        session_id = request.preferences.session_id or str(uuid.uuid4())

        preference = UserPreference(
            session_id=session_id,
            genres=request.preferences.genres,
            favorite_artists=request.preferences.favorite_artists,
            favorite_tracks=[t.model_dump() for t in request.preferences.favorite_tracks],
            hours_per_day=request.preferences.hours_per_day,
            primary_source=request.preferences.primary_source,
            listening_environment=request.preferences.listening_environment,
            sound_preferences=request.preferences.sound_preferences.model_dump(),
            primary_use_case=request.preferences.primary_use_case,
            secondary_use_cases=request.preferences.secondary_use_cases,
            budget_min=request.preferences.budget_min,
            budget_max=request.preferences.budget_max,
            preferred_type=request.preferences.preferred_type,
            open_back_acceptable=request.preferences.open_back_acceptable,
            wireless_required=request.preferences.wireless_required,
            anc_required=request.preferences.anc_required,
            additional_notes=request.preferences.additional_notes,
        )

        db.add(preference)
        await db.flush()

        logger.info(
            "preference_created",
            preference_id=str(preference.id),
            session_id=session_id,
            genres=preference.genres,
            budget=f"${preference.budget_min}-${preference.budget_max}",
        )

        # TODO: If async mode, trigger Celery task and return immediately
        if request.async_mode:
            # For now, we'll process synchronously
            # In Phase 6, this will trigger a Celery task
            logger.warning("async_mode_not_implemented", session_id=session_id)

        # Generate recommendations (synchronous)
        engine = RecommendationEngine(db)
        session = await engine.generate_recommendations(preference, top_n=5)

        # Build response
        response = RecommendationResponse(
            session_id=session.id,
            status=session.status,
            processing_time_ms=session.processing_time_ms,
        )

        # If complete, include recommendations
        if session.status == SessionStatus.COMPLETE:
            # Fetch full session with matches
            full_session = await engine.get_session_with_matches(session.id)

            if full_session and full_session.matches:
                recommendations = []
                for match in full_session.matches:
                    match_response = HeadphoneMatchResponse(
                        id=match.id,
                        rank=match.rank,
                        scores={
                            "overall": float(match.overall_score),
                            "genreMatch": float(match.genre_match_score),
                            "soundProfile": float(match.sound_profile_score),
                            "useCase": float(match.use_case_score),
                            "budget": float(match.budget_score),
                            "featureMatch": float(match.feature_match_score),
                        },
                        explanation=match.explanation,
                        personalizedPros=match.personalized_pros,
                        personalizedCons=match.personalized_cons,
                        matchHighlights=match.match_highlights,
                        headphone=HeadphoneResponse.model_validate(match.headphone),
                    )
                    recommendations.append(match_response)

                response.recommendations = recommendations

        # Cache successful result
        if session.status == SessionStatus.COMPLETE:
            await cache.cache_session(
                str(session.id),
                response.model_dump(mode="json"),
            )

        return response

    except ValidationException as e:
        logger.error("validation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    except LLMException as e:
        logger.error("llm_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recommendation service temporarily unavailable",
        )

    except Exception as e:
        logger.error("recommendation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendations",
        )


@router.get("/recommendations/{session_id}", response_model=RecommendationResponse)
async def get_recommendation_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a recommendation session by ID.

    **Path Parameters:**
    - session_id: UUID of the recommendation session

    **Response:**
    - Complete recommendation session with matches

    **Caching:**
    - Complete sessions are cached for 1 hour
    - Processing sessions are not cached
    """
    try:
        # Check cache first
        cached = await cache.get_cached_session(str(session_id))
        if cached:
            logger.info("session_cache_hit", session_id=str(session_id))
            return RecommendationResponse(**cached)

        # Fetch from database
        engine = RecommendationEngine(db)
        session = await engine.get_session_with_matches(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        # Build response
        response = RecommendationResponse(
            session_id=session.id,
            status=session.status,
            processing_time_ms=session.processing_time_ms,
        )

        # Include recommendations if complete
        if session.status == SessionStatus.COMPLETE and session.matches:
            recommendations = []
            for match in session.matches:
                match_response = HeadphoneMatchResponse(
                    id=match.id,
                    rank=match.rank,
                    scores={
                        "overall": float(match.overall_score),
                        "genreMatch": float(match.genre_match_score),
                        "soundProfile": float(match.sound_profile_score),
                        "useCase": float(match.use_case_score),
                        "budget": float(match.budget_score),
                        "featureMatch": float(match.feature_match_score),
                    },
                    explanation=match.explanation,
                    personalizedPros=match.personalized_pros,
                    personalizedCons=match.personalized_cons,
                    matchHighlights=match.match_highlights,
                    headphone=HeadphoneResponse.model_validate(match.headphone),
                )
                recommendations.append(match_response)

            response.recommendations = recommendations

            # Cache complete sessions
            await cache.cache_session(
                str(session.id),
                response.model_dump(mode="json"),
            )

        return response

    except HTTPException:
        raise

    except Exception as e:
        logger.error("session_retrieval_error", error=str(e), session_id=str(session_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session",
        )
