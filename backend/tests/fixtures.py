"""
Test fixtures and sample data for evaluation
"""

from typing import Dict, List
from app.models.audio_profile import AudioProfile
from app.models.headphone import (
    Headphone, HeadphoneType, UseCase, SoundProfile, HeadphoneCharacteristics
)


# Sample Spotify tracks for different music tastes
SAMPLE_TRACKS = {
    "bass_head": [
        # Hip-hop & EDM tracks with high energy, danceability
        {
            "track_name": "SICKO MODE",
            "track_artist": "Travis Scott",
            "energy": 0.834,
            "danceability": 0.834,
            "acousticness": 0.0124,
            "valence": 0.448,
            "tempo": 155.008,
            "loudness": -3.714,
            "speechiness": 0.222,
            "instrumentalness": 0.0,
            "liveness": 0.123,
            "track_genre": "hip hop"
        },
        {
            "track_name": "Bangarang",
            "track_artist": "Skrillex",
            "energy": 0.967,
            "danceability": 0.642,
            "acousticness": 0.00146,
            "valence": 0.423,
            "tempo": 110.0,
            "loudness": -3.5,
            "speechiness": 0.138,
            "instrumentalness": 0.789,
            "liveness": 0.324,
            "track_genre": "edm"
        }
    ],
    "audiophile": [
        # Classical & Jazz - acoustic, instrumental
        {
            "track_name": "Clair de Lune",
            "track_artist": "Claude Debussy",
            "energy": 0.0880,
            "danceability": 0.283,
            "acousticness": 0.993,
            "valence": 0.0594,
            "tempo": 68.693,
            "loudness": -25.340,
            "speechiness": 0.0362,
            "instrumentalness": 0.949,
            "liveness": 0.117,
            "track_genre": "classical"
        },
        {
            "track_name": "Take Five",
            "track_artist": "Dave Brubeck",
            "energy": 0.401,
            "danceability": 0.446,
            "acousticness": 0.954,
            "valence": 0.744,
            "tempo": 173.834,
            "loudness": -12.345,
            "speechiness": 0.0456,
            "instrumentalness": 0.912,
            "liveness": 0.234,
            "track_genre": "jazz"
        }
    ],
    "pop_casual": [
        # Modern pop - balanced, energetic
        {
            "track_name": "Blinding Lights",
            "track_artist": "The Weeknd",
            "energy": 0.730,
            "danceability": 0.514,
            "acousticness": 0.00146,
            "valence": 0.334,
            "tempo": 171.038,
            "loudness": -5.934,
            "speechiness": 0.0598,
            "instrumentalness": 0.0,
            "liveness": 0.0897,
            "track_genre": "pop"
        },
        {
            "track_name": "Levitating",
            "track_artist": "Dua Lipa",
            "energy": 0.702,
            "danceability": 0.702,
            "acousticness": 0.0673,
            "valence": 0.915,
            "tempo": 102.977,
            "loudness": -3.787,
            "speechiness": 0.0673,
            "instrumentalness": 0.0,
            "liveness": 0.0729,
            "track_genre": "pop"
        }
    ]
}


