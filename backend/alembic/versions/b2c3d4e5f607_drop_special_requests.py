"""drop special_requests column; notes live per product

Revision ID: b2c3d4e5f607
Revises: a1b2c3d4e5f6
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f607'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.drop_column('extracted_orders', 'special_requests')

def downgrade() -> None:
    op.add_column('extracted_orders', sa.Column('special_requests', sa.Text(), nullable=True))
