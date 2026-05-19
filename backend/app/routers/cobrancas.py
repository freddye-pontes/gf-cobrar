from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime
from urllib.parse import quote

from app.database import get_db
from app.models import Cobranca, Negociacao, Divida
from app.models.devedor import Devedor
from app.schemas.cobranca import CobrancaCreate, CobrancaOut, ConfirmarPagamentoPayload
from app.services import asaas as asaas_svc
from app.services.asaas import AsaasError

router = APIRouter(prefix="/cobrancas", tags=["cobrancas"])


def _load_cobranca(cobranca_id: int, db: Session) -> Cobranca:
    c = db.query(Cobranca).filter(Cobranca.id == cobranca_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")
    return c


def _baixar_pagamento(
    cobranca: Cobranca,
    data_pagamento: date,
    forma_confirmacao: str,
    db: Session,
) -> None:
    cobranca.status = "pago"
    cobranca.data_pagamento_confirmado = data_pagamento
    cobranca.forma_confirmacao = forma_confirmacao

    neg = db.query(Negociacao).filter(Negociacao.id == cobranca.negociacao_id).first()
    divida = (
        db.query(Divida)
        .options(joinedload(Divida.credor))
        .filter(Divida.id == cobranca.divida_id)
        .first()
    )

    if divida:
        divida.status = "pago"
        divida.data_pagamento_confirmado = data_pagamento
        divida.valor_negociado = float(cobranca.valor)
        if divida.credor:
            pct = float(divida.credor.comissao_percentual or 0)
            divida.comissao_percentual = pct

    if neg:
        neg.status = "concluida"
        neg.status_detalhe = "pago"
        neg.data_conclusao = data_pagamento


# ── POST / — Criar cobrança via Asaas ─────────────────────────────────────────

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

    # Verificar cobrança ativa existente
    cobranca_ativa = (
        db.query(Cobranca)
        .filter(
            Cobranca.negociacao_id == payload.negociacao_id,
            Cobranca.status.notin_(["cancelado", "expirado", "erro"]),
        )
        .first()
    )
    if cobranca_ativa:
        raise HTTPException(status_code=409, detail="Já existe uma cobrança ativa para esta negociação")

    devedor: Devedor | None = neg.divida.devedor if neg.divida else None
    data_venc = (
        payload.data_vencimento.isoformat()
        if payload.data_vencimento
        else date.today().isoformat()
    )
    descricao = f"Cobrança GF Recebíveis — {divida.chave_divida}"

    cobranca = Cobranca(
        negociacao_id=payload.negociacao_id,
        divida_id=payload.divida_id,
        forma_pagamento=payload.forma_pagamento,
        valor=payload.valor,
        data_vencimento=payload.data_vencimento or date.today(),
        numero_parcelas=payload.numero_parcelas,
        status="pendente",
        data_envio=datetime.now(),
    )

    try:
        customer_id = asaas_svc.buscar_ou_criar_cliente(
            nome=devedor.nome if devedor else "Devedor",
            cpf_cnpj=devedor.cpf_cnpj if devedor else "",
            email=devedor.email if devedor else None,
            telefone=devedor.telefones[0] if devedor and devedor.telefones else None,
            cep=devedor.cep if devedor else None,
        )

        if payload.forma_pagamento == "pix":
            resultado = asaas_svc.criar_cobranca_pix(
                customer_id, payload.valor, descricao, divida.chave_divida, data_venc
            )
            cobranca.asaas_id = resultado["asaas_id"]
            cobranca.pix_copia_cola = resultado.get("pix_copia_cola")
            cobranca.pix_qr_code = resultado.get("pix_qr_code_imagem")
            cobranca.pix_qr_code_imagem = resultado.get("pix_qr_code_imagem")
            cobranca.asaas_url_fatura = resultado.get("asaas_url_fatura")

        elif payload.forma_pagamento == "boleto":
            resultado = asaas_svc.criar_cobranca_boleto(
                customer_id, payload.valor, descricao, divida.chave_divida, data_venc
            )
            cobranca.asaas_id = resultado["asaas_id"]
            cobranca.boleto_url = resultado.get("boleto_url")
            cobranca.boleto_linha_digitavel = resultado.get("boleto_linha_digitavel")
            cobranca.boleto_codigo = resultado.get("boleto_linha_digitavel")  # compat
            cobranca.boleto_codigo_barras = resultado.get("boleto_codigo_barras")
            cobranca.asaas_url_fatura = resultado.get("asaas_url_fatura")

        elif payload.forma_pagamento == "link_parcelado":
            resultado = asaas_svc.criar_link_parcelado(
                customer_id, payload.valor, descricao, divida.chave_divida,
                payload.numero_parcelas or 1, data_venc
            )
            cobranca.asaas_id = resultado["asaas_id"]
            cobranca.link_pagamento = resultado.get("link_pagamento")
            cobranca.asaas_url_fatura = resultado.get("asaas_url_fatura")

        cobranca.status = "aguardando_pagamento"

    except AsaasError as e:
        cobranca.status = "erro"
        cobranca.erro_mensagem = e.message
        db.add(cobranca)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Erro Asaas: {e.message}")
    except Exception as e:
        cobranca.status = "erro"
        cobranca.erro_mensagem = str(e)
        db.add(cobranca)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Erro ao criar cobrança: {e}")

    # Atualizar status da dívida
    if divida.status not in ("pago", "encerrado"):
        divida.status = "ptp_ativa"

    # Atualizar status_detalhe da negociação
    neg.status_detalhe = "aguardando_pagamento"

    db.add(cobranca)
    db.commit()
    db.refresh(cobranca)
    return cobranca


# ── GET /{id} ─────────────────────────────────────────────────────────────────

@router.get("/{cobranca_id}", response_model=CobrancaOut)
def get_cobranca(cobranca_id: int, db: Session = Depends(get_db)):
    return _load_cobranca(cobranca_id, db)


# ── GET /negociacao/{neg_id} ──────────────────────────────────────────────────

@router.get("/negociacao/{neg_id}", response_model=list[CobrancaOut])
def cobracas_por_negociacao(neg_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Cobranca)
        .filter(Cobranca.negociacao_id == neg_id)
        .order_by(Cobranca.created_at.desc())
        .all()
    )


