"""
SonicMatch Backend - FastAPI Application Entry Point
AI-powered headphone recommendation service
"""
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import structlog

from app.config import settings
from app.core.exceptions import SonicMatchException
from app.core.cache import cache
from app.api.v1.router import router as api_v1_router


# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()


# Rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"] if settings.rate_limit_enabled else []
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    # Startup
    logger.info("starting_application", app_name=settings.app_name)

    # Initialize Redis cache
    await cache.initialize()

    # TODO: Initialize database connection pool
    # TODO: Ping external services

    yield

    # Shutdown
    logger.info("shutting_down_application")

    # Close Redis connection
    await cache.close()

    # TODO: Close database connections


# Create FastAPI application
app = FastAPI(
    title="SonicMatch API",
    description="AI-powered headphone recommendation engine",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

# Attach limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ============================================
# Middleware
# ============================================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

# Trusted Host Middleware (security)
if not settings.debug:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.sonicmatch.com", "sonicmatch.com"]
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests."""
    start_time = time.time()

    # Log request
    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else None,
    )

    # Process request
    response = await call_next(request)

    # Log response
    process_time = time.time() - start_time
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time_ms=round(process_time * 1000, 2),
    )

    # Add process time header
    response.headers["X-Process-Time"] = str(process_time)

    return response


# ============================================
# Exception Handlers
# ============================================

@app.exception_handler(SonicMatchException)
async def sonicmatch_exception_handler(request: Request, exc: SonicMatchException):
    """Handle custom SonicMatch exceptions."""
    logger.error(
        "sonicmatch_exception",
        error=str(exc),
        error_type=exc.__class__.__name__,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(
        "unhandled_exception",
        error=str(exc),
        error_type=exc.__class__.__name__,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc) if settings.debug else None},
    )


# ============================================
# Routes
# ============================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs" if settings.debug else "Documentation disabled in production",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    # TODO: Check database connection
    # TODO: Check Redis connection
    # TODO: Check LLM API availability

    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "database": "connected",  # TODO: actual check
            "redis": "connected",  # TODO: actual check
            "llm": "available",  # TODO: actual check
        }
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Readiness check for Kubernetes/Docker."""
    return {"status": "ready"}


@app.get("/health/live", tags=["Health"])
async def liveness_check():
    """Liveness check for Kubernetes/Docker."""
    return {"status": "alive"}


# Include API v1 router
app.include_router(api_v1_router, prefix=settings.api_v1_prefix)


# ============================================
# Application Entry Point
# ============================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
