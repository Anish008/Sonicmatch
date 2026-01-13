# SonicMatch Backend

AI-powered headphone recommendation engine built with FastAPI, PostgreSQL, Redis, and LLM integration (Claude/OpenAI).

## 🎯 Overview

Production-grade backend API for personalized headphone recommendations using Large Language Models. The system analyzes user music preferences, listening habits, and requirements to match them with the perfect headphones from a curated catalog.

## ✅ Implementation Status

### Completed Features

- ✅ **Complete FastAPI Application**
  - Async/await throughout for high concurrency
  - CORS middleware configured for frontend
  - Structured JSON logging with contextual info
  - Global exception handling
  - Request/response validation
  - Health check endpoints

- ✅ **Database Layer (PostgreSQL + SQLAlchemy 2.0)**
  - 6 production models: Headphone, UserPreference, RecommendationSession, HeadphoneMatch, User, AnalyticsEvent
  - Async session management with connection pooling
  - Comprehensive indexing strategy
  - JSON fields for flexible data structures
  - Alembic migrations configured

- ✅ **LLM Integration**
  - Unified client supporting Claude (Anthropic) and OpenAI
  - Structured output with JSON mode
  - Retry logic with exponential backoff
  - Timeout handling (30s default)
  - Token usage tracking
  - Error fallbacks

- ✅ **Recommendation Engine**
  - Full LLM-based matching pipeline
  - Multi-dimensional scoring (6 metrics: overall, genre_match, sound_profile, use_case, budget, feature_match)
  - Personalized explanations, pros/cons
  - Candidate filtering by hard constraints
  - Match highlights generation

- ✅ **API Endpoints (v1)**
  - `POST /api/v1/recommend` - Generate recommendations (sync/async modes)
  - `GET /api/v1/recommendations/{session_id}` - Retrieve session results
  - `POST /api/v1/explain` - Detailed match explanation
  - `GET /api/v1/headphones` - Browse catalog with filters
  - `GET /health`, `/health/ready`, `/health/live` - Monitoring

- ✅ **Redis Caching**
  - Session caching (1hr TTL)
  - Headphone catalog caching (10min TTL)
  - Query result caching (5min TTL)
  - Rate limit counters
  - Automatic cache invalidation

- ✅ **Rate Limiting**
  - Per-endpoint limits using SlowAPI
  - IP-based tracking
  - Configurable thresholds:
    - `/recommend`: 10 req/min
    - `/explain`: 20 req/min
    - `/headphones`: 100 req/min

- ✅ **Background Jobs (Celery)**
  - Async recommendation processing
  - Redis broker and result backend
  - Task timeout and retry configuration
  - Scheduled cleanup tasks (30-day session retention)
  - Flower monitoring support

- ✅ **Seed Data**
  - 28 real headphones across all price tiers
  - Budget: Sennheiser HD 560S, Philips SHP9500, etc.
  - Mid-range: Beyerdynamic DT 770 Pro, Audio-Technica M50xBT
  - Premium: Sony WH-1000XM5, Sennheiser Momentum 4
  - Flagship: Apple AirPods Max, Focal Clear MG, Audeze LCD-2
  - Complete specs, sound profiles, target genres
  - Seed script ready (`seeds/seed_db.py`)

- ✅ **Docker Deployment**
  - Multi-service docker-compose.yml
  - Services: API, Celery worker, PostgreSQL, Redis, Nginx, Flower
  - Health checks for all services
  - Volume persistence
  - Production and monitoring profiles
  - Optimized Dockerfile with multi-stage build

- ✅ **Security**
  - Input sanitization via Pydantic
  - CORS configuration
  - Rate limiting
  - Environment variable isolation
  - SQL injection protection (ORM)
  - LLM call protection (dedup, timeout, budget)

- ✅ **Configuration & Documentation**
  - Pydantic Settings with `.env` support
  - Comprehensive `.env.example`
  - Type-safe configuration
  - This README with setup instructions

### Remaining (Optional Enhancements)

- ⏳ **Comprehensive Test Suite**
  - Unit tests for services
  - Integration tests for API endpoints
  - Test fixtures and mocks
  - Coverage reporting

- ⏳ **JWT Authentication** (Phase 2)
  - User registration/login
  - Protected endpoints
  - Session ownership validation

- ⏳ **Advanced Analytics**
  - Usage metrics dashboard
  - A/B testing framework
  - Recommendation quality tracking

## 📁 Project Structure

