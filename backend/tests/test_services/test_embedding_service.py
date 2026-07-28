"""
Tests for the embedding service.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.embedding_service import EmbeddingService
from app.core.exceptions import LLMException


class TestEmbeddingService:
    """Test embedding service functionality."""

    @pytest.mark.asyncio
    async def test_embed_text_returns_vector(self):
        """Test that embed_text returns a valid embedding vector."""
        service = EmbeddingService()

        # Mock the OpenAI client
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1536)]

        with patch.object(service.client.embeddings, 'create', new=AsyncMock(return_value=mock_response)):
            embedding = await service.embed_text("Test headphone review text")

            assert isinstance(embedding, list)
            assert len(embedding) == 1536
            assert all(isinstance(x, (int, float)) for x in embedding)

    @pytest.mark.asyncio
    async def test_embed_batch_returns_multiple_vectors(self):
        """Test that embed_batch returns embeddings for all inputs."""
        service = EmbeddingService()

        texts = [
            "Excellent sound quality with deep bass",
            "Comfortable for long listening sessions",
            "Great for classical music",
        ]

        # Mock the OpenAI client
        mock_response = MagicMock()
        mock_response.data = [
            MagicMock(embedding=[0.1] * 1536),
            MagicMock(embedding=[0.2] * 1536),
            MagicMock(embedding=[0.3] * 1536),
        ]

        with patch.object(service.client.embeddings, 'create', new=AsyncMock(return_value=mock_response)):
            embeddings = await service.embed_batch(texts)

            assert isinstance(embeddings, list)
            assert len(embeddings) == 3
            assert all(len(emb) == 1536 for emb in embeddings)

    @pytest.mark.asyncio
    async def test_embed_batch_handles_batching(self):
        """Test that embed_batch splits large requests into batches."""
        service = EmbeddingService()
        service.batch_size = 2  # Small batch size for testing

        texts = ["text1", "text2", "text3", "text4", "text5"]

        # Mock the OpenAI client to track number of calls
        call_count = 0

        async def mock_create(**kwargs):
            nonlocal call_count
            call_count += 1
            batch_size = len(kwargs['input'])
            response = MagicMock()
            response.data = [MagicMock(embedding=[0.1] * 1536) for _ in range(batch_size)]
            return response

        with patch.object(service.client.embeddings, 'create', new=AsyncMock(side_effect=mock_create)):
            embeddings = await service.embed_batch(texts)

            # Should make 3 calls (2 + 2 + 1)
            assert call_count == 3
            assert len(embeddings) == 5

    @pytest.mark.asyncio
    async def test_embed_text_raises_on_error(self):
        """Test that embedding errors are properly raised."""
        service = EmbeddingService()

        with patch.object(service.client.embeddings, 'create', new=AsyncMock(side_effect=Exception("API Error"))):
            with pytest.raises(LLMException) as exc_info:
                await service.embed_text("Test text")

            assert "Failed to generate embedding" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_embed_batch_empty_list(self):
        """Test that embed_batch handles empty input list."""
        service = EmbeddingService()

        embeddings = await service.embed_batch([])

        assert embeddings == []

    @pytest.mark.asyncio
    async def test_embed_text_with_retry_succeeds_on_second_attempt(self):
        """Test that retry logic works correctly."""
        service = EmbeddingService()

        # First call fails, second succeeds
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1536)]

        call_count = 0

        async def mock_create(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Temporary error")
            return mock_response

        with patch.object(service.client.embeddings, 'create', new=AsyncMock(side_effect=mock_create)):
            embedding = await service.embed_text_with_retry("Test text", max_retries=3, retry_delay=0.01)

            assert len(embedding) == 1536
            assert call_count == 2  # Failed once, succeeded on second try

    @pytest.mark.asyncio
    async def test_embed_text_with_retry_fails_after_max_retries(self):
        """Test that retry gives up after max attempts."""
        service = EmbeddingService()

        with patch.object(service.client.embeddings, 'create', new=AsyncMock(side_effect=Exception("Persistent error"))):
            with pytest.raises(LLMException):
                await service.embed_text_with_retry("Test text", max_retries=2, retry_delay=0.01)
