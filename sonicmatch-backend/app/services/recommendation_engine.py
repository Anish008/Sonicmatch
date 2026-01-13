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

            # Step 3: Call LLM for recommendations
            llm_response = await self.llm.generate_recommendations(
                user_profile=user_profile,
                candidate_headphones=[h.to_dict() for h in candidates],
                top_n=min(top_n, len(candidates)),
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

        # Call LLM for detailed explanation
        explanation = await self.llm.generate_detailed_explanation(
            user_profile=user_profile,
            headphone=target_match.headphone.to_dict(),
            other_headphones=[h.to_dict() for h in other_headphones],
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
            "genres": preference.genres,
            "favorite_artists": preference.favorite_artists,
            "favorite_tracks": preference.favorite_tracks,
            "sound_preferences": preference.sound_preferences,
            "primary_use_case": preference.primary_use_case,
            "secondary_use_cases": preference.secondary_use_cases,
            "budget_min": float(preference.budget_min),
            "budget_max": float(preference.budget_max),
            "wireless_required": preference.wireless_required,
            "anc_required": preference.anc_required,
            "preferred_type": preference.preferred_type,
        }

    async def _save_matches(
        self,
        session: RecommendationSession,
        llm_response: Dict[str, Any],
        candidates: Dict[uuid.UUID, Headphone],
    ) -> List[HeadphoneMatch]:
        """
        Save LLM recommendations as HeadphoneMatch records.

        Args:
            session: Recommendation session
            llm_response: LLM response with recommendations
            candidates: Dict mapping headphone ID to Headphone object

        Returns:
            List of created matches
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

            # Create match record
            match = HeadphoneMatch(
                session_id=session.id,
                headphone_id=headphone_id,
                rank=rec["rank"],
                overall_score=Decimal(str(rec["scores"]["overall"])),
                genre_match_score=Decimal(str(rec["scores"]["genre_match"])),
                sound_profile_score=Decimal(str(rec["scores"]["sound_profile"])),
                use_case_score=Decimal(str(rec["scores"]["use_case"])),
                budget_score=Decimal(str(rec["scores"]["budget"])),
                feature_match_score=Decimal(str(rec["scores"]["feature_match"])),
                explanation=rec["explanation"],
                personalized_pros=rec["personalized_pros"],
                personalized_cons=rec["personalized_cons"],
                match_highlights=rec["match_highlights"],
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
