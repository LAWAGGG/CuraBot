from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261006botmode"
down_revision: Union[str, Sequence[str], None] = "f5a6b7c8d9e0"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("bot_chats", sa.Column("mode", sa.Enum("ai", "manual"), nullable=False, server_default="ai"))

def downgrade() -> None:
    op.drop_column("bot_chats", "mode")
