"""
Headphone Pydantic schemas for API requests and responses.
"""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.headphone import HeadphoneType, BackType, PriceTier


class HeadphoneBase(BaseModel):
    """Base headphone schema."""

    brand: str = Field(..., max_length=100)
    model: str = Field(..., max_length=200)
    full_name: str = Field(..., max_length=300)
    slug: str = Field(..., max_length=300)
    headphone_type: HeadphoneType
    back_type: BackType
    is_wireless: bool = False
    has_anc: bool = False
    price_usd: Decimal = Field(..., ge=0, decimal_places=2)
    price_tier: PriceTier
    image_url: str
    sound_signature: str = Field(..., max_length=50)
    description: str
    key_features: list[str] = Field(default_factory=list)
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    detailed_specs: dict = Field(default_factory=dict)
    target_genres: list[str] = Field(default_factory=list)
    target_use_cases: list[str] = Field(default_factory=list)


class HeadphoneCreate(HeadphoneBase):
    """Schema for creating a headphone."""
    pass


class HeadphoneUpdate(BaseModel):
    """Schema for updating a headphone (all fields optional)."""

    brand: str | None = None
    model: str | None = None
    full_name: str | None = None
    slug: str | None = None
    headphone_type: HeadphoneType | None = None
    back_type: BackType | None = None
    is_wireless: bool | None = None
    has_anc: bool | None = None
    price_usd: Decimal | None = None
    price_tier: PriceTier | None = None
    image_url: str | None = None
    sound_signature: str | None = None
    description: str | None = None
    key_features: list[str] | None = None
    pros: list[str] | None = None
    cons: list[str] | None = None
    detailed_specs: dict | None = None
    target_genres: list[str] | None = None
    target_use_cases: list[str] | None = None


class HeadphoneResponse(HeadphoneBase):
    """Schema for headphone responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID


class HeadphoneFilterParams(BaseModel):
    """Query parameters for filtering headphones."""

    headphone_type: HeadphoneType | None = None
    price_min: Decimal | None = Field(None, ge=0)
    price_max: Decimal | None = Field(None, ge=0)
    is_wireless: bool | None = None
    has_anc: bool | None = None
    price_tier: PriceTier | None = None
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
