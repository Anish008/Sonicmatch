"""
Unit tests for audio profile extraction
"""

import pytest
from app.models.audio_profile import AudioProfile, SpotifyFeatureExtractor, SoundSignature
from tests.fixtures import SAMPLE_TRACKS


class TestSpotifyFeatureExtractor:
    """Test feature extraction from Spotify data"""

    def test_bass_head_extraction(self):
        """Test bass-heavy music profile extraction"""
        tracks = SAMPLE_TRACKS["bass_head"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Bass-heavy genres should result in high bass preference
        assert profile.bass_preference > 0.7, "Hip-hop/EDM should extract high bass"
        assert profile.energy_level > 0.7, "High-energy music should extract high energy"
        assert profile.confidence > 0, "Should have confidence score"

        # Sound signature should be bass-forward or warm
        sig = profile.get_sound_signature()
        assert sig in [SoundSignature.BASS_FORWARD, SoundSignature.WARM], \
            f"Expected bass-forward/warm, got {sig}"

    def test_audiophile_extraction(self):
        """Test analytical music profile extraction"""
        tracks = SAMPLE_TRACKS["audiophile"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Classical/jazz should result in balanced/analytical profile
        assert profile.bass_preference < 0.6, "Classical should extract lower bass preference"
        assert profile.soundstage_width > 0.6, "Acoustic music should value soundstage"
        assert profile.warmth < 0.6, "Classical should lean analytical"

        sig = profile.get_sound_signature()
        assert sig in [SoundSignature.ANALYTICAL, SoundSignature.BALANCED], \
            f"Expected analytical/balanced, got {sig}"

    def test_pop_casual_extraction(self):
        """Test balanced pop profile extraction"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Pop should be balanced
        assert 0.5 < profile.bass_preference < 0.8, "Pop should have moderate bass"
        assert 0.5 < profile.mids_preference < 0.7, "Pop should emphasize mids"
        assert profile.energy_level > 0.6, "Modern pop is energetic"

    def test_empty_tracks(self):
        """Test fallback when no tracks provided"""
        profile = SpotifyFeatureExtractor.extract_from_tracks([])

        # Should return default profile
        assert profile.bass_preference == 0.5
        assert profile.mids_preference == 0.5
        assert profile.treble_preference == 0.5
        assert profile.confidence == 0.0, "No tracks = zero confidence"

    def test_single_track(self):
        """Test extraction with single track"""
        tracks = [SAMPLE_TRACKS["bass_head"][0]]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Should work but with lower confidence
        assert 0 < profile.confidence < 0.5, "Single track = low confidence"
        assert profile.bass_preference > 0, "Should extract some preferences"

    def test_manual_preference_blending(self):
        """Test blending extracted profile with manual sliders"""
        tracks = SAMPLE_TRACKS["audiophile"]
        auto_profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Classical music = low bass, but user manually sets high bass
        manual_prefs = {
            "bass": 0.9,
            "mids": 0.5,
            "treble": 0.5,
            "soundstage": 0.7,
            "detail": 0.8
        }

        blended = SpotifyFeatureExtractor.enhance_with_manual_preferences(
            auto_profile,
            manual_prefs,
            blend_weight=0.7  # 70% manual, 30% auto
        )

        # Blended bass should be between auto (low) and manual (high)
        assert auto_profile.bass_preference < blended.bass_preference < manual_prefs["bass"], \
            "Blended bass should be between auto and manual"

        # Should lean towards manual (70%)
        expected = auto_profile.bass_preference * 0.3 + manual_prefs["bass"] * 0.7
        assert abs(blended.bass_preference - expected) < 0.05, "Blend weights incorrect"

    def test_genre_weights_extraction(self):
        """Test genre weight calculation"""
        tracks = SAMPLE_TRACKS["bass_head"]  # Hip-hop & EDM
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        # Should identify hip-hop and EDM as primary genres
        assert "hip hop" in profile.genre_weights or "hip_hop" in profile.genre_weights
        assert sum(profile.genre_weights.values()) > 0, "Should have genre weights"

    def test_confidence_calculation(self):
        """Test confidence scoring based on data quality"""
        # More tracks = higher confidence
        tracks_2 = SAMPLE_TRACKS["bass_head"][:2]
        tracks_5 = SAMPLE_TRACKS["bass_head"] * 3  # Simulate 6 tracks

        profile_2 = SpotifyFeatureExtractor.extract_from_tracks(tracks_2)
        profile_5 = SpotifyFeatureExtractor.extract_from_tracks(tracks_5[:5])

        # 5 tracks should have higher confidence than 2
        assert profile_5.confidence > profile_2.confidence, \
            "More tracks should increase confidence"

    def test_sound_signature_classification(self):
        """Test sound signature classification logic"""
        # Create profiles for each signature
        bass_forward = AudioProfile(
            bass_preference=0.85,
            mids_preference=0.5,
            treble_preference=0.5,
            soundstage_width=0.5,
            imaging_precision=0.5,
            warmth=0.6,
            energy_level=0.7,
            genre_weights={"hip_hop": 1.0},
            confidence=0.8
        )

        analytical = AudioProfile(
            bass_preference=0.45,
            mids_preference=0.5,
            treble_preference=0.5,
            soundstage_width=0.8,
            imaging_precision=0.8,
            warmth=0.3,
            energy_level=0.4,
            genre_weights={"classical": 1.0},
            confidence=0.8
        )

        bright = AudioProfile(
            bass_preference=0.4,
            mids_preference=0.5,
            treble_preference=0.8,
            soundstage_width=0.6,
            imaging_precision=0.6,
            warmth=0.4,
            energy_level=0.6,
            genre_weights={"pop": 1.0},
            confidence=0.8
        )

        assert bass_forward.get_sound_signature() == SoundSignature.BASS_FORWARD
        assert analytical.get_sound_signature() == SoundSignature.ANALYTICAL
        assert bright.get_sound_signature() == SoundSignature.BRIGHT

    def test_to_dict_serialization(self):
        """Test profile serialization for API responses"""
        tracks = SAMPLE_TRACKS["pop_casual"]
        profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

        profile_dict = profile.to_dict()

        # Should contain all required fields
        assert "bass_preference" in profile_dict
        assert "sound_signature" in profile_dict
        assert "genre_weights" in profile_dict
        assert "confidence" in profile_dict

        # Values should be serializable (not objects)
        assert isinstance(profile_dict["bass_preference"], float)
        assert isinstance(profile_dict["sound_signature"], str)
        assert isinstance(profile_dict["confidence"], float)
