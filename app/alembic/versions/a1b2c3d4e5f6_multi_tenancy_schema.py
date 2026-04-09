"""multi_tenancy_schema

Revision ID: a1b2c3d4e5f6
Revises: 67ac6e1c9da0
Create Date: 2026-04-09 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "67ac6e1c9da0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ================================================================
    # 0. Create tables/columns missing from initial migration
    #    (organizations, network_clinic, company_address were added
    #     outside alembic in production; here we create them properly)
    # ================================================================

    # Create organizations table (base version, then extend below)
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=True),
        sa.Column("bitrix24_webhook_url", sa.String(), nullable=True),
        sa.Column("bitrix24_smart_process_visit_id", sa.Integer(), nullable=True),
        sa.Column(
            "settings", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_organizations_id"), "organizations", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True
    )

    # Create network_clinic table
    op.create_table(
        "network_clinic",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bitrix_id", sa.Integer(), nullable=True),
        sa.Column(
            "company_id",
            sa.Integer(),
            sa.ForeignKey("companies.bitrix_id"),
            nullable=True,
        ),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column(
            "doctor_bitrix_id",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "dynamic_fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("last_synced", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_network_clinic_id"), "network_clinic", ["id"], unique=False
    )

    # Create company_address table
    op.create_table(
        "company_address",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column(
            "company_id",
            sa.Integer(),
            sa.ForeignKey("companies.id"),
            nullable=True,
        ),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("street", sa.String(), nullable=True),
        sa.Column("number", sa.String(), nullable=True),
        sa.Column("postal_code", sa.String(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_network", sa.Boolean(), server_default="false"),
    )
    op.create_index(
        op.f("ix_company_address_id"), "company_address", ["id"], unique=False
    )

    # Add missing columns to companies (is_network)
    op.add_column(
        "companies",
        sa.Column("is_network", sa.Boolean(), server_default="false"),
    )

    # Add missing columns to visits (geo)
    op.add_column(
        "visits",
        sa.Column("geo", sa.Boolean(), server_default="false"),
    )

    # Add organization_id to users (nullable first)
    op.add_column(
        "users",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )

    # Add organization_id to companies (nullable first)
    op.add_column(
        "companies",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )

    # Add organization_id to visits (nullable first)
    op.add_column(
        "visits",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )

    # ================================================================
    # 1. Add multi-tenancy columns as NULLABLE
    # ================================================================

    # Organization extensions
    op.add_column(
        "organizations",
        sa.Column(
            "owner_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "organizations",
        sa.Column("plan", sa.String(), server_default="free", nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "plan_limits",
            postgresql.JSONB(),
            server_default='{"max_users": 3, "max_visits_per_month": 100}',
            nullable=True,
        ),
    )

    # User extensions
    op.add_column(
        "users",
        sa.Column("role", sa.String(), server_default="user", nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("first_name", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("last_name", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "invited_by",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )

    # organization_id on remaining tables that don't have it yet
    op.add_column(
        "contacts",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "doctors",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "field_mappings",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "custom_sections",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "network_clinic",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "company_address",
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=True,
        ),
    )

    # ================================================================
    # Create new tables
    # ================================================================
    op.create_table(
        "org_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("key", sa.String(), nullable=False, index=True),
        sa.Column("value", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        comment="Per-organization settings",
    )

    op.create_table(
        "invitations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), server_default="user"),
        sa.Column(
            "token", sa.String(), nullable=False, unique=True, index=True
        ),
        sa.Column(
            "invited_by",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # ================================================================
    # 2. Data migration
    # ================================================================
    conn = op.get_bind()

    # Create default organization if none exists
    result = conn.execute(sa.text("SELECT id FROM organizations LIMIT 1"))
    default_org = result.fetchone()
    if not default_org:
        conn.execute(
            sa.text(
                """
            INSERT INTO organizations (name, slug, plan, plan_limits, is_active, created_at)
            VALUES (
                'Default Organization',
                'default',
                'free',
                '{"max_users": 3, "max_visits_per_month": 100}',
                true,
                NOW()
            )
        """
            )
        )
        result = conn.execute(
            sa.text("SELECT id FROM organizations WHERE slug = 'default'")
        )
        default_org = result.fetchone()

    default_org_id = default_org[0]

    # Assign all unassigned data to default org
    for table in [
        "users",
        "companies",
        "visits",
        "contacts",
        "doctors",
        "field_mappings",
        "custom_sections",
        "network_clinic",
        "company_address",
    ]:
        conn.execute(
            sa.text(
                f"UPDATE {table} SET organization_id = :org_id WHERE organization_id IS NULL"
            ),
            {"org_id": default_org_id},
        )

    # Migrate is_admin -> role
    conn.execute(
        sa.text("UPDATE users SET role = 'org_admin' WHERE is_admin = true")
    )
    conn.execute(
        sa.text(
            "UPDATE users SET role = 'user' WHERE is_admin = false OR is_admin IS NULL"
        )
    )

    # Set first user as platform_admin (owner of the platform) -- only if users exist
    conn.execute(
        sa.text(
            """
        UPDATE users SET role = 'platform_admin'
        WHERE id = (SELECT MIN(id) FROM users)
        AND (SELECT COUNT(*) FROM users) > 0
    """
        )
    )

    # Set default org owner -- only if users exist
    conn.execute(
        sa.text(
            """
        UPDATE organizations
        SET owner_id = (SELECT MIN(id) FROM users WHERE organization_id = :org_id)
        WHERE id = :org_id
        AND (SELECT COUNT(*) FROM users WHERE organization_id = :org_id) > 0
    """
        ),
        {"org_id": default_org_id},
    )

    # ================================================================
    # 3. Now make columns NOT NULL
    # ================================================================
    # Note: users/companies/visits may have 0 rows, so NOT NULL is safe.
    # For tables that had organization_id added as nullable, we need to
    # handle the case where there are no rows -- that's fine, ALTER
    # just needs no NULL values present.
    op.alter_column("users", "organization_id", nullable=False)
    op.alter_column("users", "role", nullable=False, server_default=None)
    op.alter_column("companies", "organization_id", nullable=False)
    op.alter_column("visits", "organization_id", nullable=False)
    op.alter_column("contacts", "organization_id", nullable=False)
    op.alter_column("doctors", "organization_id", nullable=False)
    op.alter_column("field_mappings", "organization_id", nullable=False)
    op.alter_column("custom_sections", "organization_id", nullable=False)
    op.alter_column("network_clinic", "organization_id", nullable=False)
    op.alter_column("company_address", "organization_id", nullable=False)

    # ================================================================
    # 4. Drop is_admin column
    # ================================================================
    op.drop_column("users", "is_admin")

    # ================================================================
    # 5. Add indexes for organization_id
    # ================================================================
    op.create_index(
        "ix_users_organization_id", "users", ["organization_id"]
    )
    op.create_index(
        "ix_companies_organization_id", "companies", ["organization_id"]
    )
    op.create_index(
        "ix_visits_organization_id", "visits", ["organization_id"]
    )
    op.create_index(
        "ix_contacts_organization_id", "contacts", ["organization_id"]
    )
    op.create_index(
        "ix_doctors_organization_id", "doctors", ["organization_id"]
    )
    op.create_index(
        "ix_field_mappings_organization_id",
        "field_mappings",
        ["organization_id"],
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_field_mappings_organization_id", table_name="field_mappings")
    op.drop_index("ix_doctors_organization_id", table_name="doctors")
    op.drop_index("ix_contacts_organization_id", table_name="contacts")
    op.drop_index("ix_visits_organization_id", table_name="visits")
    op.drop_index("ix_companies_organization_id", table_name="companies")
    op.drop_index("ix_users_organization_id", table_name="users")

    # Re-add is_admin column
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), server_default="false"),
    )

    # Migrate role back to is_admin
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE users SET is_admin = true WHERE role IN ('org_admin', 'platform_admin')"
        )
    )
    conn.execute(
        sa.text("UPDATE users SET is_admin = false WHERE role = 'user'")
    )

    # Drop new user columns
    op.drop_column("users", "role")
    op.drop_column("users", "first_name")
    op.drop_column("users", "last_name")
    op.drop_column("users", "invited_by")

    # Drop organization extensions
    op.drop_column("organizations", "owner_id")
    op.drop_column("organizations", "plan")
    op.drop_column("organizations", "plan_limits")

    # Drop organization_id from newly-added tables
    for table in [
        "contacts",
        "doctors",
        "field_mappings",
        "custom_sections",
        "network_clinic",
        "company_address",
    ]:
        op.drop_column(table, "organization_id")

    # Make nullable again (revert to original)
    op.alter_column("users", "organization_id", nullable=True)
    op.alter_column("companies", "organization_id", nullable=True)
    op.alter_column("visits", "organization_id", nullable=True)

    # Drop new tables
    op.drop_table("invitations")
    op.drop_table("org_settings")

    # Drop organization_id from users, companies, visits (added in step 0)
    op.drop_column("users", "organization_id")
    op.drop_column("companies", "organization_id")
    op.drop_column("visits", "organization_id")

    # Drop columns added to companies and visits
    op.drop_column("companies", "is_network")
    op.drop_column("visits", "geo")

    # Drop tables created in step 0
    op.drop_index(op.f("ix_company_address_id"), table_name="company_address")
    op.drop_table("company_address")
    op.drop_index(op.f("ix_network_clinic_id"), table_name="network_clinic")
    op.drop_table("network_clinic")
    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_id"), table_name="organizations")
    op.drop_table("organizations")
