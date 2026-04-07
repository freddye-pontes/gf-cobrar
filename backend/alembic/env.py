import sys
import os
from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context

# Add backend/ to path so app imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Load .env file if present (local dev)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
except ImportError:
    pass

from app.models.base import Base
import app.models  # noqa: F401 — ensure all models are registered

config = context.config

# Read DATABASE_URL directly from environment (handles empty string too)
_raw = os.environ.get("DATABASE_URL", "NOT_SET")
_db_url = _raw if (_raw and _raw != "NOT_SET") else "postgresql://postgres:senha@localhost:5432/gf_cobrar"

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=_db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(_db_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
