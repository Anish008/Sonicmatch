"""
Celery application configuration.

Handles background task processing for:
- Async recommendation generation
- Batch processing
- Scheduled tasks
"""
from celery import Celery

from app.config import settings

# Create Celery app
celery_app = Celery(
    "sonicmatch",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.recommendation_tasks"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.celery_task_timeout,
    task_soft_time_limit=settings.celery_task_timeout - 10,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

# Task routes (optional - for multiple queues)
celery_app.conf.task_routes = {
    "app.tasks.recommendation_tasks.*": {"queue": "recommendations"},
}

if __name__ == "__main__":
    celery_app.start()
