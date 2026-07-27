"""Add CHECK constraints for score range validation

Revision ID: 001
Revises:
Create Date: 2026-07-27 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add CHECK constraints to ensure all scores in headphone_matches
    are within the valid range [0.0, 1.0].

    This provides database-level validation as a final safety layer,
    complementing application-level validation.
    """
    # Add CHECK constraints for each score column
    op.create_check_constraint(
        "ck_overall_score_range",
        "headphone_matches",
        "overall_score >= 0.0 AND overall_score <= 1.0"
    )

    op.create_check_constraint(
        "ck_genre_match_score_range",
        "headphone_matches",
        "genre_match_score >= 0.0 AND genre_match_score <= 1.0"
    )

    op.create_check_constraint(
        "ck_sound_profile_score_range",
        "headphone_matches",
        "sound_profile_score >= 0.0 AND sound_profile_score <= 1.0"
    )

    op.create_check_constraint(
        "ck_use_case_score_range",
        "headphone_matches",
        "use_case_score >= 0.0 AND use_case_score <= 1.0"
    )

    op.create_check_constraint(
        "ck_budget_score_range",
        "headphone_matches",
        "budget_score >= 0.0 AND budget_score <= 1.0"
    )

    op.create_check_constraint(
        "ck_feature_match_score_range",
        "headphone_matches",
        "feature_match_score >= 0.0 AND feature_match_score <= 1.0"
    )


def downgrade() -> None:
    """Remove score range CHECK constraints."""
    op.drop_constraint("ck_overall_score_range", "headphone_matches")
    op.drop_constraint("ck_genre_match_score_range", "headphone_matches")
    op.drop_constraint("ck_sound_profile_score_range", "headphone_matches")
    op.drop_constraint("ck_use_case_score_range", "headphone_matches")
    op.drop_constraint("ck_budget_score_range", "headphone_matches")
    op.drop_constraint("ck_feature_match_score_range", "headphone_matches")