# Sample headphones for testing
SAMPLE_HEADPHONES = [
    Headphone(
        headphone_id=1,
        brand="Sony",
        model="WH-1000XM5",
        price=399.99,
        type=HeadphoneType.OVER_EAR,
        use_case=UseCase.CASUAL,
        bass_level="Medium",
        sound_profile=SoundProfile.BALANCED,
        noise_cancellation=True,
        user_rating=4.7,
        user_reviews=15432,
        characteristics=HeadphoneCharacteristics(
            bass_response=0.65,
            mids_response=0.60,
            treble_response=0.60,
            soundstage_width=0.70,
            imaging_quality=0.75,
            warmth=0.55,
            detail_retrieval=0.75,
            isolation=0.90,
            comfort_score=0.85,
            durability_score=0.80
        ),
        full_name="Sony WH-1000XM5",
        slug="sony-wh-1000xm5",
        description="Premium ANC headphones with balanced sound"
    ),
    Headphone(
        headphone_id=2,
        brand="Beats",
        model="Studio3 Wireless",
        price=349.99,
        type=HeadphoneType.OVER_EAR,
        use_case=UseCase.CASUAL,
        bass_level="High",
        sound_profile=SoundProfile.BASS_HEAVY,
        noise_cancellation=True,
        user_rating=4.4,
        user_reviews=8921,
        characteristics=HeadphoneCharacteristics(
            bass_response=0.90,
            mids_response=0.45,
            treble_response=0.45,
            soundstage_width=0.55,
            imaging_quality=0.60,
            warmth=0.75,
            detail_retrieval=0.55,
            isolation=0.85,
            comfort_score=0.75,
            durability_score=0.75
        ),
        full_name="Beats Studio3 Wireless",
        slug="beats-studio3-wireless",
        description="Bass-heavy headphones for hip-hop and EDM"
    ),
    Headphone(
        headphone_id=3,
        brand="Sennheiser",
        model="HD 600",
        price=399.99,
        type=HeadphoneType.OVER_EAR,
        use_case=UseCase.STUDIO,
        bass_level="Low",
        sound_profile=SoundProfile.FLAT,
        noise_cancellation=False,
        user_rating=4.8,
        user_reviews=6234,
        characteristics=HeadphoneCharacteristics(
            bass_response=0.50,
            mids_response=0.50,
            treble_response=0.50,
            soundstage_width=0.85,
            imaging_quality=0.90,
            warmth=0.35,
            detail_retrieval=0.95,
            isolation=0.50,
            comfort_score=0.90,
            durability_score=0.95
        ),
        full_name="Sennheiser HD 600",
        slug="sennheiser-hd-600",
        description="Reference-grade studio headphones with flat response"
    ),
    Headphone(
        headphone_id=4,
        brand="Audio-Technica",
        model="ATH-M50x",
        price=149.99,
        type=HeadphoneType.OVER_EAR,
        use_case=UseCase.STUDIO,
        bass_level="Medium",
        sound_profile=SoundProfile.BALANCED,
        noise_cancellation=False,
        user_rating=4.6,
        user_reviews=23456,
        characteristics=HeadphoneCharacteristics(
            bass_response=0.65,
            mids_response=0.60,
            treble_response=0.60,
            soundstage_width=0.60,
            imaging_quality=0.75,
            warmth=0.50,
            detail_retrieval=0.80,
            isolation=0.60,
            comfort_score=0.70,
            durability_score=0.85
        ),
        full_name="Audio-Technica ATH-M50x",
        slug="audio-technica-ath-m50x",
        description="Professional monitoring headphones with balanced sound"
    ),
    Headphone(
        headphone_id=5,
        brand="Bose",
        model="QuietComfort 45",
        price=329.99,
        type=HeadphoneType.OVER_EAR,
        use_case=UseCase.CASUAL,
        bass_level="Medium",
        sound_profile=SoundProfile.BALANCED,
        noise_cancellation=True,
        user_rating=4.5,
        user_reviews=12789,
        characteristics=HeadphoneCharacteristics(
            bass_response=0.70,
            mids_response=0.60,
            treble_response=0.55,
            soundstage_width=0.65,
            imaging_quality=0.65,
            warmth=0.60,
            detail_retrieval=0.65,
            isolation=0.95,
            comfort_score=0.95,
            durability_score=0.80
        ),
        full_name="Bose QuietComfort 45",
        slug="bose-quietcomfort-45",
        description="Premium comfort with excellent noise cancellation"
    )
]


