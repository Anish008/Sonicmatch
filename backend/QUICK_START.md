# Quick Start Guide

Get the Sonicmatch backend running in 5 minutes.

---

## Step 1: Install Dependencies

```bash
cd C:\Project\Sonicmatch\backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

---

## Step 2: (Optional) Set API Key

For LLM-powered features, set your Anthropic API key:

```bash
# Windows
set ANTHROPIC_API_KEY=your_api_key_here

# Or add to .env file
echo ANTHROPIC_API_KEY=your_api_key_here > .env
```

**Don't have a key?** The system works without it (algorithm-only mode).

---

## Step 3: Start the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
✅ Loaded 5 headphones
✅ Loaded 6 songs for analysis
```

**Server running at:** http://localhost:8000
**API docs:** http://localhost:8000/docs

---

## Step 4: Test It Works

### Option A: Quick Test Script (Recommended)

```bash
# In a new terminal (keep server running)
cd C:\Project\Sonicmatch\backend
venv\Scripts\activate

python examples\quick_test.py
```

This runs a full test suite and shows you example recommendations.

### Option B: Manual Test

Visit in browser: http://localhost:8000

You should see:
```json
{
  "status": "online",
  "headphones_loaded": 5,
  "songs_loaded": 6
}
```

### Option C: API Test

```bash
curl http://localhost:8000/api/recommendations -X POST -H "Content-Type: application/json" -d "{\"genres\":[\"pop\"],\"primary_use_case\":\"casual\",\"budget_min\":100,\"budget_max\":400,\"use_llm_refinement\":false}"
```

---

## Step 5: Integrate with Frontend

See **INTEGRATION_GUIDE.md** for complete frontend integration.

**Quick version:**

1. Create `lib/api/recommendationService.ts` in your frontend
2. Copy the API client code from INTEGRATION_GUIDE.md
3. Update your results page to call `RecommendationAPI.getRecommendations()`
4. Add `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`

---

## Troubleshooting

### "Module not found" errors
```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### "Headphones file not found"
Update paths in `app/main.py` lines 112 and 122:
```python
headphones_path = Path(__file__).parent.parent.parent / "your" / "path" / "headphones.csv"
songs_path = Path(__file__).parent.parent.parent / "your" / "path" / "spotify_songs.csv"
```

Or copy your CSV files to:
- `backend/../sonicmatch-frontend/sonicmatch-frontend/public/data/headphones.csv`
- `backend/../sonicmatch-frontend/sonicmatch-frontend/public/data/spotify_songs.csv`

### "Port 8000 already in use"
```bash
# Use a different port
uvicorn app.main:app --reload --port 8001

# Update frontend .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8001
```

### LLM not working
- Check ANTHROPIC_API_KEY is set: `echo %ANTHROPIC_API_KEY%`
- System works without LLM (algorithm-only mode)
- Set `use_llm_refinement: false` in requests

---

## What's Next?

- 📖 Read **README.md** for detailed documentation
- 🔗 Follow **INTEGRATION_GUIDE.md** to connect your frontend
- 🧪 Run **tests**: `pytest`
- 📊 Check **PROJECT_SUMMARY.md** for architecture overview
- 🌐 Visit **http://localhost:8000/docs** for interactive API docs

---

## Example Request

Test with this sample request:

```json
{
  "genres": ["hip_hop", "r&b"],
  "favorite_tracks": [
    {"name": "Blinding Lights", "artist": "The Weeknd"}
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
  "use_llm_refinement": false
}
```

POST to: http://localhost:8000/api/recommendations

---

## Need Help?

1. Check the troubleshooting section above
2. Review README.md for detailed docs
3. Run the test suite: `python examples/quick_test.py`
4. Check server logs in the terminal

---

**That's it! Your ML + LLM recommendation backend is ready to use.**
