"""
Recommendation models - Session and HeadphoneMatch.
"""
import enum
import uuid
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, Text, Enum
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class SessionStatus(str, enum.Enum):
    """Recommendation session status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETE = "complete"
    ERROR = "error"


class RecommendationSession(Base, UUIDMixin, TimestampMixin):
    """
    Recommendation session model.

    Tracks a recommendation request from start to finish,
    including processing status and LLM metadata.
    """

    __tablename__ = "recommendation_sessions"

    # Link to user preference
    preference_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_preferences.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Session Status
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status_enum"),
        default=SessionStatus.PENDING,
        nullable=False,
        index=True,
    )

    # LLM Metadata
    llm_provider: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    llm_model: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Performance Metrics
    processing_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # Error Information
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    # preference: Mapped["UserPreference"] = relationship(
    #     "UserPreference",
    #     back_populates="recommendation_sessions"
    # )

    # matches: Mapped[List["HeadphoneMatch"]] = relationship(
    #     "HeadphoneMatch",
    #     back_populates="session",
    #     cascade="all, delete-orphan",
    #     order_by="HeadphoneMatch.rank"
    # )

    # Indexes for querying
    __table_args__ = (
        Index("ix_rec_sessions_status_created", "status", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<RecommendationSession {self.id} - {self.status.value}>"

    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "preference_id": str(self.preference_id),
            "status": self.status.value,
            "llm_provider": self.llm_provider,
            "llm_model": self.llm_model,
            "processing_time_ms": self.processing_time_ms,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class HeadphoneMatch(Base, UUIDMixin, TimestampMixin):
    """
    Headphone match model.

    Represents a single recommended headphone with personalized
    scores, explanation, and pros/cons for a specific session.
    """

    __tablename__ = "headphone_matches"

    # Links
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendation_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    headphone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("headphones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Ranking
    rank: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # Scores (0.0 - 1.0)
    overall_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )
    genre_match_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )
    sound_profile_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )
    use_case_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )
    budget_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )
    feature_match_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )

    # LLM-Generated Content
    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    personalized_pros: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    personalized_cons: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    match_highlights: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # Relationships
    # session: Mapped["RecommendationSession"] = relationship(
    #     "RecommendationSession",
    #     back_populates="matches"
    # )
    # headphone: Mapped["Headphone"] = relationship(
    #     "Headphone",
    #     back_populates="matches"
    # )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_matches_session_rank", "session_id", "rank"),
        Index("ix_matches_session_score", "session_id", "overall_score"),
    )

    def __repr__(self) -> str:
        return f"<HeadphoneMatch Rank {self.rank} - Score {self.overall_score}>"

    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "session_id": str(self.session_id),
            "headphone_id": str(self.headphone_id),
            "rank": self.rank,
            "scores": {
                "overall": float(self.overall_score),
                "genre_match": float(self.genre_match_score),
                "sound_profile": float(self.sound_profile_score),
                "use_case": float(self.use_case_score),
                "budget": float(self.budget_score),
                "feature_match": float(self.feature_match_score),
            },
            "explanation": self.explanation,
            "personalized_pros": self.personalized_pros,
            "personalized_cons": self.personalized_cons,
            "match_highlights": self.match_highlights,
        }