```
sonicmatch-backend/
├── app/
│   ├── main.py                    # FastAPI application entry
│   ├── config.py                  # Pydantic Settings
│   ├── api/
│   │   └── v1/
│   │       ├── router.py          # Main v1 router
│   │       ├── recommendations.py # Recommendation endpoints
│   │       ├── explain.py         # Explanation endpoint
│   │       └── headphones.py      # Catalog endpoints
│   ├── core/
│   │   ├── cache.py               # Redis wrapper
│   │   ├── exceptions.py          # Custom exceptions
│   │   └── security.py            # Auth utilities
│   ├── db/
│   │   ├── base.py                # SQLAlchemy base
│   │   └── session.py             # DB session management
│   ├── models/
│   │   ├── headphone.py           # Headphone catalog
│   │   ├── preference.py          # User preferences
│   │   ├── recommendation.py      # Sessions & matches
│   │   ├── user.py                # User accounts
│   │   └── analytics.py           # Analytics events
│   ├── schemas/
│   │   ├── headphone.py           # Headphone schemas
│   │   ├── preference.py          # Preference schemas
│   │   ├── recommendation.py      # Recommendation schemas
│   │   └── common.py              # Shared types
│   ├── services/
│   │   ├── llm_client.py          # Claude/OpenAI client
│   │   └── recommendation_engine.py # Matching logic
│   ├── tasks/
│   │   ├── celery_app.py          # Celery configuration
│   │   └── recommendation_tasks.py # Background tasks
│   └── utils/
│       └── validators.py          # Validation helpers
├── migrations/
│   ├── env.py                     # Alembic config
│   ├── script.py.mako             # Migration template
│   └── versions/                  # Migration files
├── seeds/
│   ├── headphones.json            # 28 real headphones
│   └── seed_db.py                 # Seeding script
├── docker/
│   ├── nginx.conf                 # Nginx config
│   └── .dockerignore              # Docker ignore rules
├── tests/
│   └── conftest.py                # Test fixtures
├── Dockerfile                     # Container image
├── docker-compose.yml             # Multi-service orchestration
├── requirements.txt               # Python dependencies
├── pyproject.toml                 # Poetry config
├── alembic.ini                    # Alembic config
├── .env.example                   # Environment template
└── README.md                      # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)
- Claude API key (Anthropic) or OpenAI API key

### Option 1: Docker (Recommended)

1. **Clone and configure**:
   ```bash
   cd sonicmatch-backend
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Run migrations and seed**:
   ```bash
   docker-compose exec api alembic upgrade head
   docker-compose exec api python seeds/seed_db.py
   ```

4. **Access**:
   - API: `http://localhost:8000`
   - Docs: `http://localhost:8000/docs`
   - Flower (Celery): `http://localhost:5555` (with monitoring profile)

### Option 2: Local Development

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database, Redis, and API keys
   ```

4. **Start PostgreSQL and Redis**:
   ```bash
   # Using Docker:
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=sonicmatch -e POSTGRES_USER=sonicmatch -e POSTGRES_PASSWORD=password postgres:15-alpine
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

5. **Run migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Seed database**:
   ```bash
   python seeds/seed_db.py
   ```

7. **Start API server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

8. **Start Celery worker** (separate terminal):
   ```bash
   celery -A app.tasks.celery_app worker -l info --concurrency=2
   ```

9. **Access**:
   - API: `http://localhost:8000`
   - Docs: `http://localhost:8000/docs`
   - Health: `http://localhost:8000/health`

## 📊 Database Schema

### Headphone Model
- Product catalog with specifications
- Sound signature profiles (bass, mids, treble, soundstage, detail)
- Pricing and tier categorization
- Target genres and use cases
- Features (wireless, ANC, type)

### UserPreference Model
- Music taste (genres, artists, tracks)
- Sound preferences (0-1 scale for each dimension)
- Budget range and requirements
- Primary/secondary use cases
- Listening environment

### RecommendationSession Model
- Track recommendation requests
- LLM provider/model metadata
- Processing status (pending, processing, complete, error)
- Processing time tracking

### HeadphoneMatch Model
- Individual recommendations with ranking
- 6-dimensional scoring:
  - Overall match score
  - Genre match score
  - Sound profile match score
  - Use case match score
  - Budget match score
  - Feature match score
- LLM-generated explanation
- Personalized pros/cons
- Match highlights

### User Model (Optional - Phase 2)
- Authentication and authorization
- User profile and history

### AnalyticsEvent Model
- Usage tracking
- Event metadata
- Session correlation

## 🎯 API Endpoints

### Recommendations

```http
POST /api/v1/recommend
Content-Type: application/json

{
  "preferences": {
    "genres": ["rock", "jazz"],
    "favorite_artists": ["Pink Floyd", "Miles Davis"],
    "sound_preferences": {
      "bass": 0.6,
      "mids": 0.8,
      "treble": 0.7,
      "soundstage": 0.9,
      "detail": 0.8
    },
    "budget_min": 200,
    "budget_max": 500,
    "primary_use_case": "critical_listening"
  }
}

Response: 200 OK
{
  "session_id": "uuid",
  "status": "complete",
  "matches": [
    {
      "rank": 1,
      "headphone": {...},
      "overall_score": 0.92,
      "scores": {...},
      "explanation": "...",
      "personalized_pros": [...],
      "personalized_cons": [...],
      "match_highlights": [...]
    }
  ],
  "processing_time_ms": 1234
}
```

```http
GET /api/v1/recommendations/{session_id}

Response: 200 OK (same as above)
```

```http
POST /api/v1/explain
Content-Type: application/json

{
  "session_id": "uuid",
  "headphone_id": "uuid"
}

Response: 200 OK
{
  "headphone": {...},
  "detailed_explanation": "...",
  "comparison_points": [...]
}
```

