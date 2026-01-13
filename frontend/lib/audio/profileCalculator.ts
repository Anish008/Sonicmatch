/**
 * Profile Calculator
 *
 * Converts A/B comparison results into a sound preference vector.
 * Also calculates confidence scores based on listening behavior.
 */

import type {
  ABComparisonResult,
  ABTestSession,
  AudioAttribute,
  ListeningTestPreferences,
  PreferenceStrength,
  SoundProfileAnalysis,
} from '@/types/listeningTest';

/**
 * Multipliers for preference strength
 * Higher multiplier = stronger deviation from neutral
 */
const STRENGTH_MULTIPLIERS: Record<PreferenceStrength, number> = {
  slight: 0.3,
  moderate: 0.6,
  strong: 1.0,
};

/**
 * Calculate preference score from a single A/B comparison
 *
 * Logic:
 * - If user prefers balanced: score = 0.5 (neutral)
 * - If user prefers modified: score = 0.5 + (strength * 0.5)
 *   - slight: 0.65
 *   - moderate: 0.80
 *   - strong: 1.0
 */
function calculateAttributeScore(comparison: ABComparisonResult): number {
  if (comparison.userChoice === null) {
    return 0.5; // No choice = neutral
  }

  // Determine if user chose the modified version
  const choseModified =
    (comparison.userChoice === 'A' && !comparison.balancedWasTrackA) ||
    (comparison.userChoice === 'B' && comparison.balancedWasTrackA);

  if (!choseModified) {
    // User prefers balanced = neutral on this attribute
    return 0.5;
  }

  // User prefers the modified (emphasized) version
  const strength = comparison.preferenceStrength || 'moderate';
  const multiplier = STRENGTH_MULTIPLIERS[strength];
  return 0.5 + multiplier * 0.5;
}

/**
 * Calculate final preference vector from all A/B comparison results
 */
export function calculateProfileFromComparisons(
  comparisons: Partial<Record<AudioAttribute, ABComparisonResult>>
): ListeningTestPreferences {
  const attributes: AudioAttribute[] = ['bass', 'mids', 'treble', 'soundstage', 'detail'];

  const preferences: ListeningTestPreferences = {
    bass: 0.5,
    mids: 0.5,
    treble: 0.5,
    soundstage: 0.5,
    detail: 0.5,
  };

  for (const attr of attributes) {
    const comparison = comparisons[attr];
    if (comparison) {
      preferences[attr] = calculateAttributeScore(comparison);
    }
  }

  return preferences;
}

/**
 * Apply refinement rankings to adjust final scores
 * Top-ranked attributes get a small boost
 */
export function applyRefinementRankings(
  basePreferences: ListeningTestPreferences,
  rankings: AudioAttribute[]
): ListeningTestPreferences {
  if (!rankings || rankings.length === 0) {
    return basePreferences;
  }

  const adjusted = { ...basePreferences };

  // Boost top-ranked attributes (small adjustment)
  rankings.forEach((attr, index) => {
    const boost = (rankings.length - index) * 0.03;
    adjusted[attr] = Math.min(1, adjusted[attr] + boost);
  });

  return adjusted;
}

/**
 * Calculate confidence score based on listening behavior
 *
 * Higher confidence when:
 * - User listened to both tracks before deciding
 * - User specified preference strength
 * - User spent adequate time listening
 * - User replayed tracks multiple times
 */
