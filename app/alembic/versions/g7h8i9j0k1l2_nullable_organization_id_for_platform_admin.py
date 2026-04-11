"""nullable_organization_id_for_platform_admin

Revision ID: g7h8i9j0k1l2
Revises: f6e7f6605428
Create Date: 2026-04-11 11:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = 'g7h8i9j0k1l2'
down_revision: Union[str, None] = 'f6e7f6605428'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Allow platform_admin users to have NULL organization_id
    op.alter_column('users', 'organization_id', nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'organization_id', nullable=False)
