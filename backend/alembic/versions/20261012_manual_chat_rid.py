from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261012manualrid"
down_revision: Union[str, Sequence[str], None] = "20261011manualchat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("telegram_response_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "telegram_response_id")
