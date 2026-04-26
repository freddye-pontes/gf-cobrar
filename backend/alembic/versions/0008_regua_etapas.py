"""Add regua_etapas table

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'regua_etapas',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('credor_id', sa.Integer, sa.ForeignKey('credores.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('dia', sa.Integer, nullable=False),
        sa.Column('acao', sa.String(100), nullable=False),
        sa.Column('canais', ARRAY(sa.String), nullable=False, server_default='{}'),
        sa.Column('descricao', sa.Text, nullable=False, server_default=''),
        sa.Column('automatico', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('ordem', sa.Integer, nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_table('regua_etapas')
