"""
Analytics model - Track usage and events.
"""
from typing import Optional
import uuid

from sqlalchemy import String, Index
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class AnalyticsEvent(Base, UUIDMixin, TimestampMixin):
    """
    Analytics event model.

    Tracks user interactions and system events for
    analytics, monitoring, and optimization.
    """

    __tablename__ = "analytics_events"

    # Event Type
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    # Session Reference (optional)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    # Event Metadata (flexible JSON)
    # Examples:
    # - session_created: {"preference_count": 5, "budget": 400}
    # - recommendation_generated: {"headphone_count": 3, "processing_time_ms": 1234}
    # - llm_call: {"provider": "anthropic", "tokens": 1500, "cost": 0.05}
    event_metadata: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Indexes for analytics queries
    __table_args__ = (
        Index("ix_analytics_type_created", "event_type", "created_at"),
        Index("ix_analytics_session_created", "session_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AnalyticsEvent {self.event_type} at {self.created_at}>"

    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "event_type": self.event_type,
            "session_id": str(self.session_id) if self.session_id else None,
            "event_metadata": self.event_metadata,
            "created_at": self.created_at.isoformat(),
        }
