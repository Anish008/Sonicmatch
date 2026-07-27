"""
Tests for LLM Client - focusing on response parsing and error handling.

Critical areas:
- JSON parsing (including malformed responses)
- Score validation
- Markdown unwrapping
- Missing keys handling
"""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.llm_client import LLMClient
from app.core.exceptions import LLMException


class TestLLMClientParsing:
    """Test LLM response parsing logic."""

    @pytest.fixture
    def llm_client_instance(self):
        """Create LLM client instance with mocked settings."""
        with patch("app.services.llm_client.settings") as mock_settings:
            mock_settings.llm_provider = "anthropic"
            mock_settings.llm_model = "claude-sonnet-4-5-20250929"
            mock_settings.llm_max_tokens = 4000
            mock_settings.llm_temperature = 0.7
            mock_settings.llm_timeout = 30
            mock_settings.get_llm_api_key.return_value = "test-key"

            client = LLMClient()
            return client

    def test_parse_valid_response(self, llm_client_instance):
        """Test parsing valid LLM response."""
        valid_response = json.dumps({
            "recommendations": [
                {
                    "headphone_id": "test-id",
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
                    "personalized_pros": ["Pro 1", "Pro 2"],
                    "personalized_cons": ["Con 1"],
                    "match_highlights": ["Highlight 1"],
                }
            ]
        })

        result = llm_client_instance._parse_recommendation_response(valid_response)

        assert "recommendations" in result
        assert len(result["recommendations"]) == 1
        assert result["recommendations"][0]["headphone_id"] == "test-id"
        assert result["recommendations"][0]["scores"]["overall"] == 0.92

    def test_parse_markdown_wrapped_response(self, llm_client_instance, malformed_llm_responses):
        """Test parsing response wrapped in markdown code blocks."""
        markdown_response = malformed_llm_responses["markdown_wrapped"]

        result = llm_client_instance._parse_recommendation_response(markdown_response)

        assert "recommendations" in result
        assert isinstance(result["recommendations"], list)

    def test_parse_invalid_json(self, llm_client_instance, malformed_llm_responses):
        """Test handling of invalid JSON response."""
        invalid_json = malformed_llm_responses["invalid_json"]

        with pytest.raises(LLMException) as exc_info:
            llm_client_instance._parse_recommendation_response(invalid_json)

        assert "Failed to parse LLM response as JSON" in str(exc_info.value)

    def test_parse_missing_recommendations_key(self, llm_client_instance, malformed_llm_responses):
        """Test handling of response missing 'recommendations' key."""
        missing_key = malformed_llm_responses["missing_recommendations_key"]

        with pytest.raises(LLMException) as exc_info:
            llm_client_instance._parse_recommendation_response(missing_key)

        assert "Missing 'recommendations' key" in str(exc_info.value)

    def test_parse_empty_response(self, llm_client_instance):
        """Test handling of empty response."""
        empty_response = ""

        with pytest.raises(LLMException):
            llm_client_instance._parse_recommendation_response(empty_response)

    def test_parse_whitespace_response(self, llm_client_instance):
        """Test handling of whitespace-only response."""
        whitespace_response = "   \n\t   "

        with pytest.raises(LLMException):
            llm_client_instance._parse_recommendation_response(whitespace_response)


