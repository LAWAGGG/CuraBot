from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20261007filelabel"
down_revision: Union[str, Sequence[str], None] = "b9c8d7e6f5a4"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("uploaded_files", sa.Column("label", sa.String(255), nullable=True))

def downgrade() -> None:
    op.drop_column("uploaded_files", "label")
