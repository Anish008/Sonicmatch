"""
LLM Integration Service
Interfaces with Claude API for intelligent recommendation reasoning
"""

import json
import os
from typing import List, Dict, Optional
import anthropic

from app.models.audio_profile import AudioProfile
from app.models.headphone import Headphone
from app.services.recommendation_engine import Recommendation
from app.prompts.recommendation_prompts import RecommendationPrompts


class LLMService:
    """Service for LLM-powered recommendation enhancement"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize LLM service

        Args:
            api_key: Anthropic API key (or set ANTHROPIC_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key required. Set ANTHROPIC_API_KEY env var or pass api_key")

        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.model = "claude-3-5-sonnet-20241022"  # Latest model
        self.prompts = RecommendationPrompts()

    def refine_recommendations(
        self,
        user_profile: AudioProfile,
        user_context: Dict,
        recommendations: List[Recommendation],
        temperature: float = 0.3
    ) -> Dict:
        """
        Use LLM to refine and enhance recommendations

        Args:
            user_profile: User's audio profile
            user_context: Additional context (budget, use case, etc.)
            recommendations: Initial algorithmic recommendations
            temperature: LLM temperature (0-1, lower = more deterministic)

        Returns:
            Dict with refined recommendations and LLM insights
        """
        prompt = self.prompts.generate_ranking_refinement_prompt(
            user_profile,
            user_context,
            recommendations
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=temperature,
                system=self.prompts.SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            # Extract JSON response
            content = response.content[0].text
            llm_analysis = self._parse_json_response(content)

            # Re-rank recommendations based on LLM output
            ranked_recs = self._apply_llm_ranking(
                recommendations,
                llm_analysis.get('recommended_ranking', list(range(1, 6)))
            )

            return {
                'recommendations': [r.to_dict() for r in ranked_recs],
                'llm_insights': {
                    'top_pick_explanation': llm_analysis.get('top_pick_explanation', ''),
                    'key_insights': llm_analysis.get('key_insights', []),
                    'alternatives': llm_analysis.get('alternatives', {}),
                },
                'model_used': self.model,
                'confidence': user_profile.confidence
            }

        except Exception as e:
            print(f"LLM refinement error: {e}")
            # Fallback to algorithmic recommendations
            return {
                'recommendations': [r.to_dict() for r in recommendations],
                'llm_insights': None,
                'error': str(e)
            }

    def generate_explanation(
        self,
        user_profile: AudioProfile,
        headphone: Headphone,
        scores: Dict,
        rank: int
    ) -> str:
        """
        Generate personalized explanation for a recommendation

        Returns:
            Explanation string
        """
        prompt = self.prompts.generate_explanation_prompt(
            user_profile,
            headphone,
            scores,
            rank
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                temperature=0.4,
                system=self.prompts.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            print(f"Explanation generation error: {e}")
            return self._fallback_explanation(headphone, scores)

    def compare_headphones(
        self,
        headphone_a: Headphone,
        headphone_b: Headphone,
        user_profile: AudioProfile
    ) -> str:
        """
        Generate intelligent comparison between two headphones

        Returns:
            Comparison text
        """
        prompt = self.prompts.generate_comparison_prompt(
            headphone_a,
            headphone_b,
            user_profile
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=150,
                temperature=0.4,
                system=self.prompts.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            print(f"Comparison error: {e}")
            return f"Compare {headphone_a.full_name} vs {headphone_b.full_name}"

    def generate_personalized_review(
        self,
        headphone: Headphone,
        user_profile: AudioProfile
    ) -> str:
        """
        Generate personalized review from user's perspective

        Returns:
            Review text
        """
        prompt = self.prompts.generate_personalized_review_prompt(
            headphone,
            user_profile
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=150,
                temperature=0.5,  # Slightly more creative
                system=self.prompts.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            print(f"Review generation error: {e}")
            return f"Review of {headphone.full_name}"

    def _parse_json_response(self, content: str) -> Dict:
        """Parse JSON from LLM response, handling markdown code blocks"""
        # Try to find JSON in markdown code block
        if '```json' in content:
            start = content.find('```json') + 7
            end = content.find('```', start)
            json_str = content[start:end].strip()
        elif '```' in content:
            start = content.find('```') + 3
            end = content.find('```', start)
            json_str = content[start:end].strip()
        else:
            json_str = content.strip()

        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON: {json_str[:200]}")
            return {}

    def _apply_llm_ranking(
        self,
        recommendations: List[Recommendation],
        llm_ranking: List[int]
    ) -> List[Recommendation]:
        """
        Apply LLM's recommended ranking to recommendations

        Args:
            recommendations: Original list
            llm_ranking: List of 1-based indices in new order

        Returns:
            Re-ranked recommendations
        """
        if not llm_ranking or len(llm_ranking) != len(recommendations):
            return recommendations

        # Convert 1-based to 0-based and re-rank
        ranked = []
        for new_rank, old_idx in enumerate(llm_ranking, 1):
            if 1 <= old_idx <= len(recommendations):
                rec = recommendations[old_idx - 1]
                rec.rank = new_rank
                ranked.append(rec)

        return ranked if ranked else recommendations

    def _fallback_explanation(self, headphone: Headphone, scores: Dict) -> str:
        """Fallback explanation if LLM fails"""
        score = scores.get('overall', 0)
        return (
            f"The {headphone.full_name} scores {score:.0f}/100 overall match based on "
            f"its {headphone.sound_profile.value} sound signature and {headphone.bass_level} bass level. "
            f"Rated {headphone.user_rating}/5 by {headphone.user_reviews:,} users."
        )


class CachedLLMService(LLMService):
    """
    LLM Service with simple caching to reduce API costs

    Caches:
    - Explanations by (headphone_id, profile_hash)
    - Comparisons by (headphone_a_id, headphone_b_id, profile_hash)
    """

    def __init__(self, api_key: Optional[str] = None, cache_size: int = 1000):
        super().__init__(api_key)
        self.explanation_cache = {}
        self.comparison_cache = {}
        self.cache_size = cache_size

    def generate_explanation(
        self,
        user_profile: AudioProfile,
        headphone: Headphone,
        scores: Dict,
        rank: int
    ) -> str:
        """Generate explanation with caching"""
        cache_key = (
            headphone.headphone_id,
            self._hash_profile(user_profile)
        )

        if cache_key in self.explanation_cache:
            return self.explanation_cache[cache_key]

        explanation = super().generate_explanation(user_profile, headphone, scores, rank)

        # Cache with size limit
        if len(self.explanation_cache) < self.cache_size:
            self.explanation_cache[cache_key] = explanation

        return explanation

    def _hash_profile(self, profile: AudioProfile) -> str:
        """Create simple hash of profile for caching"""
        return f"{profile.bass_preference:.1f}_{profile.mids_preference:.1f}_{profile.treble_preference:.1f}"
