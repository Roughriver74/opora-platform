"""fix_models_integrity: FK network_clinic, sync_error, visit.date timezone

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-04-11 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "h8i9j0k1l2m3"
down_revision: Union[str, None] = "g7h8i9j0k1l2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1.1 Fix NetworkClinic FK: companies.bitrix_id -> companies.id
    # First, convert existing company_id values from bitrix_id to id
    op.execute("""
        UPDATE network_clinic nc
        SET company_id = c.id
        FROM companies c
        WHERE nc.company_id = c.bitrix_id
          AND c.bitrix_id IS NOT NULL
    """)
    # Set NULL for any remaining rows that don't match (orphaned references)
    op.execute("""
        UPDATE network_clinic
        SET company_id = NULL
        WHERE company_id IS NOT NULL
          AND company_id NOT IN (SELECT id FROM companies)
    """)

    # Drop old FK and create new one
    op.drop_constraint(
        "network_clinic_company_id_fkey", "network_clinic", type_="foreignkey"
    )
    op.create_foreign_key(
        "network_clinic_company_id_fkey",
        "network_clinic",
        "companies",
        ["company_id"],
        ["id"],
    )

    # 1.5 Add sync_error column to synced entities
    op.add_column("companies", sa.Column("sync_error", sa.Text(), nullable=True))
    op.add_column("visits", sa.Column("sync_error", sa.Text(), nullable=True))
    op.add_column("doctors", sa.Column("sync_error", sa.Text(), nullable=True))
    op.add_column("contacts", sa.Column("sync_error", sa.Text(), nullable=True))

    # 1.6 Fix Visit.date and Visit.last_synced timezone
    op.alter_column(
        "visits",
        "date",
        type_=sa.DateTime(timezone=True),
        existing_type=sa.DateTime(),
        existing_nullable=True,
    )
    op.alter_column(
        "visits",
        "last_synced",
        type_=sa.DateTime(timezone=True),
        existing_type=sa.DateTime(),
        existing_nullable=True,
    )


def downgrade() -> None:
    # Revert Visit.date and Visit.last_synced timezone
    op.alter_column(
        "visits",
        "last_synced",
        type_=sa.DateTime(),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
    )
    op.alter_column(
        "visits",
        "date",
        type_=sa.DateTime(),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
    )

    # Remove sync_error columns
    op.drop_column("contacts", "sync_error")
    op.drop_column("doctors", "sync_error")
    op.drop_column("visits", "sync_error")
    op.drop_column("companies", "sync_error")

    # Revert NetworkClinic FK back to companies.bitrix_id
    op.drop_constraint(
        "network_clinic_company_id_fkey", "network_clinic", type_="foreignkey"
    )
    op.create_foreign_key(
        "network_clinic_company_id_fkey",
        "network_clinic",
        "companies",
        ["company_id"],
        ["bitrix_id"],
    )
    # Note: data conversion is lossy — cannot perfectly restore bitrix_id references
