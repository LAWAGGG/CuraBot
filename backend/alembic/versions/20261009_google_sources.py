from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261009googlesrc"
down_revision: Union[str, Sequence[str], None] = "20261007cashenable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bot_external_sources",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("bot_id", sa.Integer(), sa.ForeignKey("bots.id"), nullable=False, index=True),
        sa.Column("kind", sa.Enum("sheet", "drive_folder"), nullable=False),
        sa.Column("url", sa.String(2000), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("tab", sa.String(255), nullable=True),
        sa.Column("mapping", sa.JSON(), nullable=True),
        sa.Column("last_error", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.add_column("extracted_orders", sa.Column("stock_deducted", sa.Boolean(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("extracted_orders", "stock_deducted")
    op.drop_table("bot_external_sources")