export function calculateConfidenceScore(
  comparisons: Partial<Record<AudioAttribute, ABComparisonResult>>
): number {
  const results = Object.values(comparisons).filter(Boolean) as ABComparisonResult[];

  if (results.length === 0) {
    return 0;
  }

  let totalScore = 0;

  for (const comparison of results) {
    let stepScore = 0;

    // Did user listen to both tracks?
    const listenedToBoth = comparison.trackAPlays > 0 && comparison.trackBPlays > 0;
    if (listenedToBoth) {
      stepScore += 0.35;
    }

    // Did user specify preference strength?
    if (comparison.preferenceStrength !== null) {
      stepScore += 0.25;
    }

    // Adequate listening time (at least 5 seconds total)?
    const totalListenTime = comparison.trackAListenDuration + comparison.trackBListenDuration;
    if (totalListenTime > 5000) {
      stepScore += 0.2;
    } else if (totalListenTime > 2000) {
      stepScore += 0.1;
    }

    // Multiple replays indicate careful consideration
    const totalPlays = comparison.trackAPlays + comparison.trackBPlays;
    if (totalPlays >= 4) {
      stepScore += 0.2;
    } else if (totalPlays >= 2) {
      stepScore += 0.1;
    }

    totalScore += stepScore;
  }

  return Math.min(1, totalScore / results.length);
}

/**
 * Determine the primary sound signature based on preferences
 */
function determineSoundSignature(preferences: ListeningTestPreferences): string {
  const { bass, mids, treble, detail } = preferences;

  // Check for V-shaped (high bass and treble, lower mids)
  if (bass > 0.65 && treble > 0.65 && mids < 0.55) {
    return 'V-Shaped';
  }

  // Check for warm (high bass, lower treble)
  if (bass > 0.65 && treble < 0.5) {
    return 'Warm';
  }

  // Check for bright (high treble, lower bass)
  if (treble > 0.65 && bass < 0.5) {
    return 'Bright';
  }

  // Check for analytical (high detail and treble)
  if (detail > 0.7 && treble > 0.55) {
    return 'Analytical';
  }

  // Check for bass-heavy
  if (bass > 0.75) {
    return 'Bass-Heavy';
  }

  // Check for mid-forward
  if (mids > 0.65) {
    return 'Mid-Forward';
  }

  // Default to balanced
  return 'Balanced';
}

/**
 * Get a descriptive profile name based on preferences
 */
function getProfileName(signature: string, preferences: ListeningTestPreferences): string {
  const profileNames: Record<string, string[]> = {
    'V-Shaped': ['Bass & Treble Lover', 'Dynamic Listener', 'Impact Seeker'],
    Warm: ['Warmth Seeker', 'Smooth Sound Lover', 'Bass Enthusiast'],
    Bright: ['Detail Lover', 'Clarity Seeker', 'Treble Enthusiast'],
    Analytical: ['Critical Listener', 'Detail Seeker', 'Studio Ear'],
    'Bass-Heavy': ['Bass Head', 'Low-End Lover', 'Impact Chaser'],
    'Mid-Forward': ['Vocal Lover', 'Intimacy Seeker', 'Mid-Range Enthusiast'],
    Balanced: ['Neutral Listener', 'All-Rounder', 'Versatile Ear'],
  };

  const names = profileNames[signature] || profileNames.Balanced;

  // Pick based on preferences hash
  const hash = Math.abs(
    preferences.bass * 100 +
      preferences.mids * 200 +
      preferences.treble * 300 +
      preferences.soundstage * 400 +
      preferences.detail * 500
  );

  return names[Math.floor(hash) % names.length];
}

/**
 * Get recommended genres based on sound signature
 */
function getRecommendedGenres(signature: string): string[] {
  const genreMap: Record<string, string[]> = {
    'V-Shaped': ['EDM', 'Hip-Hop', 'Pop', 'Rock'],
    Warm: ['R&B', 'Soul', 'Jazz', 'Lo-Fi'],
    Bright: ['Classical', 'Acoustic', 'Folk', 'Indie'],
    Analytical: ['Classical', 'Jazz', 'Acoustic', 'Audiophile Recordings'],
    'Bass-Heavy': ['Hip-Hop', 'EDM', 'Dubstep', 'Trap'],
    'Mid-Forward': ['Vocal Jazz', 'Podcasts', 'Singer-Songwriter', 'Indie'],
    Balanced: ['All Genres', 'Mixed Playlists', 'Variety'],
  };

  return genreMap[signature] || genreMap.Balanced;
}

/**
 * Get profile characteristics based on preferences
 */
