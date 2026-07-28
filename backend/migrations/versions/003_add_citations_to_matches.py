"""add citations to headphone matches

Revision ID: 003
Revises: 002
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add citations column to headphone_matches table for RAG support."""
    op.add_column(
        'headphone_matches',
        sa.Column('citations', postgresql.JSON(), nullable=True, server_default='[]')
    )


def downgrade() -> None:
    """Remove citations column from headphone_matches table."""
    op.drop_column('headphone_matches', 'citations')
