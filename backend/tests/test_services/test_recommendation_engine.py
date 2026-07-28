"""
Tests for Recommendation Engine - focusing on candidate filtering and score validation.

Critical areas:
- Candidate filtering by budget, wireless, ANC, type, open-back
- Score range validation when saving matches
- Error handling for no candidates, LLM failures
"""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from app.models import (
    Headphone,
    HeadphoneType,
    BackType,
    PriceTier,
    UserPreference,
    UseCase,
    SessionStatus,
)
from app.services.recommendation_engine import RecommendationEngine
from app.core.exceptions import ValidationException, LLMException


class TestCandidateFiltering:
    """Test headphone candidate filtering logic."""

    @pytest.mark.asyncio
    async def test_filter_by_budget_range(self, db_session, sample_user_preference_data, sample_headphone_data):
        """Test that only headphones within budget are returned."""
        # Create headphones at different price points
        cheap_headphone = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "cheap", "price_usd": 100}
        )
        mid_headphone = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "mid", "price_usd": 400}
        )
        expensive_headphone = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "expensive", "price_usd": 1000}
        )

        db_session.add_all([cheap_headphone, mid_headphone, expensive_headphone])
        await db_session.commit()

        # Create preference with budget $200-$600
        preference = UserPreference(**{**sample_user_preference_data, "budget_min": 200, "budget_max": 600})
        db_session.add(preference)
        await db_session.commit()

        # Fetch candidates
        engine = RecommendationEngine(db_session)
        candidates = await engine._fetch_candidate_headphones(preference)

        # Only mid_headphone ($400) should be returned
        assert len(candidates) == 1
        assert candidates[0].price_usd == 400

    @pytest.mark.asyncio
    async def test_filter_by_wireless_required(self, db_session, sample_user_preference_data, sample_headphone_data):
        """Test filtering when wireless is required."""
        # Create wired and wireless headphones
        wired = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "wired", "is_wireless": False}
        )
        wireless = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "wireless", "is_wireless": True}
        )

        db_session.add_all([wired, wireless])
        await db_session.commit()

        # Create preference requiring wireless
        preference = UserPreference(**{**sample_user_preference_data, "wireless_required": True})
        db_session.add(preference)
        await db_session.commit()

        # Fetch candidates
        engine = RecommendationEngine(db_session)
        candidates = await engine._fetch_candidate_headphones(preference)

        # Only wireless should be returned
        assert len(candidates) == 1
        assert candidates[0].is_wireless is True

    @pytest.mark.asyncio
    async def test_filter_by_anc_required(self, db_session, sample_user_preference_data, sample_headphone_data):
        """Test filtering when ANC is required."""
        # Create headphones with/without ANC
        no_anc = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "no-anc", "has_anc": False}
        )
        with_anc = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "with-anc", "has_anc": True}
        )

        db_session.add_all([no_anc, with_anc])
        await db_session.commit()

        # Create preference requiring ANC
        preference = UserPreference(**{**sample_user_preference_data, "anc_required": True})
        db_session.add(preference)
        await db_session.commit()

        # Fetch candidates
        engine = RecommendationEngine(db_session)
        candidates = await engine._fetch_candidate_headphones(preference)

        # Only ANC headphone should be returned
        assert len(candidates) == 1
        assert candidates[0].has_anc is True

    @pytest.mark.asyncio
    async def test_filter_by_preferred_type(self, db_session, sample_user_preference_data, sample_headphone_data):
        """Test filtering by preferred headphone type."""
        # Create different types
        over_ear = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "over-ear", "headphone_type": HeadphoneType.OVER_EAR}
        )
        on_ear = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "on-ear", "headphone_type": HeadphoneType.ON_EAR}
        )

        db_session.add_all([over_ear, on_ear])
        await db_session.commit()

        # Create preference for over-ear
        preference = UserPreference(**{**sample_user_preference_data, "preferred_type": HeadphoneType.OVER_EAR})
        db_session.add(preference)
        await db_session.commit()

        # Fetch candidates
        engine = RecommendationEngine(db_session)
        candidates = await engine._fetch_candidate_headphones(preference)

        # Only over-ear should be returned
        assert len(candidates) == 1
        assert candidates[0].headphone_type == HeadphoneType.OVER_EAR

    @pytest.mark.asyncio
    async def test_filter_open_back_not_acceptable(self, db_session, sample_user_preference_data, sample_headphone_data):
        """Test filtering when open-back is NOT acceptable."""
        # Create open and closed back headphones
        open_back = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "open", "back_type": BackType.OPEN}
        )
        closed_back = Headphone(
            **{**sample_headphone_data, "id": uuid.uuid4(), "slug": "closed", "back_type": BackType.CLOSED}
        )

        db_session.add_all([open_back, closed_back])
        await db_session.commit()

        # Create preference NOT accepting open-back
        preference = UserPreference(**{**sample_user_preference_data, "open_back_acceptable": False})
        db_session.add(preference)
        await db_session.commit()

        # Fetch candidates
        engine = RecommendationEngine(db_session)
        candidates = await engine._fetch_candidate_headphones(preference)

        # Only closed-back should be returned
        assert len(candidates) == 1
        assert candidates[0].back_type == BackType.CLOSED

    @pytest.mark.asyncio
    async def test_combined_filters(self, db_session, sample_user_preference_data, sample_headphone_data):
        """Test multiple filters combined."""
        # Create various headphones
        perfect_match = Headphone(
            **{
                **sample_headphone_data,
                "id": uuid.uuid4(),
                "slug": "perfect",
                "price_usd": 400,
                "is_wireless": True,
                "has_anc": True,
                "headphone_type": HeadphoneType.OVER_EAR,
                "back_type": BackType.CLOSED,
            }
        )
        wrong_price = Headphone(
            **{
                **sample_headphone_data,
                "id": uuid.uuid4(),
                "slug": "wrong-price",
                "price_usd": 1000,
                "is_wireless": True,
                "has_anc": True,
            }
        )
        not_wireless = Headphone(
            **{
                **sample_headphone_data,
                "id": uuid.uuid4(),
                "slug": "not-wireless",
                "price_usd": 400,
                "is_wireless": False,
                "has_anc": True,
            }
        )

        db_session.add_all([perfect_match, wrong_price, not_wireless])
        await db_session.commit()

        # Create strict preference
        preference = UserPreference(
            **{
                **sample_user_preference_data,
                "budget_min": 200,
                "budget_max": 600,
                "wireless_required": True,
                "anc_required": True,
                "preferred_type": HeadphoneType.OVER_EAR,
                "open_back_acceptable": False,
            }
        )
        db_session.add(preference)
        await db_session.commit()

        # Fetch candidates
        engine = RecommendationEngine(db_session)
        candidates = await engine._fetch_candidate_headphones(preference)

        # Only perfect_match should pass all filters
        assert len(candidates) == 1
        assert candidates[0].slug == "perfect"