function getCharacteristics(preferences: ListeningTestPreferences): string[] {
  const chars: string[] = [];

  if (preferences.bass > 0.65) chars.push('Rich low-end presence');
  else if (preferences.bass < 0.4) chars.push('Light, clean bass');

  if (preferences.mids > 0.65) chars.push('Forward vocals and instruments');
  else if (preferences.mids < 0.4) chars.push('Recessed mid-range');

  if (preferences.treble > 0.65) chars.push('Crisp, airy highs');
  else if (preferences.treble < 0.4) chars.push('Smooth, relaxed treble');

  if (preferences.soundstage > 0.65) chars.push('Wide, immersive sound');
  else if (preferences.soundstage < 0.4) chars.push('Intimate presentation');

  if (preferences.detail > 0.65) chars.push('High micro-detail retrieval');
  else if (preferences.detail < 0.4) chars.push('Smooth, musical presentation');

  // Default if no strong preferences
  if (chars.length === 0) {
    chars.push('Balanced sound signature', 'Versatile across genres');
  }

  return chars;
}

/**
 * Generate detailed explanation based on preferences
 */
function generateDetailedExplanation(
  preferences: ListeningTestPreferences,
  signature: string
): string {
  const { bass, mids, treble, soundstage, detail } = preferences;

  let explanation = `Your listening tests reveal a ${signature.toLowerCase()} sound preference. `;

  if (bass > 0.65) {
    explanation +=
      'You appreciate strong bass response that adds weight and impact to your music. ';
  } else if (bass < 0.4) {
    explanation += 'You prefer a lighter bass presentation that keeps the sound clean and clear. ';
  }

  if (treble > 0.65) {
    explanation +=
      'Bright, detailed highs appeal to you, bringing out the sparkle in recordings. ';
  } else if (treble < 0.4) {
    explanation +=
      'You favor smooth treble that avoids harshness and is easy on the ears for long sessions. ';
  }

  if (soundstage > 0.65) {
    explanation += 'A wide, immersive soundstage helps you feel surrounded by your music. ';
  }

  if (detail > 0.65) {
    explanation +=
      'You value hearing every nuance and micro-detail in your recordings. ';
  }

  explanation +=
    'Based on these preferences, we can find headphones that match your unique sound signature.';

  return explanation;
}

/**
 * Generate full sound profile analysis from A/B test session
 */
export function generateAnalysisFromSession(session: ABTestSession): SoundProfileAnalysis {
  // Calculate base preferences
  let preferences = calculateProfileFromComparisons(session.comparisons);

  // Apply refinement if available
  if (!session.skipRefinement && session.refinementRankings) {
    preferences = applyRefinementRankings(preferences, session.refinementRankings);
  }

  // Calculate confidence
  const confidenceScore = calculateConfidenceScore(session.comparisons);

  // Generate analysis
  const signature = determineSoundSignature(preferences);
  const profileName = getProfileName(signature, preferences);
  const recommendedGenres = getRecommendedGenres(signature);
  const characteristics = getCharacteristics(preferences);
  const detailedExplanation = generateDetailedExplanation(preferences, signature);

  return {
    profileName,
    profileDescription: `You have a ${signature.toLowerCase()} sound preference`,
    characteristics,
    recommendedGenres,
    soundSignature: signature,
    detailedExplanation,
    confidenceScore,
  };
}

/**
 * Generate analysis directly from preferences (for compatibility)
 */
export function generateAnalysisFromPreferences(
  preferences: ListeningTestPreferences,
  confidenceScore = 0.7
): SoundProfileAnalysis {
  const signature = determineSoundSignature(preferences);
  const profileName = getProfileName(signature, preferences);
  const recommendedGenres = getRecommendedGenres(signature);
  const characteristics = getCharacteristics(preferences);
  const detailedExplanation = generateDetailedExplanation(preferences, signature);

  return {
    profileName,
    profileDescription: `You have a ${signature.toLowerCase()} sound preference`,
    characteristics,
    recommendedGenres,
    soundSignature: signature,
    detailedExplanation,
    confidenceScore,
  };
}