# Expected recommendations for each persona
EXPECTED_RECOMMENDATIONS = {
    "bass_head": {
        "description": "Loves hip-hop & EDM, wants strong bass",
        "tracks": SAMPLE_TRACKS["bass_head"],
        "preferences": {
            "genres": ["hip_hop", "edm"],
            "primary_use_case": "casual",
            "budget_min": 200,
            "budget_max": 400,
            "anc_required": True
        },
        "expected_profile": {
            "bass_preference": 0.85,  # High
            "mids_preference": 0.45,  # Low
            "treble_preference": 0.50,  # Medium
            "sound_signature": "Bass-forward"
        },
        "expected_top_pick": "Beats Studio3 Wireless",  # Bass-heavy
        "expected_rankings": [2, 1, 5, 4, 3]  # Beats > Sony > Bose > ATH > Sennheiser
    },
    "audiophile": {
        "description": "Classical & jazz lover, wants accuracy",
        "tracks": SAMPLE_TRACKS["audiophile"],
        "preferences": {
            "genres": ["classical", "jazz"],
            "primary_use_case": "studio",
            "budget_min": 300,
            "budget_max": 500,
            "anc_required": False
        },
        "expected_profile": {
            "bass_preference": 0.30,  # Low
            "mids_preference": 0.50,  # Medium
            "treble_preference": 0.50,  # Medium
            "sound_signature": "Analytical"
        },
        "expected_top_pick": "Sennheiser HD 600",  # Flat, studio
        "expected_rankings": [3, 4, 1, 5, 2]  # Sennheiser > ATH > Sony > Bose > Beats
    },
    "pop_casual": {
        "description": "Pop music fan, everyday listening",
        "tracks": SAMPLE_TRACKS["pop_casual"],
        "preferences": {
            "genres": ["pop"],
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 400,
            "anc_required": True
        },
        "expected_profile": {
            "bass_preference": 0.65,  # Medium-high
            "mids_preference": 0.60,  # Medium
            "treble_preference": 0.60,  # Medium
            "sound_signature": "Balanced"
        },
        "expected_top_pick": "Sony WH-1000XM5",  # Balanced, casual, ANC
        "expected_rankings": [1, 5, 2, 4, 3]  # Sony > Bose > Beats > ATH > Sennheiser
    }
}


# Test cases for edge cases
EDGE_CASES = {
    "no_tracks": {
        "description": "User provides genres but no favorite tracks",
        "tracks": [],
        "preferences": {
            "genres": ["rock", "metal"],
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 300
        },
        "should_fallback_to": "genre-based profile"
    },
    "tight_budget": {
        "description": "Very low budget, few matches",
        "tracks": SAMPLE_TRACKS["pop_casual"],
        "preferences": {
            "genres": ["pop"],
            "primary_use_case": "casual",
            "budget_min": 50,
            "budget_max": 100
        },
        "expected_behavior": "Return budget-friendly options or suggest increasing budget"
    },
    "contradictory_prefs": {
        "description": "Manual sliders contradict music taste",
        "tracks": SAMPLE_TRACKS["audiophile"],  # Classical = low bass
        "manual_sliders": {
            "bass": 0.9,  # User manually sets high bass
            "mids": 0.5,
            "treble": 0.5
        },
        "preferences": {
            "genres": ["classical"],
            "primary_use_case": "studio",
            "budget_min": 200,
            "budget_max": 500
        },
        "expected_behavior": "Blend manual preferences with extracted profile (70% manual)"
    },
    "all_requirements": {
        "description": "Strict requirements narrow results",
        "tracks": SAMPLE_TRACKS["pop_casual"],
        "preferences": {
            "genres": ["pop"],
            "primary_use_case": "studio",
            "budget_min": 100,
            "budget_max": 200,
            "anc_required": True,
            "wireless_required": True,
            "preferred_type": "over-ear"
        },
        "expected_behavior": "May return fewer matches or none if too restrictive"
    }
}


def get_sample_recommendation_request(persona: str) -> Dict:
    """
    Generate sample API request for a given persona

    Args:
        persona: One of "bass_head", "audiophile", "pop_casual"

    Returns:
        Dict ready to send to /api/recommendations
    """
    data = EXPECTED_RECOMMENDATIONS[persona]

    return {
        "genres": data["preferences"]["genres"],
        "favorite_tracks": [
            {"name": t["track_name"], "artist": t["track_artist"]}
            for t in data["tracks"]
        ],
        "primary_use_case": data["preferences"]["primary_use_case"],
        "budget_min": data["preferences"]["budget_min"],
        "budget_max": data["preferences"]["budget_max"],
        "anc_required": data["preferences"].get("anc_required", False),
        "wireless_required": data["preferences"].get("wireless_required", False),
        "use_llm_refinement": False  # For deterministic testing
    }
