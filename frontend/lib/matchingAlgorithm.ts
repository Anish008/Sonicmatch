import { UserPreferences, HeadphoneMatch } from '@/stores';
import { HeadphoneData, AudioProfile, USE_CASE_PRIORITIES } from '@/types/data';
import {
  loadHeadphones,
  getSongsByGenre,
  getSongsByArtist,
  calculateAudioProfileFromSongs,
  getAudioProfileFromGenres,
  getHeadphoneAudioProfile,
} from './dataService';
import { getHeadphoneImageUrl } from './headphoneImages';

// ============================================
// Matching Algorithm
// ============================================

export async function findHeadphoneMatches(
  preferences: UserPreferences
): Promise<HeadphoneMatch[]> {
  // Load all headphones
  const allHeadphones = await loadHeadphones();

  // Filter by budget
  let candidateHeadphones = allHeadphones.filter(
    h => h.price >= preferences.budgetMin && h.price <= preferences.budgetMax
  );

  // Calculate user's audio profile from genres and artists
  const userAudioProfile = await calculateUserAudioProfile(preferences);

  // Score each headphone
  const scoredHeadphones = await Promise.all(
    candidateHeadphones.map(async (headphone) => {
      const scores = calculateMatchScores(headphone, preferences, userAudioProfile);
      return {
        headphone,
        scores,
        overallScore: calculateOverallScore(scores),
      };
    })
  );

  // Sort by overall score
  scoredHeadphones.sort((a, b) => b.overallScore - a.overallScore);

  // Convert to HeadphoneMatch format
  const matches: HeadphoneMatch[] = scoredHeadphones.slice(0, 20).map((item, index) => ({
    id: `match-${item.headphone.headphone_id}`,
    rank: index + 1,
    headphone: {
      id: item.headphone.headphone_id.toString(),
      brand: item.headphone.brand,
      model: item.headphone.model,
      fullName: `${item.headphone.brand} ${item.headphone.model}`,
      slug: `${item.headphone.brand}-${item.headphone.model}`.toLowerCase().replace(/\s+/g, '-'),
      headphoneType: normalizeHeadphoneType(item.headphone.type),
      backType: 'closed' as const, // Default, could be enhanced
      isWireless: preferences.wirelessRequired, // Simplified
      hasAnc: item.headphone.noise_cancellation === 'Yes',
      priceUsd: item.headphone.price,
      priceTier: getPriceTier(item.headphone.price),
      imageUrl: item.headphone.image_url || getHeadphoneImageUrl(item.headphone.brand, item.headphone.model, item.headphone.type),
      soundSignature: item.headphone.sound_profile,
      description: generateDescription(item.headphone, preferences),
      keyFeatures: generateKeyFeatures(item.headphone),
      pros: generatePros(item.headphone, preferences),
      cons: generateCons(item.headphone, preferences),
    },
    scores: item.scores,
    explanation: generateExplanation(item.headphone, preferences, item.scores),
    personalizedPros: generatePros(item.headphone, preferences),
    personalizedCons: generateCons(item.headphone, preferences),
    matchHighlights: generateMatchHighlights(item.headphone, preferences, item.scores),
  }));

  return matches;
}

// ============================================
// Helper Functions
// ============================================

async function calculateUserAudioProfile(preferences: UserPreferences): Promise<AudioProfile> {
  // Start with genre-based profile
  let profile = getAudioProfileFromGenres(preferences.genres);

  // Priority 1: If user selected specific tracks, use those for the most accurate profile
  if (preferences.favoriteTracks && preferences.favoriteTracks.length > 0) {
    // Fetch the full song data for selected tracks
    const allSongs = await Promise.all(
      preferences.favoriteTracks.map(track => getSongsByArtist(track.artist))
    );
    const flatSongs = allSongs.flat();

    // Filter to only the exact tracks the user selected
    const selectedSongs = flatSongs.filter(song =>
      preferences.favoriteTracks.some(track =>
        song.track_name === track.name && song.track_artist === track.artist
      )
    );

    if (selectedSongs.length > 0) {
      const songProfile = calculateAudioProfileFromSongs(selectedSongs);
      // Heavily weight selected tracks (80% selected tracks, 20% genre)
      profile = blendAudioProfiles(songProfile, profile, 0.8);
    }
  }
  // Priority 2: If no tracks selected but has favorite artists, use all their songs
  else if (preferences.favoriteArtists.length > 0) {
    const songs = await Promise.all(
      preferences.favoriteArtists.map(artist => getSongsByArtist(artist))
    );
    const allSongs = songs.flat();

    if (allSongs.length > 0) {
      const songProfile = calculateAudioProfileFromSongs(allSongs);
      // Blend genre and song profiles (60% song data, 40% genre)
      profile = blendAudioProfiles(songProfile, profile, 0.6);
    }
  }

  // Incorporate user's manual sound preferences
  if (preferences.soundPreferences) {
    profile = blendAudioProfiles(profile, {
      bass: preferences.soundPreferences.bass,
      mids: preferences.soundPreferences.mids,
      treble: preferences.soundPreferences.treble,
      clarity: preferences.soundPreferences.detail,
      soundstage: preferences.soundPreferences.soundstage,
      energy: (preferences.soundPreferences.bass + preferences.soundPreferences.treble) / 2,
    }, 0.7); // 70% manual preferences, 30% calculated
  }

  return profile;
}