class TestScoreValidation:
    """Test score validation when saving matches."""

    @pytest.mark.asyncio
    async def test_save_valid_scores(self, db_session, sample_user_preference, sample_headphone):
        """Test saving matches with valid scores (0-1)."""
        from app.models import RecommendationSession

        # Create session
        session = RecommendationSession(
            preference_id=sample_user_preference.id,
            status=SessionStatus.PROCESSING,
            llm_provider="anthropic",
            llm_model="claude-sonnet-4-5-20250929",
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)

        # Mock LLM response with valid scores
        llm_response = {
            "recommendations": [
                {
                    "headphone_id": str(sample_headphone.id),
                    "rank": 1,
                    "scores": {
                        "overall": 0.92,
                        "genre_match": 0.95,
                        "sound_profile": 0.88,
                        "use_case": 0.90,
                        "budget": 1.0,
                        "feature_match": 0.95,
                    },
                    "explanation": "Great match",
                    "personalized_pros": ["Pro 1"],
                    "personalized_cons": ["Con 1"],
                    "match_highlights": ["Highlight 1"],
                }
            ]
        }

        # Save matches
        engine = RecommendationEngine(db_session)
        matches = await engine._save_matches(
            session=session,
            llm_response=llm_response,
            candidates={sample_headphone.id: sample_headphone},
        )

        # Verify match was saved
        assert len(matches) == 1
        assert matches[0].overall_score == Decimal("0.92")
        assert matches[0].genre_match_score == Decimal("0.95")

    @pytest.mark.asyncio
    async def test_save_scores_out_of_range(self, db_session, sample_user_preference, sample_headphone):
        """
        Test that matches with scores outside [0, 1] range are skipped.

        The implementation now validates score ranges and skips recommendations
        with invalid scores instead of saving them.
        """
        from app.models import RecommendationSession

        # Create session
        session = RecommendationSession(
            preference_id=sample_user_preference.id,
            status=SessionStatus.PROCESSING,
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)

        # LLM response with OUT OF RANGE scores
        llm_response = {
            "recommendations": [
                {
                    "headphone_id": str(sample_headphone.id),
                    "rank": 1,
                    "scores": {
                        "overall": 1.5,  # > 1.0
                        "genre_match": -0.1,  # < 0.0
                        "sound_profile": 0.88,
                        "use_case": 2.0,  # > 1.0
                        "budget": 1.0,
                        "feature_match": 0.95,
                    },
                    "explanation": "Test",
                    "personalized_pros": [],
                    "personalized_cons": [],
                    "match_highlights": [],
                }
            ]
        }

        # Save matches
        engine = RecommendationEngine(db_session)

        # Should skip recommendations with invalid scores
        matches = await engine._save_matches(
            session=session,
            llm_response=llm_response,
            candidates={sample_headphone.id: sample_headphone},
        )

        # Should return no matches because scores are invalid
        assert len(matches) == 0