class TestLLMClientScoreHandling:
    """Test score validation and handling."""

    @pytest.fixture
    def llm_client_instance(self):
        """Create LLM client instance with mocked settings."""
        with patch("app.services.llm_client.settings") as mock_settings:
            mock_settings.llm_provider = "anthropic"
            mock_settings.llm_model = "claude-sonnet-4-5-20250929"
            mock_settings.llm_max_tokens = 4000
            mock_settings.llm_temperature = 0.7
            mock_settings.llm_timeout = 30
            mock_settings.get_llm_api_key.return_value = "test-key"

            client = LLMClient()
            return client

    def test_scores_within_valid_range(self, llm_client_instance):
        """Test that valid scores (0-1) are accepted."""
        valid_scores_response = json.dumps({
            "recommendations": [
                {
                    "headphone_id": "test-id",
                    "rank": 1,
                    "scores": {
                        "overall": 0.0,
                        "genre_match": 0.5,
                        "sound_profile": 1.0,
                        "use_case": 0.25,
                        "budget": 0.75,
                        "feature_match": 0.99,
                    },
                    "explanation": "Test",
                    "personalized_pros": [],
                    "personalized_cons": [],
                    "match_highlights": [],
                }
            ]
        })

        # Should parse without error
        result = llm_client_instance._parse_recommendation_response(valid_scores_response)
        assert result["recommendations"][0]["scores"]["overall"] == 0.0
        assert result["recommendations"][0]["scores"]["sound_profile"] == 1.0

    def test_missing_score_field_raises_error(self, llm_client_instance):
        """Test that missing score field raises LLMException."""
        missing_field = json.dumps({
            "recommendations": [
                {
                    "headphone_id": "test-id",
                    "rank": 1,
                    "scores": {
                        "overall": 0.9,
                        "genre_match": 0.95,
                        # Missing "sound_profile"
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
        })

        with pytest.raises(LLMException) as exc_info:
            llm_client_instance._parse_recommendation_response(missing_field)

        assert "missing required score field" in str(exc_info.value).lower() or "sound_profile" in str(exc_info.value)

    def test_score_out_of_range_raises_error(self, llm_client_instance, malformed_llm_responses):
        """Test that scores outside [0, 1] range raise LLMException."""
        out_of_range = json.dumps(malformed_llm_responses["score_out_of_range"])

        # Should now raise LLMException with validation
        with pytest.raises(LLMException) as exc_info:
            llm_client_instance._parse_recommendation_response(out_of_range)

        # Check error message mentions the out-of-range score
        error_msg = str(exc_info.value)
        assert "must be between 0.0 and 1.0" in error_msg

    def test_negative_score_raises_error(self, llm_client_instance):
        """Test that negative scores raise LLMException."""
        negative_score = json.dumps({
            "recommendations": [
                {
                    "headphone_id": "test-id",
                    "rank": 1,
                    "scores": {
                        "overall": 0.9,
                        "genre_match": -0.1,  # Invalid negative
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
        })

        with pytest.raises(LLMException) as exc_info:
            llm_client_instance._parse_recommendation_response(negative_score)

        assert "genre_match" in str(exc_info.value) or "must be between" in str(exc_info.value)

    def test_non_numeric_score_raises_error(self, llm_client_instance, malformed_llm_responses):
        """Test that non-numeric scores raise LLMException."""
        non_numeric = json.dumps(malformed_llm_responses["non_numeric_score"])

        with pytest.raises(LLMException) as exc_info:
            llm_client_instance._parse_recommendation_response(non_numeric)

        error_msg = str(exc_info.value)
        assert "must be numeric" in error_msg or "overall" in error_msg


class TestLLMClientPromptBuilding:
    """Test prompt construction logic."""

    @pytest.fixture
    def llm_client_instance(self):
        """Create LLM client instance."""
        with patch("app.services.llm_client.settings") as mock_settings:
            mock_settings.llm_provider = "anthropic"
            mock_settings.llm_model = "claude-sonnet-4-5-20250929"
            mock_settings.llm_max_tokens = 4000
            mock_settings.llm_temperature = 0.7
            mock_settings.llm_timeout = 30
            mock_settings.get_llm_api_key.return_value = "test-key"

            return LLMClient()

    def test_build_recommendation_prompt(self, llm_client_instance, sample_user_preference_data):
        """Test that recommendation prompt is built correctly."""
        candidates = [
            {
                "id": "test-id",
                "full_name": "Test Headphone",
                "price_usd": 500,
                "headphone_type": "over_ear",
                "back_type": "open",
                "is_wireless": False,
                "has_anc": False,
                "sound_signature": "neutral",
                "description": "Test description",
                "key_features": ["Feature 1"],
                "target_genres": ["rock"],
            }
        ]

        prompt = llm_client_instance._build_recommendation_prompt(
            user_profile=sample_user_preference_data,
            candidates=candidates,
            top_n=5,
        )

        # Check that key user preferences are in prompt
        assert "rock" in prompt
        assert "electronic" in prompt
        assert "$200 - $600" in prompt
        assert "casual" in prompt.lower()

        # Check that candidate info is included
        assert "Test Headphone" in prompt
        assert "$500" in prompt


class TestLLMClientRetry:
    """Test retry logic and error handling."""

    @pytest.fixture
    def llm_client_instance(self):
        """Create LLM client instance."""
        with patch("app.services.llm_client.settings") as mock_settings:
            mock_settings.llm_provider = "anthropic"
            mock_settings.llm_model = "claude-sonnet-4-5-20250929"
            mock_settings.llm_max_tokens = 4000
            mock_settings.llm_temperature = 0.7
            mock_settings.llm_timeout = 30
            mock_settings.get_llm_api_key.return_value = "test-key"

            return LLMClient()

    @pytest.mark.asyncio
    async def test_retry_on_timeout(self, llm_client_instance):
        """Test that client retries on timeout."""
        import httpx

        with patch.object(llm_client_instance, "_call_anthropic", side_effect=httpx.TimeoutException("Timeout")):
            with pytest.raises(LLMException) as exc_info:
                await llm_client_instance._call_llm_with_retry(
                    prompt="test",
                    system_prompt="test",
                    json_mode=True,
                    max_retries=2,
                )

            assert "timed out" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_retry_exhaustion(self, llm_client_instance):
        """Test that client raises error after max retries."""
        with patch.object(llm_client_instance, "_call_anthropic", side_effect=Exception("API Error")):
            with pytest.raises(Exception):  # Should re-raise the exception
                await llm_client_instance._call_llm_with_retry(
                    prompt="test",
                    system_prompt="test",
                    json_mode=True,
                    max_retries=1,
                )
