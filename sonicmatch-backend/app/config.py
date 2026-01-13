"""
Application configuration using Pydantic Settings.
Environment variables are loaded from .env file.
"""
from typing import Any, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    app_name: str = Field(default="SonicMatch", description="Application name")
    debug: bool = Field(default=False, description="Debug mode")
    secret_key: str = Field(..., description="Secret key for JWT")
    api_v1_prefix: str = Field(default="/api/v1", description="API v1 prefix")

    # Server
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")

    # Database
    database_url: str = Field(..., description="PostgreSQL connection URL")

    # Redis
    redis_url: str = Field(..., description="Redis connection URL")

    # LLM Configuration
    llm_provider: str = Field(default="anthropic", description="LLM provider (anthropic|openai)")
    anthropic_api_key: str | None = Field(default=None, description="Anthropic API key")
    openai_api_key: str | None = Field(default=None, description="OpenAI API key")
    llm_model: str = Field(default="claude-opus-4-5", description="LLM model to use")
    llm_max_tokens: int = Field(default=4000, description="Max tokens for LLM responses")
    llm_temperature: float = Field(default=0.7, description="LLM temperature")
    llm_timeout: int = Field(default=30, description="LLM request timeout in seconds")

    # CORS
    cors_origins: str | List[str] = Field(
        default="http://localhost:3000",
        description="Allowed CORS origins"
    )
    cors_credentials: bool = Field(default=True, description="Allow credentials")
    cors_methods: str | List[str] = Field(default="*", description="Allowed methods")
    cors_headers: str | List[str] = Field(default="*", description="Allowed headers")

    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True, description="Enable rate limiting")
    rate_limit_per_minute: int = Field(default=60, description="Default rate limit per minute")
    rate_limit_recommend: int = Field(default=10, description="Rate limit for /recommend")
    rate_limit_explain: int = Field(default=20, description="Rate limit for /explain")
    rate_limit_headphones: int = Field(default=100, description="Rate limit for /headphones")

    # Celery
    celery_broker_url: str = Field(..., description="Celery broker URL")
    celery_result_backend: str = Field(..., description="Celery result backend URL")
    celery_task_timeout: int = Field(default=60, description="Celery task timeout")

    # Security
    bcrypt_rounds: int = Field(default=12, description="BCrypt hash rounds")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiry")
    algorithm: str = Field(default="HS256", description="JWT algorithm")

    # Caching
    cache_ttl_session: int = Field(default=3600, description="Session cache TTL")
    cache_ttl_headphones: int = Field(default=600, description="Headphones cache TTL")
    cache_ttl_filters: int = Field(default=300, description="Filter results cache TTL")

    # Monitoring
    sentry_dsn: str | None = Field(default=None, description="Sentry DSN")
    log_level: str = Field(default="INFO", description="Logging level")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @field_validator("cors_methods", "cors_headers", mode="before")
    @classmethod
    def parse_cors_lists(cls, v: Any) -> List[str]:
        """Parse CORS methods/headers from string or list."""
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [item.strip() for item in v.split(",")]
        return v

    @field_validator("llm_provider")
    @classmethod
    def validate_llm_provider(cls, v: str) -> str:
        """Validate LLM provider."""
        if v not in ["anthropic", "openai"]:
            raise ValueError("llm_provider must be 'anthropic' or 'openai'")
        return v

    def get_llm_api_key(self) -> str:
        """Get the appropriate LLM API key based on provider."""
        if self.llm_provider == "anthropic":
            if not self.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY is required when using anthropic provider")
            return self.anthropic_api_key
        elif self.llm_provider == "openai":
            if not self.openai_api_key:
                raise ValueError("OPENAI_API_KEY is required when using openai provider")
            return self.openai_api_key
        raise ValueError(f"Unknown LLM provider: {self.llm_provider}")

    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL (for Alembic)."""
        return self.database_url.replace("+asyncpg", "")


# Global settings instance
settings = Settings()
