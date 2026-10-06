"""bot_chats unique chat_id

Revision ID: b9c8d7e6f5a4
Revises: 20261006botmode
Create Date: 2026-10-06 11:20:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b9c8d7e6f5a4'
down_revision: Union[str, Sequence[str], None] = '20261006botmode'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: ensure one BotChat row per Telegram chat_id."""
    # keep earliest row per chat_id; later duplicates are ambiguous/stale
    op.execute(
        "DELETE FROM bot_chats WHERE id NOT IN ("
        "SELECT min_id FROM (SELECT MIN(id) AS min_id FROM bot_chats GROUP BY chat_id) AS t)"
    )
    op.drop_index(op.f('ix_bot_chats_chat_id'), table_name='bot_chats')
    op.create_index(op.f('ix_bot_chats_chat_id'), 'bot_chats', ['chat_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_bot_chats_chat_id'), table_name='bot_chats')
    op.create_index(op.f('ix_bot_chats_chat_id'), 'bot_chats', ['chat_id'], unique=False)
