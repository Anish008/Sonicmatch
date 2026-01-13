"""
Audio Profile Feature Engineering
Converts Spotify audio features into interpretable headphone preference vectors
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
import numpy as np
from enum import Enum


class SoundCharacteristic(Enum):
    """Sound characteristics that map to headphone tuning"""
    BASS_HEAVY = "bass_heavy"
    BALANCED = "balanced"
    ANALYTICAL = "analytical"
    WARM = "warm"
    BRIGHT = "bright"
    DARK = "dark"


@dataclass
class AudioProfile:
    """
    Unified audio preference profile derived from user's music taste
    All values normalized 0-1
    """
    # Frequency response preferences
    bass_preference: float  # 0=neutral, 1=bass-head
    mids_preference: float  # Vocal/instrument clarity importance
    treble_preference: float  # Detail/sparkle preference

    # Soundstage & imaging
    soundstage_width: float  # Spatial preference (0=intimate, 1=expansive)
    imaging_precision: float  # Instrument separation importance

    # Tonal balance
    warmth: float  # 0=neutral/analytical, 1=warm/smooth
    brightness: float  # 0=laid-back, 1=energetic/forward

    # Dynamic characteristics
    energy_level: float  # Music energy level
    dynamic_range: float  # Preference for dynamic contrast

    # Genre-specific weights
    genre_weights: Dict[str, float]

    # Confidence scores
    confidence: float = 1.0  # How much data we have

    def to_dict(self) -> Dict:
        return {
            'bass': self.bass_preference,
            'mids': self.mids_preference,
            'treble': self.treble_preference,
            'soundstage': self.soundstage_width,
            'imaging': self.imaging_precision,
            'warmth': self.warmth,
            'brightness': self.brightness,
            'energy': self.energy_level,
            'dynamics': self.dynamic_range,
            'genres': self.genre_weights,
            'confidence': self.confidence
        }

    def get_sound_signature(self) -> SoundCharacteristic:
        """Classify overall preference into sound signature"""
        if self.bass_preference > 0.7:
            return SoundCharacteristic.BASS_HEAVY
        elif self.warmth > 0.6 and self.brightness < 0.4:
            return SoundCharacteristic.WARM
        elif self.brightness > 0.6 and self.warmth < 0.4:
            return SoundCharacteristic.BRIGHT
        elif self.treble_preference > 0.7 and self.imaging_precision > 0.7:
            return SoundCharacteristic.ANALYTICAL
        else:
            return SoundCharacteristic.BALANCED


class SpotifyFeatureExtractor:
    """
    Extracts audio profile from Spotify audio features

    Spotify Features Used:
    - danceability: rhythmic stability, beat strength
    - energy: intensity and activity
    - acousticness: acoustic vs electronic
    - instrumentalness: vocal vs instrumental
    - valence: musical positiveness
    - tempo: BPM
    - loudness: overall loudness in dB
    """

    # Genre to sound profile mappings (based on audio research)
    GENRE_PROFILES = {
        'edm': {'bass': 0.9, 'energy': 0.9, 'brightness': 0.8},
        'hip_hop': {'bass': 0.95, 'energy': 0.7, 'warmth': 0.6},
        'classical': {'soundstage': 0.95, 'imaging': 0.9, 'dynamics': 0.9},
        'jazz': {'soundstage': 0.8, 'imaging': 0.85, 'mids': 0.8},
        'rock': {'energy': 0.8, 'mids': 0.7, 'dynamics': 0.75},
        'metal': {'bass': 0.7, 'energy': 0.95, 'brightness': 0.7},
        'pop': {'bass': 0.6, 'energy': 0.6, 'balanced': True},
        'r&b': {'bass': 0.75, 'warmth': 0.8, 'mids': 0.75},
        'electronic': {'bass': 0.8, 'soundstage': 0.7, 'brightness': 0.7},
        'acoustic': {'mids': 0.85, 'warmth': 0.7, 'imaging': 0.75},
        'indie': {'mids': 0.7, 'soundstage': 0.6, 'balanced': True},
    }

    @staticmethod
    def extract_from_tracks(tracks: List[Dict]) -> AudioProfile:
        """
        Extract audio profile from list of Spotify tracks

        Args:
            tracks: List of dicts with Spotify audio features

        Returns:
            AudioProfile with user's inferred preferences
        """
        if not tracks:
            return SpotifyFeatureExtractor._default_profile()

        # Aggregate features
        features = {
            'danceability': [],
            'energy': [],
            'acousticness': [],
            'instrumentalness': [],
            'valence': [],
            'tempo': [],
            'loudness': [],
            'speechiness': []
        }

        genres = {}

        for track in tracks:
            for key in features.keys():
                if key in track and track[key] is not None:
                    features[key].append(float(track[key]))

            # Track genres
            if 'playlist_genre' in track:
                genre = track['playlist_genre'].lower()
                genres[genre] = genres.get(genre, 0) + 1

        # Calculate averages
        avg_features = {
            k: np.mean(v) if v else 0.5
            for k, v in features.items()
        }

        # Normalize genre weights
        total_tracks = len(tracks)
        genre_weights = {
            g: count / total_tracks
            for g, count in genres.items()
        }

        # Map to audio profile
        return SpotifyFeatureExtractor._map_to_profile(avg_features, genre_weights, len(tracks))

    @staticmethod
    def _map_to_profile(features: Dict, genres: Dict[str, float], track_count: int) -> AudioProfile:
        """Map Spotify features to AudioProfile"""

        # Bass: High energy + high danceability + low acousticness
        bass_pref = (
            features['energy'] * 0.4 +
            features['danceability'] * 0.4 +
            (1 - features['acousticness']) * 0.2
        )

        # Mids: Low instrumentalness (vocals) + mid-range acousticness
        mids_pref = (
            (1 - features['instrumentalness']) * 0.6 +
            features['acousticness'] * 0.4
        )

        # Treble: High energy + high valence (brightness)
        treble_pref = (
            features['energy'] * 0.5 +
            features['valence'] * 0.3 +
            (1 - features['acousticness']) * 0.2
        )

        # Soundstage: Acousticness + instrumentalness
        soundstage = (
            features['acousticness'] * 0.6 +
            features['instrumentalness'] * 0.4
        )

        # Imaging: Inverse of loudness (compressed music = less imaging need)
        # Normalize loudness from typical range [-60, 0] dB
        normalized_loudness = (features['loudness'] + 60) / 60
        imaging = 1 - (normalized_loudness * 0.5)  # Less compression = more imaging need

        # Warmth: Low energy + high valence + acousticness
        warmth = (
            (1 - features['energy']) * 0.3 +
            features['valence'] * 0.3 +
            features['acousticness'] * 0.4
        )

        # Brightness: High energy + high valence
        brightness = (
            features['energy'] * 0.6 +
            features['valence'] * 0.4
        )

        # Energy: Direct mapping
        energy_level = features['energy']

        # Dynamic range: Inverse of loudness + acousticness
        dynamic_range = (
            (1 - normalized_loudness) * 0.6 +
            features['acousticness'] * 0.4
        )

        # Confidence based on track count
        confidence = min(1.0, track_count / 20)  # Full confidence at 20+ tracks

        return AudioProfile(
            bass_preference=np.clip(bass_pref, 0, 1),
            mids_preference=np.clip(mids_pref, 0, 1),
            treble_preference=np.clip(treble_pref, 0, 1),
            soundstage_width=np.clip(soundstage, 0, 1),
            imaging_precision=np.clip(imaging, 0, 1),
            warmth=np.clip(warmth, 0, 1),
            brightness=np.clip(brightness, 0, 1),
            energy_level=energy_level,
            dynamic_range=np.clip(dynamic_range, 0, 1),
            genre_weights=genres,
            confidence=confidence
        )

    @staticmethod
    def _default_profile() -> AudioProfile:
        """Default neutral profile"""
        return AudioProfile(
            bass_preference=0.5,
            mids_preference=0.5,
            treble_preference=0.5,
            soundstage_width=0.5,
            imaging_precision=0.5,
            warmth=0.5,
            brightness=0.5,
            energy_level=0.5,
            dynamic_range=0.5,
            genre_weights={},
            confidence=0.0
        )

    @staticmethod
    def enhance_with_manual_preferences(
        profile: AudioProfile,
        manual_prefs: Dict[str, float],
        blend_weight: float = 0.7
    ) -> AudioProfile:
        """
        Blend extracted profile with user's manual slider adjustments

        Args:
            profile: Extracted AudioProfile
            manual_prefs: Dict with 'bass', 'mids', 'treble', etc.
            blend_weight: Weight for manual prefs (0-1), default 0.7 = 70% manual
        """
        return AudioProfile(
            bass_preference=blend_weight * manual_prefs.get('bass', profile.bass_preference) +
                          (1 - blend_weight) * profile.bass_preference,
            mids_preference=blend_weight * manual_prefs.get('mids', profile.mids_preference) +
                          (1 - blend_weight) * profile.mids_preference,
            treble_preference=blend_weight * manual_prefs.get('treble', profile.treble_preference) +
                            (1 - blend_weight) * profile.treble_preference,
            soundstage_width=blend_weight * manual_prefs.get('soundstage', profile.soundstage_width) +
                           (1 - blend_weight) * profile.soundstage_width,
            imaging_precision=profile.imaging_precision,  # Keep calculated
            warmth=profile.warmth,  # Keep calculated
            brightness=profile.brightness,  # Keep calculated
            energy_level=profile.energy_level,
            dynamic_range=profile.dynamic_range,
            genre_weights=profile.genre_weights,
            confidence=max(profile.confidence, 0.8)  # Boost confidence with manual input
        )
