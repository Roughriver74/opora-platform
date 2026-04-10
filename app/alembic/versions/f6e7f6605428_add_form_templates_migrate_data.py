"""add_form_templates_migrate_data

Revision ID: f6e7f6605428
Revises: d4e5f6g7h8i9
Create Date: 2026-04-10 19:34:38.702486

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f6e7f6605428'
down_revision: Union[str, None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create form_templates table
    op.create_table(
        "form_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("fields", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "entity_type", name="uq_form_template_org_entity"),
    )
    # 2. Migrate data from visit_form_templates into form_templates
    op.execute("""
        INSERT INTO form_templates (organization_id, entity_type, fields, created_at)
        SELECT
            vft.organization_id,
            'visit',
            (
                SELECT COALESCE(jsonb_agg(
                    CASE
                        WHEN fm.bitrix_field_id IS NOT NULL THEN
                            field_def || jsonb_build_object(
                                'bitrix_field_id', fm.bitrix_field_id,
                                'bitrix_field_type', fm.field_type,
                                'bitrix_value_mapping', COALESCE(fm.value_options, '[]'::jsonb)
                            )
                        ELSE field_def
                    END
                ), '[]'::jsonb)
                FROM jsonb_array_elements(COALESCE(vft.fields, '[]'::jsonb)) AS field_def
                LEFT JOIN field_mappings fm
                    ON fm.organization_id = vft.organization_id
                    AND fm.entity_type = 'visit'
                    AND fm.app_field_name = field_def->>'key'
            ),
            vft.created_at
        FROM visit_form_templates vft
        ON CONFLICT (organization_id, entity_type) DO UPDATE SET fields = EXCLUDED.fields
    """)


def downgrade() -> None:
    # WARNING: This downgrade is lossy. Merged Bitrix field data stored in
    # form_templates is NOT written back to field_mappings on rollback.
    # The original visit_form_templates rows are preserved (not touched by upgrade).
    op.drop_table("form_templates")
