from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.models import Cobranca, Divida, Negociacao
from app.core.config import settings
from app.services import asaas as asaas_svc

router = APIRouter(tags=["webhooks"])

ASAAS_STATUS_PAGO = {"RECEIVED", "CONFIRMED"}


def _baixar_pagamento(cobranca: Cobranca, forma_confirmacao: str, db: Session) -> None:
    hoje = date.today()
    cobranca.status = "pago"
    cobranca.data_pagamento_confirmado = hoje
    cobranca.forma_confirmacao = forma_confirmacao

    divida = db.query(Divida).filter(Divida.id == cobranca.divida_id).first()
    neg = db.query(Negociacao).filter(Negociacao.id == cobranca.negociacao_id).first()

    if divida:
        divida.status = "pago"
        divida.data_pagamento_confirmado = hoje
        divida.valor_negociado = float(cobranca.valor)

    if neg:
        neg.status = "concluida"
        neg.status_detalhe = "pago"
        neg.data_conclusao = hoje


@router.post("/webhook/asaas")
async def asaas_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recebe eventos do Asaas.
    SEMPRE retorna 200 — nunca 4xx/5xx para o Asaas.
    """
    # Validar token
    token = request.headers.get("asaas-access-token", "")
    if settings.ASAAS_WEBHOOK_TOKEN and token != settings.ASAAS_WEBHOOK_TOKEN:
        # Retornar 200 mesmo assim para não parar reenvios
        return Response(status_code=200)

    try:
        body = await request.json()
    except Exception:
        return Response(status_code=200)

    event = body.get("event", "")
    payment = body.get("payment", {})
    asaas_id = payment.get("id")
    external_ref = payment.get("externalReference")  # = chave_divida

    if event not in ("PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"):
        return Response(status_code=200)

    cobranca = None

    # Buscar por asaas_id
    if asaas_id:
        cobranca = db.query(Cobranca).filter(Cobranca.asaas_id == asaas_id).first()

    # Fallback: buscar pela chave da dívida
    if not cobranca and external_ref:
        divida = db.query(Divida).filter(Divida.chave_divida == external_ref).first()
        if divida:
            cobranca = (
                db.query(Cobranca)
                .filter(
                    Cobranca.divida_id == divida.id,
                    Cobranca.status.notin_(["cancelado", "expirado", "erro"]),
                )
                .order_by(Cobranca.created_at.desc())
                .first()
            )

    if cobranca and cobranca.status != "pago":
        _baixar_pagamento(cobranca, "automatica_webhook", db)
        db.commit()

    return Response(status_code=200)
