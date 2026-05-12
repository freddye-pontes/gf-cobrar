from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.core.config import settings
from app.services import asaas as asaas_svc

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset", summary="Limpa todos os dados do banco (IRREVERSÍVEL)")
def reset_database(db: Session = Depends(get_db)):
    """
    Trunca todas as tabelas em ordem correta (respeita FK).
    Use apenas para resetar o ambiente de testes.
    """
    db.execute(text("TRUNCATE TABLE cobrancas, repasses, negociacoes, historico_contatos, dividas, devedores, credores RESTART IDENTITY CASCADE"))
    db.commit()
    return {"ok": True, "message": "Banco limpo com sucesso."}


@router.post("/registrar-webhook", summary="Registra o webhook do Asaas")
def registrar_webhook():
    webhook_url = f"{settings.BACKEND_PUBLIC_URL}/api/v1/webhook/asaas"
    sucesso = asaas_svc.registrar_webhook(webhook_url)
    return {"success": sucesso, "webhook_url": webhook_url}
