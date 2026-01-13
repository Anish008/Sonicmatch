"""
LLM Prompt Templates for Intelligent Recommendation Reasoning
Uses Claude API for contextual understanding and explanation generation
"""

from typing import List, Dict
from app.models.audio_profile import AudioProfile
from app.models.headphone import Headphone
from app.services.recommendation_engine import Recommendation


class RecommendationPrompts:
    """Prompt engineering for headphone recommendation intelligence"""

    SYSTEM_PROMPT = """You are an expert audio engineer and music analyst specializing in headphone recommendations.

Your expertise includes:
- Psychoacoustics and frequency response analysis
- Headphone tuning philosophies (neutral, warm, V-shaped, etc.)
- Genre-specific sound requirements
- Audio production and critical listening
- Consumer headphone market knowledge

Your role is to:
1. Analyze user music preferences and translate them into headphone requirements
2. Provide technical yet accessible explanations
3. Be honest about trade-offs and limitations
4. Avoid marketing fluff - give real, actionable insights
5. Consider use-case context (studio vs casual vs gaming)

Guidelines:
- Use specific audio terminology when relevant (soundstage, imaging, frequency response)
- Explain WHY a headphone matches, not just THAT it matches
- Point out potential mismatches honestly
- Consider genre-specific needs (e.g., classical needs soundstage, EDM needs sub-bass)
- Reference specific frequency ranges when discussing sound (sub-bass: 20-60Hz, mids: 250Hz-2kHz, etc.)

Avoid:
- Generic phrases like "crystal clear sound" or "premium audio experience"
- Overpromising ("perfect for everything")
- Ignoring obvious mismatches
- Marketing speak"""

    @staticmethod
    def generate_ranking_refinement_prompt(
        user_profile: AudioProfile,
        user_context: Dict,
        initial_recommendations: List[Recommendation]
    ) -> str:
        """
        Generate prompt for LLM to refine and re-rank recommendations

        Args:
            user_profile: User's extracted audio profile
            user_context: Additional context (budget, use case, etc.)
            initial_recommendations: Algorithm's initial ranking

        Returns:
            Formatted prompt string
        """
        # Format user profile
        profile_summary = f"""
**User's Music Profile:**
- Primary Genres: {', '.join([f"{g} ({w:.0%})" for g, w in sorted(user_profile.genre_weights.items(), key=lambda x: x[1], reverse=True)[:5]])}
- Bass Preference: {user_profile.bass_preference:.0%} (0%=neutral, 100%=bass-head)
- Mids Preference: {user_profile.mids_preference:.0%} (vocal/instrument clarity importance)
- Treble Preference: {user_profile.treble_preference:.0%} (detail/sparkle preference)
- Soundstage Width: {user_profile.soundstage_width:.0%} (spatial preference)
- Warmth vs Analytical: {user_profile.warmth:.0%} (0%=analytical, 100%=warm/smooth)
- Energy Level: {user_profile.energy_level:.0%} (music intensity)
- Confidence: {user_profile.confidence:.0%} (data quality: {user_profile.confidence:.0%})

**Listening Context:**
- Primary Use: {user_context.get('use_case', 'Not specified')}
- Budget Range: ${user_context.get('budget_min', 0):.0f} - ${user_context.get('budget_max', 0):.0f}
- Required Features: {', '.join([f for f, required in user_context.get('features', {}).items() if required]) or 'None'}
"""

        # Format top recommendations
        recs_summary = []
        for i, rec in enumerate(initial_recommendations[:5], 1):
            hp = rec.headphone
            recs_summary.append(f"""
**Option {i}: {hp.full_name} (${hp.price:.0f})**
- Sound Profile: {hp.sound_profile.value}, Bass Level: {hp.bass_level}
- Use Case: {hp.use_case.value}
- Type: {hp.type.value}
- ANC: {'Yes' if hp.noise_cancellation else 'No'}
- User Rating: {hp.user_rating}/5 ({hp.user_reviews:,} reviews)
- Match Scores:
  * Overall: {rec.scores.overall:.0f}/100
  * Sound Match: {rec.scores.sound_profile:.0f}/100
  * Use Case: {rec.scores.use_case:.0f}/100
  * Budget: {rec.scores.budget:.0f}/100
- Algorithm Highlights: {', '.join(rec.match_highlights)}
- Trade-offs: {', '.join(rec.trade_offs) if rec.trade_offs else 'None identified'}
""")

        prompt = f"""{profile_summary}

**Initial Algorithm Recommendations (Top 5):**
{''.join(recs_summary)}

**Your Task:**
Based on the user's music profile and listening context, analyze these recommendations and provide:

1. **Ranking Adjustment:** Should any headphones be re-ranked? Consider:
   - Genre-specific requirements (e.g., classical needs wide soundstage + imaging, hip-hop needs sub-bass extension)
   - Use-case alignment (studio = flat/neutral, casual = forgiving, gaming = soundstage)
   - Hidden mismatches the algorithm might have missed
   - Price-to-performance considerations

2. **Top Pick Explanation (~100 words):**
   Why is #1 the best match? Be specific about:
   - Which frequency ranges align with their music taste
   - How the headphone's tuning complements their genres
   - Any technical advantages for their use case
   - Honest limitations they should know about

3. **Alternative Recommendations:**
   - If budget allows, suggest one premium upgrade and why it's worth it
   - If there's a value pick, highlight it
   - If there's a genre-specific specialist (e.g., bass cannons for EDM), mention it

Format your response as JSON:
{{
  "recommended_ranking": [1, 2, 3, 4, 5],  // Re-ranked indices (1-based)
  "top_pick_explanation": "Detailed explanation here...",
  "key_insights": [
    "Specific insight about match quality",
    "Technical reasoning",
    "Honest trade-off or limitation"
  ],
  "alternatives": {{
    "upgrade_pick": {{"index": 2, "reason": "Why worth the extra cost"}},
    "value_pick": {{"index": 4, "reason": "Best bang for buck"}},
    "specialist_pick": {{"index": 3, "reason": "Excels for specific genre"}}
  }}
}}

Remember: Be technical but clear, honest about limitations, and focus on WHY these match the user's specific taste."""

        return prompt

    @staticmethod
    def generate_explanation_prompt(
        user_profile: AudioProfile,
        headphone: Headphone,
        scores: Dict,
        rank: int
    ) -> str:
        """Generate prompt for explaining a single recommendation"""

        prompt = f"""Given this user's music taste and this headphone, generate a technical yet accessible explanation of the match.

**User Profile:**
- Genres: {', '.join([f"{g} ({w:.0%})" for g, w in user_profile.genre_weights.items()])}
- Bass Preference: {user_profile.bass_preference:.0%}
- Mids: {user_profile.mids_preference:.0%}
- Treble: {user_profile.treble_preference:.0%}
- Soundstage: {user_profile.soundstage_width:.0%}
- Sound Signature: {user_profile.get_sound_signature().value}

**Headphone:**
- Model: {headphone.full_name}
- Price: ${headphone.price:.0f}
- Sound Profile: {headphone.sound_profile.value}
- Bass Level: {headphone.bass_level}
- Type: {headphone.type.value}
- Rating: {headphone.user_rating}/5

**Match Scores:**
- Overall: {scores.get('overall', 0):.0f}/100
- Sound: {scores.get('sound_profile', 0):.0f}/100
- Frequency: {scores.get('frequency_match', 0):.0f}/100

Generate a concise explanation (60-80 words) that:
1. Explains WHY this headphone matches their taste
2. Mentions specific frequency ranges or tuning characteristics
3. Addresses their primary genres
4. Is honest about any limitations

Avoid generic phrases. Be specific and technical."""

        return prompt

    @staticmethod
    def generate_comparison_prompt(
        headphone_a: Headphone,
        headphone_b: Headphone,
        user_profile: AudioProfile
    ) -> str:
        """Generate prompt for comparing two headphones for a user"""

        prompt = f"""Compare these two headphones for this specific user's music taste.

**User's Preferences:**
- Genres: {', '.join(user_profile.genre_weights.keys())}
- Bass: {user_profile.bass_preference:.0%}
- Sound Signature: {user_profile.get_sound_signature().value}

**Option A: {headphone_a.full_name} (${headphone_a.price:.0f})**
- Profile: {headphone_a.sound_profile.value}
- Bass: {headphone_a.bass_level}
- Type: {headphone_a.type.value}

**Option B: {headphone_b.full_name} (${headphone_b.price:.0f})**
- Profile: {headphone_b.sound_profile.value}
- Bass: {headphone_b.bass_level}
- Type: {headphone_b.type.value}

Provide a brief comparison (50-70 words):
1. Which is better for their taste and why?
2. Key sonic differences
3. Price-to-performance consideration

Be direct and specific."""

        return prompt

    @staticmethod
    def generate_personalized_review_prompt(
        headphone: Headphone,
        user_profile: AudioProfile
    ) -> str:
        """Generate a personalized review from user's perspective"""

        prompt = f"""Write a brief personalized review of this headphone from the perspective of someone with this user's music taste.

**User Listens To:** {', '.join(user_profile.genre_weights.keys())}
**Prefers:** {user_profile.get_sound_signature().value} sound

**Headphone:** {headphone.full_name}
- Profile: {headphone.sound_profile.value}
- Bass: {headphone.bass_level}
- Price: ${headphone.price:.0f}

Write 40-60 words about:
- How it sounds with their genres
- Strengths for their taste
- One honest limitation

Use "I" voice, be specific about music examples."""

        return prompt
