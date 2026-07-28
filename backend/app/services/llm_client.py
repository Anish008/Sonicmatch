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
        retrieved_context: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        """
        Generate headphone recommendations using LLM.

        Args:
            user_profile: User preferences and requirements
            candidate_headphones: List of headphones matching hard constraints
            top_n: Number of top recommendations to return
            retrieved_context: Optional RAG-retrieved review chunks for grounding

        Returns:
            Dictionary with recommendations, scores, and explanations
        """
        # Build prompt (with optional RAG context)
        prompt = self._build_recommendation_prompt(
            user_profile, candidate_headphones, top_n, retrieved_context
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
        retrieved_context: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        """
        Generate detailed explanation for a specific headphone recommendation.

        Args:
            user_profile: User preferences
            headphone: The headphone to explain
            other_headphones: Other recommended headphones for comparison
            retrieved_context: Optional RAG-retrieved review chunks

        Returns:
            Dictionary with detailed explanation, comparison points, and citations
        """
        prompt = self._build_explanation_prompt(
            user_profile, headphone, other_headphones, retrieved_context
        )

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

    async def call_llm_raw(
        self,
        user_prompt: str,
        system_prompt: str,
        max_tokens: int = None,
        temperature: float = None,
        json_mode: bool = False,
    ) -> str:
        """
        Make a raw LLM API call with custom parameters.

        Useful for lightweight tasks like classification, routing, etc.
        that don't fit the standard recommendation/explanation flow.

        Args:
            user_prompt: User/main prompt
            system_prompt: System instructions
            max_tokens: Override default max tokens
            temperature: Override default temperature
            json_mode: Whether to request JSON output

        Returns:
            Raw LLM response text

        Raises:
            LLMException: If LLM call fails
        """
        # Store original settings
        original_max_tokens = self.max_tokens
        original_temperature = self.temperature

        try:
            # Apply overrides
            if max_tokens is not None:
                self.max_tokens = max_tokens
            if temperature is not None:
                self.temperature = temperature

            # Call LLM
            response = await self._call_llm_with_retry(
                prompt=user_prompt,
                system_prompt=system_prompt,
                json_mode=json_mode,
            )

            return response

        finally:
            # Restore original settings
            self.max_tokens = original_max_tokens
            self.temperature = original_temperature

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
        retrieved_context: List[Dict[str, Any]] | None = None,
    ) -> str:
        """
        Build prompt for recommendation generation.

        Args:
            user_profile: User preferences
            candidates: Candidate headphones
            top_n: Number of recommendations
            retrieved_context: Optional RAG-retrieved chunks

        Returns:
            Formatted prompt string
        """
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

        # Add RAG context if available
        rag_context_text = ""
        if retrieved_context:
            rag_context_text = "\n**Retrieved Review Context (for grounding explanations):**\n"
            rag_context_text += "The following review excerpts provide real-world insights. Use them to support your recommendations:\n\n"

            for i, chunk in enumerate(retrieved_context[:10], 1):  # Limit to top 10 chunks
                rag_context_text += f"{i}. [{chunk['headphone_name']}] ({chunk['source_type']})\n"
                rag_context_text += f"   \"{chunk['chunk_text'][:200]}...\"\n"
                rag_context_text += f"   Source: {chunk['source_url']}\n"
                rag_context_text += f"   Similarity: {chunk['similarity_score']:.2f}\n\n"

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
{rag_context_text}
**Task:**
Analyze the user's profile and rank the top {top_n} headphones from the candidates above. For each recommended headphone, provide:

1. **Overall Match Score** (0.0-1.0): Holistic match quality considering all factors
   - 0.9-1.0: Exceptional match, hard to find better
   - 0.8-0.9: Excellent match, highly recommended
   - 0.7-0.8: Good match, solid choice
   - 0.6-0.7: Decent match, acceptable
   - <0.6: Weak match, has significant trade-offs

