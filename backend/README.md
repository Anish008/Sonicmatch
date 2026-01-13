# Sonicmatch Backend - Intelligent Recommendation Engine

Hybrid ML + LLM-powered headphone recommendation system using music taste analysis.

## Architecture

**3-Layer Intelligence:**
1. **Feature Engineering**: Extracts audio profile from Spotify track features
2. **Rule-Based Algorithm**: Weighted scoring with similarity matching (0-100 scale)
3. **LLM Refinement**: Claude API for contextual intelligence and explanations

## Setup

### Prerequisites
- Python 3.10+
- Anthropic API key (for LLM features)

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

Or set as environment variable:
```bash
# Windows
set ANTHROPIC_API_KEY=your_api_key_here

# macOS/Linux
export ANTHROPIC_API_KEY=your_api_key_here
```

### Data Files

The backend expects CSV files at:
- `../sonicmatch-frontend/sonicmatch-frontend/public/data/headphones.csv`
- `../sonicmatch-frontend/sonicmatch-frontend/public/data/spotify_songs.csv`

Update paths in `app/main.py` lines 112 and 122 if your data is located elsewhere.

## Running the Server

```bash
# Development (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Server will be available at: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Health Check
```
GET /
```

Returns server status and loaded data counts.

### Get Recommendations
```
POST /api/recommendations
```

**Request Body:**
```json
{
  "genres": ["hip_hop", "r&b", "pop"],
  "favorite_artists": ["The Weeknd", "Dua Lipa"],
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
  "anc_required": true,
  "wireless_required": false,
  "use_llm_refinement": true
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "rank": 1,
      "headphone": {
        "id": 123,
        "brand": "Sony",
        "model": "WH-1000XM5",
        "price": 399.99,
        "sound_profile": "Balanced",
        "rating": 4.7
      },
      "scores": {
        "overall": 87.5,
        "sound_profile": 92.0,
        "use_case": 100.0
      },
      "match_highlights": [
        "Excellent balanced sound signature match",
        "Strong bass response matches your preference",
        "Highly rated: 4.7/5"
      ],
      "trade_offs": [],
      "confidence": 0.85
    }
  ],
  "user_profile": {
    "bass_preference": 0.82,
    "mids_preference": 0.65,
    "treble_preference": 0.58,
    "sound_signature": "Warm/Bass-forward"
  },
  "llm_insights": {
    "top_pick_explanation": "The Sony WH-1000XM5 excels with hip-hop and R&B...",
    "key_insights": [
      "Strong sub-bass extension (20-60Hz) for hip-hop production",
      "Wide soundstage benefits pop's layered production"
    ]
  },
  "metadata": {
    "total_candidates": 150,
    "matched": 10,
    "llm_used": true
  }
}
```

### Compare Headphones
```
POST /api/compare
```

**Request Body:**
```json
{
  "headphone_ids": [123, 456],
  "user_profile_data": {
    "bass_preference": 0.8,
    "mids_preference": 0.6,
    "treble_preference": 0.5
  }
}
```

### Get Headphone Details
```
GET /api/headphones/{headphone_id}
```

### List Headphones
```
GET /api/headphones?min_price=100&max_price=500&use_case=casual&limit=50
```

## How It Works

### 1. Feature Engineering (`app/models/audio_profile.py`)

Extracts audio profile from Spotify features:

**Spotify Feature → Audio Preference Mapping:**
- **Bass**: High energy + danceability + low acousticness
- **Mids**: Moderate energy + speechiness
- **Treble**: High energy + low acousticness
- **Soundstage**: Acousticness + instrumentalness
- **Warmth**: High valence + low acousticness
- **Imaging**: Instrumentalness

### 2. Headphone Modeling (`app/models/headphone.py`)

Derives normalized audio characteristics (0-1) from headphone specs:
- Frequency response (bass/mids/treble)
- Soundstage width & imaging quality
- Warmth vs analytical signature
- Comfort, isolation, durability

### 3. Recommendation Algorithm (`app/services/recommendation_engine.py`)

**Weighted Scoring (0-100):**
- Sound Match: 40% - Weighted Euclidean distance in 5D audio space
- Use Case: 20% - Primary usage alignment
- Budget Fit: 15% - Prefers mid-range of budget
- Features: 15% - ANC, wireless, type
- Rating: 10% - Community validation

**Hard Filters:**
- Budget (allows 10% overage)
- Required features (ANC, wireless)

### 4. LLM Refinement (`app/services/llm_service.py`)

Claude API enhances recommendations with:
- Contextual re-ranking based on genre-specific needs
- Technical explanations (frequency ranges, tuning philosophy)
- Honest trade-off analysis
- Alternative suggestions (upgrade, value, specialist picks)

**Prompt Engineering:**
- System: Audio engineer persona with psychoacoustics expertise
- Context: User's music profile + algorithmic recommendations
- Output: JSON with ranking, explanations, insights

## Configuration

### Scoring Weights

Customize in `app/services/recommendation_engine.py`:

```python
@dataclass
class ScoringWeights:
    sound_match: float = 0.40
    use_case_match: float = 0.20
    budget_fit: float = 0.15
    feature_match: float = 0.15
    user_rating: float = 0.10
