"""
Sonicmatch Backend API
FastAPI server for intelligent headphone recommendations
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import csv
from pathlib import Path

from app.models.audio_profile import AudioProfile, SpotifyFeatureExtractor
from app.models.headphone import Headphone
from app.services.recommendation_engine import (
    RecommendationEngine,
    ScoringWeights
)
from app.services.llm_service import CachedLLMService


# Pydantic models for API
class UserPreferencesRequest(BaseModel):
    """Request model for user preferences"""
    # Music preferences
    genres: List[str] = Field(description="List of favorite genres")
    favorite_artists: Optional[List[str]] = Field(default=[], description="List of favorite artists")
    favorite_tracks: Optional[List[Dict]] = Field(
        default=[],
        description="List of favorite tracks with 'name' and 'artist'"
    )

    # Manual sound preferences (0-1)
    sound_preferences: Optional[Dict[str, float]] = Field(
        default=None,
        description="Manual sliders: bass, mids, treble, soundstage, detail"
    )

    # Context
    primary_use_case: str = Field(description="Main use case: studio, gaming, casual, workout")
    budget_min: float = Field(ge=0, description="Minimum budget in USD")
    budget_max: float = Field(ge=0, description="Maximum budget in USD")

    # Requirements
    anc_required: bool = Field(default=False, description="Require active noise cancellation")
    wireless_required: bool = Field(default=False, description="Require wireless")
    preferred_type: Optional[str] = Field(default=None, description="Preferred type: over-ear, on-ear, in-ear")

    # LLM options
    use_llm_refinement: bool = Field(default=True, description="Use LLM for intelligent refinement")

    class Config:
        json_schema_extra = {
            "example": {
                "genres": ["hip_hop", "r&b", "pop"],
                "favorite_tracks": [
                    {"name": "Blinding Lights", "artist": "The Weeknd"},
                    {"name": "Levitating", "artist": "Dua Lipa"}
                ],
                "sound_preferences": {
                    "bass": 0.8,
                    "mids": 0.6,
                    "treble": 0.5,
                    "soundstage": 0.6,
                    "detail": 0.7
                },
                "primary_use_case": "casual",
                "budget_min": 100,
                "budget_max": 400,
                "anc_required": True,
                "wireless_required": False,
                "use_llm_refinement": True
            }
        }


class RecommendationResponse(BaseModel):
    """Response model for recommendations"""
    recommendations: List[Dict]
    user_profile: Dict
    llm_insights: Optional[Dict] = None
    metadata: Dict


# Initialize FastAPI
app = FastAPI(
    title="Sonicmatch API",
    description="Intelligent headphone recommendation engine",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
headphones_db: List[Headphone] = []
songs_db: List[Dict] = []


@app.on_event("startup")
async def load_data():
    """Load headphones and songs data on startup"""
    global headphones_db, songs_db

    # Load headphones
    headphones_path = Path(__file__).parent.parent.parent / "sonicmatch-frontend" / "sonicmatch-frontend" / "public" / "data" / "headphones.csv"
    if headphones_path.exists():
        with open(headphones_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headphones_db = [Headphone.from_csv_row(row) for row in reader]
        print(f"[OK] Loaded {len(headphones_db)} headphones")
    else:
        print(f"[WARNING] Headphones file not found: {headphones_path}")

    # Load songs (sample for feature extraction)
    songs_path = Path(__file__).parent.parent.parent / "sonicmatch-frontend" / "sonicmatch-frontend" / "public" / "data" / "spotify_songs.csv"
    if songs_path.exists():
        with open(songs_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            # Store first 10000 songs for performance
            songs_db = list(reader)[:10000]
        print(f"[OK] Loaded {len(songs_db)} songs for analysis")
    else:
        print(f"[WARNING] Songs file not found: {songs_path}")


# Dependency injection
def get_recommendation_engine():
    """Get recommendation engine instance"""
    return RecommendationEngine()


def get_llm_service():
    """Get LLM service instance (with caching)"""
    try:
        return CachedLLMService()
    except ValueError as e:
        print(f"⚠️  LLM service not available: {e}")
        return None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Sonicmatch Recommendation API",
        "version": "1.0.0",
        "headphones_loaded": len(headphones_db),
        "songs_loaded": len(songs_db)
    }


@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    request: UserPreferencesRequest,
    engine: RecommendationEngine = Depends(get_recommendation_engine),
    llm_service: Optional[CachedLLMService] = Depends(get_llm_service)
):
    """
    Generate personalized headphone recommendations

    This endpoint:
    1. Extracts audio profile from user's music taste
    2. Runs rule-based recommendation algorithm
    3. Optionally refines with LLM intelligence
    4. Returns ranked recommendations with explanations
    """
    if not headphones_db:
        raise HTTPException(status_code=503, detail="Headphones database not loaded")

    # Step 1: Extract audio profile from favorite tracks
    user_tracks = []
    if request.favorite_tracks:
        # Find tracks in songs database
        for fav in request.favorite_tracks:
            matching_songs = [
                s for s in songs_db
                if (s.get('track_name', '').lower() == fav['name'].lower() and
                    s.get('track_artist', '').lower() == fav['artist'].lower())
            ]
            user_tracks.extend(matching_songs[:1])  # Take first match

    # Extract audio profile from Spotify features
    if user_tracks:
        audio_profile = SpotifyFeatureExtractor.extract_from_tracks(user_tracks)
    else:
        # Fallback to genre-based profile
        audio_profile = SpotifyFeatureExtractor._default_profile()
        audio_profile.genre_weights = {g: 1.0/len(request.genres) for g in request.genres}

    # Enhance with manual preferences if provided
    if request.sound_preferences:
        audio_profile = SpotifyFeatureExtractor.enhance_with_manual_preferences(
            audio_profile,
            request.sound_preferences,
            blend_weight=0.7
        )

    # Step 2: Generate recommendations using algorithm
    required_features = {
        'anc': request.anc_required,
        'wireless': request.wireless_required
    }

    recommendations = engine.recommend(
        user_profile=audio_profile,
        headphones=headphones_db,
        budget_min=request.budget_min,
        budget_max=request.budget_max,
        primary_use_case=request.primary_use_case,
        required_features=required_features,
        top_k=10
    )

    if not recommendations:
        raise HTTPException(
            status_code=404,
            detail="No headphones found matching your criteria. Try relaxing your budget or requirements."
        )

    # Step 3: LLM refinement (optional)
    llm_insights = None
    if request.use_llm_refinement and llm_service:
        try:
            user_context = {
                'use_case': request.primary_use_case,
                'budget_min': request.budget_min,
                'budget_max': request.budget_max,
                'features': required_features
            }

            llm_result = llm_service.refine_recommendations(
                audio_profile,
                user_context,
                recommendations[:5]  # Top 5 for LLM analysis
            )

            llm_insights = llm_result.get('llm_insights')

            # Use LLM-refined recommendations if available
            if 'recommendations' in llm_result:
                # Merge LLM insights back into recommendation objects
                for rec in recommendations:
                    if rec.rank <= 5:
                        rec.explanation = llm_insights.get('top_pick_explanation', '') if rec.rank == 1 else ''

        except Exception as e:
            print(f"LLM refinement failed: {e}")
            # Continue with algorithmic recommendations

    # Format response
    return RecommendationResponse(
        recommendations=[r.to_dict() for r in recommendations],
        user_profile=audio_profile.to_dict(),
        llm_insights=llm_insights,
        metadata={
            'total_candidates': len(headphones_db),
            'matched': len(recommendations),
            'algorithm_version': '1.0',
            'llm_used': llm_insights is not None
        }
    )


@app.post("/api/compare")
async def compare_headphones(
    headphone_ids: List[int],
    user_profile_data: Optional[Dict] = None,
    llm_service: Optional[CachedLLMService] = Depends(get_llm_service)
):
    """
    Compare multiple headphones

    Args:
        headphone_ids: List of headphone IDs to compare
        user_profile_data: Optional user profile for personalized comparison
    """
    if len(headphone_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 headphones to compare")

    # Find headphones
    headphones = [h for h in headphones_db if h.headphone_id in headphone_ids]

    if len(headphones) != len(headphone_ids):
        raise HTTPException(status_code=404, detail="Some headphones not found")

    # Basic comparison
    comparison = {
        'headphones': [h.to_dict() for h in headphones],
        'comparison_table': _build_comparison_table(headphones)
    }

    # LLM-powered comparison if user profile provided
    if user_profile_data and llm_service and len(headphones) == 2:
        try:
            # Reconstruct audio profile
            profile = AudioProfile(**user_profile_data)

            llm_comparison = llm_service.compare_headphones(
                headphones[0],
                headphones[1],
                profile
            )

            comparison['llm_comparison'] = llm_comparison

        except Exception as e:
            print(f"LLM comparison failed: {e}")

    return comparison


@app.get("/api/headphones/{headphone_id}")
async def get_headphone(headphone_id: int):
    """Get details for a specific headphone"""
    headphone = next((h for h in headphones_db if h.headphone_id == headphone_id), None)

    if not headphone:
        raise HTTPException(status_code=404, detail="Headphone not found")

    return headphone.to_dict()


@app.get("/api/headphones")
async def list_headphones(
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    use_case: Optional[str] = None,
    limit: int = 50
):
    """List headphones with optional filters"""
    filtered = headphones_db

    if min_price is not None:
        filtered = [h for h in filtered if h.price >= min_price]

    if max_price is not None:
        filtered = [h for h in filtered if h.price <= max_price]

    if use_case:
        filtered = [h for h in filtered if h.use_case.value.lower() == use_case.lower()]

    return {
        'headphones': [h.to_dict() for h in filtered[:limit]],
        'total': len(filtered)
    }


def _build_comparison_table(headphones: List[Headphone]) -> Dict:
    """Build comparison table for headphones"""
    return {
        'price': [h.price for h in headphones],
        'sound_profile': [h.sound_profile.value for h in headphones],
        'bass_level': [h.bass_level for h in headphones],
        'use_case': [h.use_case.value for h in headphones],
        'anc': [h.noise_cancellation for h in headphones],
        'rating': [h.user_rating for h in headphones],
        'reviews': [h.user_reviews for h in headphones]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
