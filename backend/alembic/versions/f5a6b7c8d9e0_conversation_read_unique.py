"""unique conversation read per bot and customer

Revision ID: f5a6b7c8d9e0
Revises: d4e5f6071890
"""
from alembic import op

revision = "f5a6b7c8d9e0"
down_revision = "d4e5f6071890"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_conversation_reads_bot_user",
        "conversation_reads",
        ["bot_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_conversation_reads_bot_user",
        "conversation_reads",
        type_="unique",
    )
