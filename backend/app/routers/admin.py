from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset", summary="Limpa todos os dados do banco (IRREVERSÍVEL)")
def reset_database(db: Session = Depends(get_db)):
    """
    Trunca todas as tabelas em ordem correta (respeita FK).
    Use apenas para resetar o ambiente de testes.
    """
    db.execute(text("TRUNCATE TABLE repasses, negociacoes, historico_contatos, dividas, devedores, credores RESTART IDENTITY CASCADE"))
    db.commit()
    return {"ok": True, "message": "Banco limpo com sucesso."}
