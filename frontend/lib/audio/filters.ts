/**
 * Filter Parameter Mappings & Presets
 *
 * Defines the relationship between UI slider values (0-1)
 * and actual audio DSP parameters (frequencies, gains, Q values).
 */

import type { AudioTestStep } from '@/types/listeningTest';

// ============================================================================
// Filter Constants
// ============================================================================

export const FILTER_FREQUENCIES = {
  BASS: 80,
  LOW_MIDS: 350,
  MIDS: 1500,
  UPPER_MIDS: 3000,
  PRESENCE: 4500,
  TREBLE: 8000,
  AIR: 12000,
} as const;

export const Q_VALUES = {
  SHELF: 0.707,    // Standard shelf Q
  WIDE: 0.8,       // Wide peaking
  MEDIUM: 1.2,     // Standard peaking
  NARROW: 2.5,     // Surgical precision
  VERY_NARROW: 4,  // Notch-like
} as const;

// ============================================================================
// Slider to DSP Mappings
// ============================================================================

/**
 * Convert slider value (0-1) to decibels
 * Default range: -12dB to +12dB
 */
export function sliderToDb(value: number, range = 24): number {
  return (value - 0.5) * range;
}

/**
 * Convert decibels to slider value (0-1)
 */
export function dbToSlider(db: number, range = 24): number {
  return db / range + 0.5;
}

/**
 * Get filter parameters for bass adjustment
 */
export function getBassFilterParams(sliderValue: number) {
  return {
    type: 'lowshelf' as BiquadFilterType,
    frequency: FILTER_FREQUENCIES.BASS,
    gain: sliderToDb(sliderValue),
  };
}

/**
 * Get filter parameters for mids adjustment
 */
export function getMidsFilterParams(sliderValue: number) {
  return {
    type: 'peaking' as BiquadFilterType,
    frequency: FILTER_FREQUENCIES.MIDS,
    Q: Q_VALUES.MEDIUM,
    gain: sliderToDb(sliderValue),
  };
}

/**
 * Get filter parameters for treble adjustment
 */
export function getTrebleFilterParams(sliderValue: number) {
  return {
    type: 'highshelf' as BiquadFilterType,
    frequency: FILTER_FREQUENCIES.TREBLE,
    gain: sliderToDb(sliderValue),
  };
}

/**
 * Get filter parameters for detail/presence adjustment
 */
export function getDetailFilterParams(sliderValue: number) {
  return {
    type: 'peaking' as BiquadFilterType,
    frequency: FILTER_FREQUENCIES.PRESENCE,
    Q: Q_VALUES.NARROW,
    gain: sliderToDb(sliderValue, 16), // Narrower range: -8 to +8dB
  };
}

/**
 * Get stereo width factor from slider
 * 0 = intimate/narrow
 * 0.5 = normal stereo
 * 1 = enhanced width
 */
export function getSoundstageWidth(sliderValue: number): number {
  if (sliderValue <= 0.5) {
    // Narrow: 0.7 to 1.0
    return 0.7 + sliderValue * 0.6;
  } else {
    // Wide: 1.0 to 1.25
    return 1 + (sliderValue - 0.5) * 0.5;
  }
}

// ============================================================================
// Audio Files per Step
// ============================================================================

export const AUDIO_FILES: Record<AudioTestStep, string> = {
  bass: '/audio_dataset/bass/nightfall-future-bass_loop.wav',
  mids: '/audio_dataset/mids/vocal_mids_loop.wav',
  treble: '/audio_dataset/mids_detail/soft-piano-music_loop.wav',
  soundstage: '/audio_dataset/soundstage/soft-background-music_loop.wav',
  detail: '/audio_dataset/ambient_detail/beautiful-loop_loop.wav',
};

export const FULL_RANGE_AUDIO = '/audio_dataset/full_range/balanced_fullrange_loop.wav';

// ============================================================================
// Sound Profile Presets
// ============================================================================

export interface SoundPreset {
  name: string;
  description: string;
  values: {
    bass: number;
    mids: number;
    treble: number;
    soundstage: number;
    detail: number;
  };
}

