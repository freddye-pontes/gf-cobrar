"""cobranca_sync_asaas

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-13
"""
from alembic import op
from sqlalchemy import text

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS checkout_visualizado BOOLEAN NOT NULL DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS checkout_visualizado_em TIMESTAMP"))
    conn.execute(text("ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS asaas_status_raw VARCHAR(50)"))
    conn.execute(text("ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS asaas_sincronizado_em TIMESTAMP"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE cobrancas DROP COLUMN IF EXISTS asaas_sincronizado_em"))
    conn.execute(text("ALTER TABLE cobrancas DROP COLUMN IF EXISTS asaas_status_raw"))
    conn.execute(text("ALTER TABLE cobrancas DROP COLUMN IF EXISTS checkout_visualizado_em"))
    conn.execute(text("ALTER TABLE cobrancas DROP COLUMN IF EXISTS checkout_visualizado"))
