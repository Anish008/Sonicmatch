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

## RAG Evaluation

### Overview

The RAG (Retrieval-Augmented Generation) evaluation tests the system's ability to:
1. **Route queries correctly**: Identify which queries need retrieval vs. structured filtering
2. **Retrieve relevant content**: Find review chunks that actually address the user's query
3. **Cite sources accurately**: Ensure citations reference real, retrieved sources

### Files

- **`rag_eval_set.json`**: 15 test cases for RAG system (10 subjective/hybrid, 5 structured)
- **`run_rag_eval.py`**: RAG evaluation script with three key metrics
- **`rag_eval_results.json`**: Generated results (created after running)

### Test Case Types

**Subjective queries** (should route to RAG):
- Sound quality questions ("best bass", "warm sound")
- Comfort assessments ("comfortable for long sessions")
- Build quality opinions ("durable", "premium feel")
- Genre-specific performance ("good for classical")

**Structured queries** (should NOT route to RAG):
- Budget-only ("under $200")
- Feature requirements ("wireless + ANC")
- Technical specs ("over-ear, open-back")

**Hybrid queries** (should route to RAG):
- Mix of technical + subjective ("wireless for gym with good durability")

### Running RAG Evaluation

```bash
cd backend
python eval/run_rag_eval.py
```

### Metrics

**1. Routing Accuracy (Target: ≥85%)**
- Measures whether the router correctly identifies RAG-needed vs. structured queries
- Pass: Query routed correctly (subjective → RAG, structured → no RAG)
- Fail: Query misrouted (could miss relevant context or waste retrieval)

**2. Retrieval Precision@k (Target: ≥70%)**
- For RAG-routed queries, checks if expected relevant chunks are in top-k results
- Pass: At least 50% of expected relevant headphone chunks retrieved
- Fail: Missing key relevant sources

**3. Citation Accuracy (Target: ≥80%)**
- Spot-checks that cited sources actually exist in retrieved chunks
- Pass: At least 80% of citations reference real retrieved sources
- Fail: Hallucinated or fabricated citations

### Example Output

```
================================================================================
SonicMatch RAG System Evaluation
================================================================================

Loaded 15 RAG test cases from rag_eval_set.json

[subjective_bass_01] User asking about bass quality for hip-hop
  Query type: subjective
  Routing: ✓ PASS
    Expected RAG: True, Actual: True
    Confidence: 0.92, Type: subjective
  Retrieval Precision@k: ✓ PASS
    Precision: 1.00 (2 expected)
    Matches: sony-wh-1000xm4, beats-studio3

[structured_wireless_anc_06] Purely technical requirements: wireless + ANC under $200
  Query type: structured
  Routing: ✓ PASS
    Expected RAG: False, Actual: False
    Confidence: 0.95, Type: structured

... (13 more test cases)

================================================================================
RAG EVALUATION SUMMARY
================================================================================

Total test cases:           15

1. Routing Accuracy:        13/15 (86.7%)
   - Target: ≥85% (route queries correctly)

2. Retrieval Precision@k:   8/10 (80.0%)
   - Target: ≥70% (retrieve relevant chunks)

3. Citation Accuracy:       Pending (requires full recommendation)
   - Target: ≥80% (cite real sources)

Overall Pass Rate:          12/15 (80.0%)
   - Target: ≥70%

Detailed results saved to rag_eval_results.json

================================================================================
✓ RAG EVALUATION PASSED
================================================================================
```

### Interpreting RAG Results

**High routing accuracy (>90%)**
- Router correctly distinguishes subjective vs. structured queries
- LLM-based classification is working well
- Low false positives/negatives

**Low routing accuracy (<80%)**
- Router prompt may need tuning
- Threshold (rag_routing_threshold) may need adjustment
- Consider adding more examples to routing prompt

**High retrieval precision (>80%)**
- Vector embeddings capturing semantic meaning well
- Similarity threshold set appropriately
- Review chunks well-written and indexed

**Low retrieval precision (<60%)**
- May need more/better review chunks in database
- Embedding model may not capture domain-specific terminology
- Similarity threshold may be too high (excluding relevant results)

## Future Improvements

- **Expand test set**: Add more edge cases (IEMs, on-ear, specific brands)
- **Multi-genre tests**: Users with very diverse music tastes
- **Budget edge cases**: Users at exact tier boundaries
- **Negative tests**: Impossible requirements (e.g., open-back with ANC)
- **Regression tracking**: Store historical pass rates to detect degradation
- **CI/CD integration**: Run on every PR to prevent recommendation quality regressions
- **Citation accuracy automation**: Generate full recommendations in eval to measure citation accuracy
- **RAG performance tracking**: Monitor retrieval latency and cost per query
