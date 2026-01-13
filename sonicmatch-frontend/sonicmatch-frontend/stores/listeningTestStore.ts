/**
 * Listening Test Store
 *
 * Zustand store for managing the "Find My Sound" listening test state.
 * Handles step navigation, A/B comparisons, user preferences, and analysis results.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  ListeningTestPreferences,
  HeadphoneEQProfile,
  SoundProfileAnalysis,
  ListeningTestStepType,
  AudioAttribute,
  PreferenceStrength,
  ABComparisonResult,
  ABTestSession,
} from '@/types/listeningTest';
import { createEmptyABTestSession, createEmptyComparisonResult } from '@/types/listeningTest';
import { shouldBalancedBeTrackA } from '@/lib/audio/referenceAudioConfig';
import {
  calculateProfileFromComparisons,
  calculateConfidenceScore,
  generateAnalysisFromPreferences,
  applyRefinementRankings,
} from '@/lib/audio/profileCalculator';

// ============================================================================
// State Interface
// ============================================================================

interface ListeningTestState {
  // Navigation
  currentStep: number;
  totalSteps: number;

  // Audio State
  isPlaying: boolean;
  volume: number;

  // Headphone Selection
  selectedHeadphone: HeadphoneEQProfile | null;
  headphoneSearchQuery: string;

  // A/B Comparison State (NEW)
  abTestSession: ABTestSession;
  activeTrack: 'A' | 'B' | null;

  // User Preferences (calculated from comparisons)
  preferences: ListeningTestPreferences;

  // Analysis
  isAnalyzing: boolean;
  analysisResult: SoundProfileAnalysis | null;
  analysisError: string | null;

  // Session
  testSessionId: string | null;
  testStartedAt: string | null;
  testCompletedAt: string | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

interface ListeningTestActions {
  // Navigation
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepType: ListeningTestStepType) => void;

  // Audio
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setActiveTrack: (track: 'A' | 'B' | null) => void;

  // Headphone
  setSelectedHeadphone: (headphone: HeadphoneEQProfile | null) => void;
  setHeadphoneSearchQuery: (query: string) => void;
  clearHeadphoneSelection: () => void;

  // A/B Comparison Actions (NEW)
  initializeComparison: (attribute: AudioAttribute) => void;
  recordTrackPlay: (track: 'A' | 'B') => void;
  recordTrackStop: (track: 'A' | 'B', duration: number) => void;
  setUserChoice: (attribute: AudioAttribute, choice: 'A' | 'B') => void;
  setPreferenceStrength: (attribute: AudioAttribute, strength: PreferenceStrength | null) => void;
  getComparisonResult: (attribute: AudioAttribute) => ABComparisonResult | null;

  // Refinement
  setRefinementRankings: (rankings: AudioAttribute[]) => void;
  skipRefinement: () => void;

  // Preferences (for compatibility)
  setPreference: (key: keyof ListeningTestPreferences, value: number) => void;
  setPreferences: (preferences: Partial<ListeningTestPreferences>) => void;
  resetPreferences: () => void;

  // Profile Calculation
  calculateFinalPreferences: () => void;

  // Analysis
  setAnalyzing: (analyzing: boolean) => void;
  setAnalysisResult: (result: SoundProfileAnalysis | null) => void;
  setAnalysisError: (error: string | null) => void;

  // Session
  startSession: () => string;
  completeSession: () => void;
  resetTest: () => void;
}

// ============================================================================
// Combined Store Type
// ============================================================================

type ListeningTestStore = ListeningTestState & ListeningTestActions;

// ============================================================================
// Default Values
// ============================================================================

const defaultPreferences: ListeningTestPreferences = {
  bass: 0.5,
  mids: 0.5,
  treble: 0.5,
  soundstage: 0.5,
  detail: 0.5,
};

const initialState: ListeningTestState = {
  currentStep: 0,
  totalSteps: 8, // 0: Headphone, 1-5: A/B Tests, 6: Refinement, 7: Results

  isPlaying: false,
  volume: 0.7,

  selectedHeadphone: null,
  headphoneSearchQuery: '',

  abTestSession: createEmptyABTestSession(),
  activeTrack: null,

  preferences: defaultPreferences,

  isAnalyzing: false,
  analysisResult: null,
  analysisError: null,

  testSessionId: null,
  testStartedAt: null,
  testCompletedAt: null,
};

// ============================================================================
// Step Type Mapping (Updated for A/B flow)
// ============================================================================

const STEP_TYPE_TO_INDEX: Record<ListeningTestStepType, number> = {
  'headphone-select': 0,
  'ab-bass': 1,
  'ab-mids': 2,
  'ab-treble': 3,
  'ab-soundstage': 4,
  'ab-detail': 5,
  'refinement': 6,
  'result': 7,
};

const INDEX_TO_STEP_TYPE: ListeningTestStepType[] = [
  'headphone-select',
  'ab-bass',
  'ab-mids',
  'ab-treble',
  'ab-soundstage',
  'ab-detail',
  'refinement',
  'result',
];

// ============================================================================
// Store Implementation
// ============================================================================

export const useListeningTestStore = create<ListeningTestStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...initialState,

        // ====================================================================
        // Navigation Actions
        // ====================================================================

        setStep: (step) =>
          set(
            { currentStep: Math.max(0, Math.min(step, get().totalSteps - 1)) },
            false,
            'setStep'
          ),

        nextStep: () => {
          const { currentStep, totalSteps } = get();
          if (currentStep < totalSteps - 1) {
            set({ currentStep: currentStep + 1 }, false, 'nextStep');
          }
        },

        prevStep: () => {
          const { currentStep } = get();
          if (currentStep > 0) {
            set({ currentStep: currentStep - 1 }, false, 'prevStep');
          }
        },

        goToStep: (stepType) => {
          const index = STEP_TYPE_TO_INDEX[stepType];
          if (index !== undefined) {
            set({ currentStep: index }, false, 'goToStep');
          }
        },

        // ====================================================================
        // Audio Actions
        // ====================================================================

        setPlaying: (isPlaying) => set({ isPlaying }, false, 'setPlaying'),

        setVolume: (volume) =>
          set({ volume: Math.max(0, Math.min(1, volume)) }, false, 'setVolume'),

        setActiveTrack: (activeTrack) => set({ activeTrack }, false, 'setActiveTrack'),

        // ====================================================================
        // Headphone Actions
        // ====================================================================

        setSelectedHeadphone: (headphone) =>
          set({ selectedHeadphone: headphone }, false, 'setSelectedHeadphone'),

        setHeadphoneSearchQuery: (query) =>
          set({ headphoneSearchQuery: query }, false, 'setHeadphoneSearchQuery'),

        clearHeadphoneSelection: () =>
          set(
            { selectedHeadphone: null, headphoneSearchQuery: '' },
            false,
            'clearHeadphoneSelection'
          ),

        // ====================================================================
        // A/B Comparison Actions (NEW)
        // ====================================================================

        initializeComparison: (attribute) => {
          const { testSessionId, abTestSession } = get();
          if (!testSessionId) return;

          // Only initialize if not already initialized
          if (abTestSession.comparisons[attribute]) return;

          const balancedWasTrackA = shouldBalancedBeTrackA(testSessionId, attribute);
          const comparison = createEmptyComparisonResult(attribute, balancedWasTrackA);

          set(
            (state) => ({
              abTestSession: {
                ...state.abTestSession,
                comparisons: {
                  ...state.abTestSession.comparisons,
                  [attribute]: comparison,
                },
              },
            }),
            false,
            'initializeComparison'
          );
        },

        recordTrackPlay: (track) => {
          const stepType = selectCurrentStepType(get());
          const attribute = getAttributeFromStepType(stepType);
          if (!attribute) return;

          set(
            (state) => {
              const comparison = state.abTestSession.comparisons[attribute];
              if (!comparison) return state;

              const updatedComparison = {
                ...comparison,
                [track === 'A' ? 'trackAPlays' : 'trackBPlays']:
                  comparison[track === 'A' ? 'trackAPlays' : 'trackBPlays'] + 1,
                firstPlayTimestamp:
                  comparison.firstPlayTimestamp || new Date().toISOString(),
              };

              return {
                abTestSession: {
                  ...state.abTestSession,
                  comparisons: {
                    ...state.abTestSession.comparisons,
                    [attribute]: updatedComparison,
                  },
                },
                activeTrack: track,
                isPlaying: true,
              };
            },
            false,
            'recordTrackPlay'
          );
        },

        recordTrackStop: (track, duration) => {
          const stepType = selectCurrentStepType(get());
          const attribute = getAttributeFromStepType(stepType);
          if (!attribute) return;

          set(
            (state) => {
              const comparison = state.abTestSession.comparisons[attribute];
              if (!comparison) return state;

              const durationKey = track === 'A' ? 'trackAListenDuration' : 'trackBListenDuration';
              const updatedComparison = {
                ...comparison,
                [durationKey]: comparison[durationKey] + duration,
              };

              return {
                abTestSession: {
                  ...state.abTestSession,
                  comparisons: {
                    ...state.abTestSession.comparisons,
                    [attribute]: updatedComparison,
                  },
                },
                isPlaying: false,
              };
            },
            false,
            'recordTrackStop'
          );
        },

        setUserChoice: (attribute, choice) => {
          set(
            (state) => {
              const comparison = state.abTestSession.comparisons[attribute];
              if (!comparison) return state;

              const updatedComparison = {
                ...comparison,
                userChoice: choice,
                decisionTimestamp: new Date().toISOString(),
              };

              return {
                abTestSession: {
                  ...state.abTestSession,
                  comparisons: {
                    ...state.abTestSession.comparisons,
                    [attribute]: updatedComparison,
                  },
                },
              };
            },
            false,
            'setUserChoice'
          );
        },

        setPreferenceStrength: (attribute, strength) => {
          set(
            (state) => {
              const comparison = state.abTestSession.comparisons[attribute];
              if (!comparison) return state;

              const updatedComparison = {
                ...comparison,
                preferenceStrength: strength,
              };

              return {
                abTestSession: {
                  ...state.abTestSession,
                  comparisons: {
                    ...state.abTestSession.comparisons,
                    [attribute]: updatedComparison,
                  },
                },
              };
            },
            false,
            'setPreferenceStrength'
          );
        },

        getComparisonResult: (attribute) => {
          return get().abTestSession.comparisons[attribute] || null;
        },

        // ====================================================================
        // Refinement Actions
        // ====================================================================

        setRefinementRankings: (rankings) => {
          set(
            (state) => ({
              abTestSession: {
                ...state.abTestSession,
                refinementRankings: rankings,
                skipRefinement: false,
              },
            }),
            false,
            'setRefinementRankings'
          );
        },

        skipRefinement: () => {
          set(
            (state) => ({
              abTestSession: {
                ...state.abTestSession,
                skipRefinement: true,
              },
            }),
            false,
            'skipRefinement'
          );
        },

        // ====================================================================
        // Profile Calculation
        // ====================================================================

        calculateFinalPreferences: () => {
          const { abTestSession } = get();

          // Calculate preferences from A/B comparisons
          let preferences = calculateProfileFromComparisons(abTestSession.comparisons);
          const confidenceScore = calculateConfidenceScore(abTestSession.comparisons);

          // Apply refinement rankings if user provided them
          if (!abTestSession.skipRefinement && abTestSession.refinementRankings && abTestSession.refinementRankings.length > 0) {
            preferences = applyRefinementRankings(preferences, abTestSession.refinementRankings);
          }

          // Generate analysis
          const analysisResult = generateAnalysisFromPreferences(preferences, confidenceScore);

          set(
            {
              preferences,
              analysisResult,
              isAnalyzing: false,
            },
            false,
            'calculateFinalPreferences'
          );
        },

        // ====================================================================
        // Preference Actions (for compatibility)
        // ====================================================================

        setPreference: (key, value) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                [key]: Math.max(0, Math.min(1, value)),
              },
            }),
            false,
            'setPreference'
          ),

        setPreferences: (preferences) =>
          set(
            (state) => ({
              preferences: {
                ...state.preferences,
                ...preferences,
              },
            }),
            false,
            'setPreferences'
          ),

        resetPreferences: () =>
          set({ preferences: defaultPreferences }, false, 'resetPreferences'),

        // ====================================================================
        // Analysis Actions
        // ====================================================================

        setAnalyzing: (isAnalyzing) =>
          set({ isAnalyzing }, false, 'setAnalyzing'),

        setAnalysisResult: (result) =>
          set(
            { analysisResult: result, isAnalyzing: false, analysisError: null },
            false,
            'setAnalysisResult'
          ),

        setAnalysisError: (error) =>
          set(
            { analysisError: error, isAnalyzing: false },
            false,
            'setAnalysisError'
          ),

        // ====================================================================
        // Session Actions
        // ====================================================================

        startSession: () => {
          const sessionId = `lt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          set(
            {
              testSessionId: sessionId,
              testStartedAt: new Date().toISOString(),
              testCompletedAt: null,
              abTestSession: createEmptyABTestSession(),
            },
            false,
            'startSession'
          );
          return sessionId;
        },

        completeSession: () =>
          set(
            { testCompletedAt: new Date().toISOString() },
            false,
            'completeSession'
          ),

        resetTest: () =>
          set(
            {
              ...initialState,
              // Keep volume preference
              volume: get().volume,
            },
            false,
            'resetTest'
          ),
      }),
      {
        name: 'sonicmatch-listening-test',
        // Only persist essential data
        partialize: (state) => ({
          selectedHeadphone: state.selectedHeadphone,
          preferences: state.preferences,
          analysisResult: state.analysisResult,
          volume: state.volume,
          testSessionId: state.testSessionId,
          abTestSession: state.abTestSession,
        }),
      }
    ),
    { name: 'ListeningTestStore' }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get audio attribute from step type
 */
