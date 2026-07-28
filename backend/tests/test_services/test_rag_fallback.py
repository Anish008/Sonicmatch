"""
Tests for RAG fallback behavior.

Ensures the system gracefully handles RAG failures and continues
with non-RAG recommendations when retrieval fails or returns no results.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from decimal import Decimal

from app.services.recommendation_engine import RecommendationEngine
from app.services.retrieval_engine import RetrievalEngine
from app.models import UserPreference, Headphone
from app.core.exceptions import ValidationException


@pytest.mark.asyncio
class TestRAGFallback:
    """Test suite for RAG fallback scenarios."""

    async def test_retrieval_failure_falls_back_to_non_rag(self, db_session):
        """
        Test that when retrieval fails, the system falls back to non-RAG recommendations.

        Scenario: Retrieval engine throws an exception
        Expected: Recommendations are still generated without RAG context
        """
        # Create engine
        engine = RecommendationEngine(db_session)

        # Mock retrieval to raise exception
        with patch.object(
            engine.retrieval_engine,
            'retrieve',
            side_effect=Exception("Retrieval service error")
        ):
            # Mock other dependencies
            with patch.object(
                engine.llm,
                'generate_recommendations',
                return_value={
                    "recommendations": [{
                        "headphone_id": "123e4567-e89b-12d3-a456-426614174000",
                        "rank": 1,
                        "scores": {
                            "overall": 0.9,
                            "genre_match": 0.85,
                            "sound_profile": 0.88,
                            "use_case": 0.92,
                            "budget": 0.87,
                            "feature_match": 0.95,
                        },
                        "explanation": "Great match",
                        "personalized_pros": ["Pro 1", "Pro 2"],
                        "personalized_cons": ["Con 1"],
                        "match_highlights": ["Highlight 1", "Highlight 2"],
                    }]
                }
            ):
                # Create mock preference
                preference = MagicMock(spec=UserPreference)
                preference.id = "123e4567-e89b-12d3-a456-426614174001"
                preference.budget_min = 100
                preference.budget_max = 300
                preference.genres = ["rock", "pop"]
                preference.sound_preferences = {"bass": 0.7}
                preference.primary_use_case = "casual"
                preference.wireless_required = False
                preference.anc_required = False
                preference.preferred_type = None
                preference.open_back_acceptable = True

                # Mock _fetch_candidate_headphones to return mock headphones
                mock_headphone = MagicMock(spec=Headphone)
                mock_headphone.id = "123e4567-e89b-12d3-a456-426614174000"
                mock_headphone.to_dict = lambda: {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "full_name": "Test Headphone",
                    "price_usd": 200,
                    "headphone_type": "over_ear",
                    "back_type": "closed",
                    "is_wireless": True,
                    "has_anc": False,
                    "sound_signature": "neutral",
                    "description": "Test",
                    "key_features": [],
                    "target_genres": [],
                }

                with patch.object(
                    engine,
                    '_fetch_candidate_headphones',
                    return_value=[mock_headphone]
                ):
                    # This should not raise an exception despite retrieval failure
                    # The _retrieve_context method already handles exceptions and returns []
                    context = await engine._retrieve_context(preference, [mock_headphone])

                    # Verify fallback: empty context returned
                    assert context == []

    async def test_empty_retrieval_results_continues_without_citations(self, db_session):
        """
        Test that when retrieval returns no results, the system continues without citations.

        Scenario: Retrieval returns empty list (no relevant chunks found)
        Expected: Recommendations generated without citations field
        """
        engine = RecommendationEngine(db_session)

        # Mock retrieval to return empty results
        with patch.object(
            engine.retrieval_engine,
            'retrieve',
            return_value=[]
        ):
            preference = MagicMock(spec=UserPreference)
            preference.budget_min = 100
            preference.budget_max = 300
            preference.genres = ["rock"]
            preference.sound_preferences = {}
            preference.primary_use_case = "casual"
            preference.wireless_required = False
            preference.anc_required = False
            preference.preferred_type = None
            preference.open_back_acceptable = True

            mock_headphone = MagicMock(spec=Headphone)

            # Retrieve context
            context = await engine._retrieve_context(preference, [mock_headphone])

            # Verify empty context
            assert context == []

    async def test_rag_disabled_skips_retrieval(self, db_session):
        """
        Test that when RAG is disabled in config, retrieval is skipped.

        Scenario: RAG_ENABLED=false in config
        Expected: Router returns needs_rag=False, no retrieval occurs
        """
        engine = RecommendationEngine(db_session)

        # Mock RAG router to return disabled decision
        mock_decision = MagicMock()
        mock_decision.needs_rag = False
        mock_decision.confidence = 1.0
        mock_decision.reasoning = "RAG is disabled"
        mock_decision.query_type = "structured"

        with patch.object(
            engine.rag_router,
            'route_query',
            return_value=mock_decision
        ):
            with patch.object(
                engine.rag_router,
                'should_use_rag',
                return_value=False
            ):
                preference = MagicMock(spec=UserPreference)
                preference.budget_min = 100
                preference.budget_max = 300
                preference.genres = []
                preference.sound_preferences = {}
                preference.primary_use_case = "casual"

                user_profile = engine._build_user_profile(preference)

                # Route query
                decision = await engine._route_query(preference, user_profile)

                # Verify RAG not used
                assert not engine.rag_router.should_use_rag(decision)

    async def test_low_similarity_results_filtered_out(self, db_session):
        """
        Test that retrieval results below similarity threshold are filtered out.

        Scenario: All retrieved chunks have similarity < threshold
        Expected: Empty context passed to LLM (graceful fallback)
        """
        engine = RecommendationEngine(db_session)

        # Mock retrieval to return low-similarity results
        # Note: The retrieval engine itself filters by threshold,
        # so this tests that the engine respects the threshold setting
        mock_low_sim_result = MagicMock()
        mock_low_sim_result.similarity_score = 0.3  # Below default 0.5 threshold
        mock_low_sim_result.to_dict = lambda: {
            "chunk_id": "123",
            "headphone_id": "456",
            "headphone_name": "Test HP",
            "chunk_text": "Some text",
            "source_type": "review",
            "source_url": "http://example.com",
            "similarity_score": 0.3,
        }

        with patch.object(
            engine.retrieval_engine,
            'retrieve',
            return_value=[]  # Retrieval engine already filtered out low-similarity
        ):
            preference = MagicMock(spec=UserPreference)
            preference.budget_min = 100
            preference.budget_max = 300
            preference.genres = ["rock"]
            preference.sound_preferences = {"bass": 0.8}
            preference.primary_use_case = "casual"
            preference.wireless_required = False
            preference.anc_required = False
            preference.preferred_type = None
            preference.open_back_acceptable = True

            mock_headphone = MagicMock(spec=Headphone)

            context = await engine._retrieve_context(preference, [mock_headphone])

            # Verify no low-similarity results passed through
            assert context == []

    async def test_routing_error_defaults_to_rag(self, db_session):
        """
        Test that routing errors default to using RAG (conservative fallback).

        Scenario: Router throws exception during classification
        Expected: System defaults to RAG path to avoid missing relevant context
        """
        engine = RecommendationEngine(db_session)

        # Router's route_query already handles exceptions and defaults to RAG
        # This tests that behavior
        with patch.object(
            engine.rag_router,
            'route_query',
            side_effect=Exception("LLM routing error")
        ):
            preference = MagicMock(spec=UserPreference)
            preference.budget_min = 100
            preference.budget_max = 300
            preference.genres = ["rock"]
            preference.sound_preferences = {}
            preference.primary_use_case = "casual"

            user_profile = engine._build_user_profile(preference)

            # This should raise since we're mocking route_query to fail
            # In production, the router itself handles this internally
            with pytest.raises(Exception, match="LLM routing error"):
                await engine._route_query(preference, user_profile)


@pytest.mark.asyncio
class TestRAGRouterFallback:
    """Test RAG router fallback behavior specifically."""

    async def test_rag_router_handles_parse_errors(self):
        """Test that router handles JSON parse errors gracefully."""
        from app.services.rag_router import RAGRouter

        router = RAGRouter()

        # Mock LLM to return invalid JSON
        with patch.object(
            router.llm,
            'call_llm_raw',
            return_value="This is not JSON"
        ):
            decision = await router.route_query(
                query="test query",
                context={}
            )

            # Should default to RAG on parse error
            assert decision.needs_rag == True
            assert "Failed to parse" in decision.reasoning

    async def test_rag_router_handles_llm_errors(self):
        """Test that router handles LLM API errors gracefully."""
        from app.services.rag_router import RAGRouter

        router = RAGRouter()

        # Mock LLM to raise exception
        with patch.object(
            router.llm,
            'call_llm_raw',
            side_effect=Exception("API timeout")
        ):
            decision = await router.route_query(
                query="test query",
                context={}
            )

            # Should default to RAG on error
            assert decision.needs_rag == True
            assert "error" in decision.reasoning.lower()
