"""
Initialize database schema.

Creates all tables defined in SQLAlchemy models.
Run this before running migrations or seeding.

Usage:
    python init_db.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.db.base import Base
# Import all models to register them with Base
from app.models import (
    Headphone, UserPreference, RecommendationSession, HeadphoneMatch,
    ReviewChunk, User, AnalyticsEvent
)


async def init_database():
    """Create all database tables."""
    print("=" * 60)
    print("SonicMatch Database Initialization")
    print("=" * 60)

    engine = create_async_engine(settings.database_url, echo=True)

    print("\nCreating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()

    print("\nDatabase initialization complete!")
    print("Next steps:")
    print("  1. Run migrations: python -m alembic upgrade head")
    print("  2. Seed data: python seeds/seed_db.py")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(init_database())
