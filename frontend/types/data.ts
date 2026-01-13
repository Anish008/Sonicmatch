// ============================================
// Headphone Data Types (from CSV)
// ============================================

export interface HeadphoneData {
  headphone_id: number;
  brand: string;
  model: string;
  price: number;
  type: string; // 'Over-ear' | 'On-ear' | 'In-ear' | 'Bone-conduction'
  use_case: string; // 'Casual' | 'Studio' | 'Workout' | 'Gaming'
  bass_level: string; // 'Low' | 'Medium' | 'High'
  sound_profile: string; // 'Balanced' | 'Flat' | 'Bass-heavy'
  noise_cancellation: string; // 'Yes' | 'No'
  user_rating: number;
  user_reviews: number;
  image_url?: string; // Wikimedia Commons search URL for headphone images
}

// ============================================
// Spotify Song Data Types (from CSV)
// ============================================

export interface SpotifySongData {
  track_id: string;
  track_name: string;
  track_artist: string;
  track_popularity: number;
  track_album_id: string;
  track_album_name: string;
  track_album_release_date: string;
  playlist_name: string;
  playlist_id: string;
  playlist_genre: string;
  playlist_subgenre: string;
  danceability: number; // 0-1
  energy: number; // 0-1
  key: number; // 0-11
  loudness: number; // dB
  mode: number; // 0 or 1
  speechiness: number; // 0-1
  acousticness: number; // 0-1
  instrumentalness: number; // 0-1
  liveness: number; // 0-1
  valence: number; // 0-1 (musical positiveness)
  tempo: number; // BPM
  duration_ms: number;
}

// ============================================
// Audio Profile Types
// ============================================

export interface AudioProfile {
  bass: number; // 0-1 (derived from energy, bass_level)
  mids: number; // 0-1 (derived from acousticness, instrumentalness)
  treble: number; // 0-1 (derived from energy, brightness)
  energy: number; // 0-1
  clarity: number; // 0-1
  soundstage: number; // 0-1
}

// ============================================
// Genre Mapping
// ============================================

export const GENRE_AUDIO_PROFILES: Record<string, Partial<AudioProfile>> = {
  rock: { bass: 0.6, energy: 0.7, treble: 0.6 },
  classical: { bass: 0.3, clarity: 0.9, soundstage: 0.9, mids: 0.8 },
  jazz: { bass: 0.5, clarity: 0.8, soundstage: 0.7, mids: 0.7 },
  electronic: { bass: 0.8, energy: 0.8, treble: 0.7 },
  hip_hop: { bass: 0.9, energy: 0.7, treble: 0.5 },
  pop: { bass: 0.6, energy: 0.6, treble: 0.6 },
  metal: { bass: 0.7, energy: 0.9, treble: 0.7 },
  indie: { bass: 0.5, clarity: 0.7, mids: 0.7 },
  rnb: { bass: 0.7, energy: 0.6, mids: 0.7 },
  acoustic: { bass: 0.3, clarity: 0.8, mids: 0.8, soundstage: 0.6 },
  country: { bass: 0.4, clarity: 0.7, mids: 0.7 },
  soul: { bass: 0.6, energy: 0.6, mids: 0.8 },
  reggae: { bass: 0.7, energy: 0.5, mids: 0.6 },
  blues: { bass: 0.5, clarity: 0.7, mids: 0.7 },
  latin: { bass: 0.6, energy: 0.7, treble: 0.6 },
};

// ============================================
// Sound Profile Mapping (Headphone -> Audio Profile)
// ============================================

export const SOUND_PROFILE_MAP: Record<string, Partial<AudioProfile>> = {
  'Balanced': { bass: 0.5, mids: 0.5, treble: 0.5, clarity: 0.7 },
  'Flat': { bass: 0.5, mids: 0.5, treble: 0.5, clarity: 0.9, soundstage: 0.8 },
  'Bass-heavy': { bass: 0.9, mids: 0.4, treble: 0.4, energy: 0.8 },
};

// ============================================
// Use Case Mapping
// ============================================

export const USE_CASE_PRIORITIES: Record<string, { features: string[], weight: number }> = {
  Studio: {
    features: ['clarity', 'soundstage', 'flat sound profile'],
    weight: 1.2,
  },
  Gaming: {
    features: ['soundstage', 'bass', 'comfort'],
    weight: 1.0,
  },
  Casual: {
    features: ['comfort', 'wireless', 'noise cancellation'],
    weight: 1.0,
  },
  Workout: {
    features: ['bass', 'wireless', 'durability'],
    weight: 0.9,
  },
};
