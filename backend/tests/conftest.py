"""
Pytest configuration and fixtures for SonicMatch tests.
"""
import asyncio
import uuid
from typing import AsyncGenerator, Generator
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models import (
    Headphone,
    HeadphoneType,
    BackType,
    PriceTier,
    UserPreference,
    UseCase,
)


# Test database URL (use in-memory SQLite for speed)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def sample_headphone_data():
    """Sample headphone data for tests."""
    return {
        "brand": "Sennheiser",
        "model": "HD 660S2",
        "full_name": "Sennheiser HD 660S2",
        "slug": "sennheiser-hd-660s2",
        "headphone_type": HeadphoneType.OVER_EAR,
        "back_type": BackType.OPEN,
        "is_wireless": False,
        "has_anc": False,
        "price_usd": 499,
        "price_tier": PriceTier.PREMIUM,
        "image_url": "https://example.com/hd660s2.jpg",
        "sound_signature": "neutral",
        "description": "Open-back audiophile headphones with neutral sound",
        "key_features": ["Open-back", "Neutral sound", "150 ohm impedance"],
        "pros": ["Excellent soundstage", "Neutral tuning", "Comfortable"],
        "cons": ["Requires amp", "Sound leakage"],
        "detailed_specs": {
            "bass": 0.7,
            "mids": 0.9,
            "treble": 0.85,
            "soundstage": 0.95,
            "detail": 0.9,
            "impedance_ohms": 150,
            "sensitivity_db": 104.0,
            "weight_grams": 260,
        },
        "target_genres": ["rock", "classical", "jazz"],
        "target_use_cases": ["music_listening", "studio"],
    }


@pytest_asyncio.fixture
async def sample_headphone(db_session, sample_headphone_data):
    """Create a sample headphone in the database."""
    headphone = Headphone(**sample_headphone_data)
    db_session.add(headphone)
    await db_session.commit()
    await db_session.refresh(headphone)
    return headphone


@pytest.fixture
def sample_user_preference_data():
    """Sample user preference data for tests."""
    return {
        "session_id": str(uuid.uuid4()),
        "genres": ["rock", "electronic"],
        "favorite_artists": ["Pink Floyd", "Daft Punk"],
        "favorite_tracks": ["Comfortably Numb"],
        "sound_preferences": {
            "bass": 0.6,
            "mids": 0.8,
            "treble": 0.7,
            "soundstage": 0.9,
            "detail": 0.85,
        },
        "primary_use_case": UseCase.CASUAL,
        "secondary_use_cases": ["gaming"],
        "budget_min": 200,
        "budget_max": 600,
        "preferred_type": HeadphoneType.OVER_EAR,
        "open_back_acceptable": True,
        "wireless_required": False,
        "anc_required": False,
    }


@pytest_asyncio.fixture
async def sample_user_preference(db_session, sample_user_preference_data):
    """Create a sample user preference in the database."""
    preference = UserPreference(**sample_user_preference_data)
    db_session.add(preference)
    await db_session.commit()
    await db_session.refresh(preference)
    return preference


@pytest.fixture
def mock_llm_response():
    """Mock LLM response for recommendation tests."""
    return {
        "recommendations": [
            {
                "headphone_id": None,  # Will be set in test
                "rank": 1,
                "scores": {
                    "overall": 0.92,
                    "genre_match": 0.95,
                    "sound_profile": 0.88,
                    "use_case": 0.90,
                    "budget": 1.0,
                    "feature_match": 0.95,
                },
                "explanation": "Excellent match for your preferences.",
                "personalized_pros": ["Great soundstage", "Neutral sound", "Good value"],
                "personalized_cons": ["Requires amplifier"],
                "match_highlights": ["Perfect for rock and electronic", "Within budget"],
            }
        ]
    }


@pytest.fixture
def malformed_llm_responses():
    """Collection of malformed LLM responses for error testing."""
    return {
        "invalid_json": "This is not JSON {broken",
        "missing_recommendations_key": '{"results": []}',
        "score_out_of_range": {
            "recommendations": [
                {
                    "headphone_id": "test-id",
                    "rank": 1,
                    "scores": {
                        "overall": 1.5,  # Out of range
                        "genre_match": 0.95,
                        "sound_profile": -0.1,  # Negative
                        "use_case": 0.90,
                        "budget": 1.0,
                        "feature_match": 0.95,
                    },
                    "explanation": "Test",
                    "personalized_pros": [],
                    "personalized_cons": [],
                    "match_highlights": [],
                }
            ]
        },
        "non_numeric_score": {
            "recommendations": [
                {
                    "headphone_id": "test-id",
                    "rank": 1,
                    "scores": {
                        "overall": "high",  # Not a number
                        "genre_match": 0.95,
                        "sound_profile": 0.88,
                        "use_case": 0.90,
                        "budget": 1.0,
                        "feature_match": 0.95,
                    },
                    "explanation": "Test",
                    "personalized_pros": [],
                    "personalized_cons": [],
                    "match_highlights": [],
                }
            ]
        },
        "markdown_wrapped": '```json\n{"recommendations": []}\n```',
    }
