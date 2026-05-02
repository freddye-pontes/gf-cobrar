"""fase1_cobranca_e_inteligencia

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-02
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Campos de inteligência em devedores ───────────────────────────────────
    op.add_column("devedores", sa.Column("score_recuperabilidade", sa.Integer(), nullable=True))
    op.add_column("devedores", sa.Column("chance_recuperacao", sa.String(20), nullable=True))
    op.add_column("devedores", sa.Column("perfil_financeiro", sa.String(50), nullable=True))
    op.add_column("devedores", sa.Column("renda_estimada_min", sa.Numeric(15, 2), nullable=True))
    op.add_column("devedores", sa.Column("renda_estimada_max", sa.Numeric(15, 2), nullable=True))
    op.add_column("devedores", sa.Column("historico_pagamento", sa.String(20), nullable=True))

    # ── Campos novos em negociacoes ───────────────────────────────────────────
    op.add_column("negociacoes", sa.Column("status_detalhe", sa.String(40), nullable=True))
    op.add_column("negociacoes", sa.Column("valor_entrada", sa.Numeric(15, 2), nullable=True))
    op.add_column("negociacoes", sa.Column("data_promessa_ptp", sa.Date(), nullable=True))

    # ── Tabela cobrancas ──────────────────────────────────────────────────────
    op.create_table(
        "cobrancas",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("negociacao_id", sa.Integer(), sa.ForeignKey("negociacoes.id"), nullable=False, index=True),
        sa.Column("divida_id", sa.Integer(), sa.ForeignKey("dividas.id"), nullable=False, index=True),
        sa.Column("forma_pagamento", sa.String(30), nullable=False),
        sa.Column("valor", sa.Numeric(15, 2), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="aguardando_pagamento", index=True),
        sa.Column("pix_qr_code", sa.Text(), nullable=True),
        sa.Column("pix_copia_cola", sa.Text(), nullable=True),
        sa.Column("boleto_url", sa.String(500), nullable=True),
        sa.Column("boleto_codigo", sa.String(200), nullable=True),
        sa.Column("link_pagamento", sa.String(500), nullable=True),
        sa.Column("numero_parcelas", sa.Integer(), nullable=True),
        sa.Column("data_pagamento_confirmado", sa.Date(), nullable=True),
        sa.Column("forma_confirmacao", sa.String(30), nullable=True),
        sa.Column("comprovante_url", sa.String(500), nullable=True),
        sa.Column("enviado_whatsapp", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("enviado_email", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("canal_envio", sa.String(20), nullable=True),
        sa.Column("data_envio", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("cobrancas")
    op.drop_column("negociacoes", "data_promessa_ptp")
    op.drop_column("negociacoes", "valor_entrada")
    op.drop_column("negociacoes", "status_detalhe")
    op.drop_column("devedores", "historico_pagamento")
    op.drop_column("devedores", "renda_estimada_max")
    op.drop_column("devedores", "renda_estimada_min")
    op.drop_column("devedores", "perfil_financeiro")
    op.drop_column("devedores", "chance_recuperacao")
    op.drop_column("devedores", "score_recuperabilidade")
