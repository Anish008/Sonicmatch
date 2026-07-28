"""
Recommendation Engine - Core service for generating headphone recommendations.

This service orchestrates the entire recommendation process:
1. Filter candidate headphones based on hard constraints
2. Call LLM to rank and score headphones
3. Save results to database
4. Return recommendations
"""
import time
import uuid
from decimal import Decimal
from typing import List, Dict, Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import DatabaseException, LLMException, ValidationException
from app.models import (
    Headphone,
    UserPreference,
    RecommendationSession,
    HeadphoneMatch,
    SessionStatus,
    AnalyticsEvent,
)
from app.services.llm_client import llm_client
from app.services.rag_router import rag_router
from app.services.retrieval_engine import RetrievalEngine

logger = structlog.get_logger()


class RecommendationEngine:
    """
    Main recommendation engine.

    Coordinates headphone matching, LLM scoring, and result persistence.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize recommendation engine.

        Args:
            db: Async database session
        """
        self.db = db
        self.llm = llm_client
        self.rag_router = rag_router
        self.retrieval_engine = RetrievalEngine(db)

    async def generate_recommendations(
        self,
        preference: UserPreference,
        top_n: int = 5,
    ) -> RecommendationSession:
        """
        Generate complete headphone recommendations for a user preference.

        Process:
        1. Create recommendation session
        2. Fetch candidate headphones (hard constraints)
        3. Call LLM for scoring and ranking
        4. Save matches to database
        5. Update session status
        6. Track analytics

        Args:
            preference: User preference object
            top_n: Number of recommendations to generate

        Returns:
            Complete recommendation session with matches

        Raises:
            LLMException: If LLM call fails
            DatabaseException: If database operations fail
        """
        start_time = time.time()

        try:
            # Create session record
            session = RecommendationSession(
                preference_id=preference.id,
                status=SessionStatus.PROCESSING,
                llm_provider=settings.llm_provider,
                llm_model=settings.llm_model,
            )
            self.db.add(session)
            await self.db.flush()  # Get session ID

            logger.info(
                "recommendation_session_created",
                session_id=str(session.id),
                preference_id=str(preference.id),
            )

            # Step 1: Fetch candidate headphones
            candidates = await self._fetch_candidate_headphones(preference)

            if not candidates:
                raise ValidationException(
                    "No headphones match your requirements",
                    detail={"budget": f"${preference.budget_min}-${preference.budget_max}"},
                )

            logger.info(
                "candidates_fetched",
                session_id=str(session.id),
                candidate_count=len(candidates),
            )

            # Step 2: Prepare user profile for LLM
            user_profile = self._build_user_profile(preference)

            # Step 2.5: Route query to determine if RAG is needed
            routing_decision = await self._route_query(preference, user_profile)

            # Step 2.6: Retrieve relevant chunks if RAG is needed
            retrieved_chunks = []
            if self.rag_router.should_use_rag(routing_decision):
                retrieved_chunks = await self._retrieve_context(preference, candidates)

            # Step 3: Call LLM for recommendations (with optional RAG context)
            llm_response = await self.llm.generate_recommendations(
                user_profile=user_profile,
                candidate_headphones=[h.to_dict() for h in candidates],
                top_n=min(top_n, len(candidates)),
                retrieved_context=retrieved_chunks if retrieved_chunks else None,
            )

            # Step 4: Save matches to database
            matches = await self._save_matches(
                session=session,
                llm_response=llm_response,
                candidates={h.id: h for h in candidates},
            )

            # Step 5: Update session status
            processing_time_ms = int((time.time() - start_time) * 1000)
            session.status = SessionStatus.COMPLETE
            session.processing_time_ms = processing_time_ms

            await self.db.commit()
            await self.db.refresh(session)

            logger.info(
                "recommendation_session_complete",
                session_id=str(session.id),
                match_count=len(matches),
                processing_time_ms=processing_time_ms,
            )

            # Step 6: Track analytics
            await self._track_event(
                event_type="recommendation_generated",
                session_id=session.id,
                metadata={
                    "candidate_count": len(candidates),
                    "recommendation_count": len(matches),
                    "processing_time_ms": processing_time_ms,
                    "llm_provider": settings.llm_provider,
                    "llm_model": settings.llm_model,
                },
            )

            return session

        except LLMException:
            # Mark session as error
            if session:
                session.status = SessionStatus.ERROR
                session.error_message = "LLM service error"
                await self.db.commit()
            raise

        except ValidationException:
            # Mark session as error and re-raise validation errors
            if session:
                session.status = SessionStatus.ERROR
                session.error_message = "No matching headphones"
                await self.db.commit()
            raise

        except Exception as e:
            logger.error(
                "recommendation_generation_error",
                error=str(e),
                preference_id=str(preference.id),
            )
            if session:
                session.status = SessionStatus.ERROR
                session.error_message = str(e)
                await self.db.commit()
            raise DatabaseException(f"Failed to generate recommendations: {str(e)}")

    async def get_session_with_matches(
        self, session_id: uuid.UUID
    ) -> RecommendationSession | None:
        """
        Fetch recommendation session with all matches and headphone data.

        Args:
            session_id: Session UUID

        Returns:
            Session with matches, or None if not found
        """
        query = select(RecommendationSession).where(
            RecommendationSession.id == session_id
        )
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            return None

        # Fetch matches
        matches_query = (
            select(HeadphoneMatch)
            .where(HeadphoneMatch.session_id == session_id)
            .order_by(HeadphoneMatch.rank)
        )
        matches_result = await self.db.execute(matches_query)
        matches = matches_result.scalars().all()

        # Fetch headphones for matches
        if matches:
            headphone_ids = [m.headphone_id for m in matches]
            headphones_query = select(Headphone).where(Headphone.id.in_(headphone_ids))
            headphones_result = await self.db.execute(headphones_query)
            headphones = {h.id: h for h in headphones_result.scalars().all()}

            # Attach headphones to matches
            for match in matches:
                match.headphone = headphones.get(match.headphone_id)

        # Attach matches to session
        session.matches = matches

        return session

    async def generate_detailed_explanation(
        self,
        session_id: uuid.UUID,
        headphone_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Generate detailed explanation for a specific headphone match.

        Args:
            session_id: Recommendation session ID
            headphone_id: Headphone to explain

        Returns:
            Dictionary with detailed explanation and comparison points

        Raises:
            ValidationException: If session or headphone not found
        """
        # Fetch session with preference
        session = await self.get_session_with_matches(session_id)
        if not session:
            raise ValidationException("Session not found")

        # Fetch preference
        pref_query = select(UserPreference).where(
            UserPreference.id == session.preference_id
        )
        pref_result = await self.db.execute(pref_query)
        preference = pref_result.scalar_one_or_none()

        if not preference:
            raise ValidationException("Preference not found")

        # Find target headphone in matches
        target_match = None
        other_headphones = []

        for match in session.matches:
            if match.headphone_id == headphone_id:
                target_match = match
            else:
                other_headphones.append(match.headphone)

        if not target_match:
            raise ValidationException("Headphone not in recommendations")

        # Build user profile
        user_profile = self._build_user_profile(preference)

        # Retrieve context for this specific headphone (for RAG-enhanced explanation)
        retrieved_chunks = []
        if settings.rag_enabled:
            try:
                # Build a subjective query for this headphone
                query = f"sound quality comfort build quality performance {headphone.full_name}"

                results = await self.retrieval_engine.retrieve_for_headphone(
                    query=query,
                    headphone_id=str(headphone_id),
                    top_k=3,  # Fewer chunks for detailed explanation
                    similarity_threshold=settings.rag_similarity_threshold,
                )

                retrieved_chunks = [r.to_dict() for r in results]

                logger.info(
                    "explanation_rag_retrieval",
                    headphone_id=str(headphone_id),
                    num_chunks=len(retrieved_chunks),
                )

            except Exception as e:
                logger.warning(
                    "explanation_rag_retrieval_failed",
                    error=str(e),
                    headphone_id=str(headphone_id),
                )
                # Continue without RAG context
                retrieved_chunks = []

        # Call LLM for detailed explanation (with optional RAG context)
        explanation = await self.llm.generate_detailed_explanation(
            user_profile=user_profile,
            headphone=target_match.headphone.to_dict(),
            other_headphones=[h.to_dict() for h in other_headphones],
            retrieved_context=retrieved_chunks if retrieved_chunks else None,
        )

        logger.info(
            "detailed_explanation_generated",
            session_id=str(session_id),
            headphone_id=str(headphone_id),
        )

        return explanation

    async def _fetch_candidate_headphones(
        self, preference: UserPreference
    ) -> List[Headphone]:
        """
        Fetch headphones matching hard constraints.

        Constraints:
        - Budget range
        - Wireless requirement
        - ANC requirement
        - Preferred type (if specified)
        - Open back acceptable

        Args:
            preference: User preferences

        Returns:
            List of candidate headphones
        """
        query = select(Headphone).where(
            Headphone.price_usd >= preference.budget_min,
            Headphone.price_usd <= preference.budget_max,
        )

        # Wireless requirement
        if preference.wireless_required:
            query = query.where(Headphone.is_wireless == True)

        # ANC requirement
        if preference.anc_required:
            query = query.where(Headphone.has_anc == True)

        # Preferred type
        if preference.preferred_type:
            from app.models.headphone import HeadphoneType
            query = query.where(Headphone.headphone_type == preference.preferred_type)

        # Open back filter
        if not preference.open_back_acceptable:
            from app.models.headphone import BackType
            query = query.where(Headphone.back_type != BackType.OPEN)

        # Execute query
        result = await self.db.execute(query)
        candidates = result.scalars().all()

        return list(candidates)

    def _build_user_profile(self, preference: UserPreference) -> Dict[str, Any]:
        """
        Convert UserPreference model to dictionary for LLM.

        Args:
            preference: User preference object

        Returns:
            User profile dictionary
        """
        return {
            "genres": preference.genres or [],
            "favorite_artists": preference.favorite_artists or [],
            "favorite_tracks": preference.favorite_tracks or [],
            "sound_preferences": preference.sound_preferences or {},
            "primary_use_case": preference.primary_use_case,
            "secondary_use_cases": preference.secondary_use_cases or [],
            "budget_min": float(preference.budget_min),
            "budget_max": float(preference.budget_max),
            "wireless_required": preference.wireless_required,
            "anc_required": preference.anc_required,
            "preferred_type": preference.preferred_type,
        }

    def _validate_score(self, score: float, score_name: str, headphone_id: uuid.UUID) -> Decimal:
        """
        Validate that a score is within valid range [0.0, 1.0].

        Args:
            score: Score value to validate
            score_name: Name of the score (for error messages)
            headphone_id: Headphone ID (for error logging)

        Returns:
            Validated score as Decimal

        Raises:
            ValidationException: If score is outside valid range or non-numeric
        """
        try:
            score_float = float(score)
        except (TypeError, ValueError) as e:
            logger.error(
                "invalid_score_type",
                score_name=score_name,
                score_value=score,
                headphone_id=str(headphone_id),
                error=str(e),
            )
            raise ValidationException(
                f"Score '{score_name}' must be numeric, got: {type(score).__name__}",
                detail={
                    "score_name": score_name,
                    "invalid_value": str(score),
                    "headphone_id": str(headphone_id),
                },
            )

        if not (0.0 <= score_float <= 1.0):
            logger.error(
                "score_out_of_range",
                score_name=score_name,
                score_value=score_float,
                headphone_id=str(headphone_id),
            )
            raise ValidationException(
                f"Score '{score_name}' must be between 0.0 and 1.0, got: {score_float}",
                detail={
                    "score_name": score_name,
                    "invalid_value": score_float,
                    "valid_range": [0.0, 1.0],
                    "headphone_id": str(headphone_id),
                },
            )

        return Decimal(str(score_float))

    async def _save_matches(
        self,
        session: RecommendationSession,
        llm_response: Dict[str, Any],
        candidates: Dict[uuid.UUID, Headphone],
    ) -> List[HeadphoneMatch]:
        """
        Save LLM recommendations as HeadphoneMatch records.

        Validates all scores are in [0.0, 1.0] range before saving.

        Args:
            session: Recommendation session
            llm_response: LLM response with recommendations
            candidates: Dict mapping headphone ID to Headphone object

        Returns:
            List of created matches

        Raises:
            ValidationException: If any score is invalid or out of range
        """
        matches = []

        for rec in llm_response.get("recommendations", []):
            # Find headphone by ID (from LLM response)
            headphone_id = uuid.UUID(rec["headphone_id"])

            if headphone_id not in candidates:
                logger.warning(
                    "headphone_not_in_candidates",
                    headphone_id=str(headphone_id),
                )
                continue

            # Validate scores before creating match
            scores = rec.get("scores", {})
            try:
                validated_scores = {
                    "overall": self._validate_score(scores.get("overall"), "overall", headphone_id),
                    "genre_match": self._validate_score(scores.get("genre_match"), "genre_match", headphone_id),
                    "sound_profile": self._validate_score(scores.get("sound_profile"), "sound_profile", headphone_id),
                    "use_case": self._validate_score(scores.get("use_case"), "use_case", headphone_id),
                    "budget": self._validate_score(scores.get("budget"), "budget", headphone_id),
                    "feature_match": self._validate_score(scores.get("feature_match"), "feature_match", headphone_id),
                }
            except ValidationException:
                # Log already happened in _validate_score, skip this recommendation
                logger.warning(
                    "skipping_recommendation_invalid_scores",
                    headphone_id=str(headphone_id),
                    rank=rec.get("rank"),
                )
                continue

            # Create match record with validated scores
            match = HeadphoneMatch(
                session_id=session.id,
                headphone_id=headphone_id,
                rank=rec["rank"],
                overall_score=validated_scores["overall"],
                genre_match_score=validated_scores["genre_match"],
                sound_profile_score=validated_scores["sound_profile"],
                use_case_score=validated_scores["use_case"],
                budget_score=validated_scores["budget"],
                feature_match_score=validated_scores["feature_match"],
                explanation=rec["explanation"],
                personalized_pros=rec["personalized_pros"],
                personalized_cons=rec["personalized_cons"],
                match_highlights=rec["match_highlights"],
                citations=rec.get("citations", []),  # Optional RAG citations
            )

            self.db.add(match)
            matches.append(match)

        await self.db.flush()

        logger.info(
            "matches_saved",
            session_id=str(session.id),
            match_count=len(matches),
        )

        return matches

    async def _route_query(
        self,
        preference: UserPreference,
        user_profile: Dict[str, Any],
    ) -> Any:
        """
        Route query through RAG decision layer.

        Determines if this query needs retrieval-augmented generation
        based on the presence of subjective/review-based needs.

        Args:
            preference: User preference object
            user_profile: Formatted user profile dict

        Returns:
            RoutingDecision object
        """
        # Build query context for routing
        query_text = self._build_query_text_for_routing(preference)
        context = {
            "budget": f"${preference.budget_min}-${preference.budget_max}",
            "genres": preference.genres or [],
            "sound_preferences": preference.sound_preferences or {},
            "use_case": preference.primary_use_case,
        }

        # Route query
        routing_decision = await self.rag_router.route_query(
            query=query_text,
            context=context,
        )

        logger.info(
            "query_routed",
            needs_rag=routing_decision.needs_rag,
            confidence=routing_decision.confidence,
            query_type=routing_decision.query_type,
            reasoning=routing_decision.reasoning,
        )

        return routing_decision

    def _build_query_text_for_routing(self, preference: UserPreference) -> str:
        """
        Build a textual representation of the user's query for routing.

        Combines all preference fields into a natural language query
        for the routing classifier.

        Args:
            preference: User preference object

        Returns:
            Query text for routing
        """
        parts = []

        # Add use case
        if preference.primary_use_case:
            parts.append(f"Primary use: {preference.primary_use_case}")

        # Add music preferences
        if preference.genres:
            parts.append(f"Favorite genres: {', '.join(preference.genres[:3])}")

        # Add sound preferences
        if preference.sound_preferences:
            sound_prefs = []
            for key, value in preference.sound_preferences.items():
                if value > 0.6:  # High preference
                    sound_prefs.append(f"strong {key}")
                elif value < 0.4:  # Low preference
                    sound_prefs.append(f"minimal {key}")
            if sound_prefs:
                parts.append(f"Sound preferences: {', '.join(sound_prefs)}")

        # Add budget
        parts.append(f"Budget: ${preference.budget_min}-${preference.budget_max}")

        # Add feature requirements
        features = []
        if preference.wireless_required:
            features.append("wireless required")
        if preference.anc_required:
            features.append("ANC required")
        if features:
            parts.append(f"Features: {', '.join(features)}")

        return " | ".join(parts)

    async def _retrieve_context(
        self,
        preference: UserPreference,
        candidates: List[Headphone],
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant review chunks for RAG-enhanced recommendations.

        Builds a retrieval query from user preferences and fetches
        relevant chunks from the vector store.

        Args:
            preference: User preference object
            candidates: List of candidate headphones

        Returns:
            List of retrieved chunk dictionaries
        """
        # Build retrieval query from preferences
        query_parts = []

        if preference.genres:
            query_parts.append(f"sound quality for {', '.join(preference.genres[:2])}")

        if preference.sound_preferences:
            prefs = preference.sound_preferences
            if prefs.get("bass", 0.5) > 0.7:
                query_parts.append("bass response and low-end extension")
            if prefs.get("mids", 0.5) > 0.7:
                query_parts.append("midrange clarity and vocal presence")
            if prefs.get("treble", 0.5) > 0.7:
                query_parts.append("treble detail and sparkle")
            if prefs.get("soundstage", 0.5) > 0.7:
                query_parts.append("soundstage width and imaging")

        if preference.primary_use_case:
            query_parts.append(f"performance for {preference.primary_use_case}")

        retrieval_query = " ".join(query_parts) or "overall sound quality and comfort"

        logger.info(
            "rag_retrieval_started",
            query=retrieval_query,
            candidate_count=len(candidates),
        )

        # Build filters from preference
        filters = {
            "budget_min": float(preference.budget_min),
            "budget_max": float(preference.budget_max),
            "wireless_required": preference.wireless_required,
            "anc_required": preference.anc_required,
        }

        if preference.preferred_type:
            filters["preferred_type"] = preference.preferred_type

        if not preference.open_back_acceptable:
            filters["open_back_acceptable"] = False

        # Retrieve chunks
        try:
            results = await self.retrieval_engine.retrieve(
                query=retrieval_query,
                filters=filters,
                top_k=settings.rag_top_k,
                similarity_threshold=settings.rag_similarity_threshold,
            )

            logger.info(
                "rag_retrieval_completed",
                num_chunks=len(results),
                avg_similarity=sum(r.similarity_score for r in results) / len(results) if results else 0,
            )

            return [r.to_dict() for r in results]

        except Exception as e:
            logger.warning(
                "rag_retrieval_failed_fallback",
                error=str(e),
            )
            # Fallback: return empty context (graceful degradation)
            return []

    async def _track_event(
        self,
        event_type: str,
        session_id: uuid.UUID | None = None,
        metadata: Dict[str, Any] | None = None,
    ):
        """
        Track analytics event.

        Args:
            event_type: Type of event
            session_id: Optional session reference
            metadata: Event metadata
        """
        event = AnalyticsEvent(
            event_type=event_type,
            session_id=session_id,
            metadata=metadata or {},
        )
        self.db.add(event)
        # Don't await commit - let it be committed with the main transaction
