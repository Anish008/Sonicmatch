// ============================================
// Headphone Image URL Utilities
// ============================================

// Map of popular headphones to their product image URLs
// Using high-quality product images from reliable sources
const HEADPHONE_IMAGES: Record<string, string[]> = {
  // Sony
  'sony_wh-1000xm5': [
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop',
  ],
  'sony_wh-1000xm4': [
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop',
  ],
  // Bose
  'bose_quietcomfort 45': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
  ],
  'bose_quietcomfort ultra': [
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop',
  ],
  // Apple
  'apple_airpods max': [
    'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=400&h=400&fit=crop',
  ],
  // Sennheiser
  'sennheiser_hd 660s': [
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop',
  ],
  // Audio-Technica
  'audio-technica_ath-m50x': [
    'https://images.unsplash.com/photo-1599669454699-248893623440?w=400&h=400&fit=crop',
  ],
  // Beyerdynamic
  'beyerdynamic_dt 770 pro': [
    'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop',
  ],
};

// Fallback placeholder images for different headphone types
const FALLBACK_IMAGES: Record<string, string[]> = {
  'over-ear': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop',
  ],
  'on-ear': [
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop',
  ],
  'in-ear': [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1598331668826-20cecc596b86?w=400&h=400&fit=crop',
  ],
  'earbuds': [
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop',
  ],
  'default': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop',
  ],
};

/**
 * Get the primary product image URL for a headphone
 */
export function getHeadphoneImageUrl(
  brand: string,
  model: string,
  type?: string
): string {
  const key = `${brand}_${model}`.toLowerCase();

  // Check for specific product image
  if (HEADPHONE_IMAGES[key] && HEADPHONE_IMAGES[key].length > 0) {
    return HEADPHONE_IMAGES[key][0];
  }

  // Fall back to type-based image
  const normalizedType = type?.toLowerCase().replace(/[_\s]+/g, '-') || 'default';
  const fallbackList = FALLBACK_IMAGES[normalizedType] || FALLBACK_IMAGES['default'];

  // Use a deterministic index based on brand+model hash for consistency
  const hash = hashString(`${brand}${model}`);
  const index = Math.abs(hash) % fallbackList.length;

  return fallbackList[index];
}

/**
 * Get multiple images for a headphone (for gallery/hover view)
 */
export function getHeadphoneImages(
  brand: string,
  model: string,
  type?: string,
  count: number = 3
): string[] {
  const key = `${brand}_${model}`.toLowerCase();
  const images: string[] = [];

  // Add specific product images if available
  if (HEADPHONE_IMAGES[key]) {
    images.push(...HEADPHONE_IMAGES[key]);
  }

  // Fill remaining slots with fallback images
  const normalizedType = type?.toLowerCase().replace(/[_\s]+/g, '-') || 'default';
  const fallbackList = FALLBACK_IMAGES[normalizedType] || FALLBACK_IMAGES['default'];

  const hash = hashString(`${brand}${model}`);
  let fallbackIndex = Math.abs(hash) % fallbackList.length;

  while (images.length < count && fallbackList.length > 0) {
    const img = fallbackList[fallbackIndex % fallbackList.length];
    if (!images.includes(img)) {
      images.push(img);
    }
    fallbackIndex++;
    // Prevent infinite loop
    if (fallbackIndex - (Math.abs(hash) % fallbackList.length) >= fallbackList.length) {
      break;
    }
  }

  return images.slice(0, count);
}

/**
 * Generate a Google Images search URL for a headphone
 */
export function getHeadphoneSearchUrl(brand: string, model: string): string {
  const query = encodeURIComponent(`${brand} ${model} headphones`);
  return `https://www.google.com/search?q=${query}&tbm=isch`;
}

/**
 * Simple string hash function for consistent image selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}
