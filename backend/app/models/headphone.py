"""
Headphone model - Database catalog of all headphones.
"""
import enum
from decimal import Decimal
from typing import List

from sqlalchemy import Enum, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class HeadphoneType(str, enum.Enum):
    """Headphone form factor types."""
    OVER_EAR = "over_ear"
    ON_EAR = "on_ear"
    IN_EAR = "in_ear"
    EARBUDS = "earbuds"


class BackType(str, enum.Enum):
    """Headphone back design."""
    OPEN = "open"
    CLOSED = "closed"
    SEMI_OPEN = "semi_open"


class PriceTier(str, enum.Enum):
    """Price categorization."""
    BUDGET = "budget"  # < $150
    MID_RANGE = "mid_range"  # $150-$300
    PREMIUM = "premium"  # $300-$500
    FLAGSHIP = "flagship"  # > $500


class Headphone(Base, UUIDMixin, TimestampMixin):
    """
    Headphone catalog model.

    Stores all available headphones with their specifications,
    pricing, and characteristics for matching against user preferences.
    """

    __tablename__ = "headphones"

    # Basic Information
    brand: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(200), nullable=False)
    full_name: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(300), nullable=False, unique=True, index=True)

    # Physical Characteristics
    headphone_type: Mapped[HeadphoneType] = mapped_column(
        Enum(HeadphoneType, name="headphone_type_enum"),
        nullable=False,
        index=True,
    )
    back_type: Mapped[BackType] = mapped_column(
        Enum(BackType, name="back_type_enum"),
        nullable=False,
    )

    # Features
    is_wireless: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)
    has_anc: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)

    # Pricing
    price_usd: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        index=True,
    )
    price_tier: Mapped[PriceTier] = mapped_column(
        Enum(PriceTier, name="price_tier_enum"),
        nullable=False,
        index=True,
    )

    # Media & Description
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    sound_signature: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Structured Data (JSON)
    key_features: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    pros: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    cons: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # Detailed Specifications (JSON)
    # Format: {"bass": 0.7, "mids": 0.6, "treble": 0.5, "soundstage": 0.8, "detail": 0.7}
    detailed_specs: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Target Audience (JSON Arrays)
    target_genres: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    target_use_cases: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # Relationships
    # matches: Mapped[List["HeadphoneMatch"]] = relationship(
    #     "HeadphoneMatch",
    #     back_populates="headphone",
    #     cascade="all, delete-orphan"
    # )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_headphones_price_tier_type", "price_tier", "headphone_type"),
        Index("ix_headphones_wireless_anc", "is_wireless", "has_anc"),
        Index("ix_headphones_price_range", "price_usd"),
    )

    def __repr__(self) -> str:
        return f"<Headphone {self.full_name} (${self.price_usd})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "brand": self.brand,
            "model": self.model,
            "full_name": self.full_name,
            "slug": self.slug,
            "headphone_type": self.headphone_type.value,
            "back_type": self.back_type.value,
            "is_wireless": self.is_wireless,
            "has_anc": self.has_anc,
            "price_usd": float(self.price_usd),
            "price_tier": self.price_tier.value,
            "image_url": self.image_url,
            "sound_signature": self.sound_signature,
            "description": self.description,
            "key_features": self.key_features,
            "pros": self.pros,
            "cons": self.cons,
            "detailed_specs": self.detailed_specs,
            "target_genres": self.target_genres,
            "target_use_cases": self.target_use_cases,
        }