# ── PUT /{id}/confirmar ───────────────────────────────────────────────────────

@router.put("/{cobranca_id}/confirmar", response_model=CobrancaOut)
def confirmar_pagamento(
    cobranca_id: int,
    payload: ConfirmarPagamentoPayload,
    db: Session = Depends(get_db),
):
    cobranca = _load_cobranca(cobranca_id, db)
    _baixar_pagamento(cobranca, payload.data_pagamento, payload.forma_confirmacao, db)
    if payload.comprovante_url:
        cobranca.comprovante_url = payload.comprovante_url
    db.commit()
    db.refresh(cobranca)
    return cobranca


# ── PUT /{id}/cancelar ────────────────────────────────────────────────────────

@router.put("/{cobranca_id}/cancelar", response_model=CobrancaOut)
def cancelar_cobranca(cobranca_id: int, db: Session = Depends(get_db)):
    cobranca = _load_cobranca(cobranca_id, db)

    if cobranca.asaas_id:
        asaas_svc.cancelar_cobranca(cobranca.asaas_id)

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


# ── POST /{id}/reenviar ───────────────────────────────────────────────────────

@router.post("/{cobranca_id}/reenviar")
def reenviar_cobranca(
    cobranca_id: int,
    canal: str = Query(default="whatsapp"),
    db: Session = Depends(get_db),
):
    cobranca = _load_cobranca(cobranca_id, db)

    link_cobranca = (
        cobranca.asaas_url_fatura
        or cobranca.boleto_url
        or cobranca.link_pagamento
        or cobranca.pix_copia_cola
        or ""
    )

    url_whatsapp = None
    if canal == "whatsapp":
        divida = db.query(Divida).options(joinedload(Divida.devedor)).filter(
            Divida.id == cobranca.divida_id
        ).first()
        if divida and divida.devedor and divida.devedor.telefones:
            tel_raw = divida.devedor.telefones[0]
            tel_digits = "".join(x for x in tel_raw if x.isdigit())
            if not tel_digits.startswith("55"):
                tel_digits = "55" + tel_digits
            msg = f"Olá! Segue o link para pagamento da sua cobrança GF Recebíveis: {link_cobranca}"
            url_whatsapp = f"https://wa.me/{tel_digits}?text={quote(msg)}"

        cobranca.enviado_whatsapp = True
        cobranca.data_envio = datetime.now()
        db.commit()

    return {"url_whatsapp": url_whatsapp, "link_cobranca": link_cobranca}


# ── GET /{id}/sincronizar — busca status atual no Asaas ──────────────────────

@router.get("/{cobranca_id}/sincronizar")
def sincronizar_cobranca(cobranca_id: int, db: Session = Depends(get_db)):
    cobranca = _load_cobranca(cobranca_id, db)

    if not cobranca.asaas_id:
        raise HTTPException(status_code=400, detail="Esta cobrança não tem ID Asaas — não foi gerada via integração.")

    try:
        info = asaas_svc.consultar_status_completo(cobranca.asaas_id)
    except AsaasError as e:
        raise HTTPException(status_code=502, detail=f"Erro Asaas: {e.message}")

    # Sincronizar campos
    cobranca.asaas_status_raw = info["status_raw"]
    cobranca.asaas_sincronizado_em = datetime.now()

    pago = info["status_raw"] in ("RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH")
    if pago and cobranca.status != "pago":
        data_pgto = info.get("data_pagamento")
        from datetime import date as ddate
        dt = ddate.fromisoformat(data_pgto) if data_pgto else ddate.today()
        _baixar_pagamento(cobranca, dt, "automatica_asaas", db)

    # Visualização
    vd = info.get("invoice_viewed_date") or info.get("bank_slip_viewed_date")
    if vd and not cobranca.checkout_visualizado:
        cobranca.checkout_visualizado = True
        cobranca.checkout_visualizado_em = datetime.fromisoformat(vd) if isinstance(vd, str) else datetime.now()

    db.commit()
    db.refresh(cobranca)

    return {
        "cobranca_id": cobranca_id,
        "asaas_id": cobranca.asaas_id,
        "status_raw": info["status_raw"],
        "status_label": info["status_label"],
        "pago": pago,
        "checkout_visualizado": cobranca.checkout_visualizado,
        "checkout_visualizado_em": cobranca.checkout_visualizado_em,
        "data_pagamento": info.get("data_pagamento"),
        "data_credito": info.get("data_credito"),
        "fatura_url": info.get("fatura_url"),
        "billing_type": info.get("billing_type"),
        "net_value": info.get("net_value"),
        "sincronizado_em": cobranca.asaas_sincronizado_em,
    }
