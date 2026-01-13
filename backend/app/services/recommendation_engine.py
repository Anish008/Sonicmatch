"""
Hybrid Recommendation Engine
Combines rule-based scoring with contextual intelligence
"""

from typing import List, Dict, Tuple, Optional
import numpy as np
from dataclasses import dataclass

from app.models.audio_profile import AudioProfile
from app.models.headphone import Headphone, UseCase


@dataclass
class ScoringWeights:
    """Configurable weights for different scoring components"""
    sound_match: float = 0.40  # How well sound matches profile
    use_case_match: float = 0.20  # Primary use case alignment
    budget_fit: float = 0.15  # Price within budget
    feature_match: float = 0.15  # Required features (ANC, wireless)
    user_rating: float = 0.10  # Community validation

    def validate(self):
        total = (self.sound_match + self.use_case_match +
                self.budget_fit + self.feature_match + self.user_rating)
        assert abs(total - 1.0) < 0.01, f"Weights must sum to 1.0, got {total}"


@dataclass
class MatchScore:
    """Detailed breakdown of how well a headphone matches"""
    overall: float  # 0-100
    sound_profile: float  # 0-100
    frequency_match: float  # 0-100
    soundstage_match: float  # 0-100
    use_case: float  # 0-100
    budget: float  # 0-100
    features: float  # 0-100
    rating_boost: float  # 0-100

    def to_dict(self) -> Dict:
        return {
            'overall': round(self.overall, 1),
            'sound_profile': round(self.sound_profile, 1),
            'frequency_match': round(self.frequency_match, 1),
            'soundstage': round(self.soundstage_match, 1),
            'use_case': round(self.use_case, 1),
            'budget': round(self.budget, 1),
            'features': round(self.features, 1),
            'rating': round(self.rating_boost, 1)
        }


@dataclass
class Recommendation:
    """Single headphone recommendation with scores and explanations"""
    headphone: Headphone
    rank: int
    scores: MatchScore
    match_highlights: List[str]
    trade_offs: List[str]
    confidence: float  # 0-1

    def to_dict(self) -> Dict:
        return {
            'rank': self.rank,
            'headphone': self.headphone.to_dict(),
            'scores': self.scores.to_dict(),
            'match_highlights': self.match_highlights,
            'trade_offs': self.trade_offs,
            'confidence': round(self.confidence, 2)
        }


