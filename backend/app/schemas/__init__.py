"""
Pydantic schemas package.
Export all schemas for easy import.
"""
from app.schemas.common import (
    ResponseBase,
    MessageResponse,
    ErrorResponse,
    PaginationParams,
    PaginatedResponse,
)
from app.schemas.headphone import (
    HeadphoneBase,
    HeadphoneCreate,
    HeadphoneUpdate,
    HeadphoneResponse,
    HeadphoneFilterParams,
)
from app.schemas.preference import (
    SoundPreferences,
    FavoriteTrack,
    UserPreferenceBase,
    UserPreferenceCreate,
    UserPreferenceResponse,
    UserPreferenceUpdate,
)
from app.schemas.recommendation import (
    MatchScores,
    HeadphoneMatchBase,
    HeadphoneMatchResponse,
    RecommendationSessionBase,
    RecommendationSessionResponse,
    RecommendationRequest,
    RecommendationResponse,
    ExplainRequest,
    ExplainResponse,
)

__all__ = [
    # Common
    "ResponseBase",
    "MessageResponse",
    "ErrorResponse",
    "PaginationParams",
    "PaginatedResponse",
    # Headphone
    "HeadphoneBase",
    "HeadphoneCreate",
    "HeadphoneUpdate",
    "HeadphoneResponse",
    "HeadphoneFilterParams",
    # Preference
    "SoundPreferences",
    "FavoriteTrack",
    "UserPreferenceBase",
    "UserPreferenceCreate",
    "UserPreferenceResponse",
    "UserPreferenceUpdate",
    # Recommendation
    "MatchScores",
    "HeadphoneMatchBase",
    "HeadphoneMatchResponse",
    "RecommendationSessionBase",
    "RecommendationSessionResponse",
    "RecommendationRequest",
    "RecommendationResponse",
    "ExplainRequest",
    "ExplainResponse",
]
