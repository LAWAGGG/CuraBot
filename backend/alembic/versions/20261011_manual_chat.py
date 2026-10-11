from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261011manualchat"
down_revision: Union[str, Sequence[str], None] = "20261009googlesrc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("telegram_message_id", sa.Integer(), nullable=True))
    op.add_column("messages", sa.Column("reply_to_text", sa.Text(), nullable=True))
    op.add_column("messages", sa.Column("file_name", sa.String(255), nullable=True))
    op.add_column("messages", sa.Column("file_mime", sa.String(100), nullable=True))
    op.add_column("messages", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("messages", "is_deleted")
    op.drop_column("messages", "file_mime")
    op.drop_column("messages", "file_name")
    op.drop_column("messages", "reply_to_text")
    op.drop_column("messages", "telegram_message_id")
