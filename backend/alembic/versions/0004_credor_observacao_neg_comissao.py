"""add observacao to credores and comissao_percentual to negociacoes

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Credor: add observacao, make comissao/desconto default to 0
    op.add_column('credores', sa.Column('observacao', sa.Text(), nullable=True))
    op.alter_column('credores', 'comissao_percentual',
                    existing_type=sa.Numeric(5, 2), server_default='0', nullable=False)
    op.alter_column('credores', 'limite_desconto',
                    existing_type=sa.Numeric(5, 2), server_default='0', nullable=False)

    # Negociacao: add comissao_percentual
    op.add_column('negociacoes', sa.Column('comissao_percentual', sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('credores', 'observacao')
    op.drop_column('negociacoes', 'comissao_percentual')
