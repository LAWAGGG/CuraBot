"""payment fields on bots & orders

Revision ID: c3d4e5f60718
Revises: b2c3d4e5f607
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f60718'
down_revision = 'b2c3d4e5f607'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('bots', sa.Column('payment_info', sa.Text(), nullable=True))
    op.add_column('bots', sa.Column('qris_image_path', sa.String(length=500), nullable=True))
    op.add_column('extracted_orders', sa.Column('payment_proof_path', sa.String(length=500), nullable=True))

def downgrade() -> None:
    op.drop_column('extracted_orders', 'payment_proof_path')
    op.drop_column('bots', 'qris_image_path')
    op.drop_column('bots', 'payment_info')
