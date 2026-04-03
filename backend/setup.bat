@echo off
echo === GF Cobrar — Setup do Backend ===
cd /d "%~dp0"

REM Copia .env se nao existir
if not exist .env (
    copy .env.example .env
    echo [OK] .env criado a partir de .env.example — edite DATABASE_URL antes de continuar
    pause
    exit /b 1
)

call ..\venv\Scripts\activate

REM Cria o banco (precisa do PostgreSQL rodando)
echo [1/3] Criando banco de dados...
..\venv\Scripts\python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(engine); print('Tabelas criadas com sucesso')"

REM Popula com dados de exemplo
echo [2/3] Populando dados de exemplo...
..\venv\Scripts\python seed.py

echo [3/3] Iniciando servidor em http://localhost:8000
echo       Docs: http://localhost:8000/docs
uvicorn app.main:app --reload --port 8000
