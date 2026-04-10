"""add api_key column to organizations

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-04-09 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6g7h8i9"
down_revision: Union[str, None] = "c3d4e5f6g7h8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("api_key", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_organizations_api_key",
        "organizations",
        ["api_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_organizations_api_key", table_name="organizations")
    op.drop_column("organizations", "api_key")
