"""
Recommendation Pydantic schemas for API requests and responses.
"""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.recommendation import SessionStatus
from app.schemas.preference import UserPreferenceCreate
from app.schemas.headphone import HeadphoneResponse


class MatchScores(BaseModel):
    """Individual match scores."""

    overall: float = Field(..., ge=0.0, le=1.0)
    genre_match: float = Field(alias="genreMatch", ge=0.0, le=1.0)
    sound_profile: float = Field(alias="soundProfile", ge=0.0, le=1.0)
    use_case: float = Field(alias="useCase", ge=0.0, le=1.0)
    budget: float = Field(..., ge=0.0, le=1.0)
    feature_match: float = Field(alias="featureMatch", ge=0.0, le=1.0)

    model_config = ConfigDict(populate_by_name=True)


class HeadphoneMatchBase(BaseModel):
    """Base headphone match schema."""

    rank: int = Field(..., ge=1)
    scores: MatchScores
    explanation: str
    personalized_pros: list[str] = Field(
        alias="personalizedPros",
        default_factory=list
    )
    personalized_cons: list[str] = Field(
        alias="personalizedCons",
        default_factory=list
    )
    match_highlights: list[str] = Field(
        alias="matchHighlights",
        default_factory=list
    )

    model_config = ConfigDict(populate_by_name=True)


class HeadphoneMatchResponse(HeadphoneMatchBase):
    """Schema for headphone match responses."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    headphone: HeadphoneResponse


class RecommendationSessionBase(BaseModel):
    """Base recommendation session schema."""

    status: SessionStatus
    llm_provider: str | None = None
    llm_model: str | None = None
    processing_time_ms: int | None = Field(
        None,
        alias="processingTimeMs",
        description="Processing time in milliseconds"
    )

    model_config = ConfigDict(populate_by_name=True)


class RecommendationSessionResponse(RecommendationSessionBase):
    """Schema for recommendation session responses."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    created_at: str = Field(alias="createdAt")
    recommendations: list[HeadphoneMatchResponse] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    """
    Request schema for POST /api/v1/recommend.

    Includes full user preferences for generating recommendations.
    """

    preferences: UserPreferenceCreate
    async_mode: bool = Field(
        False,
        alias="async",
        description="If true, return immediately and process in background"
    )

    model_config = ConfigDict(populate_by_name=True)


class RecommendationResponse(BaseModel):
    """
    Response schema for POST /api/v1/recommend.

    Returns session ID and optionally full recommendations (sync mode).
    """

    session_id: UUID = Field(alias="sessionId")
    status: SessionStatus
    recommendations: list[HeadphoneMatchResponse] | None = None
    processing_time_ms: int | None = Field(None, alias="processingTimeMs")

    model_config = ConfigDict(populate_by_name=True)


class ExplainRequest(BaseModel):
    """Request schema for POST /api/v1/explain."""

    session_id: UUID = Field(alias="sessionId")
    headphone_id: UUID = Field(alias="headphoneId")

    model_config = ConfigDict(populate_by_name=True)


class ExplainResponse(BaseModel):
    """Response schema for POST /api/v1/explain."""

    detailed_explanation: str = Field(alias="detailedExplanation")
    comparison_points: list[str] = Field(
        alias="comparisonPoints",
        default_factory=list
    )

    model_config = ConfigDict(populate_by_name=True)
