# Score Validation Implementation

## Overview

SonicMatch now enforces strict score validation across 3 layers to ensure all recommendation scores are within the valid range [0.0, 1.0].

## Problem

Previously, the LLM could return scores outside the valid range (e.g., 1.5, -0.1, "high") which would be saved to the database without validation, potentially breaking frontend visualizations and scoring logic.

## Solution: Three-Layer Defense

### Layer 1: LLM Client Validation (First Line of Defense)

**Location:** `app/services/llm_client.py:443-489`

**Method:** `_validate_recommendation_scores(recommendations: list)`

**Validates:**
- All 6 score fields are present (overall, genre_match, sound_profile, use_case, budget, feature_match)
- All scores are numeric (not strings like "high" or None)
- All scores are within [0.0, 1.0] range

**Behavior on Error:**
- Logs detailed error with field name, invalid value, headphone ID, recommendation index
- Raises `LLMException` with specific error message
- Called immediately after JSON parsing in `_parse_recommendation_response()`

**Example Error Log:**
```python
logger.error(
    "llm_response_score_out_of_range",
    field="overall",
    score_value=1.5,
    headphone_id="uuid-123",
    recommendation_index=0,
)
```

### Layer 2: Recommendation Engine Validation (Pre-Save Check)

**Location:** `app/services/recommendation_engine.py:361-411`

**Method:** `_validate_score(score: float, score_name: str, headphone_id: UUID) -> Decimal`

**Validates:**
- Score is numeric (handles TypeError, ValueError)
- Score is within [0.0, 1.0] range
- Returns validated score as Decimal for database storage

