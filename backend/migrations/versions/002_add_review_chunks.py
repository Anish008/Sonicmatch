"""Add review_chunks table for RAG retrieval

Revision ID: 002
Revises: 001
Create Date: 2026-07-27 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector
import uuid

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add review_chunks table with pgvector support."""

    # Create source_type enum
    source_type_enum = postgresql.ENUM(
        'review',
        'forum_post',
        'spec_sheet',
        'expert_review',
        name='source_type_enum',
        create_type=False
    )
    source_type_enum.create(op.get_bind(), checkfirst=True)

    # Create review_chunks table
    op.create_table(
        'review_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column('headphone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('headphones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', source_type_enum, nullable=False),
        sa.Column('source_url', sa.Text(), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes
    # Basic indexes
    op.create_index('ix_review_chunks_headphone_id', 'review_chunks', ['headphone_id'])
    op.create_index('ix_review_chunks_source_type', 'review_chunks', ['source_type'])

    # Composite index for filtered retrieval
    op.create_index(
        'ix_review_chunks_headphone_source',
        'review_chunks',
        ['headphone_id', 'source_type']
    )

    # Vector similarity index (HNSW for cosine similarity)
    # This enables fast approximate nearest neighbor search
    op.execute("""
        CREATE INDEX ix_review_chunks_embedding_cosine
        ON review_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)


def downgrade() -> None:
    """Remove review_chunks table and related objects."""

    # Drop table (indexes will be dropped automatically)
    op.drop_table('review_chunks')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS source_type_enum')
