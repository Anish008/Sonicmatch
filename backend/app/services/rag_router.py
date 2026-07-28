"""
RAG Router - Agent decision layer for intelligent query routing.

Decides whether a user query needs RAG retrieval (subjective/review-based)
or can be answered by the existing structured+LLM path alone.

Uses a cheap LLM classification step with reasoning for defensibility.
All routing decisions are logged for inspection and evaluation.
"""
import time
from typing import Dict, Any, Optional
import structlog

from app.config import settings
from app.services.llm_client import llm_client
from app.core.exceptions import LLMException

logger = structlog.get_logger()


class RoutingDecision:
    """
    Container for routing decision with reasoning.

    Captures the decision, confidence, reasoning, and timing for
    inspection and evaluation purposes.
    """

    def __init__(
        self,
        needs_rag: bool,
        confidence: float,
        reasoning: str,
        query_type: str,
        decision_time_ms: int,
    ):
        self.needs_rag = needs_rag
        self.confidence = confidence
        self.reasoning = reasoning
        self.query_type = query_type
        self.decision_time_ms = decision_time_ms

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging and API responses."""
        return {
            "needs_rag": self.needs_rag,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "query_type": self.query_type,
            "decision_time_ms": self.decision_time_ms,
        }


class RAGRouter:
    """
    Agent decision layer for RAG routing.

    Analyzes user queries to determine if they require retrieval-augmented
    generation (subjective, review-grounded queries) or can be answered
    purely with structured filtering + LLM reasoning.

    Uses a lightweight LLM prompt for classification with reasoning,
    providing transparency and defensibility over simple heuristics.
    """

    ROUTING_PROMPT = """You are a query classifier for a headphone recommendation system.

Your task: Determine if this user query requires retrieval from reviews/subjective sources, or can be answered using only structured product data (price, specs, features).

Query types:
1. **STRUCTURED** - Can be answered with product specs/features alone:
   - Budget/price constraints ("under $200", "best value")
   - Technical requirements ("wireless", "ANC", "over-ear")
   - Objective features ("longest battery life", "lightest weight")
   - Basic filtering queries

2. **SUBJECTIVE** - Requires user reviews, expert opinions, or subjective assessments:
   - Sound quality questions ("best bass", "warm sound", "detailed treble")
   - Comfort assessments ("most comfortable", "good for glasses")
   - Build quality opinions ("feels premium", "durability")
   - Comparative subjective claims ("better soundstage than X")
   - Genre-specific performance ("best for classical", "good for EDM")
   - Real-world usage experiences ("good for gym", "comfortable for long flights")

User Query: "{query}"

Additional Context:
{context}

Analyze this query and respond in JSON format:
{{
    "needs_rag": true/false,
    "confidence": 0.0-1.0,
    "query_type": "structured" | "subjective" | "hybrid",
    "reasoning": "Brief explanation of why this query does/doesn't need retrieval (1-2 sentences)"
}}

