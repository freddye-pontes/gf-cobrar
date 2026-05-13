"""cobrancas_e_inteligencia_completo

Revision ID: 0010
Revises: 0008
Create Date: 2026-05-12

Migration idempotente (usa IF NOT EXISTS) — consolida:
- Campos de inteligência em devedores (fase 1 evolution)
- Campos de status em negociacoes (fase 1 evolution)
- Tabela cobrancas + campos Asaas completos
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "0010"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── Inteligência em devedores ─────────────────────────────────────────────
    conn.execute(text("ALTER TABLE devedores ADD COLUMN IF NOT EXISTS score_recuperabilidade INTEGER"))
    conn.execute(text("ALTER TABLE devedores ADD COLUMN IF NOT EXISTS chance_recuperacao VARCHAR(20)"))
    conn.execute(text("ALTER TABLE devedores ADD COLUMN IF NOT EXISTS perfil_financeiro VARCHAR(50)"))
    conn.execute(text("ALTER TABLE devedores ADD COLUMN IF NOT EXISTS renda_estimada_min NUMERIC(15,2)"))
    conn.execute(text("ALTER TABLE devedores ADD COLUMN IF NOT EXISTS renda_estimada_max NUMERIC(15,2)"))
    conn.execute(text("ALTER TABLE devedores ADD COLUMN IF NOT EXISTS historico_pagamento VARCHAR(20)"))

    # ── Status granular em negociacoes ────────────────────────────────────────
    conn.execute(text("ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS status_detalhe VARCHAR(40)"))
    conn.execute(text("ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC(15,2)"))
    conn.execute(text("ALTER TABLE negociacoes ADD COLUMN IF NOT EXISTS data_promessa_ptp DATE"))

    # ── Tabela cobrancas (cria se não existir) ────────────────────────────────
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS cobrancas (
            id SERIAL PRIMARY KEY,
            negociacao_id INTEGER NOT NULL REFERENCES negociacoes(id),
            divida_id INTEGER NOT NULL REFERENCES dividas(id),
            forma_pagamento VARCHAR(30) NOT NULL,
            valor NUMERIC(15,2) NOT NULL,
            data_vencimento DATE NOT NULL,
            numero_parcelas INTEGER,
            status VARCHAR(30) NOT NULL DEFAULT 'pendente',
            asaas_id VARCHAR(100) UNIQUE,
            asaas_payment_id VARCHAR(100),
            asaas_url_fatura VARCHAR(500),
            pix_qr_code TEXT,
            pix_qr_code_imagem TEXT,
            pix_copia_cola TEXT,
            boleto_url VARCHAR(500),
            boleto_codigo VARCHAR(200),
            boleto_linha_digitavel VARCHAR(200),
            boleto_codigo_barras VARCHAR(200),
            link_pagamento VARCHAR(500),
            data_pagamento_confirmado DATE,
            forma_confirmacao VARCHAR(30),
            comprovante_url VARCHAR(500),
            enviado_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
            enviado_email BOOLEAN NOT NULL DEFAULT FALSE,
            canal_envio VARCHAR(20),
            data_envio TIMESTAMP,
            erro_mensagem TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """))

    # Índices (CREATE INDEX IF NOT EXISTS)
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cobrancas_negociacao_id ON cobrancas(negociacao_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cobrancas_divida_id ON cobrancas(divida_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cobrancas_status ON cobrancas(status)"))
    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_cobrancas_asaas_id ON cobrancas(asaas_id) WHERE asaas_id IS NOT NULL"))


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
