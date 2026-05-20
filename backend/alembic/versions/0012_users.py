"""users

Revision ID: 0012
Revises: 0011
Create Date: 2026-05-20
"""
from alembic import op
from sqlalchemy import text

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(200) UNIQUE NOT NULL,
            nome VARCHAR(200) NOT NULL,
            hashed_password VARCHAR(200) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        INSERT INTO users (email, nome, hashed_password) VALUES
        (
            'freddyepn@gmail.com',
            'Freddye Pontes',
            '$2b$12$UvDg4Shti4A1sF/r2IQuSOhN3hL43zfcChuPzVtF1Mno5riLpUneq'
        ),
        (
            'gustavocardoso.contabil@gmail.com',
            'Gustavo Cardoso',
            '$2b$12$cucGcz6ZCmPBjDOLDE.Da.V17CyCoExP6Ln.KhKgNpz83IK6vFyau'
        )
        ON CONFLICT (email) DO NOTHING
    """))


def downgrade() -> None:
    op.get_bind().execute(text("DROP TABLE IF EXISTS users"))