Rules:
- If ANY part of the query involves subjective assessment, set needs_rag=true
- Confidence should reflect ambiguity (0.5-0.7 for borderline cases)
- Be conservative: when in doubt, route to RAG (better to retrieve and not need than miss relevant context)
- "Hybrid" queries have both structured and subjective elements - route to RAG
"""

    def __init__(self):
        """Initialize RAG router with LLM client."""
        self.llm = llm_client
        self.enabled = settings.rag_enabled

        logger.info(
            "rag_router_initialized",
            rag_enabled=self.enabled,
        )

    async def route_query(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> RoutingDecision:
        """
        Determine if a query needs RAG retrieval.

        Uses LLM classification with reasoning for transparent, defensible
        routing decisions. All decisions are logged for evaluation.

        Args:
            query: User's natural language query or preference description
            context: Optional additional context (user preferences, filters applied, etc.)

        Returns:
            RoutingDecision object with needs_rag flag, confidence, and reasoning

        Raises:
            LLMException: If routing classification fails
        """
        start_time = time.time()

        # If RAG is disabled, always return structured path
        if not self.enabled:
            decision = RoutingDecision(
                needs_rag=False,
                confidence=1.0,
                reasoning="RAG is disabled in configuration",
                query_type="structured",
                decision_time_ms=0,
            )

            logger.info(
                "routing_decision_rag_disabled",
                query_preview=query[:100],
                decision=decision.to_dict(),
            )

            return decision

        # Format context for prompt
        context_str = self._format_context(context or {})

        # Build routing prompt
        prompt = self.ROUTING_PROMPT.format(
            query=query,
            context=context_str,
        )

        try:
            # Call LLM for classification (use cheap model for routing)
            # This is a quick classification task, so we use minimal tokens
            response = await self.llm.call_llm_raw(
                system_prompt="You are a query classifier. Respond only in valid JSON.",
                user_prompt=prompt,
                max_tokens=200,
                temperature=0.0,  # Deterministic routing
            )

            # Parse response
            import json
            decision_data = json.loads(response)

            decision_time_ms = int((time.time() - start_time) * 1000)

            decision = RoutingDecision(
                needs_rag=decision_data["needs_rag"],
                confidence=float(decision_data["confidence"]),
                reasoning=decision_data["reasoning"],
                query_type=decision_data["query_type"],
                decision_time_ms=decision_time_ms,
            )

            # Log decision for inspection and evaluation
            logger.info(
                "routing_decision_made",
                query_preview=query[:100],
                decision=decision.to_dict(),
            )

            return decision

        except json.JSONDecodeError as e:
            logger.error(
                "routing_response_parse_error",
                error=str(e),
                response=response[:200] if response else None,
            )

            # Fallback: route to RAG on parsing error (conservative)
            decision = RoutingDecision(
                needs_rag=True,
                confidence=0.5,
                reasoning="Failed to parse routing response - defaulting to RAG",
                query_type="unknown",
                decision_time_ms=int((time.time() - start_time) * 1000),
            )

            logger.warning(
                "routing_fallback_to_rag",
                query_preview=query[:100],
                reason="parse_error",
            )

            return decision

        except Exception as e:
            logger.error(
                "routing_decision_error",
                error=str(e),
                query_preview=query[:100],
            )

            # Fallback: route to RAG on error (conservative)
            decision = RoutingDecision(
                needs_rag=True,
                confidence=0.5,
                reasoning=f"Routing error: {str(e)[:100]} - defaulting to RAG",
                query_type="unknown",
                decision_time_ms=int((time.time() - start_time) * 1000),
            )

            logger.warning(
                "routing_fallback_to_rag",
                query_preview=query[:100],
                reason="error",
                error=str(e),
            )

            return decision

    def _format_context(self, context: Dict[str, Any]) -> str:
        """
        Format context dictionary into readable string for LLM prompt.

        Args:
            context: Context dictionary with user preferences, filters, etc.

        Returns:
            Formatted context string
        """
        if not context:
            return "No additional context provided."

        lines = []

        if "budget" in context:
            lines.append(f"- Budget: {context['budget']}")

        if "genres" in context and context["genres"]:
            lines.append(f"- Music genres: {', '.join(context['genres'][:3])}")

        if "sound_preferences" in context and context["sound_preferences"]:
            prefs = context["sound_preferences"]
            if isinstance(prefs, dict):
                pref_str = ", ".join(f"{k}: {v}" for k, v in list(prefs.items())[:3])
                lines.append(f"- Sound preferences: {pref_str}")

        if "use_case" in context:
            lines.append(f"- Use case: {context['use_case']}")

        if "free_text_query" in context and context["free_text_query"]:
            lines.append(f"- Free-text query: {context['free_text_query'][:100]}")

        return "\n".join(lines) if lines else "No additional context provided."

    def should_use_rag(self, decision: RoutingDecision) -> bool:
        """
        Determine if RAG should be used based on decision and threshold.

        Applies confidence threshold for more robust routing.

        Args:
            decision: RoutingDecision from route_query

        Returns:
            True if RAG should be used, False otherwise
        """
        # If needs_rag is True with confidence above threshold, use RAG
        if decision.needs_rag and decision.confidence >= settings.rag_routing_threshold:
            return True

        # If needs_rag is False with high confidence, don't use RAG
        if not decision.needs_rag and decision.confidence >= settings.rag_routing_threshold:
            return False

        # For low-confidence decisions, default to RAG (conservative)
        logger.info(
            "low_confidence_routing_defaulting_to_rag",
            decision=decision.to_dict(),
            threshold=settings.rag_routing_threshold,
        )
        return True


# Global router instance
rag_router = RAGRouter()
