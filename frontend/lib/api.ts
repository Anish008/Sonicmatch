/**
 * API client for SonicMatch backend
 *
 * Handles all API communication with proper error handling,
 * loading states, and request optimization.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Make a request to the API with proper error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.message || `API request failed: ${response.statusText}`,
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * Get headphone recommendations based on user preferences
 * This calls the backend RAG-enhanced recommendation engine
 */
export async function getRecommendations(preferences: any) {
  return fetchAPI('/recommend', {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  });
}

/**
 * Get all headphones (for browse page)
 */
export async function getAllHeadphones() {
  return fetchAPI('/headphones');
}

/**
 * Get a specific headphone by ID
 */
export async function getHeadphone(id: string) {
  return fetchAPI(`/headphones/${id}`);
}

/**
 * Get headphone details with filters
 */
export async function getHeadphonesFiltered(params: {
  minPrice?: number;
  maxPrice?: number;
  type?: string;
  wireless?: boolean;
  anc?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.minPrice) query.set('min_price', params.minPrice.toString());
  if (params.maxPrice) query.set('max_price', params.maxPrice.toString());
  if (params.type) query.set('type', params.type);
  if (params.wireless !== undefined) query.set('wireless', params.wireless.toString());
  if (params.anc !== undefined) query.set('anc', params.anc.toString());

  return fetchAPI(`/headphones?${query.toString()}`);
}
