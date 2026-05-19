from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.database import get_db
from app.models import Cobranca, Divida, Negociacao
from app.core.config import settings

router = APIRouter(tags=["webhooks"])

EVENTOS_PAGAMENTO = {"PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"}
EVENTOS_VISUALIZACAO = {"PAYMENT_CHECKOUT_VIEWED", "PAYMENT_BANK_SLIP_VIEWED"}


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


def _buscar_cobranca(asaas_id: str, external_ref: str, db: Session):
    if asaas_id:
        c = db.query(Cobranca).filter(Cobranca.asaas_id == asaas_id).first()
        if c:
            return c
    if external_ref:
        divida = db.query(Divida).filter(Divida.chave_divida == external_ref).first()
        if divida:
            return (
                db.query(Cobranca)
                .filter(
                    Cobranca.divida_id == divida.id,
                    Cobranca.status.notin_(["cancelado", "expirado", "erro"]),
                )
                .order_by(Cobranca.created_at.desc())
                .first()
            )
    return None


@router.post("/webhook/asaas")
async def asaas_webhook(request: Request, db: Session = Depends(get_db)):
    """SEMPRE retorna 200 — nunca 4xx/5xx para o Asaas."""
    token = request.headers.get("asaas-access-token", "")
    if settings.ASAAS_WEBHOOK_TOKEN and token != settings.ASAAS_WEBHOOK_TOKEN:
        return Response(status_code=200)

    try:
        body = await request.json()
    except Exception:
        return Response(status_code=200)

    event = body.get("event", "")
    payment = body.get("payment", {})
    asaas_id = payment.get("id")
    external_ref = payment.get("externalReference")

    cobranca = _buscar_cobranca(asaas_id, external_ref, db)
    if not cobranca:
        return Response(status_code=200)

    if event in EVENTOS_PAGAMENTO and cobranca.status != "pago":
        _baixar_pagamento(cobranca, "automatica_webhook", db)
        cobranca.asaas_status_raw = "RECEIVED"
        db.commit()

    elif event in EVENTOS_VISUALIZACAO and not cobranca.checkout_visualizado:
        cobranca.checkout_visualizado = True
        cobranca.checkout_visualizado_em = datetime.now()
        cobranca.asaas_status_raw = payment.get("status", cobranca.asaas_status_raw)
        db.commit()

    elif event == "PAYMENT_OVERDUE" and cobranca.status == "aguardando_pagamento":
        cobranca.status = "expirado"
        cobranca.asaas_status_raw = "OVERDUE"
        db.commit()

    return Response(status_code=200)