### Catalog

```http
GET /api/v1/headphones?type=over_ear&price_min=200&price_max=500&wireless=true

Response: 200 OK
{
  "items": [...],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

### Health

```http
GET /health              # Overall health
GET /health/ready        # Readiness probe
GET /health/live         # Liveness probe
```

## 🔒 Security Features

- **CORS**: Configured for frontend origin (`localhost:3000` in dev)
- **Rate Limiting**: Per-endpoint limits with IP tracking
- **Input Validation**: Pydantic schemas with strict validation
- **SQL Injection Protection**: SQLAlchemy ORM parameterization
- **Environment Variables**: Sensitive credentials isolated
- **LLM Call Protection**: Deduplication, timeout, retry, budget limits
- **Error Masking**: Generic error messages to clients, detailed logs server-side

## 🔧 Configuration

See `.env.example` for all configuration options.

**Required Variables**:
- `DATABASE_URL` - PostgreSQL async connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - Application secret key
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` - LLM API key

**LLM Configuration**:
- `LLM_PROVIDER` - `anthropic` or `openai` (default: anthropic)
- `LLM_MODEL` - Model ID (default: claude-opus-4-5)
- `LLM_MAX_TOKENS` - Max response tokens (default: 4000)
- `LLM_TEMPERATURE` - Creativity (default: 0.7)

**Performance Tuning**:
- `CACHE_TTL_SESSION` - Session cache duration (default: 3600s)
- `RATE_LIMIT_RECOMMEND` - Recommend endpoint limit (default: 10/min)
- `CELERY_TASK_TIMEOUT` - Task timeout (default: 60s)

## 🧪 Testing

```bash
# Install dev dependencies
pip install -r requirements.txt

# Run tests (when implemented)
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_api/test_recommendations.py -v
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f celery

# Run migrations
docker-compose exec api alembic upgrade head

# Seed database
docker-compose exec api python seeds/seed_db.py

# Access database
docker-compose exec postgres psql -U sonicmatch -d sonicmatch

# Access Redis CLI
docker-compose exec redis redis-cli

# Stop services
docker-compose down

# Clean volumes (WARNING: deletes data)
docker-compose down -v

# Start with monitoring (includes Flower)
docker-compose --profile monitoring up -d

# Start with Nginx reverse proxy
docker-compose --profile production up -d
```

## 📈 Monitoring

### Flower (Celery Monitoring)

```bash
docker-compose --profile monitoring up -d
# Access at http://localhost:5555
```

### Logs

```bash
# Application logs (JSON structured)
docker-compose logs -f api

# All services
docker-compose logs -f
```

### Health Checks

- `/health` - Overall system health
- `/health/ready` - Database and Redis connectivity
- `/health/live` - Application responsiveness

## 🏛️ Architecture Decisions

- **Async/Await**: Full async support using asyncio for high concurrency
- **Pydantic V2**: Type-safe validation and settings management
- **SQLAlchemy 2.0**: Modern async ORM with relationship loading strategies
- **Structured Logging**: JSON logs with contextual fields for production monitoring
- **LLM-First Approach**: Full AI-powered recommendations vs rule-based matching
- **PostgreSQL JSON Fields**: Flexibility for evolving data structures
- **Redis Caching**: Multi-layer caching strategy for performance
- **Celery Background Jobs**: Async processing for long-running tasks
- **Docker Compose**: Local development parity with production

## 📚 Development Workflow

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Add new field to headphones"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

### Code Quality

```bash
# Format code
black app/

# Sort imports
isort app/

# Lint
ruff check app/

# Type checking
mypy app/
```

### Adding New Headphones

1. Edit `seeds/headphones.json`
2. Run: `python seeds/seed_db.py --append` (to add new entries)

## 🔗 Integration with Frontend

The Next.js frontend (in `../sonicmatch-frontend/`) integrates via:

1. **Environment Variable**:
   ```bash
   # In frontend .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

2. **API Calls**:
   ```typescript
   const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recommend`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(preferences)
   });
   ```

3. **CORS**: Already configured for `localhost:3000` in backend

## 📄 License

Proprietary - SonicMatch 2026

## 🤝 Contributing

1. Follow existing project structure
2. Use type hints throughout
3. Add docstrings to public functions
4. Validate with Pydantic schemas
5. Write tests for new features
6. Format with Black
7. Update documentation

## 🔗 Resources

- **API Documentation**: `/docs` (Swagger UI)
- **Alternative Docs**: `/redoc` (ReDoc)
- **Implementation Plan**: `~/.claude/plans/eager-puzzling-locket.md`
- **Frontend**: `../sonicmatch-frontend/`

## 📞 Support

For issues or questions:
1. Check API docs at `/docs`
2. Review logs: `docker-compose logs -f`
3. Verify environment configuration
4. Ensure all services are running: `docker-compose ps`

---

**Built with**: FastAPI • PostgreSQL • Redis • Celery • Claude AI • Docker