class TestRecommendationGeneration:
    """Test end-to-end recommendation generation."""

    @pytest.mark.asyncio
    async def test_no_candidates_raises_error(self, db_session, sample_user_preference):
        """Test that having no matching candidates raises ValidationException."""
        # No headphones in database, so no candidates will match
        engine = RecommendationEngine(db_session)

        with pytest.raises(ValidationException) as exc_info:
            await engine.generate_recommendations(sample_user_preference, top_n=5)

        assert "No headphones match your requirements" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_successful_generation_with_mock_llm(
        self, db_session, sample_user_preference, sample_headphone, mock_llm_response
    ):
        """Test successful recommendation generation with mocked LLM."""
        # Update mock response with actual headphone ID
        mock_llm_response["recommendations"][0]["headphone_id"] = str(sample_headphone.id)

        # Mock LLM client
        mock_llm = AsyncMock()
        mock_llm.generate_recommendations = AsyncMock(return_value=mock_llm_response)

        # Create engine and inject mock LLM
        engine = RecommendationEngine(db_session)
        engine.llm = mock_llm

        # Generate recommendations
        session = await engine.generate_recommendations(sample_user_preference, top_n=5)

        # Verify session was created
        assert session.status == SessionStatus.COMPLETE
        assert session.llm_provider == "anthropic"
        assert session.processing_time_ms is not None

        # Verify matches were saved
        assert len(session.matches) == 1
        assert session.matches[0].overall_score == Decimal("0.92")

    @pytest.mark.asyncio
    async def test_llm_failure_marks_session_error(self, db_session, sample_user_preference, sample_headphone):
        """Test that LLM failure marks session as ERROR."""
        # Mock LLM to raise exception
        mock_llm = AsyncMock()
        mock_llm.generate_recommendations = AsyncMock(side_effect=LLMException("API timeout"))

        # Create engine and inject mock LLM
        engine = RecommendationEngine(db_session)
        engine.llm = mock_llm

        # Should raise LLMException
        with pytest.raises(LLMException):
            await engine.generate_recommendations(sample_user_preference, top_n=5)

        # Verify session was marked as error
        from sqlalchemy import select
        from app.models import RecommendationSession

        query = select(RecommendationSession).where(
            RecommendationSession.preference_id == sample_user_preference.id
        )
        result = await db_session.execute(query)
        session = result.scalar_one_or_none()

        assert session is not None
        assert session.status == SessionStatus.ERROR
        assert "LLM service error" in session.error_message


class TestUserProfileBuilding:
    """Test user profile dictionary construction."""

    def test_build_user_profile(self, sample_user_preference_data):
        """Test that user profile is built correctly."""
        from app.models import UserPreference

        preference = UserPreference(**sample_user_preference_data)
        engine = RecommendationEngine(MagicMock())  # Mock session

        profile = engine._build_user_profile(preference)

        # Check all required fields are present
        assert profile["genres"] == ["rock", "electronic"]
        assert profile["favorite_artists"] == ["Pink Floyd", "Daft Punk"]
        assert profile["sound_preferences"]["bass"] == 0.6
        assert profile["budget_min"] == 200.0
        assert profile["budget_max"] == 600.0
        assert profile["wireless_required"] is False
        assert profile["anc_required"] is False

    def test_build_user_profile_with_nulls(self):
        """Test profile building with optional fields missing."""
        minimal_preference = UserPreference(
            session_id=str(uuid.uuid4()),
            genres=["rock"],
            sound_preferences={},
            primary_use_case=UseCase.CASUAL,
            budget_min=100,
            budget_max=500,
        )

        engine = RecommendationEngine(MagicMock())
        profile = engine._build_user_profile(minimal_preference)

        # Should handle None values gracefully
        assert profile["genres"] == ["rock"]
        assert profile["favorite_artists"] == []  # Default empty list
        assert profile["budget_min"] == 100.0
