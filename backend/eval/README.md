# SonicMatch Evaluation Framework

## Overview

This directory contains the evaluation framework for testing the SonicMatch recommendation engine against hand-crafted test cases.

## Files

- **`eval_set.json`**: 15 hand-crafted user preference profiles paired with expected headphone matches
- **`run_eval.py`**: Python script that runs test cases through the RecommendationEngine and reports pass rate
- **`eval_results.json`**: Generated results file with detailed pass/fail information (created after running evaluation)

## Test Cases

The evaluation set contains 15 diverse test cases covering:

- **Budget constraints**: $50-100 (tight budget) to $500-800 (flagship)
- **Use cases**: Audiophile, travel, studio, gaming, office, casual
- **Sound signatures**: Neutral, v-shaped, warm
- **Special requirements**: Wireless, ANC, open-back acceptance
- **Music genres**: Classical, jazz, electronic, hip-hop, pop, metal, indie

Each test case specifies:
- User preference profile (genres, sound preferences, budget, requirements)
- Expected top match (specific headphone slug)
- Reason for expected match
- Optional acceptable alternatives

## Running Evaluation

### Prerequisites

1. **PostgreSQL database** must be running and accessible
2. **Database must be seeded** with headphone data from `backend/seeds/headphones.json`
3. **Environment variables** must be configured in `.env`:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/sonicmatch
   LLM_PROVIDER=anthropic  # or openai
   LLM_API_KEY=your_api_key_here
   LLM_MODEL=claude-sonnet-4-5-20250929
   ```
4. **Dependencies installed**:
   ```bash
   pip install -r requirements.txt
   pip install asyncpg  # Required for async PostgreSQL
   ```

### Run Command

```bash
cd backend
python eval/run_eval.py
```

### Expected Output

```
================================================================================
SonicMatch Recommendation Engine Evaluation
================================================================================

Loaded 15 test cases from eval_set.json

[budget_audiophile_01] Budget-conscious audiophile seeking neutral, open-back sound
  Expected: philips-shp9500
  Result: ✓ PASS
  Top 3: philips-shp9500, sennheiser-hd-560s, akg-k371

[travel_anc_premium_02] Frequent traveler needing premium ANC and wireless
  Expected: sony-wh-1000xm5
  Result: ✓ PASS
  Top 3: sony-wh-1000xm5, bose-qc45, sennheiser-momentum-4

... (13 more test cases)

================================================================================
EVALUATION SUMMARY
================================================================================
Total test cases:  15
Passed:            13 (86.7%)
Failed:            2
Errors:            0

Detailed results saved to eval_results.json
```

## Pass Criteria

A test case **passes** if:
- The expected headphone slug appears in the **top 3 recommendations**, OR
- Any acceptable alternative appears in the top 3 recommendations

**Target pass rate**: ≥70% (10 out of 15 tests)

## Interpreting Results

### High Pass Rate (>80%)
- Recommendation engine is working well
- LLM is accurately matching user preferences to headphone features
- Filtering and scoring logic are sound

### Medium Pass Rate (60-80%)
- Some edge cases failing
- May need prompt tuning or scoring adjustments
- Check `eval_results.json` for patterns in failures

### Low Pass Rate (<60%)
- Major issues with recommendation logic
- LLM prompt may need revision
- Score validation or filtering may be too strict
- Database seeding may be incomplete

## Adding New Test Cases

1. Open `eval_set.json`
2. Add a new test case object:
   ```json
   {
     "test_id": "your_test_id",
     "description": "Brief description",
     "user_preference": {
       "genres": ["genre1", "genre2"],
       "sound_preferences": {
         "bass": 0.7,
         "mids": 0.6,
         "treble": 0.6,
         "soundstage": 0.5,
         "detail": 0.7
       },
       "budget_min": 100,
       "budget_max": 300,
       "wireless_required": true,
       "anc_required": true,
       ... (other fields)
     },
     "expected_top_match": {
       "slug": "headphone-slug",
       "reason": "Why this headphone matches"
     },
     "acceptable_alternatives": ["alternative-slug-1"]  // Optional
   }
   ```
3. Run evaluation again

## Troubleshooting

### "Connection refused" error
- PostgreSQL is not running
- Check `DATABASE_URL` in `.env`
- Verify database exists: `psql -U user -d sonicmatch -c "\dt"`

### "No module named 'asyncpg'" error
```bash
pip install asyncpg
```

### "ModuleNotFoundError: No module named 'app'"
- Run from `backend/` directory, not `backend/eval/`
- Script automatically adds parent directory to Python path

### All tests fail with same headphone
- Database may not be seeded
- Seed headphones: `python scripts/seed_headphones.py`
- LLM may be returning low-quality responses (check API key)

### LLM timeout errors
- Increase timeout in `app/services/llm_client.py`
- Check LLM provider API status
- Verify API key is valid

## Future Improvements

- **Expand test set**: Add more edge cases (IEMs, on-ear, specific brands)
- **Multi-genre tests**: Users with very diverse music tastes
- **Budget edge cases**: Users at exact tier boundaries
- **Negative tests**: Impossible requirements (e.g., open-back with ANC)
- **Regression tracking**: Store historical pass rates to detect degradation
- **CI/CD integration**: Run on every PR to prevent recommendation quality regressions
