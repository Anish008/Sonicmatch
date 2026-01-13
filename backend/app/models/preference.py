"""
User Preference model - Stores user's music and headphone preferences.
"""
import enum
import uuid
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class UseCase(str, enum.Enum):
    """Primary use case for headphones."""
    STUDIO = "studio"
    GAMING = "gaming"
    TRAVEL = "travel"
    CASUAL = "casual"
    WORKOUT = "workout"
    AUDIOPHILE = "audiophile"
    OFFICE = "office"


class UserPreference(Base, UUIDMixin, TimestampMixin):
    """
    User preference model.

    Stores all user preferences collected through the wizard,
    including music taste, sound preferences, budget, and requirements.
    """

    __tablename__ = "user_preferences"

    # Session tracking (for anonymous users)
    session_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    # Future: Link to authenticated user
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Music Preferences (JSON Arrays)
    genres: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    favorite_artists: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    favorite_tracks: Mapped[List[dict]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # Listening Habits
    hours_per_day: Mapped[int] = mapped_column(
        default=2,
        nullable=False,
    )
    primary_source: Mapped[str] = mapped_column(
        String(100),
        default="streaming",
        nullable=False,
    )
    listening_environment: Mapped[str] = mapped_column(
        String(100),
        default="mixed",
        nullable=False,
    )

    # Sound Preferences (JSON)
    # Format: {"bass": 0.5, "mids": 0.5, "treble": 0.5, "soundstage": 0.5, "detail": 0.5}
    sound_preferences: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Use Cases
    primary_use_case: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="casual",
    )
    secondary_use_cases: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # Budget
    budget_min: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("100.00"),
    )
    budget_max: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("400.00"),
    )

    # Headphone Preferences
    preferred_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    open_back_acceptable: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )
    wireless_required: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )
    anc_required: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    # Additional Notes
    additional_notes: Mapped[str] = mapped_column(
        Text,
        default="",
        nullable=False,
    )

    # Relationships
    # recommendation_sessions: Mapped[List["RecommendationSession"]] = relationship(
    #     "RecommendationSession",
    #     back_populates="preference",
    #     cascade="all, delete-orphan"
    # )

    def __repr__(self) -> str:
        return f"<UserPreference {self.session_id} - {len(self.genres)} genres, ${self.budget_min}-${self.budget_max}>"

    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "session_id": self.session_id,
            "genres": self.genres,
            "favorite_artists": self.favorite_artists,
            "favorite_tracks": self.favorite_tracks,
            "hours_per_day": self.hours_per_day,
            "primary_source": self.primary_source,
            "listening_environment": self.listening_environment,
            "sound_preferences": self.sound_preferences,
            "primary_use_case": self.primary_use_case,
            "secondary_use_cases": self.secondary_use_cases,
            "budget_min": float(self.budget_min),
            "budget_max": float(self.budget_max),
            "preferred_type": self.preferred_type,
            "open_back_acceptable": self.open_back_acceptable,
            "wireless_required": self.wireless_required,
            "anc_required": self.anc_required,
            "additional_notes": self.additional_notes,
        }
