"""cash_enabled on bots

Revision ID: 20261007cashenable
Revises: 20261007filelabel
"""
from alembic import op
import sqlalchemy as sa

revision = "20261007cashenable"
down_revision = "20261007filelabel"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bots", sa.Column("cash_enabled", sa.Boolean(),
                                    nullable=False, server_default=sa.text("0")))


def downgrade() -> None:
    op.drop_column("bots", "cash_enabled")
