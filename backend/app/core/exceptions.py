"""
Custom exceptions for SonicMatch application.
"""
from typing import Any
from fastapi import status


class SonicMatchException(Exception):
    """Base exception for all SonicMatch errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: Any = None
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class DatabaseException(SonicMatchException):
    """Database-related errors."""

    def __init__(self, message: str = "Database error", detail: Any = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )


class ResourceNotFoundException(SonicMatchException):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", detail: Any = None):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class ValidationException(SonicMatchException):
    """Input validation errors."""

    def __init__(self, message: str = "Validation error", detail: Any = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class RateLimitException(SonicMatchException):
    """Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", detail: Any = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail
        )


class LLMException(SonicMatchException):
    """LLM API errors."""

    def __init__(self, message: str = "LLM service error", detail: Any = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )


class CacheException(SonicMatchException):
    """Cache-related errors."""

    def __init__(self, message: str = "Cache error", detail: Any = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )


class AuthenticationException(SonicMatchException):
    """Authentication errors."""

    def __init__(self, message: str = "Authentication failed", detail: Any = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class AuthorizationException(SonicMatchException):
    """Authorization errors."""

    def __init__(self, message: str = "Not authorized", detail: Any = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )
