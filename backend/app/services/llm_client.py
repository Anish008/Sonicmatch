"""
LLM Client - Unified interface for Claude (Anthropic) and OpenAI.
Handles API calls, retries, error handling, and token tracking.
"""
import asyncio
import json
from typing import Any, Dict, List
from decimal import Decimal

import httpx
import structlog
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.config import settings
from app.core.exceptions import LLMException

logger = structlog.get_logger()


class LLMClient:
    """
    Unified LLM client supporting both Anthropic Claude and OpenAI.

    Features:
    - Automatic retry with exponential backoff
    - Timeout handling
    - Token usage tracking
    - Structured output (JSON mode)
    - Error handling and fallbacks
    """

    def __init__(self):
        """Initialize LLM clients based on configuration."""
        self.provider = settings.llm_provider
        self.model = settings.llm_model
        self.max_tokens = settings.llm_max_tokens
        self.temperature = settings.llm_temperature
        self.timeout = settings.llm_timeout

        # Initialize appropriate client
        if self.provider == "anthropic":
            api_key = settings.get_llm_api_key()
            self.anthropic_client = AsyncAnthropic(api_key=api_key)
            self.openai_client = None
        elif self.provider == "openai":
            api_key = settings.get_llm_api_key()
            self.openai_client = AsyncOpenAI(api_key=api_key)
            self.anthropic_client = None
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")

    async def generate_recommendations(
        self,
        user_profile: Dict[str, Any],
        candidate_headphones: List[Dict[str, Any]],
        top_n: int = 5,
    ) -> Dict[str, Any]:
        """
        Generate headphone recommendations using LLM.

        Args:
            user_profile: User preferences and requirements
            candidate_headphones: List of headphones matching hard constraints
            top_n: Number of top recommendations to return

        Returns:
            Dictionary with recommendations, scores, and explanations
        """
        # Build prompt
        prompt = self._build_recommendation_prompt(
            user_profile, candidate_headphones, top_n
        )

        # Call LLM with retry
        try:
            response = await self._call_llm_with_retry(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                json_mode=True,
            )

            # Parse and validate response
            result = self._parse_recommendation_response(response)

            logger.info(
                "llm_recommendation_success",
                provider=self.provider,
                model=self.model,
                candidate_count=len(candidate_headphones),
                recommendation_count=len(result.get("recommendations", [])),
            )

            return result

        except Exception as e:
            logger.error(
                "llm_recommendation_error",
                error=str(e),
                provider=self.provider,
            )
            raise LLMException(f"Failed to generate recommendations: {str(e)}")

    async def generate_detailed_explanation(
        self,
        user_profile: Dict[str, Any],
        headphone: Dict[str, Any],
        other_headphones: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate detailed explanation for a specific headphone recommendation.

        Args:
            user_profile: User preferences
            headphone: The headphone to explain
            other_headphones: Other recommended headphones for comparison

        Returns:
            Dictionary with detailed explanation and comparison points
        """
        prompt = self._build_explanation_prompt(user_profile, headphone, other_headphones)

        try:
            response = await self._call_llm_with_retry(
                prompt=prompt,
                system_prompt=self._get_system_prompt(),
                json_mode=True,
            )

            result = json.loads(response)

            logger.info(
                "llm_explanation_success",
                provider=self.provider,
                headphone=headphone.get("full_name"),
            )

            return result

        except Exception as e:
            logger.error(
                "llm_explanation_error",
                error=str(e),
                provider=self.provider,
            )
            raise LLMException(f"Failed to generate explanation: {str(e)}")

    async def _call_llm_with_retry(
        self,
        prompt: str,
        system_prompt: str,
        json_mode: bool = False,
        max_retries: int = 3,
    ) -> str:
        """
        Call LLM API with exponential backoff retry.

        Args:
            prompt: User prompt
            system_prompt: System instructions
            json_mode: Whether to request JSON output
            max_retries: Maximum retry attempts

        Returns:
            LLM response text
        """
        for attempt in range(max_retries):
            try:
                if self.provider == "anthropic":
                    return await self._call_anthropic(prompt, system_prompt, json_mode)
                elif self.provider == "openai":
                    return await self._call_openai(prompt, system_prompt, json_mode)
                else:
                    raise ValueError(f"Unknown provider: {self.provider}")

            except httpx.TimeoutException:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(
                        "llm_timeout_retry",
                        attempt=attempt + 1,
                        wait_time=wait_time,
                    )
                    await asyncio.sleep(wait_time)
                else:
                    raise LLMException("LLM request timed out after retries")

            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(
                        "llm_error_retry",
                        attempt=attempt + 1,
                        error=str(e),
                        wait_time=wait_time,
                    )
                    await asyncio.sleep(wait_time)
                else:
                    raise

        raise LLMException("Max retries exceeded")

    async def _call_anthropic(
        self, prompt: str, system_prompt: str, json_mode: bool
    ) -> str:
        """Call Anthropic Claude API."""
        messages = [{"role": "user", "content": prompt}]

        if json_mode:
            system_prompt += "\n\nYou must respond with valid JSON only. No markdown, no explanations outside the JSON structure."

        response = await self.anthropic_client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            system=system_prompt,
            messages=messages,
            timeout=self.timeout,
        )

        # Extract text from response
        content = response.content[0].text

        # Log token usage
        logger.info(
            "anthropic_api_call",
            model=self.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )

        return content

    async def _call_openai(
        self, prompt: str, system_prompt: str, json_mode: bool
    ) -> str:
        """Call OpenAI API."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "timeout": self.timeout,
        }

        # Enable JSON mode if supported
        if json_mode and "gpt-4" in self.model.lower():
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.openai_client.chat.completions.create(**kwargs)

        content = response.choices[0].message.content

        # Log token usage
        logger.info(
            "openai_api_call",
            model=self.model,
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )

        return content

    def _get_system_prompt(self) -> str:
        """Get system prompt for recommendation task."""
        return """You are an expert audiophile and headphone consultant with deep knowledge of:
- Headphone acoustics and sound signatures
- Music genres and their ideal sound profiles
- Use cases and their requirements
- Price-to-performance ratios
- Build quality and features

Your task is to provide personalized, accurate headphone recommendations based on the user's music taste, listening habits, and requirements. Be specific, honest, and helpful."""

    def _build_recommendation_prompt(
        self,
        user_profile: Dict[str, Any],
        candidates: List[Dict[str, Any]],
        top_n: int,
    ) -> str:
        """Build prompt for recommendation generation."""
        # Extract user preferences
        genres = ", ".join(user_profile.get("genres", []))
        artists = ", ".join(user_profile.get("favorite_artists", [])[:5])
        sound_prefs = user_profile.get("sound_preferences", {})
        use_case = user_profile.get("primary_use_case", "casual")
        budget_min = user_profile.get("budget_min", 0)
        budget_max = user_profile.get("budget_max", 500)

        # Format candidates
        candidates_text = ""
        for i, hp in enumerate(candidates, 1):
            candidates_text += f"\n{i}. {hp['full_name']}\n"
            candidates_text += f"   - Price: ${hp['price_usd']}\n"
            candidates_text += f"   - Type: {hp['headphone_type']}, {hp['back_type']} back\n"
            candidates_text += f"   - Wireless: {hp['is_wireless']}, ANC: {hp['has_anc']}\n"
            candidates_text += f"   - Sound Signature: {hp['sound_signature']}\n"
            candidates_text += f"   - Description: {hp['description']}\n"
            candidates_text += f"   - Key Features: {', '.join(hp.get('key_features', []))}\n"
            candidates_text += f"   - Target Genres: {', '.join(hp.get('target_genres', []))}\n"

        prompt = f"""**User Profile:**
- **Favorite Genres**: {genres}
- **Favorite Artists**: {artists if artists else "Not specified"}
- **Sound Preferences**:
  - Bass: {sound_prefs.get('bass', 0.5):.1f}/1.0
  - Mids: {sound_prefs.get('mids', 0.5):.1f}/1.0
  - Treble: {sound_prefs.get('treble', 0.5):.1f}/1.0
  - Soundstage: {sound_prefs.get('soundstage', 0.5):.1f}/1.0
  - Detail: {sound_prefs.get('detail', 0.5):.1f}/1.0
- **Primary Use Case**: {use_case}
- **Budget**: ${budget_min} - ${budget_max}

**Candidate Headphones:**
{candidates_text}

**Task:**
Analyze the user's profile and rank the top {top_n} headphones from the candidates above. For each recommended headphone, provide:

1. **Overall Match Score** (0.0-1.0): How well it matches overall
2. **Individual Scores** (0.0-1.0 each):
   - genre_match: How well it suits their music taste
   - sound_profile: How well it matches their sound preferences
   - use_case: How well it fits their primary use case
   - budget: Value for money in their budget range
   - feature_match: How well features align with needs

3. **Explanation** (2-3 sentences): Why this headphone is recommended for this user
4. **Personalized Pros** (2-3 points): Benefits specific to this user
5. **Personalized Cons** (1-2 points): Drawbacks specific to this user
6. **Match Highlights** (3 points): Key reasons for the match

Return the response as a JSON array with this exact structure:
{{
  "recommendations": [
    {{
      "headphone_id": "uuid-from-candidate",
      "rank": 1,
      "scores": {{
        "overall": 0.92,
        "genre_match": 0.88,
        "sound_profile": 0.90,
        "use_case": 0.95,
        "budget": 0.85,
        "feature_match": 0.98
      }},
      "explanation": "...",
      "personalized_pros": ["...", "...", "..."],
      "personalized_cons": ["...", "..."],
      "match_highlights": ["...", "...", "..."]
    }}
  ]
}}

Ensure scores are realistic and relative to the user's needs. Sort by overall score descending."""

        return prompt

    def _build_explanation_prompt(
        self,
        user_profile: Dict[str, Any],
        headphone: Dict[str, Any],
        others: List[Dict[str, Any]],
    ) -> str:
        """Build prompt for detailed explanation."""
        prompt = f"""**User Profile:**
- Genres: {', '.join(user_profile.get('genres', []))}
- Sound Preferences: Bass={user_profile.get('sound_preferences', {}).get('bass', 0.5):.1f}, Mids={user_profile.get('sound_preferences', {}).get('mids', 0.5):.1f}, Treble={user_profile.get('sound_preferences', {}).get('treble', 0.5):.1f}
- Use Case: {user_profile.get('primary_use_case', 'casual')}
- Budget: ${user_profile.get('budget_min', 0)}-${user_profile.get('budget_max', 500)}

**Recommended Headphone:**
{headphone['full_name']} - ${headphone['price_usd']}
{headphone['description']}

**Other Recommendations:**
{', '.join([h['full_name'] for h in others[:3]])}

**Task:**
Provide a detailed explanation (4-5 sentences) of why {headphone['full_name']} is recommended for this user. Include:
1. How it matches their music taste and sound preferences
2. Why it's ideal for their use case
3. How it compares to the other recommendations
4. Value proposition

Also provide 3-5 specific comparison points against the alternatives.

Return as JSON:
{{
  "detailed_explanation": "...",
  "comparison_points": ["...", "...", "..."]
}}"""

        return prompt

    def _parse_recommendation_response(self, response: str) -> Dict[str, Any]:
        """Parse and validate LLM recommendation response."""
        try:
            # Remove markdown code blocks if present
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            response = response.strip()

            # Parse JSON
            data = json.loads(response)

            # Validate structure
            if "recommendations" not in data:
                raise ValueError("Missing 'recommendations' key")

            return data

        except json.JSONDecodeError as e:
            logger.error("llm_response_parse_error", error=str(e), response=response[:500])
            raise LLMException(f"Failed to parse LLM response as JSON: {str(e)}")


# Global LLM client instance
llm_client = LLMClient()
