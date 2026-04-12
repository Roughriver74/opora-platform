"""add visit checkin fields and visit_photos table

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'l2m3n4o5p6q7'
down_revision = 'k1l2m3n4o5p6'
branch_labels = None
depends_on = None


def upgrade():
    # Add checkin/checkout columns to visits table
    op.add_column('visits', sa.Column('checkin_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('visits', sa.Column('checkin_lat', sa.Float(), nullable=True))
    op.add_column('visits', sa.Column('checkin_lon', sa.Float(), nullable=True))
    op.add_column('visits', sa.Column('checkout_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('visits', sa.Column('checkout_lat', sa.Float(), nullable=True))
    op.add_column('visits', sa.Column('checkout_lon', sa.Float(), nullable=True))

    # Create visit_photos table
    op.create_table(
        'visit_photos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('visit_id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('thumbnail_path', sa.String(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('taken_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_visit_photos_id', 'visit_photos', ['id'])
    op.create_index('ix_visit_photos_visit_id', 'visit_photos', ['visit_id'])
    op.create_index('ix_visit_photos_organization_id', 'visit_photos', ['organization_id'])


def downgrade():
    op.drop_index('ix_visit_photos_organization_id', table_name='visit_photos')
    op.drop_index('ix_visit_photos_visit_id', table_name='visit_photos')
    op.drop_index('ix_visit_photos_id', table_name='visit_photos')
    op.drop_table('visit_photos')

    op.drop_column('visits', 'checkout_lon')
    op.drop_column('visits', 'checkout_lat')
    op.drop_column('visits', 'checkout_at')
    op.drop_column('visits', 'checkin_lon')
    op.drop_column('visits', 'checkin_lat')
    op.drop_column('visits', 'checkin_at')
