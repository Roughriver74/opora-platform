"""remove_doctors_entity: drop doctors table and visit_doctors junction

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-04-11 18:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "i9j0k1l2m3n4"
down_revision: Union[str, None] = "h8i9j0k1l2m3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop junction table first (depends on doctors)
    op.drop_table("visit_doctors")
    # Drop doctors table
    op.drop_table("doctors")


def downgrade() -> None:
    # Recreate doctors table
    op.create_table(
        "doctors",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("bitrix_id", sa.Integer(), unique=True),
        sa.Column("name", sa.String()),
        sa.Column("dynamic_fields", JSONB(), server_default="{}"),
        sa.Column("last_synced", sa.DateTime(timezone=True)),
        sa.Column("sync_status", sa.String(), server_default="pending"),
        sa.Column("sync_error", sa.Text(), nullable=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
    )
    op.create_index("ix_doctors_id", "doctors", ["id"])
    op.create_index("ix_doctors_bitrix_id", "doctors", ["bitrix_id"], unique=True)

    # Recreate junction table
    op.create_table(
        "visit_doctors",
        sa.Column("visit_id", sa.Integer(), sa.ForeignKey("visits.id")),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id")),
    )
