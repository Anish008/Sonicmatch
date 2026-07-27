# SonicMatch Backend Tests

## Overview

Baseline test suite covering highest-risk modules: LLM client and recommendation engine.

**Score validation** is now comprehensively tested and enforced at 3 layers (LLM client, app logic, database).

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures (db session, sample data, mock responses)
├── test_api/                # API endpoint tests (EMPTY - future work)
├── test_services/           # Service layer tests
│   ├── test_llm_client.py          # 14 tests - parsing, score validation, retries
│   └── test_recommendation_engine.py  # Candidate filtering (scaffolded)
├── test_schemas/            # Pydantic schema validation tests
│   └── test_preference_sanitization.py  # 19 tests - prompt injection prevention
└── test_models/             # Model tests (EMPTY - future work)
```

## Running Tests

```bash
# LLM client tests (14 passing)
python -m pytest tests/test_services/test_llm_client.py -v

# Input sanitization tests (19 passing)
python -m pytest tests/test_schemas/test_preference_sanitization.py -v

# All working tests (33 passing)
python -m pytest tests/test_services/test_llm_client.py tests/test_schemas/ -v

# With coverage
python -m pytest tests/test_services/test_llm_client.py tests/test_schemas/ --cov=app --cov-report=term-missing
```

**Note:** Recommendation engine tests are scaffolded but require full PostgreSQL setup (not in-memory SQLite). Focus on LLM client and sanitization tests for CI/CD.

## What's Tested

### LLM Client (`test_llm_client.py`) - 14 tests
- ✅ Valid JSON parsing
- ✅ Markdown code block unwrapping (````json ... ````)
- ✅ Invalid JSON handling (raises LLMException)
- ✅ Missing 'recommendations' key handling (now LLMException, not ValueError)
- ✅ Empty/whitespace response handling
- ✅ **Score validation** (5 comprehensive tests):
  - Valid score ranges (0.0-1.0) accepted
  - Out-of-range scores (>1.0, <0.0) rejected with LLMException
  - Negative scores rejected
  - Non-numeric scores (e.g., "high") rejected
  - Missing score fields detected
- ✅ Prompt building with user preferences
- ✅ Retry logic on timeout
- ✅ Max retries exhaustion

### Recommendation Engine (`test_recommendation_engine.py`)
- 📝 Budget range filtering (scaffolded - requires PostgreSQL)
- 📝 Wireless requirement filtering
- 📝 ANC requirement filtering
- 📝 Preferred type filtering
- 📝 Open-back filtering
- 📝 Combined filters
- 📝 Valid score saving
- 📝 No candidates error
- 📝 LLM failure marks session as ERROR
- 📝 User profile building

### Input Sanitization (`test_preference_sanitization.py`) - 19 tests
- ✅ **Genre Sanitization** (5 tests):
  - Newline removal (prevents multi-line injection)
  - Length limits (max 50 chars)
  - Whitespace stripping
  - Prompt injection attempts blocked
  - Empty genres after sanitization rejected

- ✅ **Artist Sanitization** (4 tests):
  - Newline removal
  - Length limits (max 100 chars per artist, max 20 total)
  - Count limits enforced
  - Empty artist strings filtered out

- ✅ **Use Case Sanitization** (3 tests):
  - Newline removal
  - Length limits (max 50 chars)
  - Count limits (max 3 secondary use cases)

- ✅ **Additional Notes Sanitization** (4 tests):
  - Newline replacement with spaces
  - Length limits (max 1000 chars)
  - Multiple spaces collapsed to single space
  - Prompt injection attempts sanitized

- ✅ **Numeric Field Safety** (3 tests):
  - Sound preferences enforce numeric types
  - String values rejected for numeric fields
  - Budget fields reject non-numeric input

## Gaps Fixed by Tests

### 1. ✅ Score Range Validation (FIXED)
**Tests:** `test_score_out_of_range_raises_error`, `test_negative_score_raises_error`, `test_non_numeric_score_raises_error`, `test_missing_score_field_raises_error`

**Was:** LLM could return scores outside [0, 1] range which were saved to database.

**Fix Applied:**
- **LLM Client**: `_validate_recommendation_scores()` validates all scores after JSON parsing
- **Recommendation Engine**: `_validate_score()` validates before database save
- **Database**: CHECK constraints on all 6 score columns (migration `001_add_score_constraints.py`)

**Current Behavior:** Invalid scores raise `LLMException` with detailed error logging.

### 2. ✅ Inconsistent Error Handling (FIXED)
**Test:** `test_parse_missing_recommendations_key`

**Was:** Missing 'recommendations' key raised `ValueError`.

**Fix Applied:** Now raises `LLMException` for consistency.

**Current Behavior:** All parsing errors raise `LLMException`.

## Test Infrastructure

- **Framework:** pytest + pytest-asyncio
- **Database:** In-memory SQLite (fast, isolated)
- **Fixtures:** Shared in `conftest.py` for reusability
- **Mocking:** `unittest.mock.AsyncMock` for LLM calls

## Coverage (Baseline)

**Current:** ~30% of backend codebase

**Covered:**
- ✅ LLM client: parsing, **score validation**, retry, prompt building (14 tests)
- ✅ **Input sanitization**: prompt injection prevention, length limits (19 tests)
- 📝 Recommendation engine: filtering, match saving (scaffolded, needs PostgreSQL)

**NOT Covered:**
- ❌ API endpoints
- ❌ Database models
- ❌ Celery tasks
- ❌ Cache layer
- ❌ Analytics
- ❌ Frontend

## Future Work

1. **API Endpoint Tests** (`test_api/`)
   - POST /recommend (full flow)
   - GET /recommendations/{id}
   - POST /explain
   - Rate limiting behavior

2. **Integration Tests**
   - End-to-end recommendation generation
   - Real database (PostgreSQL in Docker)
   - Redis caching behavior

3. **Model Tests** (`test_models/`)
   - Field validation
   - Relationship integrity
   - Enum constraints

4. **Performance Tests**
   - LLM timeout handling under load
   - Database query performance
   - Concurrent request handling

## Contributing

When adding tests:
1. Use existing fixtures from `conftest.py` when possible
2. Document any gaps/bugs found (like score validation)
3. Use `pytest.mark.asyncio` for async tests
4. Keep tests focused on one behavior each
