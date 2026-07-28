"""
Tests for the RAG retrieval engine.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal

from app.services.retrieval_engine import RetrievalEngine, RetrievalResult
from app.models import Headphone, ReviewChunk, SourceType
from app.models.headphone import HeadphoneType, BackType, PriceTier
from app.core.exceptions import ValidationException


@pytest.fixture
def mock_headphone():
    """Create a mock headphone for testing."""
    hp = MagicMock(spec=Headphone)
    hp.id = "hp-uuid-1"
    hp.full_name = "Test Headphone Model"
    hp.price_usd = Decimal("199.00")
    hp.is_wireless = True
    hp.has_anc = True
    hp.headphone_type = HeadphoneType.OVER_EAR
    hp.back_type = BackType.CLOSED
    return hp


@pytest.fixture
def mock_chunk():
    """Create a mock review chunk for testing."""
    chunk = MagicMock(spec=ReviewChunk)
    chunk.id = "chunk-uuid-1"
    chunk.headphone_id = "hp-uuid-1"
    chunk.chunk_text = "Excellent sound quality with deep bass and clear mids."
    chunk.source_type = SourceType.EXPERT_REVIEW
    chunk.source_url = "https://example.com/review"
    chunk.embedding = [0.1] * 1536  # Mock embedding
    return chunk


class TestRetrievalEngine:
    """Test retrieval engine functionality."""

    @pytest.mark.asyncio
    async def test_retrieve_returns_results(self, mock_headphone, mock_chunk):
        """Test that retrieve returns expected results."""
        # Mock database session
        mock_db = AsyncMock()

        # Mock _fetch_candidate_headphones to return our test headphone
        engine = RetrievalEngine(mock_db)

        with patch.object(engine, '_fetch_candidate_headphones', new=AsyncMock(return_value=[mock_headphone])):
            # Mock embedding service
            with patch.object(engine.embedding_service, 'embed_text', new=AsyncMock(return_value=[0.1] * 1536)):
                # Mock database query results
                mock_result = MagicMock()
                mock_result.all.return_value = [(mock_chunk, 0.85)]  # chunk, similarity
                mock_db.execute.return_value = mock_result

                # Mock cache to return None (cache miss)
                with patch('app.services.retrieval_engine.cache.get', new=AsyncMock(return_value=None)):
                    with patch('app.services.retrieval_engine.cache.set', new=AsyncMock()):
                        results = await engine.retrieve(
                            query="good bass and comfort",
                            filters={"budget_min": 100, "budget_max": 300},
                        )

                        assert len(results) > 0
                        assert isinstance(results[0], RetrievalResult)
                        assert results[0].headphone_name == "Test Headphone Model"
                        assert results[0].similarity_score == 0.85

    @pytest.mark.asyncio
    async def test_filtering_happens_before_vector_search(self):
        """Test that SQL filtering reduces candidates before vector search."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        # Create multiple headphones with different prices
        cheap_hp = MagicMock(spec=Headphone)
        cheap_hp.id = "cheap-uuid"
        cheap_hp.price_usd = Decimal("50.00")
        cheap_hp.full_name = "Cheap Headphones"

        expensive_hp = MagicMock(spec=Headphone)
        expensive_hp.id = "expensive-uuid"
        expensive_hp.price_usd = Decimal("500.00")
        expensive_hp.full_name = "Expensive Headphones"

        # Mock database query for filtering
        mock_result = MagicMock()
        # Only expensive headphone should match filter
        mock_result.scalars().all.return_value = [expensive_hp]
        mock_db.execute.return_value = mock_result

        # Call _fetch_candidate_headphones with budget filter
        candidates = await engine._fetch_candidate_headphones({
            "budget_min": 400,
            "budget_max": 600,
        })

        # Should only return expensive headphone
        assert len(candidates) == 1
        assert candidates[0].full_name == "Expensive Headphones"

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_results(self):
        """Test that cache hits return cached data without database query."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        # Mock cached results
        cached_data = [
            {
                "chunk_id": "cached-chunk-1",
                "headphone_id": "hp-1",
                "headphone_name": "Cached Headphone",
                "chunk_text": "Cached review text",
                "source_type": "expert_review",
                "source_url": "https://cached.com",
                "similarity_score": 0.9,
            }
        ]

        with patch('app.services.retrieval_engine.cache.get', new=AsyncMock(return_value=cached_data)):
            results = await engine.retrieve(
                query="test query",
                filters={},
            )

            # Should return cached results
            assert len(results) == 1
            assert results[0].headphone_name == "Cached Headphone"
            assert results[0].similarity_score == 0.9

            # Database should not be called
            mock_db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_cache_miss_queries_database_and_caches(self, mock_headphone, mock_chunk):
        """Test that cache misses query database and cache results."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        # Track if cache.set was called
        cache_set_called = False
        cached_data = None

        async def mock_cache_set(key, data, ttl):
            nonlocal cache_set_called, cached_data
            cache_set_called = True
            cached_data = data

        with patch.object(engine, '_fetch_candidate_headphones', new=AsyncMock(return_value=[mock_headphone])):
            with patch.object(engine.embedding_service, 'embed_text', new=AsyncMock(return_value=[0.1] * 1536)):
                mock_result = MagicMock()
                mock_result.all.return_value = [(mock_chunk, 0.75)]
                mock_db.execute.return_value = mock_result

                with patch('app.services.retrieval_engine.cache.get', new=AsyncMock(return_value=None)):
                    with patch('app.services.retrieval_engine.cache.set', new=AsyncMock(side_effect=mock_cache_set)):
                        results = await engine.retrieve(query="test")

                        # Should have called cache.set
                        assert cache_set_called
                        assert cached_data is not None
                        assert len(cached_data) == 1

    @pytest.mark.asyncio
    async def test_similarity_threshold_filtering(self, mock_headphone):
        """Test that results below similarity threshold are filtered out."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        # Create chunks with different similarity scores
        high_sim_chunk = MagicMock(spec=ReviewChunk)
        high_sim_chunk.id = "high-sim"
        high_sim_chunk.headphone_id = "hp-1"
        high_sim_chunk.chunk_text = "Highly relevant text"
        high_sim_chunk.source_type = SourceType.REVIEW
        high_sim_chunk.source_url = "https://example.com"

        low_sim_chunk = MagicMock(spec=ReviewChunk)
        low_sim_chunk.id = "low-sim"
        low_sim_chunk.headphone_id = "hp-1"
        low_sim_chunk.chunk_text = "Less relevant text"
        low_sim_chunk.source_type = SourceType.REVIEW
        low_sim_chunk.source_url = "https://example.com"

        with patch.object(engine, '_fetch_candidate_headphones', new=AsyncMock(return_value=[mock_headphone])):
            with patch.object(engine.embedding_service, 'embed_text', new=AsyncMock(return_value=[0.1] * 1536)):
                mock_result = MagicMock()
                # Return both high and low similarity chunks
                mock_result.all.return_value = [
                    (high_sim_chunk, 0.8),  # Above threshold
                    (low_sim_chunk, 0.3),   # Below threshold
                ]
                mock_db.execute.return_value = mock_result

                with patch('app.services.retrieval_engine.cache.get', new=AsyncMock(return_value=None)):
                    with patch('app.services.retrieval_engine.cache.set', new=AsyncMock()):
                        results = await engine.retrieve(
                            query="test",
                            similarity_threshold=0.5,  # Only chunks >= 0.5
                        )

                        # Should only return high similarity chunk
                        assert len(results) == 1
                        assert results[0].chunk_id == "high-sim"
                        assert results[0].similarity_score == 0.8

    @pytest.mark.asyncio
    async def test_top_k_limiting_per_headphone(self):
        """Test that top_k limits chunks per headphone."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        hp = MagicMock(spec=Headphone)
        hp.id = "hp-1"
        hp.full_name = "Test HP"

        # Create 5 chunks but request only top 3
        chunks = []
        for i in range(5):
            chunk = MagicMock(spec=ReviewChunk)
            chunk.id = f"chunk-{i}"
            chunk.headphone_id = "hp-1"
            chunk.chunk_text = f"Chunk {i}"
            chunk.source_type = SourceType.REVIEW
            chunk.source_url = "https://example.com"
            chunks.append((chunk, 0.9 - i * 0.1))  # Decreasing similarity

        with patch.object(engine, '_fetch_candidate_headphones', new=AsyncMock(return_value=[hp])):
            with patch.object(engine.embedding_service, 'embed_text', new=AsyncMock(return_value=[0.1] * 1536)):
                mock_result = MagicMock()
                # Database query should be limited to top_k
                # Simulate that only 3 chunks are returned (LIMIT 3 in SQL)
                mock_result.all.return_value = chunks[:3]
                mock_db.execute.return_value = mock_result

                with patch('app.services.retrieval_engine.cache.get', new=AsyncMock(return_value=None)):
                    with patch('app.services.retrieval_engine.cache.set', new=AsyncMock()):
                        results = await engine.retrieve(
                            query="test",
                            top_k=3,
                        )

                        # Should only return 3 chunks
                        assert len(results) <= 3

    @pytest.mark.asyncio
    async def test_no_candidates_raises_validation_error(self):
        """Test that no matching candidates raises ValidationException."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        # Mock database to return no headphones
        mock_result = MagicMock()
        mock_result.scalars().all.return_value = []
        mock_db.execute.return_value = mock_result

        with patch('app.services.retrieval_engine.cache.get', new=AsyncMock(return_value=None)):
            with pytest.raises(ValidationException) as exc_info:
                await engine.retrieve(
                    query="test",
                    filters={"budget_min": 10000, "budget_max": 20000},  # Impossible budget
                )

            assert "No headphones match your requirements" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_retrieve_for_headphone_targets_single_headphone(self, mock_headphone, mock_chunk):
        """Test that retrieve_for_headphone only queries one headphone."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        # Mock headphone lookup
        mock_hp_result = MagicMock()
        mock_hp_result.scalar_one_or_none.return_value = mock_headphone

        # Mock chunk query
        mock_chunk_result = MagicMock()
        mock_chunk_result.all.return_value = [(mock_chunk, 0.88)]

        mock_db.execute.side_effect = [mock_hp_result, mock_chunk_result]

        with patch.object(engine.embedding_service, 'embed_text', new=AsyncMock(return_value=[0.1] * 1536)):
            results = await engine.retrieve_for_headphone(
                query="test query",
                headphone_id="hp-uuid-1",
            )

            assert len(results) == 1
            assert results[0].headphone_id == "hp-uuid-1"
            assert results[0].headphone_name == "Test Headphone Model"

    @pytest.mark.asyncio
    async def test_results_sorted_by_similarity_desc(self, mock_headphone):
        """Test that results are sorted by similarity score descending."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        # Create chunks with varying similarity
        chunks = []
        for i, similarity in enumerate([0.6, 0.9, 0.75, 0.85]):
            chunk = MagicMock(spec=ReviewChunk)
            chunk.id = f"chunk-{i}"
            chunk.headphone_id = "hp-1"
            chunk.chunk_text = f"Chunk {i}"
            chunk.source_type = SourceType.REVIEW
            chunk.source_url = "https://example.com"
            chunks.append((chunk, similarity))

        with patch.object(engine, '_fetch_candidate_headphones', new=AsyncMock(return_value=[mock_headphone])):
            with patch.object(engine.embedding_service, 'embed_text', new=AsyncMock(return_value=[0.1] * 1536)):
                mock_result = MagicMock()
                mock_result.all.return_value = chunks
                mock_db.execute.return_value = mock_result

                with patch('app.services.retrieval_engine.cache.get', new=AsyncMock(return_value=None)):
                    with patch('app.services.retrieval_engine.cache.set', new=AsyncMock()):
                        results = await engine.retrieve(query="test")

                        # Should be sorted by similarity descending
                        assert len(results) == 4
                        assert results[0].similarity_score == 0.9
                        assert results[1].similarity_score == 0.85
                        assert results[2].similarity_score == 0.75
                        assert results[3].similarity_score == 0.6

    @pytest.mark.asyncio
    async def test_filter_wireless_required(self):
        """Test wireless_required filter."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        wireless_hp = MagicMock(spec=Headphone)
        wireless_hp.is_wireless = True
        wireless_hp.id = "wireless"

        mock_result = MagicMock()
        mock_result.scalars().all.return_value = [wireless_hp]
        mock_db.execute.return_value = mock_result

        candidates = await engine._fetch_candidate_headphones({
            "wireless_required": True,
        })

        assert len(candidates) == 1
        assert candidates[0].is_wireless is True

    @pytest.mark.asyncio
    async def test_filter_anc_required(self):
        """Test anc_required filter."""
        mock_db = AsyncMock()
        engine = RetrievalEngine(mock_db)

        anc_hp = MagicMock(spec=Headphone)
        anc_hp.has_anc = True
        anc_hp.id = "anc"

        mock_result = MagicMock()
        mock_result.scalars().all.return_value = [anc_hp]
        mock_db.execute.return_value = mock_result

        candidates = await engine._fetch_candidate_headphones({
            "anc_required": True,
        })

        assert len(candidates) == 1
        assert candidates[0].has_anc is True
