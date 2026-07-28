"""
Embedding Service - Generate vector embeddings for text chunks.

Supports OpenAI embeddings with batch processing for efficient seeding.
"""
import asyncio
from typing import List, Tuple
import structlog
from openai import AsyncOpenAI

from app.config import settings
from app.core.exceptions import LLMException

logger = structlog.get_logger()


class EmbeddingService:
    """
    Service for generating text embeddings.

    Uses OpenAI's text-embedding-3-small model by default (1536 dimensions).
    Supports batch processing to minimize API calls and cost.
    """

    def __init__(self):
        """Initialize embedding service based on configuration."""
        self.provider = settings.embedding_provider
        self.model = settings.embedding_model
        self.dimensions = settings.embedding_dimensions
        self.batch_size = settings.embedding_batch_size

        if self.provider == "openai":
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY required for OpenAI embedding provider")
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        else:
            raise ValueError(f"Unsupported embedding provider: {self.provider}")

        logger.info(
            "embedding_service_initialized",
            provider=self.provider,
            model=self.model,
            dimensions=self.dimensions,
        )

    async def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.

        Args:
            text: Text to embed

        Returns:
            Embedding vector as list of floats

        Raises:
            LLMException: If embedding generation fails
        """
        try:
            if self.provider == "openai":
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=text,
                    dimensions=self.dimensions,
                )
                embedding = response.data[0].embedding

                logger.debug(
                    "embedding_generated",
                    text_length=len(text),
                    embedding_dim=len(embedding),
                )

                return embedding

        except Exception as e:
            logger.error(
                "embedding_generation_failed",
                error=str(e),
                text_preview=text[:100],
            )
            raise LLMException(f"Failed to generate embedding: {str(e)}")

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches.

        Processes texts in batches to stay within API limits and minimize costs.
        For OpenAI, max batch size is 2048 inputs, but we use smaller batches
        for better error handling and progress tracking.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors (same order as input texts)

        Raises:
            LLMException: If batch embedding fails
        """
        if not texts:
            return []

        embeddings = []
        total_batches = (len(texts) + self.batch_size - 1) // self.batch_size

        logger.info(
            "batch_embedding_started",
            total_texts=len(texts),
            batch_size=self.batch_size,
            total_batches=total_batches,
        )

        try:
            for i in range(0, len(texts), self.batch_size):
                batch = texts[i:i + self.batch_size]
                batch_num = (i // self.batch_size) + 1

                logger.debug(
                    "processing_batch",
                    batch_num=batch_num,
                    total_batches=total_batches,
                    batch_size=len(batch),
                )

                if self.provider == "openai":
                    response = await self.client.embeddings.create(
                        model=self.model,
                        input=batch,
                        dimensions=self.dimensions,
                    )

                    # Extract embeddings in order
                    batch_embeddings = [item.embedding for item in response.data]
                    embeddings.extend(batch_embeddings)

                    logger.info(
                        "batch_embedded",
                        batch_num=batch_num,
                        batch_size=len(batch),
                        embeddings_generated=len(batch_embeddings),
                    )

                # Small delay between batches to avoid rate limiting
                if batch_num < total_batches:
                    await asyncio.sleep(0.1)

            logger.info(
                "batch_embedding_completed",
                total_embeddings=len(embeddings),
            )

            return embeddings

        except Exception as e:
            logger.error(
                "batch_embedding_failed",
                error=str(e),
                texts_processed=len(embeddings),
                total_texts=len(texts),
            )
            raise LLMException(f"Batch embedding failed: {str(e)}")

    async def embed_text_with_retry(
        self,
        text: str,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> List[float]:
        """
        Generate embedding with exponential backoff retry.

        Args:
            text: Text to embed
            max_retries: Maximum number of retry attempts
            retry_delay: Initial delay between retries (doubles each time)

        Returns:
            Embedding vector

        Raises:
            LLMException: If all retries fail
        """
        for attempt in range(max_retries):
            try:
                return await self.embed_text(text)
            except LLMException as e:
                if attempt == max_retries - 1:
                    raise

                delay = retry_delay * (2 ** attempt)
                logger.warning(
                    "embedding_retry",
                    attempt=attempt + 1,
                    max_retries=max_retries,
                    delay=delay,
                    error=str(e),
                )
                await asyncio.sleep(delay)


# Global embedding service instance
embedding_service = EmbeddingService()
