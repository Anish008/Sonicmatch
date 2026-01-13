/**
 * Reference Audio Configuration
 *
 * Paths to pre-rendered audio references for the A/B comparison test.
 * All tracks are:
 * - Same 12-second segment
 * - Loudness-matched
 * - Derived from the same source
 */

import type { AudioAttribute } from '@/types/listeningTest';

/**
 * Paths to reference audio files
 */
export const REFERENCE_AUDIO_PATHS = {
  balanced: '/audio/references/balanced_reference.wav',
  bass: '/audio/references/bass_reference.wav',
  mids: '/audio/references/mids_reference.wav',
  treble: '/audio/references/treble_reference.wav',
  soundstage: '/audio/references/soundstage_reference.wav',
  detail: '/audio/references/detail_reference.wav',
} as const;

export type ReferenceAudioKey = keyof typeof REFERENCE_AUDIO_PATHS;

/**
 * Get the audio paths for an A/B comparison step
 */
export function getComparisonAudioPaths(attribute: AudioAttribute): {
  balanced: string;
  modified: string;
} {
  return {
    balanced: REFERENCE_AUDIO_PATHS.balanced,
    modified: REFERENCE_AUDIO_PATHS[attribute],
  };
}

/**
 * Determine if balanced track should be Track A based on session ID and attribute
 * Uses a simple hash for deterministic but varied ordering per session
 */
export function shouldBalancedBeTrackA(sessionId: string, attribute: AudioAttribute): boolean {
  // Simple hash: sum of char codes
  const combined = `${sessionId}-${attribute}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 2 === 0;
}

/**
 * Get the A/B track paths for a comparison, with randomized order
 */
export function getABTrackPaths(
  sessionId: string,
  attribute: AudioAttribute
): {
  trackA: string;
  trackB: string;
  balancedIsTrackA: boolean;
} {
  const { balanced, modified } = getComparisonAudioPaths(attribute);
  const balancedIsTrackA = shouldBalancedBeTrackA(sessionId, attribute);

  return {
    trackA: balancedIsTrackA ? balanced : modified,
    trackB: balancedIsTrackA ? modified : balanced,
    balancedIsTrackA,
  };
}

/**
 * All audio attribute keys in test order
 */
export const AUDIO_ATTRIBUTES: AudioAttribute[] = [
  'bass',
  'mids',
  'treble',
  'soundstage',
  'detail',
];
