"""add cadastro_status to devedores

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('devedores', sa.Column(
        'cadastro_status', sa.String(30), nullable=False, server_default='COMPLETO'
    ))
    op.create_index('ix_devedores_cadastro_status', 'devedores', ['cadastro_status'])


def downgrade() -> None:
    op.drop_index('ix_devedores_cadastro_status', table_name='devedores')
    op.drop_column('devedores', 'cadastro_status')