function blendAudioProfiles(
  profile1: AudioProfile,
  profile2: AudioProfile,
  weight1: number
): AudioProfile {
  const weight2 = 1 - weight1;
  return {
    bass: profile1.bass * weight1 + profile2.bass * weight2,
    mids: profile1.mids * weight1 + profile2.mids * weight2,
    treble: profile1.treble * weight1 + profile2.treble * weight2,
    energy: profile1.energy * weight1 + profile2.energy * weight2,
    clarity: profile1.clarity * weight1 + profile2.clarity * weight2,
    soundstage: profile1.soundstage * weight1 + profile2.soundstage * weight2,
  };
}

function calculateMatchScores(
  headphone: HeadphoneData,
  preferences: UserPreferences,
  userAudioProfile: AudioProfile
) {
  const headphoneProfile = getHeadphoneAudioProfile(headphone);

  // Sound profile match (0-100)
  const soundProfile = calculateAudioProfileSimilarity(userAudioProfile, headphoneProfile) * 100;

  // Use case match (0-100)
  const useCase = calculateUseCaseScore(headphone, preferences) * 100;

  // Budget match (0-100) - how well it fits in their budget
  const budget = calculateBudgetScore(headphone.price, preferences.budgetMin, preferences.budgetMax) * 100;

  // Feature match (0-100)
  const featureMatch = calculateFeatureScore(headphone, preferences) * 100;

  // Genre match (already factored into sound profile, but keep for display)
  const genreMatch = soundProfile;

  // Overall weighted score
  const overall = (
    soundProfile * 0.35 +
    useCase * 0.25 +
    budget * 0.15 +
    featureMatch * 0.25
  );

  return {
    overall,
    soundProfile,
    useCase,
    budget,
    featureMatch,
    genreMatch,
  };
}

function calculateAudioProfileSimilarity(profile1: AudioProfile, profile2: AudioProfile): number {
  // Calculate Euclidean distance in normalized 6D space
  const diffBass = profile1.bass - profile2.bass;
  const diffMids = profile1.mids - profile2.mids;
  const diffTreble = profile1.treble - profile2.treble;
  const diffEnergy = profile1.energy - profile2.energy;
  const diffClarity = profile1.clarity - profile2.clarity;
  const diffSoundstage = profile1.soundstage - profile2.soundstage;

  const distance = Math.sqrt(
    diffBass ** 2 +
    diffMids ** 2 +
    diffTreble ** 2 +
    diffEnergy ** 2 +
    diffClarity ** 2 +
    diffSoundstage ** 2
  );

  // Max distance in 6D unit cube is sqrt(6)
  const maxDistance = Math.sqrt(6);
  const similarity = 1 - (distance / maxDistance);

  return Math.max(0, Math.min(1, similarity));
}

function calculateUseCaseScore(headphone: HeadphoneData, preferences: UserPreferences): number {
  const primaryMatch = headphone.use_case.toLowerCase() === preferences.primaryUseCase.toLowerCase() ? 1 : 0;
  const secondaryMatches = preferences.secondaryUseCases.filter(
    uc => headphone.use_case.toLowerCase() === uc.toLowerCase()
  ).length;

  return primaryMatch * 0.7 + (secondaryMatches > 0 ? 0.3 : 0);
}

function calculateBudgetScore(price: number, min: number, max: number): number {
  if (price < min || price > max) return 0;

  // Prefer prices in the middle of the range
  const range = max - min;
  const midpoint = (min + max) / 2;
  const distanceFromMid = Math.abs(price - midpoint);
  const normalizedDistance = distanceFromMid / (range / 2);

  return 1 - (normalizedDistance * 0.3); // Max penalty of 30% for being far from midpoint
}

function calculateFeatureScore(headphone: HeadphoneData, preferences: UserPreferences): number {
  let score = 1.0;

  // Check required features
  if (preferences.wirelessRequired) {
    // We don't have wireless info in CSV, so assume based on type and price
    const likelyWireless = headphone.price > 150;
    if (!likelyWireless) score *= 0.5;
  }

  if (preferences.ancRequired) {
    if (headphone.noise_cancellation !== 'Yes') {
      score *= 0.3; // Heavy penalty for missing required ANC
    }
  } else {
    // Slight bonus if has ANC but not required
    if (headphone.noise_cancellation === 'Yes') {
      score *= 1.1;
    }
  }

  // Preferred type
  if (preferences.preferredType) {
    const normalizedType = normalizeHeadphoneType(headphone.type);
    if (normalizedType === preferences.preferredType) {
      score *= 1.2;
    } else {
      score *= 0.7;
    }
  }

  return Math.min(1, score);
}

