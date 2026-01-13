import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================

export type Genre =
  | 'rock'
  | 'classical'
  | 'jazz'
  | 'electronic'
  | 'hip_hop'
  | 'pop'
  | 'metal'
  | 'indie'
  | 'rnb'
  | 'acoustic'
  | 'country'
  | 'soul'
  | 'reggae'
  | 'blues'
  | 'latin';

export type UseCase =
  | 'studio'
  | 'gaming'
  | 'travel'
  | 'casual'
  | 'workout'
  | 'audiophile'
  | 'office';

export type HeadphoneType = 'over_ear' | 'on_ear' | 'in_ear' | 'earbuds';

export interface SoundPreferences {
  bass: number; // 0-1
  mids: number;
  treble: number;
  soundstage: number;
  detail: number;
}

export interface UserPreferences {
  genres: Genre[];
  favoriteArtists: string[];
  favoriteTracks: { name: string; artist: string }[];
  hoursPerDay: number;
  primarySource: string;
  listeningEnvironment: string;
  soundPreferences: SoundPreferences;
  primaryUseCase: UseCase;
  secondaryUseCases: UseCase[];
  budgetMin: number;
  budgetMax: number;
  preferredType: HeadphoneType | null;
  openBackAcceptable: boolean;
  wirelessRequired: boolean;
  ancRequired: boolean;
  additionalNotes: string;
}

export interface HeadphoneMatch {
  id: string;
  rank: number;
  headphone: {
    id: string;
    brand: string;
    model: string;
    fullName: string;
    slug: string;
    headphoneType: HeadphoneType;
    backType: 'open' | 'closed' | 'semi_open';
    isWireless: boolean;
    hasAnc: boolean;
    priceUsd: number;
    priceTier: string;
    imageUrl: string;
    soundSignature: string;
    description: string;
    keyFeatures: string[];
    pros: string[];
    cons: string[];
  };
  scores: {
    overall: number;
    genreMatch: number;
    soundProfile: number;
    useCase: number;
    budget: number;
    featureMatch: number;
  };
  explanation: string;
  personalizedPros: string[];
  personalizedCons: string[];
  matchHighlights: string[];
}

export interface RecommendationSession {
  id: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  recommendations: HeadphoneMatch[];
  createdAt: string;
  processingTimeMs?: number;
}

// ============================================
// Wizard Store
// ============================================

interface WizardState {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  preferences: UserPreferences;
  
  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  toggleGenre: (genre: Genre) => void;
  addArtist: (artist: string) => void;
  removeArtist: (artist: string) => void;
  addTrack: (track: { name: string; artist: string }) => void;
  removeTrack: (trackName: string) => void;
  setSoundPreference: (key: keyof SoundPreferences, value: number) => void;
  toggleUseCase: (useCase: UseCase) => void;
  setBudget: (min: number, max: number) => void;
  resetWizard: () => void;
  completeWizard: () => void;
}

const defaultPreferences: UserPreferences = {
  genres: [],
  favoriteArtists: [],
  favoriteTracks: [],
  hoursPerDay: 2,
  primarySource: 'streaming',
  listeningEnvironment: 'mixed',
  soundPreferences: {
    bass: 0.5,
    mids: 0.5,
    treble: 0.5,
    soundstage: 0.5,
    detail: 0.5,
  },
  primaryUseCase: 'casual',
  secondaryUseCases: [],
  budgetMin: 100,
  budgetMax: 400,
  preferredType: null,
  openBackAcceptable: true,
  wirelessRequired: false,
  ancRequired: false,
  additionalNotes: '',
};

