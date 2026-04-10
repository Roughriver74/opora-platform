"""add payments table and billing fields to organizations

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-10 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6g7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add billing fields to organizations
    op.add_column(
        "organizations",
        sa.Column("billing_email", sa.String(), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("billing_inn", sa.String(), nullable=True),
    )

    # 2. Create payments table
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(), server_default="RUB"),
        sa.Column("status", sa.String(), server_default="pending"),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("payment_id", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("users_count", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_payments_id"), "payments", ["id"], unique=False
    )
    op.create_index(
        "ix_payments_organization_id", "payments", ["organization_id"]
    )
    op.create_index(
        "ix_payments_status", "payments", ["status"]
    )


def downgrade() -> None:
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_organization_id", table_name="payments")
    op.drop_index(op.f("ix_payments_id"), table_name="payments")
    op.drop_table("payments")

    op.drop_column("organizations", "billing_inn")
    op.drop_column("organizations", "billing_email")