export const SOUND_PRESETS: SoundPreset[] = [
  {
    name: 'Neutral',
    description: 'Flat, reference-like response',
    values: { bass: 0.5, mids: 0.5, treble: 0.5, soundstage: 0.5, detail: 0.5 },
  },
  {
    name: 'Bass Boost',
    description: 'Enhanced low-end for EDM, hip-hop',
    values: { bass: 0.75, mids: 0.45, treble: 0.5, soundstage: 0.55, detail: 0.45 },
  },
  {
    name: 'V-Shape',
    description: 'Boosted bass and treble, recessed mids',
    values: { bass: 0.7, mids: 0.35, treble: 0.7, soundstage: 0.6, detail: 0.55 },
  },
  {
    name: 'Warm',
    description: 'Rich bass, smooth highs, intimate',
    values: { bass: 0.65, mids: 0.55, treble: 0.35, soundstage: 0.4, detail: 0.45 },
  },
  {
    name: 'Bright',
    description: 'Elevated treble, airy and detailed',
    values: { bass: 0.45, mids: 0.5, treble: 0.7, soundstage: 0.6, detail: 0.7 },
  },
  {
    name: 'Vocal Focus',
    description: 'Forward mids for vocals and acoustic',
    values: { bass: 0.4, mids: 0.7, treble: 0.55, soundstage: 0.45, detail: 0.6 },
  },
  {
    name: 'Analytical',
    description: 'Maximum detail and clarity',
    values: { bass: 0.4, mids: 0.55, treble: 0.6, soundstage: 0.7, detail: 0.8 },
  },
  {
    name: 'Immersive',
    description: 'Wide soundstage, cinematic feel',
    values: { bass: 0.55, mids: 0.45, treble: 0.55, soundstage: 0.85, detail: 0.55 },
  },
];

// ============================================================================
// Profile Analysis Helpers
// ============================================================================

export type SoundCharacteristic =
  | 'bass-heavy'
  | 'bass-light'
  | 'mid-forward'
  | 'mid-recessed'
  | 'bright'
  | 'dark'
  | 'wide-soundstage'
  | 'intimate'
  | 'detailed'
  | 'smooth';

/**
 * Analyze user preferences and return characteristics
 */
export function analyzePreferences(preferences: {
  bass: number;
  mids: number;
  treble: number;
  soundstage: number;
  detail: number;
}): SoundCharacteristic[] {
  const characteristics: SoundCharacteristic[] = [];

  // Bass analysis
  if (preferences.bass > 0.65) {
    characteristics.push('bass-heavy');
  } else if (preferences.bass < 0.35) {
    characteristics.push('bass-light');
  }

  // Mids analysis
  if (preferences.mids > 0.6) {
    characteristics.push('mid-forward');
  } else if (preferences.mids < 0.4) {
    characteristics.push('mid-recessed');
  }

  // Treble analysis
  if (preferences.treble > 0.6) {
    characteristics.push('bright');
  } else if (preferences.treble < 0.4) {
    characteristics.push('dark');
  }

  // Soundstage analysis
  if (preferences.soundstage > 0.65) {
    characteristics.push('wide-soundstage');
  } else if (preferences.soundstage < 0.35) {
    characteristics.push('intimate');
  }

  // Detail analysis
  if (preferences.detail > 0.6) {
    characteristics.push('detailed');
  } else if (preferences.detail < 0.4) {
    characteristics.push('smooth');
  }

  return characteristics;
}

/**
 * Determine the closest sound signature based on preferences
 */
export function determineSoundSignature(preferences: {
  bass: number;
  mids: number;
  treble: number;
}): string {
  const { bass, mids, treble } = preferences;

  // V-Shape: high bass and treble, lower mids
  if (bass > 0.6 && treble > 0.6 && mids < 0.5) {
    return 'V-Shaped';
  }

  // Warm: elevated bass, smooth treble
  if (bass > 0.55 && treble < 0.45) {
    return 'Warm';
  }

  // Bright: elevated treble
  if (treble > 0.6 && bass < 0.55) {
    return 'Bright';
  }

  // Bass-heavy
  if (bass > 0.7) {
    return 'Bass-Heavy';
  }

  // Mid-forward
  if (mids > 0.6) {
    return 'Mid-Forward';
  }

  // Dark: reduced treble
  if (treble < 0.35) {
    return 'Dark';
  }

  // Neutral/Balanced
  const avgDeviation =
    (Math.abs(bass - 0.5) + Math.abs(mids - 0.5) + Math.abs(treble - 0.5)) / 3;

  if (avgDeviation < 0.1) {
    return 'Neutral';
  }

  return 'Balanced';
}

/**
 * Get recommended genres based on sound signature
 */
export function getRecommendedGenres(signature: string): string[] {
  const genreMap: Record<string, string[]> = {
    'V-Shaped': ['EDM', 'Pop', 'Hip-Hop', 'Electronic'],
    Warm: ['Jazz', 'R&B', 'Soul', 'Acoustic', 'Classical'],
    Bright: ['Classical', 'Acoustic', 'Indie', 'Folk'],
    'Bass-Heavy': ['Hip-Hop', 'EDM', 'Dubstep', 'Trap'],
    'Mid-Forward': ['Vocal', 'Rock', 'Podcast', 'Acoustic'],
    Dark: ['Metal', 'Industrial', 'Ambient'],
    Neutral: ['All genres', 'Studio monitoring', 'Critical listening'],
    Balanced: ['Rock', 'Pop', 'Indie', 'Alternative'],
  };

  return genreMap[signature] || ['Various'];
}