2. **Individual Scores** (0.0-1.0 each):
   - **genre_match**: How well the headphone's tuning and target genres align with user's music taste
     * Consider: Target genres overlap, sound signature suitability for genres
     * Examples: Classical/jazz → wide soundstage + neutral; Hip-hop/EDM → strong sub-bass

   - **sound_profile**: How well the headphone's frequency response matches user's sound preferences
     * Consider: Bass/mids/treble levels, soundstage, detail retrieval
     * Match user's bass/mids/treble/soundstage/detail values (0.0-1.0) to headphone specs
     * Examples: User bass=0.9 → v-shaped headphones score high; bass=0.3 → neutral scores high

   - **use_case**: How well the headphone fits the user's primary intended usage
     * Studio → neutral tuning, good isolation, wired preferred
     * Travel/Office → ANC required, wireless preferred, comfort priority
     * Gaming → wide soundstage, good imaging, comfort for long sessions
     * Audiophile → detail retrieval, accurate tuning, build quality
     * Casual → forgiving tuning, comfort, good value

   - **budget**: Value proposition within the user's budget range
     * High score (0.8-1.0): Exceptional value at this price, best-in-class
     * Mid score (0.6-0.8): Fair value, competitive with alternatives
     * Low score (0.4-0.6): Overpriced or better alternatives exist
     * Consider: Price positioning, competitors at same price, feature set value

   - **feature_match**: How well physical features align with user's requirements
     * Hard requirements: Wireless (if required), ANC (if required), open-back acceptance
     * Soft preferences: Type (over-ear/on-ear/IEM), portability, build quality
     * Penalize heavily for missing hard requirements, moderately for soft mismatches

**Scoring Guidelines:**
- The **overall** score should be a weighted combination of individual scores, NOT a simple average
- Suggested weighting: genre_match (25%), sound_profile (30%), use_case (20%), budget (15%), feature_match (10%)
- Hard requirements (wireless/ANC) in feature_match should heavily penalize overall if not met
- Be honest and realistic - not every headphone deserves 0.9+
- Differentiate between recommendations - top pick should clearly outscore #2, etc.

3. **Explanation** (2-3 sentences): Why this headphone is recommended for this user
4. **Personalized Pros** (2-3 points): Benefits specific to this user
5. **Personalized Cons** (1-2 points): Drawbacks specific to this user
6. **Match Highlights** (3 points): Key reasons for the match
{citation_instructions}
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
      "match_highlights": ["...", "...", "..."]{citation_schema}
    }}
  ]
}}

Ensure scores are realistic and relative to the user's needs. Sort by overall score descending."""

        # Add citation instructions if RAG context is available
        if retrieved_context:
            citation_instructions = f"""

7. **Citations**: When making claims about sound quality, comfort, build quality, or real-world performance:
   - MUST cite the retrieved review excerpts provided above
   - Each citation should reference which headphone review it came from
   - Include the source type (review, expert_review, forum_post, spec_sheet)
   - DO NOT make up citations - only cite the provided context
   - If no relevant context exists for a claim, you can make it without citation
   - Format: "claim text" (citing Source #{citation_number})
"""
            citation_schema = """,
      "citations": [
        {{
          "claim": "Specific claim made in explanation or pros/cons",
          "source_chunk_id": "chunk ID from retrieved context (if available)",
          "source_url": "URL from retrieved context",
          "source_type": "review|expert_review|forum_post|spec_sheet"
        }}
      ]"""
        else:
            citation_instructions = ""
            citation_schema = ""

        # Format prompt with optional citation instructions
        prompt = prompt.format(
            citation_instructions=citation_instructions,
            citation_schema=citation_schema,
        )

        return prompt

    def _build_explanation_prompt(
        self,
        user_profile: Dict[str, Any],
        headphone: Dict[str, Any],
        others: List[Dict[str, Any]],
        retrieved_context: List[Dict[str, Any]] | None = None,
    ) -> str:
        """
        Build prompt for detailed explanation.

        Args:
            user_profile: User preferences
            headphone: Target headphone
            others: Other recommendations
            retrieved_context: Optional RAG context

        Returns:
            Formatted prompt string
        """
        # Add RAG context if available
        rag_context_text = ""
        citation_instructions = ""
        citation_schema = ""

        if retrieved_context:
            rag_context_text = "\n**Retrieved Review Context:**\n"
            for i, chunk in enumerate(retrieved_context[:5], 1):
                rag_context_text += f"{i}. ({chunk['source_type']})\n"
                rag_context_text += f"   \"{chunk['chunk_text'][:300]}...\"\n"
                rag_context_text += f"   Source: {chunk['source_url']}\n\n"

            citation_instructions = """
**Citation Requirement:**
When making specific claims about sound quality, comfort, or performance, cite the retrieved review context above.
Format each citation with the source number and type."""

            citation_schema = """,
  "citations": [
    {
      "claim": "Specific claim from the explanation",
      "source_url": "URL from retrieved context",
      "source_type": "review|expert_review|forum_post|spec_sheet"
    }
  ]"""

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
{rag_context_text}
**Task:**
Provide a detailed explanation (4-5 sentences) of why {headphone['full_name']} is recommended for this user. Include:
1. How it matches their music taste and sound preferences
2. Why it's ideal for their use case
3. How it compares to the other recommendations
4. Value proposition
{citation_instructions}
Also provide 3-5 specific comparison points against the alternatives.

