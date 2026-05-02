from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime

from app.database import get_db
from app.models import Cobranca, Negociacao, Divida
from app.schemas.cobranca import CobrancaCreate, CobrancaOut, ConfirmarPagamentoPayload

router = APIRouter(prefix="/cobrancas", tags=["cobrancas"])


def _gerar_dados_pix(valor: float, devedor_nome: str) -> dict:
    """Gera dados mock de PIX — integração real fica para Fase 4."""
    return {
        "pix_qr_code": f"mock_qr_{valor:.2f}",
        "pix_copia_cola": f"00020126580014br.gov.bcb.pix0136mock-pix-key-{valor:.0f}5204000053039865802BR5913{devedor_nome[:13].upper()}6008BRASILIA62070503***6304ABCD",
    }


def _gerar_dados_boleto(valor: float) -> dict:
    """Gera dados mock de boleto."""
    return {
        "boleto_url": f"https://placeholder.boleto/mock/{valor:.0f}",
        "boleto_codigo": f"23790.00000 00000.000000 00000.000000 0 {int(valor):017d}",
    }


@router.post("/", response_model=CobrancaOut, status_code=status.HTTP_201_CREATED)
def criar_cobranca(payload: CobrancaCreate, db: Session = Depends(get_db)):
    neg = (
        db.query(Negociacao)
        .options(joinedload(Negociacao.divida).joinedload(Divida.devedor))
        .filter(Negociacao.id == payload.negociacao_id)
        .first()
    )
    if not neg:
        raise HTTPException(status_code=404, detail="Negociação não encontrada")

    divida = db.query(Divida).filter(Divida.id == payload.divida_id).first()
    if not divida:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")

    cobranca = Cobranca(
        negociacao_id=payload.negociacao_id,
        divida_id=payload.divida_id,
        forma_pagamento=payload.forma_pagamento,
        valor=payload.valor,
        data_vencimento=payload.data_vencimento,
        status="aguardando_pagamento",
        numero_parcelas=payload.numero_parcelas,
        data_envio=datetime.now(),
    )

    devedor_nome = neg.divida.devedor.nome if (neg.divida and neg.divida.devedor) else "DEVEDOR"

    if payload.forma_pagamento == "pix":
        dados = _gerar_dados_pix(payload.valor, devedor_nome)
        cobranca.pix_qr_code = dados["pix_qr_code"]
        cobranca.pix_copia_cola = dados["pix_copia_cola"]
        cobranca.canal_envio = "pix"
    elif payload.forma_pagamento == "boleto":
        dados = _gerar_dados_boleto(payload.valor)
        cobranca.boleto_url = dados["boleto_url"]
        cobranca.boleto_codigo = dados["boleto_codigo"]
        cobranca.canal_envio = "boleto"
    elif payload.forma_pagamento == "link_parcelado":
        cobranca.link_pagamento = f"https://placeholder.link/mock/{payload.valor:.0f}"
        cobranca.canal_envio = "link"

    # Atualizar status da negociação
    neg.status_detalhe = "aguardando_pagamento"

    # Atualizar status da dívida para ptp_ativa se ainda não for pago
    if divida.status not in ("pago", "encerrado"):
        divida.status = "ptp_ativa"

    db.add(cobranca)
    db.commit()
    db.refresh(cobranca)
    return cobranca


@router.get("/{cobranca_id}", response_model=CobrancaOut)
def get_cobranca(cobranca_id: int, db: Session = Depends(get_db)):
    c = db.query(Cobranca).filter(Cobranca.id == cobranca_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")
    return c


@router.get("/negociacao/{neg_id}", response_model=list[CobrancaOut])
def cobracas_por_negociacao(neg_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Cobranca)
        .filter(Cobranca.negociacao_id == neg_id)
        .order_by(Cobranca.created_at.desc())
        .all()
    )


@router.put("/{cobranca_id}/confirmar", response_model=CobrancaOut)
def confirmar_pagamento(
    cobranca_id: int,
    payload: ConfirmarPagamentoPayload,
    db: Session = Depends(get_db),
):
    cobranca = (
        db.query(Cobranca)
        .options(
            joinedload(Cobranca.negociacao).joinedload(Negociacao.divida).joinedload(Divida.credor)
        )
        .filter(Cobranca.id == cobranca_id)
        .first()
    )
    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")

    cobranca.status = "pago"
    cobranca.data_pagamento_confirmado = payload.data_pagamento
    cobranca.forma_confirmacao = payload.forma_confirmacao
    if payload.comprovante_url:
        cobranca.comprovante_url = payload.comprovante_url

    neg = cobranca.negociacao
    if neg:
        neg.status = "concluida"
        neg.status_detalhe = "pago"
        neg.data_conclusao = date.today()

        divida = neg.divida
        if divida:
            divida.status = "pago"
            divida.data_pagamento_confirmado = payload.data_pagamento
            divida.valor_negociado = float(neg.valor_oferta)
            if neg.desconto_percentual:
                divida.desconto_aplicado = float(neg.desconto_percentual)
            pct = float(
                neg.comissao_percentual
                or divida.comissao_percentual
                or (divida.credor.comissao_percentual if divida.credor else 0)
                or 0
            )
            divida.comissao_percentual = pct

    db.commit()
    db.refresh(cobranca)
    return cobranca


@router.put("/{cobranca_id}/cancelar", response_model=CobrancaOut)
def cancelar_cobranca(cobranca_id: int, db: Session = Depends(get_db)):
    cobranca = db.query(Cobranca).filter(Cobranca.id == cobranca_id).first()
    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")
    cobranca.status = "cancelado"

    neg = db.query(Negociacao).filter(Negociacao.id == cobranca.negociacao_id).first()
    if neg:
        neg.status_detalhe = "ativa"

    divida = db.query(Divida).filter(Divida.id == cobranca.divida_id).first()
    if divida and divida.status == "ptp_ativa":
        divida.status = "em_negociacao"

    db.commit()
    db.refresh(cobranca)
    return cobranca


@router.post("/{cobranca_id}/reenviar", status_code=status.HTTP_204_NO_CONTENT)
def reenviar_cobranca(cobranca_id: int, db: Session = Depends(get_db)):
    cobranca = db.query(Cobranca).filter(Cobranca.id == cobranca_id).first()
    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")
    # Integração real com WhatsApp fica para Fase 4
    cobranca.data_envio = datetime.now()
    db.commit()