class RecommendationEngine:
    """
    Core recommendation engine using hybrid approach:
    1. Rule-based scoring for consistency
    2. Similarity matching for sound
    3. Contextual boosting for use-case
    """

    def __init__(self, weights: Optional[ScoringWeights] = None):
        self.weights = weights or ScoringWeights()
        self.weights.validate()

    def recommend(
        self,
        user_profile: AudioProfile,
        headphones: List[Headphone],
        budget_min: float,
        budget_max: float,
        primary_use_case: str,
        required_features: Dict[str, bool],
        top_k: int = 10
    ) -> List[Recommendation]:
        """
        Generate ranked recommendations

        Args:
            user_profile: User's audio preference profile
            headphones: List of all available headphones
            budget_min, budget_max: Price constraints
            primary_use_case: Main usage scenario
            required_features: Dict like {'anc': True, 'wireless': False}
            top_k: Number of recommendations to return

        Returns:
            List of Recommendation objects, ranked by overall score
        """
        scored_headphones = []

        for hp in headphones:
            # Hard filters first
            if not self._passes_hard_filters(hp, budget_min, budget_max, required_features):
                continue

            # Calculate detailed scores
            scores = self._calculate_scores(
                user_profile, hp, budget_min, budget_max,
                primary_use_case, required_features
            )

            # Generate explanations
            highlights = self._generate_highlights(user_profile, hp, scores)
            trade_offs = self._generate_trade_offs(user_profile, hp, scores)

            scored_headphones.append((hp, scores, highlights, trade_offs))

        # Sort by overall score
        scored_headphones.sort(key=lambda x: x[1].overall, reverse=True)

        # Create recommendations
        recommendations = []
        for rank, (hp, scores, highlights, trade_offs) in enumerate(scored_headphones[:top_k], 1):
            rec = Recommendation(
                headphone=hp,
                rank=rank,
                scores=scores,
                match_highlights=highlights,
                trade_offs=trade_offs,
                confidence=user_profile.confidence
            )
            recommendations.append(rec)

        return recommendations

    def _passes_hard_filters(
        self,
        hp: Headphone,
        budget_min: float,
        budget_max: float,
        required_features: Dict[str, bool]
    ) -> bool:
        """Hard requirements that must be met"""
        # Budget
        if not (budget_min <= hp.price <= budget_max * 1.1):  # Allow 10% overage
            return False

        # ANC requirement
        if required_features.get('anc', False) and not hp.noise_cancellation:
            return False

        return True

    def _calculate_scores(
        self,
        profile: AudioProfile,
        hp: Headphone,
        budget_min: float,
        budget_max: float,
        use_case: str,
        features: Dict
    ) -> MatchScore:
        """Calculate detailed matching scores"""

        # 1. Sound Profile Match (Euclidean distance in normalized space)
        sound_score = self._calculate_sound_similarity(profile, hp)

        # 2. Frequency Response Match
        freq_score = self._calculate_frequency_match(profile, hp)

        # 3. Soundstage Match
        soundstage_score = self._calculate_soundstage_match(profile, hp)

        # 4. Use Case Match
        use_case_score = self._calculate_use_case_match(use_case, hp)

        # 5. Budget Fit (prefer mid-range of budget)
        budget_score = self._calculate_budget_score(hp.price, budget_min, budget_max)

        # 6. Feature Match
        feature_score = self._calculate_feature_score(hp, features)

        # 7. Rating Boost (community validation)
        rating_score = (hp.user_rating / 5.0) * 100

        # Weighted overall score
        overall = (
            sound_score * self.weights.sound_match +
            use_case_score * self.weights.use_case_match +
            budget_score * self.weights.budget_fit +
            feature_score * self.weights.feature_match +
            rating_score * self.weights.user_rating
        )

        return MatchScore(
            overall=overall,
            sound_profile=sound_score,
            frequency_match=freq_score,
            soundstage_match=soundstage_score,
            use_case=use_case_score,
            budget=budget_score,
            features=feature_score,
            rating_boost=rating_score
        )

    def _calculate_sound_similarity(self, profile: AudioProfile, hp: Headphone) -> float:
        """
        Calculate overall sound signature similarity
        Uses weighted Euclidean distance in normalized space
        """
        weights = {
            'bass': 1.5,  # Bass preference is often strong
            'mids': 1.2,
            'treble': 1.2,
            'soundstage': 1.0,
            'warmth': 0.8
        }

        differences = {
            'bass': (profile.bass_preference - hp.characteristics.bass_response) ** 2,
            'mids': (profile.mids_preference - hp.characteristics.mids_response) ** 2,
            'treble': (profile.treble_preference - hp.characteristics.treble_response) ** 2,
            'soundstage': (profile.soundstage_width - hp.characteristics.soundstage_width) ** 2,
            'warmth': (profile.warmth - hp.characteristics.warmth) ** 2
        }

        weighted_distance = sum(diff * weights.get(key, 1.0) for key, diff in differences.items())
        max_distance = sum(weights.values())  # Maximum possible weighted distance

        # Convert distance to similarity (0-100)
        similarity = (1 - np.sqrt(weighted_distance / max_distance)) * 100
        return max(0, min(100, similarity))

    def _calculate_frequency_match(self, profile: AudioProfile, hp: Headphone) -> float:
        """Focus on bass/mids/treble match"""
        bass_match = 1 - abs(profile.bass_preference - hp.characteristics.bass_response)
        mids_match = 1 - abs(profile.mids_preference - hp.characteristics.mids_response)
        treble_match = 1 - abs(profile.treble_preference - hp.characteristics.treble_response)

        # Weighted average (bass often most important)
        avg = (bass_match * 1.5 + mids_match * 1.2 + treble_match * 1.0) / 3.7
        return avg * 100

    def _calculate_soundstage_match(self, profile: AudioProfile, hp: Headphone) -> float:
        """Match soundstage and imaging preferences"""
        soundstage_match = 1 - abs(profile.soundstage_width - hp.characteristics.soundstage_width)
        imaging_match = 1 - abs(profile.imaging_precision - hp.characteristics.imaging_quality)

        avg = (soundstage_match + imaging_match) / 2
        return avg * 100

    def _calculate_use_case_match(self, user_use_case: str, hp: Headphone) -> float:
        """Match primary use case"""
        if user_use_case.lower() == hp.use_case.value.lower():
            return 100.0

        # Partial matches
        compatibility_matrix = {
            ('casual', 'studio'): 0.6,
            ('casual', 'gaming'): 0.5,
            ('studio', 'casual'): 0.7,
            ('gaming', 'casual'): 0.6,
        }

        key = (user_use_case.lower(), hp.use_case.value.lower())
        return compatibility_matrix.get(key, 0.3) * 100

    def _calculate_budget_score(self, price: float, min_budget: float, max_budget: float) -> float:
        """
        Score based on budget fit
        Prefer mid-range of budget (sweet spot)
        """
        if price < min_budget or price > max_budget:
            # Still allow slightly out of budget with penalty
            if price > max_budget:
                overage = (price - max_budget) / max_budget
                return max(0, 50 - (overage * 100))
            return 60  # Below budget is okay

        # Within budget - prefer middle range
        budget_range = max_budget - min_budget
        midpoint = min_budget + (budget_range / 2)
        distance_from_mid = abs(price - midpoint) / (budget_range / 2)

        # Score: 100 at midpoint, 80 at edges
        return 100 - (distance_from_mid * 20)

    def _calculate_feature_score(self, hp: Headphone, required_features: Dict) -> float:
        """Score based on feature requirements"""
        score = 100.0

        # ANC (already filtered if required)
        if hp.noise_cancellation:
            score += 10  # Bonus for having ANC

        # Over-ear generally more comfortable
        if hp.type.value == 'Over-ear':
            score += 5

        return min(score, 100)

    def _generate_highlights(
        self,
        profile: AudioProfile,
        hp: Headphone,
        scores: MatchScore
    ) -> List[str]:
        """Generate match highlights for user"""
        highlights = []

        if scores.sound_profile > 85:
            sig = profile.get_sound_signature()
            highlights.append(f"Excellent {sig.value} sound signature match")

        if scores.frequency_match > 80:
            if profile.bass_preference > 0.7 and hp.characteristics.bass_response > 0.7:
                highlights.append("Strong bass response matches your preference")
            if profile.soundstage_width > 0.7 and hp.characteristics.soundstage_width > 0.7:
                highlights.append("Wide soundstage for immersive listening")

        if scores.use_case > 90:
            highlights.append(f"Perfect for {hp.use_case.value.lower()} use")

        if hp.user_rating >= 4.5:
            highlights.append(f"Highly rated: {hp.user_rating}/5 ({hp.user_reviews:,} reviews)")

        if hp.noise_cancellation:
            highlights.append("Active noise cancellation included")

        if not highlights:
            highlights.append("Solid all-around performer")

        return highlights[:4]  # Limit to top 4

    def _generate_trade_offs(
        self,
        profile: AudioProfile,
        hp: Headphone,
        scores: MatchScore
    ) -> List[str]:
        """Generate honest trade-offs"""
        trade_offs = []

        # Sound mismatches
        if profile.bass_preference > 0.7 and hp.characteristics.bass_response < 0.5:
            trade_offs.append("Less bass emphasis than you typically prefer")

        if profile.soundstage_width > 0.7 and hp.characteristics.soundstage_width < 0.5:
            trade_offs.append("Intimate soundstage (less spatial")

        # Use case mismatch
        if scores.use_case < 60:
            trade_offs.append(f"Optimized for {hp.use_case.value} rather than your primary use")

        # Budget
        if scores.budget < 70:
            trade_offs.append("At the higher end of your budget")

        # No ANC
        if not hp.noise_cancellation and profile.genre_weights.get('classical', 0) > 0.3:
            trade_offs.append("No active noise cancellation")

        return trade_offs[:3]  # Limit to top 3
