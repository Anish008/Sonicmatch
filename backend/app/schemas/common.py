"""
Common Pydantic schemas shared across the application.
"""
from typing import Any
from pydantic import BaseModel, ConfigDict


class ResponseBase(BaseModel):
    """Base response schema."""

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str
    detail: Any | None = None


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str
    detail: Any | None = None


class PaginationParams(BaseModel):
    """Pagination parameters."""

    page: int = 1
    limit: int = 20

    @property
    def offset(self) -> int:
        """Calculate offset from page and limit."""
        return (self.page - 1) * self.limit


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""

    items: list[Any]
    total: int
    page: int
    limit: int
    pages: int

    @classmethod
    def create(cls, items: list[Any], total: int, page: int, limit: int):
        """Create paginated response."""
        import math
        return cls(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if limit > 0 else 0
        )
