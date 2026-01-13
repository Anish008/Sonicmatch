"""
Celery tasks for recommendation processing.

Background tasks for async recommendation generation.
"""
import uuid

from celery import Task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import structlog

from app.config import settings
from app.models import UserPreference, RecommendationSession, SessionStatus
from app.services.recommendation_engine import RecommendationEngine
from app.tasks.celery_app import celery_app

logger = structlog.get_logger()

# Create async engine for tasks
engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class AsyncTask(Task):
    """Base task with async support."""

    def __call__(self, *args, **kwargs):
        """Execute task synchronously (Celery requirement)."""
        import asyncio
        return asyncio.run(self.run_async(*args, **kwargs))

    async def run_async(self, *args, **kwargs):
        """Override this method in subclasses."""
        raise NotImplementedError()


@celery_app.task(
    bind=True,
    base=AsyncTask,
    name="app.tasks.process_recommendation",
    max_retries=3,
    default_retry_delay=60,
)
async def process_recommendation_task(self, session_id: str, preference_id: str):
    """
    Process recommendation generation in background.

    Args:
        session_id: Recommendation session ID
        preference_id: User preference ID

    Returns:
        dict with session_id and status
    """
    session_uuid = uuid.UUID(session_id)
    preference_uuid = uuid.UUID(preference_id)

    logger.info(
        "celery_task_started",
        task_id=self.request.id,
        session_id=session_id,
        preference_id=preference_id,
    )

    async with AsyncSessionLocal() as db:
        try:
            # Fetch preference
            pref_query = select(UserPreference).where(UserPreference.id == preference_uuid)
            pref_result = await db.execute(pref_query)
            preference = pref_result.scalar_one_or_none()

            if not preference:
                logger.error("preference_not_found", preference_id=preference_id)
                raise ValueError(f"Preference {preference_id} not found")

            # Fetch session
            session_query = select(RecommendationSession).where(
                RecommendationSession.id == session_uuid
            )
            session_result = await db.execute(session_query)
            session = session_result.scalar_one_or_none()

            if not session:
                logger.error("session_not_found", session_id=session_id)
                raise ValueError(f"Session {session_id} not found")

            # Update status to processing
            session.status = SessionStatus.PROCESSING
            await db.commit()

            # Generate recommendations
            engine = RecommendationEngine(db)
            updated_session = await engine.generate_recommendations(preference, top_n=5)

            logger.info(
                "celery_task_completed",
                task_id=self.request.id,
                session_id=session_id,
                status=updated_session.status.value,
            )

            return {
                "session_id": str(updated_session.id),
                "status": updated_session.status.value,
                "match_count": len(updated_session.matches) if hasattr(updated_session, 'matches') else 0,
            }

        except Exception as e:
            logger.error(
                "celery_task_error",
                task_id=self.request.id,
                session_id=session_id,
                error=str(e),
            )

            # Update session to error status
            if session:
                session.status = SessionStatus.ERROR
                session.error_message = str(e)
                await db.commit()

            # Retry task
            raise self.retry(exc=e, countdown=60)


@celery_app.task(name="app.tasks.cleanup_old_sessions")
def cleanup_old_sessions_task():
    """
    Cleanup old recommendation sessions (scheduled task).

    Runs daily to remove sessions older than 30 days.
    """
    import asyncio
    from datetime import datetime, timezone, timedelta

    async def cleanup():
        async with AsyncSessionLocal() as db:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)

            # Delete old sessions
            query = select(RecommendationSession).where(
                RecommendationSession.created_at < cutoff_date
            )
            result = await db.execute(query)
            old_sessions = result.scalars().all()

            for session in old_sessions:
                await db.delete(session)

            await db.commit()

            logger.info("old_sessions_cleaned", count=len(old_sessions))
            return len(old_sessions)

    return asyncio.run(cleanup())


# Optional: Set up periodic tasks
celery_app.conf.beat_schedule = {
    "cleanup-old-sessions": {
        "task": "app.tasks.cleanup_old_sessions",
        "schedule": 86400.0,  # Run daily (24 hours)
    },
}
