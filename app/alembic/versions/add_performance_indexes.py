"""add performance indexes

Revision ID: a2b3c4d5e6f7
Revises: j0k1l2m3n4o5
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'a2b3c4d5e6f7'
down_revision = 'j0k1l2m3n4o5'
branch_labels = None
depends_on = None


def upgrade():
    # Составные индексы для visits
    op.create_index('idx_visits_org_user', 'visits', ['organization_id', 'user_id'], if_not_exists=True)
    op.create_index('idx_visits_company_date', 'visits', ['company_id', 'date'],
                    postgresql_ops={'date': 'DESC'}, if_not_exists=True)
    op.create_index('idx_visits_org_date', 'visits', ['organization_id', 'date'], if_not_exists=True)

    # Индексы для companies
    op.create_index('idx_companies_org', 'companies', ['organization_id'], if_not_exists=True)
    op.create_index('idx_companies_org_region', 'companies', ['organization_id', 'region'], if_not_exists=True)

    # GIN индекс для JSONB поля dynamic_fields на companies
    op.execute("CREATE INDEX IF NOT EXISTS idx_companies_dynamic_gin ON companies USING GIN(dynamic_fields)")

    # Индексы для contacts
    op.create_index('idx_contacts_org', 'contacts', ['organization_id'], if_not_exists=True)

    # Индексы для users
    op.create_index('idx_users_org', 'users', ['organization_id'], if_not_exists=True)


def downgrade():
    op.drop_index('idx_visits_org_user', table_name='visits')
    op.drop_index('idx_visits_company_date', table_name='visits')
    op.drop_index('idx_visits_org_date', table_name='visits')
    op.drop_index('idx_companies_org', table_name='companies')
    op.drop_index('idx_companies_org_region', table_name='companies')
    op.execute("DROP INDEX IF EXISTS idx_companies_dynamic_gin")
    op.drop_index('idx_contacts_org', table_name='contacts')
    op.drop_index('idx_users_org', table_name='users')
