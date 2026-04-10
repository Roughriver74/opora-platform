"""add visit_form_templates table

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-04-09 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6g7h8"
down_revision: Union[str, None] = "b2c3d4e5f6g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "visit_form_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("fields", JSONB(), server_default="[]"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_visit_form_templates_id"),
        "visit_form_templates",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_visit_form_templates_organization_id",
        "visit_form_templates",
        ["organization_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_visit_form_templates_organization_id",
        table_name="visit_form_templates",
    )
    op.drop_index(
        op.f("ix_visit_form_templates_id"),
        table_name="visit_form_templates",
    )
    op.drop_table("visit_form_templates")