function calculateOverallScore(scores: {
  overall: number;
  soundProfile: number;
  useCase: number;
  budget: number;
  featureMatch: number;
  genreMatch: number;
}): number {
  return scores.overall;
}

function normalizeHeadphoneType(type: string): 'over_ear' | 'on_ear' | 'in_ear' | 'earbuds' {
  const lower = type.toLowerCase();
  if (lower.includes('over')) return 'over_ear';
  if (lower.includes('on')) return 'on_ear';
  if (lower.includes('in') || lower.includes('ear')) return 'in_ear';
  if (lower.includes('bud')) return 'earbuds';
  return 'over_ear';
}

function getPriceTier(price: number): string {
  if (price < 100) return 'Budget';
  if (price < 300) return 'Mid-range';
  if (price < 600) return 'Premium';
  return 'Flagship';
}

function generateDescription(headphone: HeadphoneData, preferences: UserPreferences): string {
  const useCaseDesc = headphone.use_case === 'Studio' ? 'professional audio work' :
    headphone.use_case === 'Gaming' ? 'immersive gaming experiences' :
    headphone.use_case === 'Workout' ? 'active lifestyles' : 'everyday listening';

  return `The ${headphone.brand} ${headphone.model} offers ${headphone.sound_profile.toLowerCase()} sound signature perfect for ${useCaseDesc}. ${headphone.noise_cancellation === 'Yes' ? 'Features active noise cancellation for immersive listening.' : ''} Rated ${headphone.user_rating}/5 by ${headphone.user_reviews.toLocaleString()} users.`;
}

function generateKeyFeatures(headphone: HeadphoneData): string[] {
  const features: string[] = [
    `${headphone.sound_profile} sound signature`,
    `${headphone.bass_level} bass response`,
    `${headphone.type} design`,
    `Ideal for ${headphone.use_case.toLowerCase()}`,
  ];

  if (headphone.noise_cancellation === 'Yes') {
    features.push('Active Noise Cancellation');
  }

  features.push(`${headphone.user_rating}/5 rating (${headphone.user_reviews.toLocaleString()} reviews)`);

  return features;
}

function generatePros(headphone: HeadphoneData, preferences: UserPreferences): string[] {
  const pros: string[] = [];

  if (headphone.user_rating >= 4.5) {
    pros.push('Highly rated by users');
  }

  if (headphone.sound_profile === 'Flat' && preferences.primaryUseCase === 'studio') {
    pros.push('Excellent for critical listening and mixing');
  }

  if (headphone.noise_cancellation === 'Yes') {
    pros.push('Effective noise cancellation');
  }

  if (headphone.bass_level === 'High' && preferences.soundPreferences.bass > 0.7) {
    pros.push('Strong bass response matches your preference');
  }

  if (headphone.price < preferences.budgetMax * 0.7) {
    pros.push('Great value within your budget');
  }

  return pros.length > 0 ? pros : ['Well-suited for your needs'];
}

function generateCons(headphone: HeadphoneData, preferences: UserPreferences): string[] {
  const cons: string[] = [];

  if (headphone.noise_cancellation === 'No' && preferences.ancRequired) {
    cons.push('No active noise cancellation');
  }

  if (headphone.sound_profile === 'Bass-heavy' && preferences.primaryUseCase === 'studio') {
    cons.push('Bass emphasis may not be ideal for studio work');
  }

  if (headphone.user_rating < 4.3) {
    cons.push('Mixed user reviews');
  }

  return cons;
}

function generateExplanation(
  headphone: HeadphoneData,
  preferences: UserPreferences,
  scores: any
): string {
  return `This headphone scores ${scores.overall.toFixed(0)}% overall match based on your ${preferences.genres.join(', ')} preferences and ${preferences.primaryUseCase} use case. The ${headphone.sound_profile.toLowerCase()} sound signature aligns well with your listening profile.`;
}

function generateMatchHighlights(
  headphone: HeadphoneData,
  preferences: UserPreferences,
  scores: any
): string[] {
  const highlights: string[] = [];

  if (scores.soundProfile > 80) {
    highlights.push(`${scores.soundProfile.toFixed(0)}% sound profile match`);
  }

  if (scores.useCase > 80) {
    highlights.push(`Perfect for ${preferences.primaryUseCase}`);
  }

  if (headphone.user_rating >= 4.5) {
    highlights.push(`${headphone.user_rating} star rating`);
  }

  if (scores.budget > 90) {
    highlights.push('Excellent value');
  }

  return highlights;
}
