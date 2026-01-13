/**
 * Listening Test Types
 *
 * Type definitions for the "Find My Sound" listening test feature.
 * Covers headphone EQ profiles, user preferences, DSP parameters,
 * and AI-generated sound profile analysis.
 */

// ============================================================================
// Headphone EQ Profile Types
// ============================================================================

export interface FrequencyResponseData {
  bass: number;        // ~60-120Hz deviation from flat (dB)
  lowMids: number;     // ~200-500Hz deviation (dB)
  mids: number;        // ~500Hz-2kHz deviation (dB)
  upperMids: number;   // ~2-4kHz deviation (dB)
  treble: number;      // ~6-10kHz deviation (dB)
  airiness: number;    // ~10-16kHz deviation (dB)
}

export interface CompensationEQ {
  bassGain: number;
  lowMidsGain: number;
  midsGain: number;
  upperMidsGain: number;
  trebleGain: number;
  airinessGain: number;
}

export interface HeadphoneEQProfile {
  id: string;
  brand: string;
  model: string;
  fullName: string;
  frequencyResponse: FrequencyResponseData;
  compensationEQ: CompensationEQ;
  soundSignature: SoundSignatureType;
  imageUrl?: string;
}

export type SoundSignatureType =
  | 'neutral'
  | 'warm'
  | 'bright'
  | 'v-shaped'
  | 'bass-heavy'
  | 'analytical'
  | 'dark'
  | 'balanced';

// ============================================================================
// User Preferences Types
// ============================================================================

export interface ListeningTestPreferences {
  bass: number;        // 0-1, user's preferred bass level
  mids: number;        // 0-1, user's preferred mids level
  treble: number;      // 0-1, user's preferred treble level
  soundstage: number;  // 0-1, user's preferred stereo width
  detail: number;      // 0-1, user's preferred detail/presence
}

export const DEFAULT_PREFERENCES: ListeningTestPreferences = {
  bass: 0.5,
  mids: 0.5,
  treble: 0.5,
  soundstage: 0.5,
  detail: 0.5,
};

// ============================================================================
// DSP Parameter Types
// ============================================================================

export interface DSPParameters {
  bass: number;        // 0-1, maps to lowShelf gain
  mids: number;        // 0-1, maps to peaking filter gain
  treble: number;      // 0-1, maps to highShelf gain
  detail: number;      // 0-1, maps to presence boost
  soundstage: number;  // 0-1, maps to stereo width
}

export interface FilterParams {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
  gain: number;
}

// ============================================================================
// Sound Profile Analysis Types
// ============================================================================

export interface SoundProfileAnalysis {
  profileName: string;           // e.g., "Bass Enthusiast", "Detail Seeker"
  profileDescription: string;    // AI-generated summary
  characteristics: string[];     // Key traits
  recommendedGenres: string[];   // Music genres that match
  soundSignature: string;        // "V-shaped", "warm", etc.
  detailedExplanation: string;   // Long-form AI analysis
  confidenceScore: number;       // 0-1
}

// ============================================================================
// Audio Step Types
// ============================================================================

export type AudioTestStep =
  | 'bass'
  | 'mids'
  | 'treble'
  | 'soundstage'
  | 'detail';

export interface AudioStepConfig {
  id: AudioTestStep;
  title: string;
  subtitle: string;
  description: string;
  audioFile: string;
  leftLabel: string;
  rightLabel: string;
  educationalTip: string;
  icon: string;
}

export const AUDIO_STEP_CONFIGS: Record<AudioTestStep, AudioStepConfig> = {
  bass: {
    id: 'bass',
    title: 'Bass',
    subtitle: 'Low Frequency Preference',
    description: 'Adjust how much low-end rumble and punch you prefer.',
    audioFile: '/audio_dataset/bass/nightfall-future-bass_loop.wav',
    leftLabel: 'Light',
    rightLabel: 'Heavy',
    educationalTip: 'Bass frequencies (20-250Hz) provide warmth, impact, and the physical "feel" of music. Higher bass is great for EDM and hip-hop.',
    icon: '🔊',
  },
  mids: {
    id: 'mids',
    title: 'Mids',
    subtitle: 'Vocal & Instrument Clarity',
    description: 'Adjust the presence of vocals and primary instruments.',
    audioFile: '/audio_dataset/mids/vocal_mids_loop.wav',
    leftLabel: 'Recessed',
    rightLabel: 'Forward',
    educationalTip: 'Midrange frequencies (250Hz-4kHz) carry vocals, guitars, and most musical content. Forward mids make voices more intimate.',
    icon: '🎤',
  },
  treble: {
    id: 'treble',
    title: 'Treble',
    subtitle: 'High Frequency Brilliance',
    description: 'Adjust the sparkle, air, and brightness of the sound.',
    audioFile: '/audio_dataset/mids_detail/soft-piano-music_loop.wav',
    leftLabel: 'Smooth',
    rightLabel: 'Bright',
    educationalTip: 'Treble frequencies (4-20kHz) add shimmer to cymbals, clarity to vocals, and "air" to recordings. Too much can cause fatigue.',
    icon: '✨',
  },
  soundstage: {
    id: 'soundstage',
    title: 'Soundstage',
    subtitle: 'Spatial Width & Depth',
    description: 'Adjust how wide and immersive the sound feels.',
    audioFile: '/audio_dataset/soundstage/soft-background-music_loop.wav',
    leftLabel: 'Intimate',
    rightLabel: 'Expansive',
    educationalTip: 'Soundstage is how "3D" music sounds. Wide soundstage places instruments around you; intimate brings them closer together.',
    icon: '🎧',
  },
  detail: {
    id: 'detail',
    title: 'Detail',
    subtitle: 'Micro-Detail & Texture',
    description: 'Adjust how much fine detail and texture you hear.',
    audioFile: '/audio_dataset/ambient_detail/beautiful-loop_loop.wav',
    leftLabel: 'Musical',
    rightLabel: 'Analytical',
    educationalTip: 'Detail reveals subtle textures: breath sounds, finger slides on strings, room ambience. More detail = more revealing.',
    icon: '🔍',
  },
};