**Behavior on Error:**
- Logs detailed error with score name, invalid value, headphone ID
- Raises `ValidationException` with detail dictionary
- Called in `_save_matches()` before creating HeadphoneMatch objects
- Invalid recommendations are skipped (logged but don't fail entire session)

**Example Usage:**
```python
validated_scores = {
    "overall": self._validate_score(scores.get("overall"), "overall", headphone_id),
    "genre_match": self._validate_score(scores.get("genre_match"), "genre_match", headphone_id),
    # ... etc
}
```

### Layer 3: Database CHECK Constraints (Final Safety Net)

**Location:** `migrations/versions/001_add_score_constraints.py`

**Constraints:**
```sql
CHECK (overall_score >= 0.0 AND overall_score <= 1.0)
CHECK (genre_match_score >= 0.0 AND genre_match_score <= 1.0)
CHECK (sound_profile_score >= 0.0 AND sound_profile_score <= 1.0)
CHECK (use_case_score >= 0.0 AND use_case_score <= 1.0)
CHECK (budget_score >= 0.0 AND budget_score <= 1.0)
CHECK (feature_match_score >= 0.0 AND feature_match_score <= 1.0)
```

**Behavior:**
- Database rejects INSERTs/UPDATEs with invalid scores
- Constraint violation raises database error
- Acts as final safety net if validation is somehow bypassed

**To Apply:**
```bash
cd backend
alembic upgrade head
```

## Test Coverage

**File:** `tests/test_services/test_llm_client.py`

**Tests (5 total):**

1. `test_scores_within_valid_range` - Verifies valid scores (0.0, 0.5, 1.0) are accepted
2. `test_score_out_of_range_raises_error` - Verifies scores >1.0 raise LLMException
3. `test_negative_score_raises_error` - Verifies negative scores raise LLMException
4. `test_non_numeric_score_raises_error` - Verifies string scores (e.g., "high") raise LLMException
5. `test_missing_score_field_raises_error` - Verifies missing score fields raise LLMException

**Run Tests:**
```bash
cd backend
python -m pytest tests/test_services/test_llm_client.py::TestLLMClientScoreHandling -v
```

**Expected Output:** `5 passed`

## Error Handling Flow

### Invalid Score from LLM

```
LLM returns {"overall": 1.5, ...}
    ↓
_parse_recommendation_response() calls _validate_recommendation_scores()
    ↓
_validate_recommendation_scores() detects score > 1.0
    ↓
Logs: "llm_response_score_out_of_range" with details
    ↓
Raises: LLMException("Score 'overall' must be between 0.0 and 1.0, got: 1.5")
    ↓
RecommendationEngine catches LLMException
    ↓
Marks session as ERROR, logs failure
    ↓
Returns HTTP 500 to client with error message
```

### Non-Numeric Score from LLM

```
LLM returns {"overall": "high", ...}
    ↓
_validate_recommendation_scores() tries float("high")
    ↓
Catches ValueError
    ↓
Logs: "llm_response_non_numeric_score"
    ↓
Raises: LLMException("Score 'overall' must be numeric, got str: high")
```

### Missing Score Field

```
LLM returns {"overall": 0.9} (missing "genre_match")
    ↓
_validate_recommendation_scores() checks scores.get("genre_match")
    ↓
Detects None
    ↓
Logs: "llm_response_missing_score"
    ↓
Raises: LLMException("Recommendation 0 missing required score field: genre_match")
```

## Logging

All validation failures are logged with structured context:

```python
# LLM Client Layer
logger.error(
    "llm_response_score_out_of_range",
    field="overall",
    score_value=1.5,
    headphone_id="uuid-123",
    recommendation_index=0,
)

# Recommendation Engine Layer
logger.error(
    "invalid_score_type",
    score_name="budget",
    score_value="free",
    headphone_id="uuid-456",
    error="could not convert string to float: 'free'",
)

logger.warning(
    "skipping_recommendation_invalid_scores",
    headphone_id="uuid-789",
    rank=2,
)
```

## API Response

When validation fails, the API returns:

```json
{
  "detail": "Failed to generate recommendations: Score 'overall' must be between 0.0 and 1.0, got: 1.5"
}
```

Status code: `500 Internal Server Error`

Session is marked as `ERROR` in database with `error_message` field populated.

## Performance Impact

- **Minimal**: Validation adds ~1-2ms per recommendation (6 float comparisons)
- **Worth it**: Prevents invalid data from corrupting database and breaking frontend
- **No database round-trip**: All validation happens in-memory before save

## Migration

If you have existing data with invalid scores:

```sql
-- Find invalid scores
SELECT id, overall_score, genre_match_score
FROM headphone_matches
WHERE overall_score < 0.0 OR overall_score > 1.0
   OR genre_match_score < 0.0 OR genre_match_score > 1.0
   -- ... repeat for all 6 score columns

-- Fix by clamping to [0, 1]
UPDATE headphone_matches
SET overall_score = LEAST(GREATEST(overall_score, 0.0), 1.0),
    genre_match_score = LEAST(GREATEST(genre_match_score, 0.0), 1.0),
    sound_profile_score = LEAST(GREATEST(sound_profile_score, 0.0), 1.0),
    use_case_score = LEAST(GREATEST(use_case_score, 0.0), 1.0),
    budget_score = LEAST(GREATEST(budget_score, 0.0), 1.0),
    feature_match_score = LEAST(GREATEST(feature_match_score, 0.0), 1.0)
WHERE overall_score < 0.0 OR overall_score > 1.0
   OR genre_match_score < 0.0 OR genre_match_score > 1.0
   -- ... etc

-- Then apply migration
alembic upgrade head
```

## Benefits

1. **Data Integrity**: Database guaranteed to contain only valid scores
2. **Early Detection**: Catches LLM hallucinations immediately
3. **Better Debugging**: Detailed logs pinpoint exact invalid score
4. **Frontend Safety**: No broken score bars or visualizations
5. **Defense in Depth**: 3 independent validation layers
6. **Fail Fast**: Errors surface immediately, not after save

## Future Enhancements

- [ ] Add score validation to Pydantic response schemas (already has `ge=0.0, le=1.0`)
- [ ] Metric tracking for validation failures (detect LLM drift)
- [ ] Automatic retry with modified prompt if scores invalid
- [ ] Admin dashboard to view validation failure trends
