"""
User Preference Pydantic schemas for API requests and responses.
"""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.preference import UseCase


class SoundPreferences(BaseModel):
    """Sound preference values (0.0 - 1.0)."""

    bass: float = Field(0.5, ge=0.0, le=1.0)
    mids: float = Field(0.5, ge=0.0, le=1.0)
    treble: float = Field(0.5, ge=0.0, le=1.0)
    soundstage: float = Field(0.5, ge=0.0, le=1.0)
    detail: float = Field(0.5, ge=0.0, le=1.0)


class FavoriteTrack(BaseModel):
    """Favorite track information."""

    name: str = Field(..., max_length=200)
    artist: str = Field(..., max_length=200)


class UserPreferenceBase(BaseModel):
    """Base user preference schema."""

    genres: list[str] = Field(
        default_factory=list,
        min_length=1,
        description="At least one genre required"
    )
    favorite_artists: list[str] = Field(
        default_factory=list,
        max_length=20,
        description="Up to 20 favorite artists"
    )
    favorite_tracks: list[FavoriteTrack] = Field(
        default_factory=list,
        max_length=20,
        description="Up to 20 favorite tracks"
    )
    hours_per_day: int = Field(2, ge=0, le=24)
    primary_source: str = Field("streaming", max_length=100)
    listening_environment: str = Field("mixed", max_length=100)
    sound_preferences: SoundPreferences = Field(default_factory=SoundPreferences)
    primary_use_case: str = Field("casual", max_length=50)
    secondary_use_cases: list[str] = Field(
        default_factory=list,
        max_length=3,
        description="Up to 3 secondary use cases"
    )
    budget_min: Decimal = Field(Decimal("100.00"), ge=0)
    budget_max: Decimal = Field(Decimal("400.00"), ge=0)
    preferred_type: str | None = Field(None, max_length=50)
    open_back_acceptable: bool = True
    wireless_required: bool = False
    anc_required: bool = False
    additional_notes: str = Field("", max_length=1000)

    @field_validator("budget_max")
    @classmethod
    def validate_budget_range(cls, v: Decimal, info) -> Decimal:
        """Ensure budget_max >= budget_min."""
        if hasattr(info, 'data') and 'budget_min' in info.data:
            budget_min = info.data['budget_min']
            if v < budget_min:
                raise ValueError("budget_max must be greater than or equal to budget_min")
        return v

    @field_validator("favorite_artists")
    @classmethod
    def validate_artist_length(cls, v: list[str]) -> list[str]:
        """Validate individual artist string lengths."""
        for artist in v:
            if len(artist) > 100:
                raise ValueError("Artist name must not exceed 100 characters")
        return v


class UserPreferenceCreate(UserPreferenceBase):
    """Schema for creating user preferences."""

    session_id: str | None = None  # Auto-generated if not provided


class UserPreferenceResponse(UserPreferenceBase):
    """Schema for user preference responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: str
    created_at: str


class UserPreferenceUpdate(BaseModel):
    """Schema for updating user preferences (all fields optional)."""

    genres: list[str] | None = None
    favorite_artists: list[str] | None = None
    favorite_tracks: list[FavoriteTrack] | None = None
    hours_per_day: int | None = None
    primary_source: str | None = None
    listening_environment: str | None = None
    sound_preferences: SoundPreferences | None = None
    primary_use_case: str | None = None
    secondary_use_cases: list[str] | None = None
    budget_min: Decimal | None = None
    budget_max: Decimal | None = None
    preferred_type: str | None = None
    open_back_acceptable: bool | None = None
    wireless_required: bool | None = None
    anc_required: bool | None = None
    additional_notes: str | None = None