function getAttributeFromStepType(stepType: ListeningTestStepType): AudioAttribute | null {
  const mapping: Partial<Record<ListeningTestStepType, AudioAttribute>> = {
    'ab-bass': 'bass',
    'ab-mids': 'mids',
    'ab-treble': 'treble',
    'ab-soundstage': 'soundstage',
    'ab-detail': 'detail',
  };
  return mapping[stepType] || null;
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get current step type from index
 */
export const selectCurrentStepType = (state: ListeningTestStore): ListeningTestStepType =>
  INDEX_TO_STEP_TYPE[state.currentStep] || 'headphone-select';

/**
 * Calculate progress percentage (0-100)
 */
export const selectProgress = (state: ListeningTestStore): number =>
  (state.currentStep / (state.totalSteps - 1)) * 100;

/**
 * Get current A/B attribute
 */
export const selectCurrentABAttribute = (state: ListeningTestStore): AudioAttribute | null => {
  const stepType = selectCurrentStepType(state);
  return getAttributeFromStepType(stepType);
};

/**
 * Get current comparison result
 */
export const selectCurrentComparison = (state: ListeningTestStore): ABComparisonResult | null => {
  const attribute = selectCurrentABAttribute(state);
  if (!attribute) return null;
  return state.abTestSession.comparisons[attribute] || null;
};

/**
 * Check if user can proceed to next step
 */
export const selectCanProceed = (state: ListeningTestStore): boolean => {
  const { currentStep } = state;
  const stepType = selectCurrentStepType(state);

  switch (stepType) {
    case 'headphone-select':
      return true; // Optional, can skip

    case 'ab-bass':
    case 'ab-mids':
    case 'ab-treble':
    case 'ab-soundstage':
    case 'ab-detail': {
      // Must have made a choice
      const attribute = getAttributeFromStepType(stepType);
      if (!attribute) return false;
      const comparison = state.abTestSession.comparisons[attribute];
      return comparison?.userChoice !== null;
    }

    case 'refinement':
      return true; // Can skip refinement

    case 'result':
      return false; // Final step

    default:
      return false;
  }
};

/**
 * Check if all A/B comparisons are complete
 */
export const selectAllComparisonsComplete = (state: ListeningTestStore): boolean => {
  const attributes: AudioAttribute[] = ['bass', 'mids', 'treble', 'soundstage', 'detail'];
  return attributes.every((attr) => {
    const comparison = state.abTestSession.comparisons[attr];
    return comparison?.userChoice !== null;
  });
};

/**
 * Check if test is complete (all audio steps done)
 */
export const selectIsTestComplete = (state: ListeningTestStore): boolean =>
  state.currentStep >= 7;

/**
 * Get step info for progress indicator
 */
export const selectStepInfo = (state: ListeningTestStore) => ({
  current: state.currentStep,
  total: state.totalSteps,
  stepType: selectCurrentStepType(state),
  isFirstStep: state.currentStep === 0,
  isLastStep: state.currentStep === state.totalSteps - 1,
  isABStep: state.currentStep >= 1 && state.currentStep <= 5,
  isRefinementStep: state.currentStep === 6,
});

/**
 * Get the audio test step parameter key for current step (for compatibility)
 */
export const selectCurrentAudioParam = (
  state: ListeningTestStore
): keyof ListeningTestPreferences | null => {
  return selectCurrentABAttribute(state);
};

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook for getting current step's preference value (for compatibility)
 */
export function useCurrentStepPreference() {
  const preferences = useListeningTestStore((s) => s.preferences);
  const currentStep = useListeningTestStore((s) => s.currentStep);
  const setPreference = useListeningTestStore((s) => s.setPreference);

  const paramKey = selectCurrentAudioParam({ currentStep } as ListeningTestStore);

  return {
    value: paramKey ? preferences[paramKey] : 0.5,
    setValue: (value: number) => {
      if (paramKey) {
        setPreference(paramKey, value);
      }
    },
    paramKey,
  };
}
