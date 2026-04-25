"""Add regua_aging to credores and comissao_percentual to dividas

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('credores', sa.Column('regua_aging', JSONB, nullable=True))
    op.add_column('dividas', sa.Column('comissao_percentual', sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('credores', 'regua_aging')
    op.drop_column('dividas', 'comissao_percentual')
