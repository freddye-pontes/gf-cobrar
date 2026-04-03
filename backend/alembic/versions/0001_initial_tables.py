"""Initial tables

Revision ID: 0001
Revises:
Create Date: 2026-03-31
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── credores ──────────────────────────────────────────────────────────────
    op.create_table(
        "credores",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("razao_social", sa.String(200), nullable=False),
        sa.Column("cnpj", sa.String(20), nullable=False, unique=True, index=True),
        sa.Column("pix_key", sa.String(200), nullable=False),
        sa.Column("contato_nome", sa.String(200), nullable=False),
        sa.Column("contato_email", sa.String(200), nullable=False),
        sa.Column("comissao_percentual", sa.Numeric(5, 2), nullable=False),
        sa.Column("limite_desconto", sa.Numeric(5, 2), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── devedores ─────────────────────────────────────────────────────────────
    op.create_table(
        "devedores",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("nome", sa.String(200), nullable=False, index=True),
        sa.Column("tipo", sa.String(2), nullable=False),
        sa.Column("cpf_cnpj", sa.String(20), nullable=False, unique=True, index=True),
        sa.Column("telefones", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("email", sa.String(200)),
        sa.Column("logradouro", sa.String(200), nullable=False, server_default=""),
        sa.Column("numero", sa.String(20), nullable=False, server_default=""),
        sa.Column("complemento", sa.String(100)),
        sa.Column("bairro", sa.String(100), nullable=False, server_default=""),
        sa.Column("cidade", sa.String(100), nullable=False, server_default=""),
        sa.Column("estado", sa.String(2), nullable=False, server_default=""),
        sa.Column("cep", sa.String(10), nullable=False, server_default=""),
        sa.Column("score_spc", sa.Integer()),
        sa.Column("perfil", sa.String(20), nullable=False, server_default="varejo"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── dividas ───────────────────────────────────────────────────────────────
    op.create_table(
        "dividas",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("devedor_id", sa.Integer(), sa.ForeignKey("devedores.id"), nullable=False, index=True),
        sa.Column("credor_id", sa.Integer(), sa.ForeignKey("credores.id"), nullable=False, index=True),
        sa.Column("valor_original", sa.Numeric(15, 2), nullable=False),
        sa.Column("valor_atualizado", sa.Numeric(15, 2), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=False, index=True),
        sa.Column("data_emissao", sa.Date(), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="em_aberto", index=True),
        sa.Column("numero_contrato", sa.String(100)),
        sa.Column("dias_sem_contato", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ultimo_contato", sa.Date()),
        sa.Column("acoes_recomendadas", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── historico_contatos ────────────────────────────────────────────────────
    op.create_table(
        "historico_contatos",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("divida_id", sa.Integer(), sa.ForeignKey("dividas.id"), nullable=False, index=True),
        sa.Column("data", sa.Date(), nullable=False, index=True),
        sa.Column("canal", sa.String(20), nullable=False),
        sa.Column("resultado", sa.Text(), nullable=False),
        sa.Column("operador_nome", sa.String(100)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ── negociacoes ───────────────────────────────────────────────────────────
    op.create_table(
        "negociacoes",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("divida_id", sa.Integer(), sa.ForeignKey("dividas.id"), nullable=False, unique=True, index=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ativa", index=True),
        sa.Column("valor_original", sa.Numeric(15, 2), nullable=False),
        sa.Column("valor_oferta", sa.Numeric(15, 2), nullable=False),
        sa.Column("desconto_percentual", sa.Numeric(5, 2)),
        sa.Column("numero_parcelas", sa.Integer()),
        sa.Column("valor_parcela", sa.Numeric(15, 2)),
        sa.Column("data_promessa", sa.Date()),
        sa.Column("data_conclusao", sa.Date()),
        sa.Column("responsavel_nome", sa.String(100), nullable=False),
        sa.Column("notas", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── repasses ──────────────────────────────────────────────────────────────
    op.create_table(
        "repasses",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("credor_id", sa.Integer(), sa.ForeignKey("credores.id"), nullable=False, index=True),
        sa.Column("valor_bruto", sa.Numeric(15, 2), nullable=False),
        sa.Column("comissao", sa.Numeric(15, 2), nullable=False),
        sa.Column("valor_liquido", sa.Numeric(15, 2), nullable=False),
        sa.Column("periodo", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pendente", index=True),
        sa.Column("dividas_ids", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("executado_em", sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table("repasses")
    op.drop_table("negociacoes")
    op.drop_table("historico_contatos")
    op.drop_table("dividas")
    op.drop_table("devedores")
    op.drop_table("credores")
