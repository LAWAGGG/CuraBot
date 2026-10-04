"""order rejected status + reason

Revision ID: a1b2c3d4e5f6
Revises: 244ce11d7b37
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision = '244ce11d7b37'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.alter_column('extracted_orders', 'status',
                    existing_type=sa.Enum('pending', 'incomplete', 'confirmed', 'shipped', 'completed'),
                    type_=sa.Enum('pending', 'incomplete', 'confirmed', 'shipped', 'completed', 'rejected'),
                    existing_nullable=True)
    op.add_column('extracted_orders', sa.Column('rejection_reason', sa.Text(), nullable=True))

def downgrade() -> None:
    op.drop_column('extracted_orders', 'rejection_reason')
    op.alter_column('extracted_orders', 'status',
                    existing_type=sa.Enum('pending', 'incomplete', 'confirmed', 'shipped', 'completed', 'rejected'),
                    type_=sa.Enum('pending', 'incomplete', 'confirmed', 'shipped', 'completed'),
                    existing_nullable=True)
