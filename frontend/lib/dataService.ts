import { HeadphoneData, SpotifySongData, AudioProfile, GENRE_AUDIO_PROFILES, SOUND_PROFILE_MAP } from '@/types/data';

// ============================================
// Data Service
// ============================================

let headphonesCache: HeadphoneData[] | null = null;
let songsCache: SpotifySongData[] | null = null;

export async function loadHeadphones(): Promise<HeadphoneData[]> {
  if (headphonesCache) return headphonesCache;

  try {
    const response = await fetch('/api/headphones');
    const data = await response.json();
    const headphones = data.headphones || [];
    headphonesCache = headphones;
    return headphones;
  } catch (error) {
    console.error('Error loading headphones:', error);
    return [];
  }
}

export async function loadSongs(): Promise<SpotifySongData[]> {
  if (songsCache) return songsCache;

  try {
    const response = await fetch('/api/songs');
    const data = await response.json();
    const songs = data.songs || [];
    songsCache = songs;
    return songs;
  } catch (error) {
    console.error('Error loading songs:', error);
    return [];
  }
}

export async function getHeadphoneById(id: number): Promise<HeadphoneData | null> {
  const headphones = await loadHeadphones();
  return headphones.find(h => h.headphone_id === id) || null;
}

export async function filterHeadphonesByBudget(min: number, max: number): Promise<HeadphoneData[]> {
  const headphones = await loadHeadphones();
  return headphones.filter(h => h.price >= min && h.price <= max);
}

export async function filterHeadphonesByUseCase(useCase: string): Promise<HeadphoneData[]> {
  const headphones = await loadHeadphones();
  return headphones.filter(h => h.use_case.toLowerCase() === useCase.toLowerCase());
}

export async function getSongsByGenre(genre: string): Promise<SpotifySongData[]> {
  const songs = await loadSongs();
  return songs.filter(s =>
    s.playlist_genre.toLowerCase().includes(genre.toLowerCase()) ||
    s.playlist_subgenre.toLowerCase().includes(genre.toLowerCase())
  );
}

export async function getSongsByArtist(artist: string): Promise<SpotifySongData[]> {
  try {
    const response = await fetch(`/api/songs?artist=${encodeURIComponent(artist)}`);
    const data = await response.json();
    return data.songs || [];
  } catch (error) {
    console.error('Error loading songs by artist:', error);
    return [];
  }
}

export async function getSongsByArtists(artists: string[]): Promise<SpotifySongData[]> {
  try {
    const response = await fetch(`/api/songs?artists=${encodeURIComponent(artists.join(','))}`);
    const data = await response.json();
    return data.songs || [];
  } catch (error) {
    console.error('Error loading songs by artists:', error);
    return [];
  }
}

// ============================================
// Audio Profile Calculation
// ============================================

export function calculateAudioProfileFromSongs(songs: SpotifySongData[]): AudioProfile {
  if (songs.length === 0) {
    return {
      bass: 0.5,
      mids: 0.5,
      treble: 0.5,
      energy: 0.5,
      clarity: 0.5,
      soundstage: 0.5,
    };
  }

  // Calculate averages from Spotify audio features
  const avgEnergy = songs.reduce((sum, s) => sum + s.energy, 0) / songs.length;
  const avgValence = songs.reduce((sum, s) => sum + s.valence, 0) / songs.length;
  const avgDanceability = songs.reduce((sum, s) => sum + s.danceability, 0) / songs.length;
  const avgAcousticness = songs.reduce((sum, s) => sum + s.acousticness, 0) / songs.length;
  const avgInstrumentalness = songs.reduce((sum, s) => sum + s.instrumentalness, 0) / songs.length;

  // Map Spotify features to audio profile
  return {
    bass: Math.min(1, avgEnergy * 0.7 + avgDanceability * 0.3), // High energy + danceability = more bass
    mids: Math.min(1, (1 - avgInstrumentalness) * 0.6 + avgAcousticness * 0.4), // Vocals and acoustic = more mids
    treble: Math.min(1, avgEnergy * 0.5 + avgValence * 0.3 + (1 - avgAcousticness) * 0.2), // Energy and brightness
    energy: avgEnergy,
    clarity: Math.min(1, (1 - avgDanceability * 0.3) + avgInstrumentalness * 0.4), // Less dance, more instrumental = more clarity
    soundstage: Math.min(1, avgAcousticness * 0.5 + avgInstrumentalness * 0.5), // Acoustic and instrumental = wider soundstage
  };
}

export function getAudioProfileFromGenres(genres: string[]): AudioProfile {
  if (genres.length === 0) {
    return {
      bass: 0.5,
      mids: 0.5,
      treble: 0.5,
      energy: 0.5,
      clarity: 0.5,
      soundstage: 0.5,
    };
  }

  // Average the audio profiles for selected genres
  const profiles = genres.map(g => GENRE_AUDIO_PROFILES[g] || {});

  const result: AudioProfile = {
    bass: 0,
    mids: 0,
    treble: 0,
    energy: 0,
    clarity: 0,
    soundstage: 0,
  };

  profiles.forEach(profile => {
    result.bass += profile.bass || 0.5;
    result.mids += profile.mids || 0.5;
    result.treble += profile.treble || 0.5;
    result.energy += profile.energy || 0.5;
    result.clarity += profile.clarity || 0.5;
    result.soundstage += profile.soundstage || 0.5;
  });

  // Average
  const count = profiles.length;
  result.bass /= count;
  result.mids /= count;
  result.treble /= count;
  result.energy /= count;
  result.clarity /= count;
  result.soundstage /= count;

  return result;
}

export function getHeadphoneAudioProfile(headphone: HeadphoneData): AudioProfile {
  const baseProfile = SOUND_PROFILE_MAP[headphone.sound_profile] || {
    bass: 0.5,
    mids: 0.5,
    treble: 0.5,
    clarity: 0.6,
    energy: 0.5,
    soundstage: 0.5,
  };

  // Adjust based on bass level
  const bassMultiplier =
    headphone.bass_level === 'High' ? 1.3 :
    headphone.bass_level === 'Medium' ? 1.0 :
    0.7;

  return {
    bass: Math.min(1, (baseProfile.bass || 0.5) * bassMultiplier),
    mids: baseProfile.mids || 0.5,
    treble: baseProfile.treble || 0.5,
    energy: baseProfile.energy || 0.5,
    clarity: baseProfile.clarity || 0.6,
    soundstage: baseProfile.soundstage || 0.5,
  };
}
