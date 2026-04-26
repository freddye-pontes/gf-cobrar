"""Add PTP/payment dates and negotiated value to dividas

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('dividas', sa.Column('data_promessa_pagamento', sa.Date, nullable=True))
    op.add_column('dividas', sa.Column('data_pagamento_confirmado', sa.Date, nullable=True))
    op.add_column('dividas', sa.Column('valor_negociado', sa.Numeric(15, 2), nullable=True))
    op.add_column('dividas', sa.Column('desconto_aplicado', sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('dividas', 'data_promessa_pagamento')
    op.drop_column('dividas', 'data_pagamento_confirmado')
    op.drop_column('dividas', 'valor_negociado')
    op.drop_column('dividas', 'desconto_aplicado')
