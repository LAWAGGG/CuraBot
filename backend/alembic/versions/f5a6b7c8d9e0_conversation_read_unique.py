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
    # Bersihkan duplikat data lama bila ada sebelum pasang unique constraint
    op.execute("""
        DELETE cr1 FROM conversation_reads cr1
        INNER JOIN conversation_reads cr2 
        WHERE cr1.id < cr2.id 
          AND cr1.bot_id = cr2.bot_id 
          AND cr1.user_id = cr2.user_id
    """)
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
