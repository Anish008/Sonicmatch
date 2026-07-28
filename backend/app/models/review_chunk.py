"""
ReviewChunk model - Stores review/spec text chunks with embeddings for RAG retrieval.
"""
import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.db.base import Base, TimestampMixin, UUIDMixin


class SourceType(str, enum.Enum):
    """Source type for review chunks."""
    REVIEW = "review"  # User reviews from retailers/aggregators
    FORUM_POST = "forum_post"  # Discussion forums (Head-Fi, Reddit, etc.)
    SPEC_SHEET = "spec_sheet"  # Official manufacturer specs
    EXPERT_REVIEW = "expert_review"  # Professional reviews (rtings, crinacle, etc.)


class ReviewChunk(Base, UUIDMixin, TimestampMixin):
    """
    Review chunk model for RAG retrieval.

    Stores segmented text from reviews, forum posts, spec sheets, and expert
    reviews with embeddings for semantic search. Each chunk is tied to a specific
    headphone and includes source metadata for citation purposes.
    """

    __tablename__ = "review_chunks"

    # Foreign key to headphone
    headphone_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("headphones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Source metadata
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type_enum"),
        nullable=False,
        index=True,
    )
    source_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Content
    chunk_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Embedding vector (1536 dimensions for OpenAI text-embedding-3-small)
    # Dimension will be configurable based on embedding model used
    embedding: Mapped[Vector] = mapped_column(
        Vector(1536),
        nullable=False,
    )

    # Relationship to headphone
    headphone: Mapped["Headphone"] = relationship(
        "Headphone",
        back_populates="review_chunks",
    )

    # Indexes for performance
    __table_args__ = (
        # Index for vector similarity search (using HNSW or IVFFlat)
        # HNSW is better for read-heavy workloads, IVFFlat for write-heavy
        Index(
            "ix_review_chunks_embedding_cosine",
            embedding,
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        # Composite index for filtered vector search (headphone_id + embedding)
        Index(
            "ix_review_chunks_headphone_source",
            "headphone_id",
            "source_type",
        ),
    )

    def __repr__(self) -> str:
        return f"<ReviewChunk {self.id} - {self.source_type.value} for headphone {self.headphone_id}>"

    def to_dict(self, include_embedding: bool = False) -> dict:
        """
        Convert model to dictionary for API responses.

        Args:
            include_embedding: Whether to include the embedding vector (usually False for API responses)

        Returns:
            Dictionary representation of the review chunk
        """
        result = {
            "id": str(self.id),
            "headphone_id": str(self.headphone_id),
            "source_type": self.source_type.value,
            "source_url": self.source_url,
            "chunk_text": self.chunk_text,
            "created_at": self.created_at.isoformat(),
        }

        if include_embedding:
            result["embedding"] = self.embedding

        return result
