"""chat grouping: conversation reads + message media sender

Revision ID: d4e5f6071890
Revises: c3d4e5f60718
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd4e5f6071890'
down_revision = 'c3d4e5f60718'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('messages', sa.Column('sender', sa.String(length=10), nullable=True))
    op.add_column('messages', sa.Column('media_path', sa.String(length=500), nullable=True))
    op.create_table('conversation_reads',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('bot_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.String(length=50), nullable=False),
    sa.Column('last_read_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversation_reads_bot_id'), 'conversation_reads', ['bot_id'], unique=False)
    op.create_index(op.f('ix_conversation_reads_user_id'), 'conversation_reads', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_conversation_reads_user_id'), table_name='conversation_reads')
    op.drop_index(op.f('ix_conversation_reads_bot_id'), table_name='conversation_reads')
    op.drop_table('conversation_reads')
    op.drop_column('messages', 'media_path')
    op.drop_column('messages', 'sender')