// ============================================================================
// A/B Comparison Types (Perceptual Audio Questionnaire)
// ============================================================================

/**
 * Audio attributes that can be compared in A/B tests
 */
export type AudioAttribute = 'bass' | 'mids' | 'treble' | 'soundstage' | 'detail';

/**
 * Strength of user's preference in an A/B comparison
 */
export type PreferenceStrength = 'slight' | 'moderate' | 'strong';

/**
 * Result of a single A/B comparison test
 */
export interface ABComparisonResult {
  attribute: AudioAttribute;
  trackAPlays: number;
  trackBPlays: number;
  trackAListenDuration: number;  // milliseconds
  trackBListenDuration: number;  // milliseconds
  balancedWasTrackA: boolean;    // for de-randomizing results
  userChoice: 'A' | 'B' | null;
  preferenceStrength: PreferenceStrength | null;
  timestamp: string;
  firstPlayTimestamp: string | null;
  decisionTimestamp: string | null;
}

/**
 * Complete A/B test session data
 */
export interface ABTestSession {
  comparisons: Partial<Record<AudioAttribute, ABComparisonResult>>;
  refinementRankings: AudioAttribute[] | null;
  skipRefinement: boolean;
}

/**
 * Configuration for an A/B comparison step
 */
export interface ABComparisonStepConfig {
  attribute: AudioAttribute;
  title: string;
  subtitle: string;
  icon: string;
}

export const AB_COMPARISON_CONFIGS: Record<AudioAttribute, ABComparisonStepConfig> = {
  bass: {
    attribute: 'bass',
    title: 'Bass',
    subtitle: 'Low-end punch and warmth',
    icon: '🔊',
  },
  mids: {
    attribute: 'mids',
    title: 'Mids',
    subtitle: 'Vocal and instrument presence',
    icon: '🎤',
  },
  treble: {
    attribute: 'treble',
    title: 'Treble',
    subtitle: 'Sparkle and brightness',
    icon: '✨',
  },
  soundstage: {
    attribute: 'soundstage',
    title: 'Soundstage',
    subtitle: 'Spatial width and immersion',
    icon: '🌌',
  },
  detail: {
    attribute: 'detail',
    title: 'Detail',
    subtitle: 'Clarity and micro-textures',
    icon: '🔍',
  },
};

/**
 * Default empty A/B comparison result
 */
export function createEmptyComparisonResult(attribute: AudioAttribute, balancedWasTrackA: boolean): ABComparisonResult {
  return {
    attribute,
    trackAPlays: 0,
    trackBPlays: 0,
    trackAListenDuration: 0,
    trackBListenDuration: 0,
    balancedWasTrackA,
    userChoice: null,
    preferenceStrength: null,
    timestamp: new Date().toISOString(),
    firstPlayTimestamp: null,
    decisionTimestamp: null,
  };
}

/**
 * Default empty A/B test session
 */
export function createEmptyABTestSession(): ABTestSession {
  return {
    comparisons: {},
    refinementRankings: null,
    skipRefinement: false,
  };
}

// ============================================================================
// Wizard Step Types
// ============================================================================

export type ListeningTestStepType =
  | 'headphone-select'
  | 'ab-bass'
  | 'ab-mids'
  | 'ab-treble'
  | 'ab-soundstage'
  | 'ab-detail'
  | 'refinement'
  | 'result';

export const LISTENING_TEST_STEPS: ListeningTestStepType[] = [
  'headphone-select',
  'ab-bass',
  'ab-mids',
  'ab-treble',
  'ab-soundstage',
  'ab-detail',
  'refinement',
  'result',
];

export interface StepInfo {
  step: ListeningTestStepType;
  index: number;
  title: string;
  icon: string;
}

export const STEP_INFO: StepInfo[] = [
  { step: 'headphone-select', index: 0, title: 'Your Headphones', icon: '🎧' },
  { step: 'ab-bass', index: 1, title: 'Bass', icon: '🔊' },
  { step: 'ab-mids', index: 2, title: 'Mids', icon: '🎤' },
  { step: 'ab-treble', index: 3, title: 'Treble', icon: '✨' },
  { step: 'ab-soundstage', index: 4, title: 'Soundstage', icon: '🌌' },
  { step: 'ab-detail', index: 5, title: 'Detail', icon: '🔍' },
  { step: 'refinement', index: 6, title: 'Rank', icon: '🏆' },
  { step: 'result', index: 7, title: 'Your Profile', icon: '📊' },
];

// ============================================================================
// Audio Engine Types
// ============================================================================

export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentAudioFile: string | null;
  error: string | null;
}

export interface AudioEngineControls {
  initialize: () => Promise<void>;
  loadAudio: (url: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  setParameters: (params: Partial<DSPParameters>) => void;
  setHeadphoneCompensation: (compensation: CompensationEQ | null) => void;
  dispose: () => void;
}

// ============================================================================
// API Types
// ============================================================================

export interface ListeningTestAnalysisRequest {
  sessionId: string;
  preferences: ListeningTestPreferences;
  headphoneProfile?: HeadphoneEQProfile;
}

export interface ListeningTestAnalysisResponse {
  sessionId: string;
  analysis: SoundProfileAnalysis;
}

export interface HeadphoneSearchResponse {
  headphones: HeadphoneEQProfile[];
  total: number;
}
