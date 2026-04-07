"""Add chave_divida (internal unique key) to dividas

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add column as nullable first so we can backfill
    op.add_column(
        "dividas",
        sa.Column("chave_divida", sa.String(30), nullable=True),
    )

    # Backfill existing rows: GFD-YYYYMMDD-{id:06d}
    op.execute(text("""
        UPDATE dividas
        SET chave_divida = 'GFD-' ||
            TO_CHAR(created_at, 'YYYYMMDD') ||
            '-' ||
            LPAD(id::text, 6, '0')
        WHERE chave_divida IS NULL
    """))

    # Now make it non-nullable and unique
    op.alter_column("dividas", "chave_divida", nullable=False)
    op.create_index("ix_dividas_chave_divida", "dividas", ["chave_divida"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_dividas_chave_divida", table_name="dividas")
    op.drop_column("dividas", "chave_divida")