export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      (set, get) => ({
        currentStep: 0,
        totalSteps: 6,
        isComplete: false,
        preferences: defaultPreferences,
        
        setStep: (step) => set({ currentStep: Math.max(0, Math.min(step, get().totalSteps - 1)) }),
        
        nextStep: () => {
          const { currentStep, totalSteps } = get();
          if (currentStep < totalSteps - 1) {
            set({ currentStep: currentStep + 1 });
          }
        },
        
        prevStep: () => {
          const { currentStep } = get();
          if (currentStep > 0) {
            set({ currentStep: currentStep - 1 });
          }
        },
        
        updatePreferences: (updates) => set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),
        
        toggleGenre: (genre) => set((state) => {
          const genres = state.preferences.genres.includes(genre)
            ? state.preferences.genres.filter((g) => g !== genre)
            : [...state.preferences.genres, genre];
          return { preferences: { ...state.preferences, genres } };
        }),
        
        addArtist: (artist) => set((state) => {
          if (state.preferences.favoriteArtists.includes(artist)) return state;
          return {
            preferences: {
              ...state.preferences,
              favoriteArtists: [...state.preferences.favoriteArtists, artist],
            },
          };
        }),
        
        removeArtist: (artist) => set((state) => ({
          preferences: {
            ...state.preferences,
            favoriteArtists: state.preferences.favoriteArtists.filter((a) => a !== artist),
          },
        })),

        addTrack: (track) => set((state) => {
          if (state.preferences.favoriteTracks.some(t => t.name === track.name && t.artist === track.artist)) {
            return state;
          }
          return {
            preferences: {
              ...state.preferences,
              favoriteTracks: [...state.preferences.favoriteTracks, track],
            },
          };
        }),

        removeTrack: (trackName) => set((state) => ({
          preferences: {
            ...state.preferences,
            favoriteTracks: state.preferences.favoriteTracks.filter((t) => t.name !== trackName),
          },
        })),

        setSoundPreference: (key, value) => set((state) => ({
          preferences: {
            ...state.preferences,
            soundPreferences: {
              ...state.preferences.soundPreferences,
              [key]: Math.max(0, Math.min(1, value)),
            },
          },
        })),
        
        toggleUseCase: (useCase) => set((state) => {
          // If toggling primary, swap with first secondary
          if (useCase === state.preferences.primaryUseCase) return state;
          
          const secondaryUseCases = state.preferences.secondaryUseCases.includes(useCase)
            ? state.preferences.secondaryUseCases.filter((u) => u !== useCase)
            : [...state.preferences.secondaryUseCases, useCase].slice(0, 3);
          
          return {
            preferences: { ...state.preferences, secondaryUseCases },
          };
        }),
        
        setBudget: (min, max) => set((state) => ({
          preferences: {
            ...state.preferences,
            budgetMin: Math.max(0, min),
            budgetMax: Math.max(min, max),
          },
        })),
        
        resetWizard: () => set({
          currentStep: 0,
          isComplete: false,
          preferences: defaultPreferences,
        }),
        
        completeWizard: () => set({ isComplete: true }),
      }),
      {
        name: 'sonicmatch-wizard',
        partialize: (state) => ({
          preferences: state.preferences,
          isComplete: state.isComplete,
        }),
      }
    ),
    { name: 'WizardStore' }
  )
);

// ============================================
// Recommendations Store
// ============================================

interface RecommendationsState {
  session: RecommendationSession | null;
  compareList: string[]; // headphone IDs
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSession: (session: RecommendationSession) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  clearSession: () => void;
}

export const useRecommendationsStore = create<RecommendationsState>()(
  devtools(
    persist(
      (set, get) => ({
        session: null,
        compareList: [],
        isLoading: false,
        error: null,

        setSession: (session) => set({ session, isLoading: false, error: null }),

        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error, isLoading: false }),

        addToCompare: (id) => set((state) => {
          if (state.compareList.includes(id)) return state;
          if (state.compareList.length >= 4) return state; // Max 4 to compare
          return { compareList: [...state.compareList, id] };
        }),

        removeFromCompare: (id) => set((state) => ({
          compareList: state.compareList.filter((cId) => cId !== id),
        })),

        clearCompare: () => set({ compareList: [] }),

        clearSession: () => set({ session: null, compareList: [] }),
      }),
      {
        name: 'sonicmatch-recommendations',
        partialize: (state) => ({
          compareList: state.compareList,
        }),
      }
    ),
    { name: 'RecommendationsStore' }
  )
);

// ============================================
// UI Store (ephemeral state)
// ============================================

interface UIState {
  isMobileMenuOpen: boolean;
  activeModal: string | null;
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>;
  
  // Actions
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (type: UIState['toasts'][0]['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      isMobileMenuOpen: false,
      activeModal: null,
      toasts: [],
      
      toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      
      closeMobileMenu: () => set({ isMobileMenuOpen: false }),
      
      openModal: (modalId) => set({ activeModal: modalId }),
      
      closeModal: () => set({ activeModal: null }),
      
      addToast: (type, message) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          toasts: [...state.toasts, { id, type, message }],
        }));
        // Auto-remove after 5 seconds
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 5000);
      },
      
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),
    }),
    { name: 'UIStore' }
  )
);

// ============================================
// Selectors (derived state)
// ============================================

export const selectWizardProgress = (state: WizardState) =>
  ((state.currentStep + 1) / state.totalSteps) * 100;

export const selectCanProceed = (state: WizardState): boolean => {
  const { currentStep, preferences } = state;
  
  switch (currentStep) {
    case 0: // Genres
      return preferences.genres.length >= 1;
    case 1: // Artists (optional but encouraged)
      return true;
    case 2: // Sound preferences
      return true;
    case 3: // Use case
      return !!preferences.primaryUseCase;
    case 4: // Budget
      return preferences.budgetMax > preferences.budgetMin;
    case 5: // Features
      return true;
    default:
      return false;
  }
};

export const selectTopMatches = (state: RecommendationsState, count = 3) =>
  state.session?.recommendations.slice(0, count) ?? [];

export const selectCompareItems = (state: RecommendationsState) =>
  state.session?.recommendations.filter((r) =>
    state.compareList.includes(r.headphone.id)
  ) ?? [];
