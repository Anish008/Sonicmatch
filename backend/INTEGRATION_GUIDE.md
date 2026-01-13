# Frontend Integration Guide

Complete guide for integrating the FastAPI backend with your Next.js frontend.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup Steps](#setup-steps)
3. [API Client Setup](#api-client-setup)
4. [Integration Examples](#integration-examples)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Deployment](#deployment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│                   (localhost:3001)                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  │
│  │ Wizard Steps │───▶│ Zustand Store│──▶│ API Service  │  │
│  │ (User Input) │    │ (State Mgmt) │   │ (Fetch Layer)│  │
│  └──────────────┘    └──────────────┘   └──────┬───────┘  │
│                                                 │           │
└─────────────────────────────────────────────────┼───────────┘
                                                  │
                                           HTTP POST
                                                  │
┌─────────────────────────────────────────────────▼───────────┐
│                   FastAPI Backend                           │
│                   (localhost:8000)                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  │
│  │   Endpoint   │───▶│Feature Extract│──▶│   Algorithm  │  │
│  │ /recommend   │    │ (Spotify→Audio│   │  (Scoring)   │  │
│  └──────────────┘    └──────────────┘   └──────┬───────┘  │
│                                                 │           │
│                                                 ▼           │
│                                        ┌──────────────┐    │
│                                        │ LLM Refine   │    │
│                                        │ (Claude API) │    │
│                                        └──────┬───────┘    │
│                                               │             │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                                        JSON Response
                                                │
                                                ▼
                                    ┌──────────────────┐
                                    │ Results Display  │
                                    │   (Frontend)     │
                                    └──────────────────┘
```

---

## Setup Steps

### 1. Start the Backend Server

```bash
cd C:\Project\Sonicmatch\backend

# Activate virtual environment
venv\Scripts\activate

# Set API key (optional, for LLM features)
set ANTHROPIC_API_KEY=your_key_here

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

### 2. Update Frontend CORS Configuration

The backend is already configured to accept requests from:
- `http://localhost:3000`
- `http://localhost:3001`

If your frontend runs on a different port, update `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:YOUR_PORT"  # Add your port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## API Client Setup

### Create API Service File

Create `lib/api/recommendationService.ts` in your frontend:

```typescript
// lib/api/recommendationService.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface RecommendationRequest {
  genres: string[];
  favorite_artists?: string[];
  favorite_tracks?: Array<{ name: string; artist: string }>;
  sound_preferences?: {
    bass: number;
    mids: number;
    treble: number;
    soundstage: number;
    detail: number;
  };
  primary_use_case: string;
  budget_min: number;
  budget_max: number;
  anc_required?: boolean;
  wireless_required?: boolean;
  preferred_type?: string;
  use_llm_refinement?: boolean;
}

export interface HeadphoneRecommendation {
  rank: number;
  headphone: {
    id: number;
    brand: string;
    model: string;
    full_name: string;
    price: number;
    sound_profile: string;
    bass_level: string;
    use_case: string;
    has_anc: boolean;
    rating: number;
    reviews: number;
    description: string;
    characteristics: {
      bass: number;
      mids: number;
      treble: number;
      soundstage: number;
      imaging: number;
      warmth: number;
      detail: number;
    };
  };
  scores: {
    overall: number;
    sound_profile: number;
    frequency_match: number;
    soundstage: number;
    use_case: number;
    budget: number;
    features: number;
    rating: number;
  };
  match_highlights: string[];
  trade_offs: string[];
  confidence: number;
}

export interface RecommendationResponse {
  recommendations: HeadphoneRecommendation[];
  user_profile: {
    bass_preference: number;
    mids_preference: number;
    treble_preference: number;
    soundstage_width: number;
    warmth: number;
    sound_signature: string;
    genre_weights: Record<string, number>;
    confidence: number;
  };
  llm_insights?: {
    top_pick_explanation: string;
    key_insights: string[];
    alternatives: {
      upgrade_pick?: { index: number; reason: string };
      value_pick?: { index: number; reason: string };
      specialist_pick?: { index: number; reason: string };
    };
  };
  metadata: {
    total_candidates: number;
    matched: number;
    algorithm_version: string;
    llm_used: boolean;
  };
}

export class RecommendationAPI {
  static async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get recommendations');
    }

    return response.json();
  }

  static async compareHeadphones(
    headphoneIds: number[],
    userProfile?: any
  ): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        headphone_ids: headphoneIds,
        user_profile_data: userProfile,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to compare headphones');
    }

    return response.json();
  }

  static async getHeadphone(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/headphones/${id}`);

    if (!response.ok) {
      throw new Error('Headphone not found');
    }

    return response.json();
  }

  static async listHeadphones(filters?: {
    min_price?: number;
    max_price?: number;
    use_case?: string;
    limit?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.min_price) params.append('min_price', filters.min_price.toString());
    if (filters?.max_price) params.append('max_price', filters.max_price.toString());
    if (filters?.use_case) params.append('use_case', filters.use_case);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/headphones?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error('Failed to list headphones');
    }

    return response.json();
  }

  static async healthCheck(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.json();
  }
}
```

### Add Environment Variable

Create/update `.env.local` in your frontend root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Integration Examples

### Example 1: Get Recommendations from Wizard

Update your results page or recommendation handler:

```typescript
// app/results/page.tsx or similar

'use client';

import { useState, useEffect } from 'react';
import { usePreferencesStore } from '@/stores';
import { RecommendationAPI, RecommendationResponse } from '@/lib/api/recommendationService';

export default function ResultsPage() {
  const preferences = usePreferencesStore((state) => state.preferences);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        setError(null);

        // Transform Zustand state to API request format
        const request = {
          // Music preferences
          genres: preferences.genres,
          favorite_artists: preferences.favoriteArtists,
          favorite_tracks: preferences.favoriteTracks.map(track => ({
            name: track.name,
            artist: track.artist,
          })),

          // Sound preferences (from sliders)
          sound_preferences: {
            bass: preferences.bass,
            mids: preferences.mids,
            treble: preferences.treble,
            soundstage: preferences.soundstage,
            detail: preferences.detail,
          },

          // Context
          primary_use_case: preferences.primaryUse,
          budget_min: preferences.budgetMin,
          budget_max: preferences.budgetMax,

          // Requirements
          anc_required: preferences.ancRequired,
          wireless_required: preferences.wirelessRequired,
          preferred_type: preferences.preferredType,

          // Enable LLM refinement
          use_llm_refinement: true,
        };

        const response = await RecommendationAPI.getRecommendations(request);
        setRecommendations(response);

      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [preferences]);

  if (loading) {
    return <div className="p-8">Loading your perfect headphones...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-red-600">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
        <p className="mt-4 text-sm text-gray-600">
          Try adjusting your budget or requirements.
        </p>
      </div>
    );
  }

  if (!recommendations || recommendations.recommendations.length === 0) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-2">No matches found</h2>
        <p>Try relaxing your budget or requirements.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* User Profile Summary */}
      <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Your Sound Profile</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Bass Preference</p>
            <p className="text-lg font-semibold">
              {(recommendations.user_profile.bass_preference * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sound Signature</p>
            <p className="text-lg font-semibold">
              {recommendations.user_profile.sound_signature}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Confidence</p>
            <p className="text-lg font-semibold">
              {(recommendations.user_profile.confidence * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Matches Found</p>
            <p className="text-lg font-semibold">
              {recommendations.metadata.matched}
            </p>
          </div>
        </div>
      </div>

      {/* LLM Insights (if available) */}
      {recommendations.llm_insights && (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h3 className="text-xl font-bold mb-3">Expert Analysis</h3>
          <p className="text-gray-700 mb-4">
            {recommendations.llm_insights.top_pick_explanation}
          </p>
          {recommendations.llm_insights.key_insights.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Key Insights:</p>
              <ul className="list-disc list-inside space-y-1">
                {recommendations.llm_insights.key_insights.map((insight, i) => (
                  <li key={i} className="text-gray-700">{insight}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <h2 className="text-3xl font-bold mb-6">Your Top Matches</h2>
      <div className="space-y-6">
        {recommendations.recommendations.map((rec) => (
          <div
            key={rec.headphone.id}
            className={`p-6 rounded-lg border-2 ${
              rec.rank === 1
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Rank Badge */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className={`text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center ${
                    rec.rank === 1
                      ? 'bg-yellow-400 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  #{rec.rank}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{rec.headphone.full_name}</h3>
                  <p className="text-gray-600">{rec.headphone.sound_profile} • {rec.headphone.use_case}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  ${rec.headphone.price.toFixed(0)}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span>{rec.headphone.rating}/5</span>
                  <span className="text-gray-400">
                    ({rec.headphone.reviews.toLocaleString()})
                  </span>
                </div>
              </div>
            </div>

            {/* Match Score */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold">Overall Match</span>
                <span className="text-lg font-bold text-purple-600">
                  {rec.scores.overall.toFixed(0)}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
                  style={{ width: `${rec.scores.overall}%` }}
                />
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Sound Match</p>
                <p className="text-lg font-bold">{rec.scores.sound_profile.toFixed(0)}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Use Case</p>
                <p className="text-lg font-bold">{rec.scores.use_case.toFixed(0)}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Budget Fit</p>
                <p className="text-lg font-bold">{rec.scores.budget.toFixed(0)}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Features</p>
                <p className="text-lg font-bold">{rec.scores.features.toFixed(0)}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="mb-3">
              <p className="font-semibold mb-2 text-green-700">Why it matches:</p>
              <ul className="space-y-1">
                {rec.match_highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trade-offs */}
            {rec.trade_offs.length > 0 && (
              <div>
                <p className="font-semibold mb-2 text-orange-700">Consider:</p>
                <ul className="space-y-1">
                  {rec.trade_offs.map((tradeOff, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-500 mt-1">⚠</span>
                      <span className="text-gray-700">{tradeOff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Audio Characteristics */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold mb-2">Audio Characteristics:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Bass:</span>{' '}
                  <span className="font-semibold">
                    {(rec.headphone.characteristics.bass * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Mids:</span>{' '}
                  <span className="font-semibold">
                    {(rec.headphone.characteristics.mids * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Treble:</span>{' '}
                  <span className="font-semibold">
                    {(rec.headphone.characteristics.treble * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Soundstage:</span>{' '}
                  <span className="font-semibold">
                    {(rec.headphone.characteristics.soundstage * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Detail:</span>{' '}
                  <span className="font-semibold">
                    {(rec.headphone.characteristics.detail * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Warmth:</span>{' '}
                  <span className="font-semibold">
                    {(rec.headphone.characteristics.warmth * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alternative Picks (from LLM) */}
      {recommendations.llm_insights?.alternatives && (
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Alternative Recommendations</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {recommendations.llm_insights.alternatives.upgrade_pick && (
              <div className="p-4 bg-white rounded border-2 border-purple-200">
                <p className="text-sm font-semibold text-purple-700 mb-1">
                  Premium Upgrade
                </p>
                <p className="text-sm text-gray-700">
                  {recommendations.llm_insights.alternatives.upgrade_pick.reason}
                </p>
              </div>
            )}
            {recommendations.llm_insights.alternatives.value_pick && (
              <div className="p-4 bg-white rounded border-2 border-green-200">
                <p className="text-sm font-semibold text-green-700 mb-1">
                  Best Value
                </p>
                <p className="text-sm text-gray-700">
                  {recommendations.llm_insights.alternatives.value_pick.reason}
                </p>
              </div>
            )}
            {recommendations.llm_insights.alternatives.specialist_pick && (
              <div className="p-4 bg-white rounded border-2 border-blue-200">
                <p className="text-sm font-semibold text-blue-700 mb-1">
                  Genre Specialist
                </p>
                <p className="text-sm text-gray-700">
                  {recommendations.llm_insights.alternatives.specialist_pick.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Health Check Hook

Create a hook to monitor backend status:

```typescript
// hooks/useBackendStatus.ts

import { useState, useEffect } from 'react';
import { RecommendationAPI } from '@/lib/api/recommendationService';

export function useBackendStatus() {
  const [status, setStatus] = useState<{
    online: boolean;
    headphonesLoaded: number;
    songsLoaded: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const health = await RecommendationAPI.healthCheck();
        setStatus({
          online: health.status === 'online',
          headphonesLoaded: health.headphones_loaded,
          songsLoaded: health.songs_loaded,
        });
      } catch (error) {
        setStatus({ online: false, headphonesLoaded: 0, songsLoaded: 0 });
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  return { status, loading };
}
```

Use in your layout or main component:

```typescript
// app/layout.tsx or components/BackendStatusBanner.tsx

import { useBackendStatus } from '@/hooks/useBackendStatus';

export function BackendStatusBanner() {
  const { status, loading } = useBackendStatus();

  if (loading) return null;

  if (!status?.online) {
    return (
      <div className="bg-red-500 text-white p-2 text-center text-sm">
        Backend server offline. Please start the backend at http://localhost:8000
      </div>
    );
  }

  return null; // Backend is online, no banner needed
}
```

---

## Error Handling

### Common Errors and Solutions

```typescript
// lib/api/errorHandler.ts

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function handleAPIError(response: Response): Promise<never> {
  const contentType = response.headers.get('content-type');

  let errorData: any = {};
  if (contentType?.includes('application/json')) {
    errorData = await response.json();
  } else {
    errorData = { detail: await response.text() };
  }

  const message = errorData.detail || `API Error: ${response.status}`;

  switch (response.status) {
    case 404:
      throw new APIError(
        'No headphones found matching your criteria. Try adjusting your budget or requirements.',
        404,
        errorData
      );
    case 422:
      throw new APIError(
        'Invalid request data. Please check your preferences.',
        422,
        errorData
      );
    case 503:
      throw new APIError(
        'Backend data not loaded. Please restart the backend server.',
        503,
        errorData
      );
    default:
      throw new APIError(message, response.status, errorData);
  }
}

// Update RecommendationAPI to use error handler
export class RecommendationAPI {
  static async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }
}
```

---

## Performance Optimization

### 1. Request Caching

```typescript
// lib/api/cache.ts

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

export function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function generateCacheKey(obj: any): string {
  return JSON.stringify(obj);
}
```

Use in API service:

```typescript
import { getCached, setCache, generateCacheKey } from './cache';

static async getRecommendations(
  request: RecommendationRequest
): Promise<RecommendationResponse> {
  // Check cache first
  const cacheKey = generateCacheKey(request);
  const cached = getCached<RecommendationResponse>(cacheKey);
  if (cached) return cached;

  // Fetch from API
  const response = await fetch(/*...*/);
  const data = await response.json();

  // Cache result
  setCache(cacheKey, data);

  return data;
}
```

### 2. Loading States

```typescript
// components/RecommendationLoader.tsx

export function RecommendationLoader() {
  return (
    <div className="p-8 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}
```

---

## Deployment

### Production Backend

For production, update CORS to include your production domain:

```python
# backend/app/main.py

FRONTEND_URLS = os.getenv("FRONTEND_URLS", "http://localhost:3000,http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Set environment variable:
```bash
export FRONTEND_URLS="https://your-domain.com,http://localhost:3001"
```

### Frontend Environment Variables

```env
# .env.production
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## Testing the Integration

### 1. Backend Health Check

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "status": "online",
  "service": "Sonicmatch Recommendation API",
  "version": "1.0.0",
  "headphones_loaded": 5,
  "songs_loaded": 6
}
```

### 2. Test Recommendation Request

```bash
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "genres": ["pop"],
    "favorite_tracks": [
      {"name": "Blinding Lights", "artist": "The Weeknd"}
    ],
    "primary_use_case": "casual",
    "budget_min": 100,
    "budget_max": 400,
    "use_llm_refinement": false
  }'
```

### 3. Frontend Integration Test

Create a test page to verify integration:

```typescript
// app/test-api/page.tsx

'use client';

import { RecommendationAPI } from '@/lib/api/recommendationService';

export default function TestAPIPage() {
  const testConnection = async () => {
    try {
      const health = await RecommendationAPI.healthCheck();
      console.log('Backend status:', health);
      alert(`Backend is ${health.status}!`);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Backend connection failed!');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Integration Test</h1>
      <button
        onClick={testConnection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Backend Connection
      </button>
    </div>
  );
}
```

---

## Next Steps

1. ✅ Start backend server
2. ✅ Verify health check endpoint
3. ✅ Create API service file in frontend
4. ✅ Update results page to fetch from backend
5. ✅ Test with sample data
6. ✅ Add error handling
7. ✅ Implement loading states
8. ✅ Deploy to production

For questions or issues, check the backend logs and API documentation at `http://localhost:8000/docs`.