```

### LLM Model

Change in `app/services/llm_service.py`:

```python
self.model = "claude-3-5-sonnet-20241022"  # Latest model
```

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

## Frontend Integration

### From Next.js Frontend

```typescript
const response = await fetch('http://localhost:8000/api/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    genres: userPreferences.genres,
    favorite_tracks: userPreferences.favoriteTracks,
    sound_preferences: {
      bass: userPreferences.bass,
      mids: userPreferences.mids,
      treble: userPreferences.treble,
      soundstage: userPreferences.soundstage,
      detail: userPreferences.detail,
    },
    primary_use_case: userPreferences.primaryUse,
    budget_min: userPreferences.budgetMin,
    budget_max: userPreferences.budgetMax,
    anc_required: userPreferences.ancRequired,
    wireless_required: userPreferences.wirelessRequired,
    use_llm_refinement: true,
  }),
});

const data = await response.json();
```

### Update CORS Origins

In `app/main.py`, update allowed origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Performance Considerations

- **LLM Caching**: `CachedLLMService` reduces API costs by caching explanations
- **Data Loading**: CSV files loaded once on startup
- **Async Operations**: FastAPI uses async for concurrent requests
- **Token Limits**: LLM prompts kept under 2000 output tokens

## Cost Estimation

**Claude API Usage (per recommendation):**
- Input: ~1500 tokens (user profile + top 5 headphones)
- Output: ~500 tokens (JSON response)
- Cost: ~$0.02 per recommendation (Claude 3.5 Sonnet)

**Optimization:**
- Use caching for repeated queries
- Set `use_llm_refinement: false` for cost-sensitive scenarios
- Algorithm-only mode still provides quality recommendations

## Troubleshooting

**LLM service not available:**
- Check `ANTHROPIC_API_KEY` is set
- Verify API key is valid
- System continues with algorithm-only mode if LLM fails

**Data files not found:**
- Check paths in `app/main.py` lines 112, 122
- Ensure CSV files exist and are readable
- Check file encoding is UTF-8

**No recommendations returned:**
- Relax budget constraints
- Remove hard requirements (ANC, wireless)
- Check headphones.csv has matching entries

## Architecture Decisions

### Why Hybrid (Algorithm + LLM)?

1. **Consistency**: Rule-based algorithm provides deterministic baseline
2. **Intelligence**: LLM adds contextual reasoning and explanations
3. **Cost Control**: Algorithm runs first, LLM only refines top results
4. **Fallback**: System works without LLM if API unavailable

### Why Euclidean Distance?

Audio preferences form a continuous space where:
- Similar sound signatures cluster together
- Distance = dissimilarity
- Weighted dimensions (bass 1.5x) reflect importance

### Why Separate Feature Engineering?

- **Transparency**: Clear mapping from Spotify → Audio profile
- **Testability**: Each step can be validated independently
- **Flexibility**: Easy to adjust weights or add new features

## Future Enhancements

- [ ] Add collaborative filtering (user-user similarity)
- [ ] Implement A/B testing framework for scoring weights
- [ ] Add caching layer (Redis) for popular queries
- [ ] Support custom audio profiles (upload EQ settings)
- [ ] Integrate with real Spotify API for live track analysis
- [ ] Add batch recommendation endpoints
- [ ] Implement rate limiting and API keys

## License

MIT License - See LICENSE file for details
