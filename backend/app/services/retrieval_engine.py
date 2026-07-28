"""
Retrieval Engine - RAG retrieval service for semantic search over review chunks.

Implements hybrid retrieval:
1. SQL pre-filtering using hard constraints (budget, wireless, ANC, type)
2. Vector similarity search over filtered chunks
3. Redis caching for performance
"""
import hashlib
import json
from typing import List, Dict, Any, Optional
from decimal import Decimal

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pgvector.sqlalchemy import Vector

from app.config import settings
from app.core.cache import cache
from app.core.exceptions import ValidationException
from app.models import Headphone, ReviewChunk, SourceType
from app.models.headphone import HeadphoneType, BackType
from app.services.embedding_service import embedding_service

logger = structlog.get_logger()


class RetrievalResult:
    """
    Container for retrieved chunk with metadata.

    Includes the chunk content, source information, and similarity score
    for citation purposes.
    """

    def __init__(
        self,
        chunk_id: str,
        headphone_id: str,
        headphone_name: str,
        chunk_text: str,
        source_type: str,
        source_url: str,
        similarity_score: float,
    ):
        self.chunk_id = chunk_id
        self.headphone_id = headphone_id
        self.headphone_name = headphone_name
        self.chunk_text = chunk_text
        self.source_type = source_type
        self.source_url = source_url
        self.similarity_score = similarity_score

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses and caching."""
        return {
            "chunk_id": self.chunk_id,
            "headphone_id": self.headphone_id,
            "headphone_name": self.headphone_name,
            "chunk_text": self.chunk_text,
            "source_type": self.source_type,
            "source_url": self.source_url,
            "similarity_score": self.similarity_score,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RetrievalResult":
        """Reconstruct from dictionary (for cache deserialization)."""
        return cls(**data)


class RetrievalEngine:
    """
    RAG retrieval engine with hybrid search.

    Combines SQL filtering (hard constraints) with vector similarity search
    to retrieve relevant review chunks for answering subjective queries.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize retrieval engine.

        Args:
            db: Async database session
        """
        self.db = db
        self.embedding_service = embedding_service

    async def retrieve(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = None,
        similarity_threshold: float = None,
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant review chunks for a query.

        Process:
        1. Check cache for this query + filters
        2. Apply SQL pre-filtering to narrow candidate headphones
        3. Embed the query
        4. Run vector similarity search over chunks from filtered headphones
        5. Return top-k chunks above similarity threshold with metadata
        6. Cache results

        Args:
            query: User query text to search for
            filters: Optional hard constraints (budget, wireless, ANC, type, open_back)
            top_k: Number of chunks to retrieve per headphone (default: rag_top_k from config)
            similarity_threshold: Minimum similarity score 0-1 (default: rag_similarity_threshold)

        Returns:
            List of RetrievalResult objects with chunks and metadata

        Raises:
            ValidationException: If no candidates match filters
        """
        # Apply defaults
        if top_k is None:
            top_k = settings.rag_top_k
        if similarity_threshold is None:
            similarity_threshold = settings.rag_similarity_threshold
        if filters is None:
            filters = {}

        # Check cache
        cache_key = self._create_cache_key(query, filters, top_k, similarity_threshold)
        cached_results = await cache.get(cache_key)

        if cached_results:
            logger.info(
                "retrieval_cache_hit",
                query_preview=query[:50],
                num_results=len(cached_results),
            )
            return [RetrievalResult.from_dict(r) for r in cached_results]

        logger.info(
            "retrieval_started",
            query_preview=query[:50],
            filters=filters,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
        )

        # Step 1: SQL pre-filtering to get candidate headphones
        candidate_headphones = await self._fetch_candidate_headphones(filters)

        if not candidate_headphones:
            logger.warning("no_candidates_match_filters", filters=filters)
            raise ValidationException(
                "No headphones match your requirements",
                detail=filters,
            )

        candidate_ids = [h.id for h in candidate_headphones]

        logger.info(
            "candidates_filtered",
            candidate_count=len(candidate_headphones),
        )

        # Step 2: Embed the query
        try:
            query_embedding = await self.embedding_service.embed_text(query)
        except Exception as e:
            logger.error("query_embedding_failed", error=str(e))
            raise

        # Step 3: Vector similarity search over chunks from candidate headphones
        # Using cosine similarity with pgvector
        # Formula: 1 - (embedding <=> query_embedding) gives cosine similarity in [0, 1]
        results = []

        # Query chunks for each headphone separately to ensure we get top_k per headphone
        for headphone in candidate_headphones:
            # Vector similarity query using pgvector's <=> operator (cosine distance)
            # Lower distance = higher similarity
            # Similarity = 1 - distance
            query = (
                select(
                    ReviewChunk,
                    (1 - ReviewChunk.embedding.cosine_distance(query_embedding)).label("similarity")
                )
                .where(ReviewChunk.headphone_id == headphone.id)
                .order_by(ReviewChunk.embedding.cosine_distance(query_embedding))
                .limit(top_k)
            )

            result = await self.db.execute(query)
            chunks = result.all()

            for chunk, similarity in chunks:
                # Filter by similarity threshold
                if similarity >= similarity_threshold:
                    retrieval_result = RetrievalResult(
                        chunk_id=str(chunk.id),
                        headphone_id=str(headphone.id),
                        headphone_name=headphone.full_name,
                        chunk_text=chunk.chunk_text,
                        source_type=chunk.source_type.value,
                        source_url=chunk.source_url,
                        similarity_score=float(similarity),
                    )
                    results.append(retrieval_result)

        # Sort all results by similarity score descending
        results.sort(key=lambda x: x.similarity_score, reverse=True)

        logger.info(
            "retrieval_completed",
            num_results=len(results),
            avg_similarity=sum(r.similarity_score for r in results) / len(results) if results else 0,
        )

        # Cache results
        await cache.set(
            cache_key,
            [r.to_dict() for r in results],
            ttl=settings.cache_ttl_retrieval,
        )

        return results

    async def retrieve_for_headphone(
        self,
        query: str,
        headphone_id: str,
        top_k: int = None,
        similarity_threshold: float = None,
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant chunks for a specific headphone only.

        Useful for targeted retrieval when you already know which headphone
        the user is asking about.

        Args:
            query: User query text
            headphone_id: UUID of specific headphone
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score

        Returns:
            List of RetrievalResult objects for this headphone
        """
        if top_k is None:
            top_k = settings.rag_top_k
        if similarity_threshold is None:
            similarity_threshold = settings.rag_similarity_threshold

        # Embed query
        query_embedding = await self.embedding_service.embed_text(query)

        # Fetch headphone for metadata
        headphone_query = select(Headphone).where(Headphone.id == headphone_id)
        headphone_result = await self.db.execute(headphone_query)
        headphone = headphone_result.scalar_one_or_none()

        if not headphone:
            raise ValidationException(f"Headphone {headphone_id} not found")

        # Vector search
        query = (
            select(
                ReviewChunk,
                (1 - ReviewChunk.embedding.cosine_distance(query_embedding)).label("similarity")
            )
            .where(ReviewChunk.headphone_id == headphone_id)
            .order_by(ReviewChunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )

        result = await self.db.execute(query)
        chunks = result.all()

        results = []
        for chunk, similarity in chunks:
            if similarity >= similarity_threshold:
                retrieval_result = RetrievalResult(
                    chunk_id=str(chunk.id),
                    headphone_id=str(headphone.id),
                    headphone_name=headphone.full_name,
                    chunk_text=chunk.chunk_text,
                    source_type=chunk.source_type.value,
                    source_url=chunk.source_url,
                    similarity_score=float(similarity),
                )
                results.append(retrieval_result)

        results.sort(key=lambda x: x.similarity_score, reverse=True)

        logger.info(
            "headphone_retrieval_completed",
            headphone_id=headphone_id,
            headphone_name=headphone.full_name,
            num_results=len(results),
        )

        return results

    async def _fetch_candidate_headphones(
        self, filters: Dict[str, Any]
    ) -> List[Headphone]:
        """
        Fetch headphones matching hard constraints.

        Reuses the same filtering logic as RecommendationEngine to ensure consistency.
        Filters are applied BEFORE vector search to reduce search space.

        Constraints:
        - budget_min, budget_max: Price range
        - wireless_required: Boolean
        - anc_required: Boolean
        - preferred_type: Headphone type (over_ear, on_ear, in_ear, earbuds)
        - open_back_acceptable: Boolean

        Args:
            filters: Dictionary of filter parameters

        Returns:
            List of candidate headphones matching filters
        """
        # Start with base query
        query = select(Headphone)

        # Budget range (default to no limit if not specified)
        budget_min = filters.get("budget_min", 0)
        budget_max = filters.get("budget_max", 10000)  # High default

        query = query.where(
            Headphone.price_usd >= budget_min,
            Headphone.price_usd <= budget_max,
        )

        # Wireless requirement
        if filters.get("wireless_required"):
            query = query.where(Headphone.is_wireless == True)

        # ANC requirement
        if filters.get("anc_required"):
            query = query.where(Headphone.has_anc == True)

        # Preferred type
        if filters.get("preferred_type"):
            query = query.where(Headphone.headphone_type == filters["preferred_type"])

        # Open back filter
        if filters.get("open_back_acceptable") is False:
            query = query.where(Headphone.back_type != BackType.OPEN)

        # Execute query
        result = await self.db.execute(query)
        candidates = result.scalars().all()

        return list(candidates)

    def _create_cache_key(
        self,
        query: str,
        filters: Dict[str, Any],
        top_k: int,
        similarity_threshold: float,
    ) -> str:
        """
        Create cache key for retrieval query.

        Uses MD5 hash of query + filters + parameters for consistent keying.

        Args:
            query: Query text
            filters: Filter dict
            top_k: Top-k parameter
            similarity_threshold: Similarity threshold

        Returns:
            Cache key string
        """
        cache_data = {
            "query": query,
            "filters": sorted(filters.items()) if filters else [],
            "top_k": top_k,
            "similarity_threshold": similarity_threshold,
        }

        data_str = json.dumps(cache_data, sort_keys=True, default=str)
        hash_hex = hashlib.md5(data_str.encode()).hexdigest()

        return f"retrieval:{hash_hex}"


# No global instance - instantiate per request with db session
