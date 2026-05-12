"""asaas_cobranca_fields

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Novos campos Asaas na tabela cobrancas
    op.add_column("cobrancas", sa.Column("asaas_id", sa.String(100), nullable=True))
    op.add_column("cobrancas", sa.Column("asaas_payment_id", sa.String(100), nullable=True))
    op.add_column("cobrancas", sa.Column("asaas_url_fatura", sa.String(500), nullable=True))
    op.add_column("cobrancas", sa.Column("pix_qr_code_imagem", sa.Text(), nullable=True))
    op.add_column("cobrancas", sa.Column("boleto_linha_digitavel", sa.String(200), nullable=True))
    op.add_column("cobrancas", sa.Column("boleto_codigo_barras", sa.String(200), nullable=True))
    op.add_column("cobrancas", sa.Column("erro_mensagem", sa.Text(), nullable=True))

    # Índice único no asaas_id
    op.create_index("ix_cobrancas_asaas_id", "cobrancas", ["asaas_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_cobrancas_asaas_id", table_name="cobrancas")
    op.drop_column("cobrancas", "erro_mensagem")
    op.drop_column("cobrancas", "boleto_codigo_barras")
    op.drop_column("cobrancas", "boleto_linha_digitavel")
    op.drop_column("cobrancas", "pix_qr_code_imagem")
    op.drop_column("cobrancas", "asaas_url_fatura")
    op.drop_column("cobrancas", "asaas_payment_id")
    op.drop_column("cobrancas", "asaas_id")
