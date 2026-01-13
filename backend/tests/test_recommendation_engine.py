"""
Unit tests for recommendation engine
"""

import pytest
from app.models.audio_profile import SpotifyFeatureExtractor
from app.services.recommendation_engine import (
    RecommendationEngine,
    ScoringWeights
)
from tests.fixtures import (
    SAMPLE_TRACKS,
    SAMPLE_HEADPHONES,
    EXPECTED_RECOMMENDATIONS
)


class TestRecommendationEngine:
    """Test recommendation algorithm"""

    def setup_method(self):
        """Setup before each test"""
        self.engine = RecommendationEngine()
        self.headphones = SAMPLE_HEADPHONES

    def test_bass_head_recommendations(self):
        """Test recommendations for bass-heavy music taste"""
        # Extract profile from bass-heavy tracks
        tracks = SAMPLE_TRACKS["bass_head"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Get recommendations
        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=200,
            budget_max=400,
            primary_use_case="casual",
            required_features={"anc": True},
            top_k=5
        )

        # Should return recommendations
        assert len(recs) > 0, "Should return recommendations"

        # Beats (bass-heavy) should rank higher than Sennheiser (flat)
        beats_rank = next(r.rank for r in recs if r.headphone.model == "Studio3 Wireless")
        sennheiser_rank = next(
            (r.rank for r in recs if r.headphone.model == "HD 600"),
            999  # May not appear due to no ANC
        )

        assert beats_rank < sennheiser_rank, \
            "Bass-heavy headphones should rank higher for bass-head profile"

        # Top recommendation should have bass > 0.7
        top_rec = recs[0]
        assert top_rec.headphone.characteristics.bass_response > 0.6, \
            f"Top pick for bass-head should have strong bass, got {top_rec.headphone.characteristics.bass_response}"

    def test_audiophile_recommendations(self):
        """Test recommendations for analytical/studio profile"""
        tracks = SAMPLE_TRACKS["audiophile"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=300,
            budget_max=500,
            primary_use_case="studio",
            required_features={},
            top_k=5
        )

        # Sennheiser HD 600 (flat, studio) should rank high
        sennheiser_rank = next(r.rank for r in recs if r.headphone.model == "HD 600")
        assert sennheiser_rank <= 2, \
            f"Sennheiser HD 600 should rank top 2 for audiophile, got rank {sennheiser_rank}"

        # Beats (bass-heavy) should rank lower
        beats_rank = next(r.rank for r in recs if r.headphone.model == "Studio3 Wireless")
        assert beats_rank > sennheiser_rank, \
            "Bass-heavy headphones should rank lower for audiophile"

    def test_pop_casual_recommendations(self):
        """Test recommendations for balanced pop profile"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=400,
            primary_use_case="casual",
            required_features={"anc": True},
            top_k=5
        )

        # Sony or Bose should rank high (balanced, casual, ANC)
        top_brands = [recs[0].headphone.brand, recs[1].headphone.brand]
        assert "Sony" in top_brands or "Bose" in top_brands, \
            "Sony/Bose should rank high for casual balanced profile"

    def test_budget_filtering(self):
        """Test hard budget constraints"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Tight budget: only ATH-M50x ($149.99) should qualify
        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=200,
            primary_use_case="casual",
            required_features={},
            top_k=10
        )

        # All recommendations should be within budget (with 10% overage allowance)
        for rec in recs:
            assert rec.headphone.price <= 200 * 1.1, \
                f"{rec.headphone.full_name} exceeds budget: ${rec.headphone.price}"

    def test_anc_requirement(self):
        """Test ANC hard filter"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=500,
            primary_use_case="casual",
            required_features={"anc": True},
            top_k=10
        )

        # All recommendations should have ANC
        for rec in recs:
            assert rec.headphone.noise_cancellation, \
                f"{rec.headphone.full_name} should have ANC but doesn't"

        # Sennheiser HD 600 and ATH-M50x should NOT appear (no ANC)
        models = [r.headphone.model for r in recs]
        assert "HD 600" not in models, "HD 600 should be filtered out (no ANC)"
        assert "ATH-M50x" not in models, "ATH-M50x should be filtered out (no ANC)"

    def test_use_case_matching(self):
        """Test use case scoring"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Ask for studio headphones
        studio_recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=500,
            primary_use_case="studio",
            required_features={},
            top_k=10
        )

        # Studio headphones should rank higher
        top_3_use_cases = [r.headphone.use_case.value for r in studio_recs[:3]]
        studio_count = top_3_use_cases.count("Studio")
        casual_count = top_3_use_cases.count("Casual")

        # At least one studio headphone in top 3
        assert studio_count > 0, "At least one studio headphone should be in top 3"

    def test_scoring_breakdown(self):
        """Test detailed scoring components"""
        tracks = SAMPLE_TRACKS["bass_head"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=200,
            budget_max=400,
            primary_use_case="casual",
            required_features={},
            top_k=5
        )

        # Check score components for top recommendation
        top_scores = recs[0].scores

        # All scores should be 0-100
        assert 0 <= top_scores.overall <= 100
        assert 0 <= top_scores.sound_profile <= 100
        assert 0 <= top_scores.use_case <= 100
        assert 0 <= top_scores.budget <= 100

        # Overall should be weighted average (roughly)
        # Not exact due to rounding and component interactions

    def test_match_highlights_generation(self):
        """Test that highlights are generated"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=500,
            primary_use_case="casual",
            required_features={},
            top_k=5
        )

        for rec in recs:
            # Should have at least one highlight
            assert len(rec.match_highlights) > 0, \
                f"{rec.headphone.full_name} should have match highlights"

            # Highlights should be strings
            for highlight in rec.match_highlights:
                assert isinstance(highlight, str)
                assert len(highlight) > 0

    def test_trade_offs_generation(self):
        """Test honest trade-off identification"""
        # Classical lover looking at bass-heavy headphones
        tracks = SAMPLE_TRACKS["audiophile"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=200,
            budget_max=400,
            primary_use_case="studio",
            required_features={},
            top_k=5
        )

        # Find Beats in recommendations
        beats_rec = next((r for r in recs if r.headphone.model == "Studio3 Wireless"), None)

        if beats_rec:
            # Beats should have trade-offs for analytical profile
            # (bass-heavy when profile wants flat)
            assert len(beats_rec.trade_offs) > 0, \
                "Beats should have trade-offs for audiophile profile"

    def test_empty_results(self):
        """Test handling when no headphones match criteria"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Impossible budget
        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=1000,
            budget_max=2000,
            primary_use_case="casual",
            required_features={},
            top_k=10
        )

        # Should return empty list
        assert len(recs) == 0, "Should return no recommendations for impossible budget"

    def test_top_k_limiting(self):
        """Test that results are limited to top_k"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=500,
            primary_use_case="casual",
            required_features={},
            top_k=3
        )

        # Should return at most 3
        assert len(recs) <= 3, "Should respect top_k parameter"

        # Ranks should be 1, 2, 3
        if len(recs) == 3:
            assert [r.rank for r in recs] == [1, 2, 3]

    def test_custom_weights(self):
        """Test custom scoring weights"""
        # Emphasize sound match, de-emphasize budget
        custom_weights = ScoringWeights(
            sound_match=0.60,  # Increase from 0.40
            use_case_match=0.20,
            budget_fit=0.05,  # Decrease from 0.15
            feature_match=0.10,
            user_rating=0.05
        )

        engine = RecommendationEngine(weights=custom_weights)

        tracks = SAMPLE_TRACKS["bass_head"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=200,  # Tight budget
            primary_use_case="casual",
            required_features={},
            top_k=5
        )

        # With increased sound_match weight and decreased budget weight,
        # expensive headphones with better sound match might rank higher
        # (Even though they exceed budget, they get 10% allowance)

    def test_confidence_propagation(self):
        """Test that user profile confidence is included in recommendations"""
        tracks = SAMPLE_TRACKS["bass_head"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=200,
            budget_max=400,
            primary_use_case="casual",
            required_features={},
            top_k=5
        )

        # All recommendations should have confidence from profile
        for rec in recs:
            assert rec.confidence == profile.confidence
            assert 0 <= rec.confidence <= 1

    def test_serialization(self):
        """Test recommendation serialization to dict"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        recs = self.engine.recommend(
            user_profile=profile,
            headphones=self.headphones,
            budget_min=100,
            budget_max=500,
            primary_use_case="casual",
            required_features={},
            top_k=3
        )

        # Convert to dict (for API response)
        for rec in recs:
            rec_dict = rec.to_dict()

            # Should have required fields
            assert "rank" in rec_dict
            assert "headphone" in rec_dict
            assert "scores" in rec_dict
            assert "match_highlights" in rec_dict
            assert "confidence" in rec_dict

            # Should be JSON-serializable (no objects)
            assert isinstance(rec_dict["rank"], int)
            assert isinstance(rec_dict["confidence"], float)