Return as JSON:
{{
  "detailed_explanation": "...",
  "comparison_points": ["...", "...", "..."]{citation_schema}
}}"""

        return prompt

    def _validate_recommendation_scores(self, recommendations: list) -> None:
        """
        Validate that all scores in recommendations are within [0.0, 1.0].

        Args:
            recommendations: List of recommendation dictionaries

        Raises:
            LLMException: If any score is invalid
        """
        for i, rec in enumerate(recommendations):
            scores = rec.get("scores", {})
            headphone_id = rec.get("headphone_id", "unknown")

            score_fields = ["overall", "genre_match", "sound_profile", "use_case", "budget", "feature_match"]

            for field in score_fields:
                score = scores.get(field)

                # Check if score exists
                if score is None:
                    logger.error(
                        "llm_response_missing_score",
                        field=field,
                        headphone_id=headphone_id,
                        recommendation_index=i,
                    )
                    raise LLMException(
                        f"Recommendation {i} missing required score field: {field}"
                    )

                # Check if score is numeric
                try:
                    score_float = float(score)
                except (TypeError, ValueError):
                    logger.error(
                        "llm_response_non_numeric_score",
                        field=field,
                        score_value=score,
                        score_type=type(score).__name__,
                        headphone_id=headphone_id,
                        recommendation_index=i,
                    )
                    raise LLMException(
                        f"Score '{field}' must be numeric, got {type(score).__name__}: {score}"
                    )

                # Check if score is in valid range
                if not (0.0 <= score_float <= 1.0):
                    logger.error(
                        "llm_response_score_out_of_range",
                        field=field,
                        score_value=score_float,
                        headphone_id=headphone_id,
                        recommendation_index=i,
                    )
                    raise LLMException(
                        f"Score '{field}' must be between 0.0 and 1.0, got: {score_float}"
                    )

    def _parse_recommendation_response(self, response: str) -> Dict[str, Any]:
        """
        Parse and validate LLM recommendation response.

        Validates JSON structure and score ranges.

        Raises:
            LLMException: If response is invalid or scores are out of range
        """
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
                logger.error("llm_response_missing_recommendations_key")
                raise LLMException("Missing 'recommendations' key in LLM response")

            # Validate scores in all recommendations
            self._validate_recommendation_scores(data["recommendations"])

            return data

        except json.JSONDecodeError as e:
            logger.error("llm_response_parse_error", error=str(e), response=response[:500])
            raise LLMException(f"Failed to parse LLM response as JSON: {str(e)}")


# Global LLM client instance
llm_client = LLMClient()
