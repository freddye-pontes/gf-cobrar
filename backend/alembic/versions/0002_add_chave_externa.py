"""Add chave_externa to dividas

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dividas",
        sa.Column("chave_externa", sa.String(100), nullable=True),
    )
    op.create_index("ix_dividas_chave_externa", "dividas", ["chave_externa"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_dividas_chave_externa", table_name="dividas")
    op.drop_column("dividas", "chave_externa")
