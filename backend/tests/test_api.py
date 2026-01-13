"""
Integration tests for FastAPI endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from app.main import app
from tests.fixtures import (
    SAMPLE_TRACKS,
    SAMPLE_HEADPHONES,
    get_sample_recommendation_request
)


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_data():
    """Mock database with sample headphones"""
    with patch("app.main.headphones_db", SAMPLE_HEADPHONES), \
         patch("app.main.songs_db", SAMPLE_TRACKS["bass_head"] + SAMPLE_TRACKS["audiophile"] + SAMPLE_TRACKS["pop_casual"]):
        yield


class TestHealthEndpoint:
    """Test health check endpoint"""

    def test_root_endpoint(self, client, mock_data):
        """Test GET / health check"""
        response = client.get("/")

        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "online"
        assert "headphones_loaded" in data
        assert "songs_loaded" in data
        assert data["headphones_loaded"] == len(SAMPLE_HEADPHONES)


class TestRecommendationsEndpoint:
    """Test main recommendations endpoint"""

    def test_bass_head_recommendations(self, client, mock_data):
        """Test recommendations for bass-heavy profile"""
        request_data = get_sample_recommendation_request("bass_head")

        response = client.post("/api/recommendations", json=request_data)

        assert response.status_code == 200

        data = response.json()

        # Should have recommendations
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0

        # Should have user profile
        assert "user_profile" in data
        profile = data["user_profile"]
        assert "bass_preference" in profile
        assert profile["bass_preference"] > 0.7  # Bass-heavy profile

        # Should have metadata
        assert "metadata" in data
        assert "matched" in data["metadata"]

        # Top recommendation should be suitable for bass-heads
        top_rec = data["recommendations"][0]
        assert top_rec["rank"] == 1
        assert "headphone" in top_rec
        assert "scores" in top_rec

    def test_audiophile_recommendations(self, client, mock_data):
        """Test recommendations for analytical profile"""
        request_data = get_sample_recommendation_request("audiophile")

        response = client.post("/api/recommendations", json=request_data)

        assert response.status_code == 200

        data = response.json()
        profile = data["user_profile"]

        # Should extract analytical profile
        assert profile["bass_preference"] < 0.6  # Lower bass
        assert "sound_signature" in profile

    def test_pop_casual_recommendations(self, client, mock_data):
        """Test recommendations for balanced profile"""
        request_data = get_sample_recommendation_request("pop_casual")

        response = client.post("/api/recommendations", json=request_data)

        assert response.status_code == 200

        data = response.json()

        # Should return balanced recommendations
        assert len(data["recommendations"]) > 0

    def test_no_favorite_tracks(self, client, mock_data):
        """Test with only genres, no tracks"""
        request_data = {
            "genres": ["rock", "metal"],
            "favorite_tracks": [],
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 400,
            "use_llm_refinement": False
        }

        response = client.post("/api/recommendations", json=request_data)

        # Should still work with genre-based profile
        assert response.status_code == 200

        data = response.json()
        assert len(data["recommendations"]) > 0

    def test_manual_sound_preferences(self, client, mock_data):
        """Test with manual sliders"""
        request_data = {
            "genres": ["pop"],
            "favorite_tracks": [],
            "sound_preferences": {
                "bass": 0.9,
                "mids": 0.6,
                "treble": 0.5,
                "soundstage": 0.7,
                "detail": 0.8
            },
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 400,
            "use_llm_refinement": False
        }

        response = client.post("/api/recommendations", json=request_data)

        assert response.status_code == 200

        data = response.json()
        profile = data["user_profile"]

        # Manual bass preference should be reflected
        assert profile["bass_preference"] > 0.7

    def test_strict_requirements(self, client, mock_data):
        """Test with ANC and budget requirements"""
        request_data = {
            "genres": ["pop"],
            "favorite_tracks": [
                {"name": "Blinding Lights", "artist": "The Weeknd"}
            ],
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 200,
            "anc_required": True,
            "wireless_required": False,
            "use_llm_refinement": False
        }

        response = client.post("/api/recommendations", json=request_data)

        # Might return fewer results due to strict constraints
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            # All returned headphones should have ANC
            for rec in data["recommendations"]:
                assert rec["headphone"]["has_anc"] is True

    def test_impossible_budget(self, client, mock_data):
        """Test with budget that matches no headphones"""
        request_data = {
            "genres": ["pop"],
            "favorite_tracks": [],
            "primary_use_case": "casual",
            "budget_min": 2000,
            "budget_max": 3000,
            "use_llm_refinement": False
        }

        response = client.post("/api/recommendations", json=request_data)

        # Should return 404 with helpful message
        assert response.status_code == 404
        assert "detail" in response.json()

    def test_llm_refinement_disabled(self, client, mock_data):
        """Test with LLM refinement explicitly disabled"""
        request_data = get_sample_recommendation_request("pop_casual")
        request_data["use_llm_refinement"] = False

        response = client.post("/api/recommendations", json=request_data)

        assert response.status_code == 200

        data = response.json()

        # Should not have LLM insights
        assert data.get("llm_insights") is None

        # Metadata should indicate LLM not used
        assert data["metadata"]["llm_used"] is False

    @patch("app.main.get_llm_service")
    def test_llm_refinement_enabled(self, mock_llm_service, client, mock_data):
        """Test with LLM refinement enabled"""
        # Mock LLM service
        mock_service = Mock()
        mock_service.refine_recommendations.return_value = {
            "recommendations": [],
            "llm_insights": {
                "top_pick_explanation": "Great for bass",
                "key_insights": ["Strong bass"],
                "alternatives": {}
            }
        }
        mock_llm_service.return_value = mock_service

        request_data = get_sample_recommendation_request("bass_head")
        request_data["use_llm_refinement"] = True

        response = client.post("/api/recommendations", json=request_data)

        assert response.status_code == 200

        data = response.json()

        # Should have LLM insights
        assert data.get("llm_insights") is not None

    def test_missing_required_fields(self, client, mock_data):
        """Test validation errors for missing fields"""
        # Missing genres
        request_data = {
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 400
        }

        response = client.post("/api/recommendations", json=request_data)

        # Should return validation error
        assert response.status_code == 422

    def test_invalid_budget_range(self, client, mock_data):
        """Test validation for invalid budget"""
        request_data = {
            "genres": ["pop"],
            "primary_use_case": "casual",
            "budget_min": 500,
            "budget_max": 100,  # Max < Min
            "use_llm_refinement": False
        }

        response = client.post("/api/recommendations", json=request_data)

        # Should still process but return no results
        # (This is a business logic issue, not a validation error)
        assert response.status_code in [200, 404]


class TestCompareEndpoint:
    """Test headphone comparison endpoint"""

    def test_compare_two_headphones(self, client, mock_data):
        """Test basic comparison"""
        request_data = {
            "headphone_ids": [1, 2],  # Sony vs Beats
            "user_profile_data": None
        }

        response = client.post("/api/compare", json=request_data)

        assert response.status_code == 200

        data = response.json()
        assert "headphones" in data
        assert len(data["headphones"]) == 2
        assert "comparison_table" in data

    def test_compare_with_profile(self, client, mock_data):
        """Test comparison with user profile"""
        request_data = {
            "headphone_ids": [1, 2],
            "user_profile_data": {
                "bass_preference": 0.8,
                "mids_preference": 0.6,
                "treble_preference": 0.5,
                "soundstage_width": 0.6,
                "imaging_precision": 0.6,
                "warmth": 0.6,
                "energy_level": 0.7,
                "genre_weights": {"hip_hop": 1.0},
                "confidence": 0.8
            }
        }

        response = client.post("/api/compare", json=request_data)

        assert response.status_code == 200

    def test_compare_insufficient_headphones(self, client, mock_data):
        """Test comparison with only one headphone"""
        request_data = {
            "headphone_ids": [1]
        }

        response = client.post("/api/compare", json=request_data)

        # Should return error
        assert response.status_code == 400

    def test_compare_nonexistent_headphones(self, client, mock_data):
        """Test comparison with invalid IDs"""
        request_data = {
            "headphone_ids": [999, 1000]
        }

        response = client.post("/api/compare", json=request_data)

        # Should return 404
        assert response.status_code == 404


class TestHeadphoneEndpoints:
    """Test individual headphone endpoints"""

    def test_get_headphone_by_id(self, client, mock_data):
        """Test GET /api/headphones/{id}"""
        response = client.get("/api/headphones/1")

        assert response.status_code == 200

        data = response.json()
        assert data["id"] == 1
        assert "brand" in data
        assert "model" in data
        assert "characteristics" in data

    def test_get_nonexistent_headphone(self, client, mock_data):
        """Test 404 for missing headphone"""
        response = client.get("/api/headphones/999")

        assert response.status_code == 404

    def test_list_headphones(self, client, mock_data):
        """Test GET /api/headphones"""
        response = client.get("/api/headphones")

        assert response.status_code == 200

        data = response.json()
        assert "headphones" in data
        assert "total" in data
        assert len(data["headphones"]) <= 50  # Default limit

    def test_list_headphones_with_filters(self, client, mock_data):
        """Test listing with price filters"""
        response = client.get("/api/headphones?min_price=200&max_price=400")

        assert response.status_code == 200

        data = response.json()

        # All results should be within price range
        for hp in data["headphones"]:
            assert 200 <= hp["price"] <= 400

    def test_list_headphones_by_use_case(self, client, mock_data):
        """Test filtering by use case"""
        response = client.get("/api/headphones?use_case=studio")

        assert response.status_code == 200

        data = response.json()

        # All results should be studio headphones
        for hp in data["headphones"]:
            assert hp["use_case"].lower() == "studio"

    def test_list_headphones_with_limit(self, client, mock_data):
        """Test result limiting"""
        response = client.get("/api/headphones?limit=2")

        assert response.status_code == 200

        data = response.json()
        assert len(data["headphones"]) <= 2


class TestCORS:
    """Test CORS configuration"""

    def test_cors_headers_present(self, client, mock_data):
        """Test that CORS headers are set"""
        # Preflight request
        response = client.options(
            "/api/recommendations",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST"
            }
        )

        # Should allow CORS
        assert "access-control-allow-origin" in response.headers
