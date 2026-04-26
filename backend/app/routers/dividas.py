from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date

from app.database import get_db
from app.models import Divida, HistoricoContato, Devedor, Credor
from app.models.credor import REGUA_AGING_PADRAO
from app.schemas.divida import (
    DividaCreate, DividaUpdate, DividaOut, DividaListOut,
    HistoricoContatoCreate, HistoricoContatoOut, StatusUpdate,
)

router = APIRouter(prefix="/dividas", tags=["dividas"])


def _calcular_aging(
    data_vencimento: date,
    regua: list | None = None,
) -> tuple[int, str, float]:
    """Returns (dias_atraso, faixa_aging, comissao_sugerida).

    Uses credor-specific regua_aging if provided, otherwise falls back to
    REGUA_AGING_PADRAO. Each tier: {faixa, ate_dias (None = ∞), comissao}.
    """
    dias = (date.today() - data_vencimento).days
    if dias <= 0:
        return 0, "em_dia", 0.0

    tiers = regua if regua else REGUA_AGING_PADRAO
    for tier in sorted(tiers, key=lambda t: t.get("ate_dias") or 99999):
        ate = tier.get("ate_dias")
        if ate is None or dias <= ate:
            return dias, tier["faixa"], float(tier["comissao"])

    # fallback: last tier
    last = tiers[-1]
    return dias, last["faixa"], float(last["comissao"])

STATUS_TRANSITIONS = {
    "em_aberto": ["em_negociacao", "ptp_ativa", "pago", "judicial", "encerrado"],
    "em_negociacao": ["em_aberto", "ptp_ativa", "pago", "judicial", "encerrado"],
    "ptp_ativa": ["em_aberto", "em_negociacao", "pago", "judicial"],
    "pago": ["encerrado"],
    "judicial": ["encerrado", "em_negociacao"],
    "encerrado": [],
}

STATUS_ACOES = {
    "em_aberto": "Sem negociação ativa — contatar devedor",
    "em_negociacao": "Negociação em andamento — aguardar resposta",
    "ptp_ativa": "Promessa de pagamento ativa — confirmar no prazo",
    "pago": "Pagamento confirmado — calcular repasse ao credor",
    "judicial": "Encaminhado para cobrança judicial",
    "encerrado": "Dívida encerrada",
}


def _aplicar_aging(d: Divida, db: Session | None = None) -> tuple[int, str, float]:
    """Calculates aging using credor's regua_aging, persists comissao_percentual."""
    regua = d.credor.regua_aging if d.credor else None
    dias, faixa, comissao = _calcular_aging(d.data_vencimento, regua)
    # Persist the current applicable commission rate on the divida
    if db and d.status not in ("pago", "encerrado") and float(d.comissao_percentual or 0) != comissao:
        d.comissao_percentual = comissao
        db.add(d)
    return dias, faixa, comissao


def _build_list_out(d: Divida, db: Session | None = None) -> DividaListOut:
    out = DividaListOut.model_validate(d)
    if d.devedor:
        out.devedor_nome = d.devedor.nome
        out.devedor_tipo = d.devedor.tipo
    if d.credor:
        out.credor_nome = d.credor.razao_social
    if d.historico:
        ultimo = max(d.historico, key=lambda h: h.data)
        out.ultimo_canal = ultimo.canal
    out.dias_atraso, out.faixa_aging, out.comissao_sugerida = _aplicar_aging(d, db)
    if d.devedor:
        out.devedor_cadastro_status = d.devedor.cadastro_status
    return out


def _build_full_out(d: Divida, db: Session | None = None) -> DividaOut:
    out = DividaOut.model_validate(d)
    if d.devedor:
        out.devedor_nome = d.devedor.nome
        out.devedor_tipo = d.devedor.tipo
    if d.credor:
        out.credor_nome = d.credor.razao_social
    out.dias_atraso, out.faixa_aging, out.comissao_sugerida = _aplicar_aging(d, db)
    out.historico = [HistoricoContatoOut.model_validate(h) for h in d.historico]
    return out


@router.get("/", response_model=list[DividaListOut])
def listar_dividas(
    status_filter: str | None = Query(None, alias="status"),
    credor_id: int | None = Query(None),
    devedor_id: int | None = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = (
        db.query(Divida)
        .options(
            joinedload(Divida.devedor),
            joinedload(Divida.credor),
            joinedload(Divida.historico),
        )
        .order_by(Divida.dias_sem_contato.desc(), Divida.data_vencimento)
    )
    if status_filter:
        q = q.filter(Divida.status == status_filter)
    if credor_id:
        q = q.filter(Divida.credor_id == credor_id)
    if devedor_id:
        q = q.filter(Divida.devedor_id == devedor_id)
    items = q.offset(skip).limit(limit).all()
    result = [_build_list_out(d, db) for d in items]
    db.commit()
    return result


@router.get("/work-queue", response_model=list[DividaListOut])
def work_queue(db: Session = Depends(get_db)):
    """Returns prioritized work queue: PTPs today > D+7 > negotiating > new."""
    from sqlalchemy import case as sa_case
    today = date.today()

    priority = sa_case(
        (Divida.status == "ptp_ativa", 1),
        (Divida.dias_sem_contato >= 7, 2),
        (Divida.status == "em_negociacao", 3),
        (Divida.dias_sem_contato >= 3, 4),
        else_=5,
    )

    dividas = (
        db.query(Divida)
        .options(
            joinedload(Divida.devedor),
            joinedload(Divida.credor),
            joinedload(Divida.historico),
        )
        .filter(Divida.status.notin_(["pago", "encerrado", "judicial"]))
        .order_by(priority, Divida.valor_atualizado.desc())
        .limit(50)
        .all()
    )
    result = [_build_list_out(d, db) for d in dividas]
    db.commit()
    return result


@router.get("/{divida_id}", response_model=DividaOut)
def get_divida(divida_id: int, db: Session = Depends(get_db)):
    d = (
        db.query(Divida)
        .options(
            joinedload(Divida.devedor),
            joinedload(Divida.credor),
            joinedload(Divida.historico),
        )
        .filter(Divida.id == divida_id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    result = _build_full_out(d, db)
    db.commit()
    return result


@router.post("/", response_model=DividaOut, status_code=status.HTTP_201_CREATED)
def criar_divida(payload: DividaCreate, db: Session = Depends(get_db)):
    devedor = db.query(Devedor).filter(Devedor.id == payload.devedor_id).first()
    credor = db.query(Credor).filter(Credor.id == payload.credor_id).first()
    if not devedor:
        raise HTTPException(status_code=404, detail="Devedor não encontrado")
    if not credor:
        raise HTTPException(status_code=404, detail="Credor não encontrado")

    d = Divida(**payload.model_dump(), chave_divida="TMP")
    db.add(d)
    db.flush()

    d.chave_divida = f"GFD-{date.today().strftime('%Y%m%d')}-{d.id:06d}"

    # Set initial commission based on aging
    _, _, comissao = _calcular_aging(d.data_vencimento, credor.regua_aging if credor else None)
    d.comissao_percentual = comissao

    h = HistoricoContato(
        divida_id=d.id,
        data=date.today(),
        canal="sistema",
        resultado=f"Dívida criada no sistema. Chave: GFD-{date.today().strftime('%Y%m%d')}-{d.id:06d}",
    )
    db.add(h)
    db.commit()
    db.refresh(d)
    return _build_full_out(d)


@router.put("/{divida_id}/status", response_model=DividaOut)
def atualizar_status(divida_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    d = db.query(Divida).filter(Divida.id == divida_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")

    allowed = STATUS_TRANSITIONS.get(d.status, [])
    if payload.status not in allowed and payload.status != d.status:
        raise HTTPException(
            status_code=422,
            detail=f"Transição inválida: {d.status} → {payload.status}",
        )

    if payload.status == "ptp_ativa" and not payload.data_promessa_pagamento:
        raise HTTPException(status_code=422, detail="Data da promessa de pagamento é obrigatória para PTP Ativa.")

    d.status = payload.status
    d.acoes_recomendadas = STATUS_ACOES.get(payload.status, d.acoes_recomendadas)

    if payload.data_promessa_pagamento:
        d.data_promessa_pagamento = payload.data_promessa_pagamento
    if payload.status == "pago":
        d.data_pagamento_confirmado = payload.data_pagamento_confirmado or date.today()
        # Auto-calculate commission on payment
        pct = float(d.comissao_percentual or (d.credor.comissao_percentual if d.credor else 0) or 0)
        d.comissao_percentual = pct

    resultado_hist = payload.nota or f"Status alterado para {payload.status}"
    if payload.status == "ptp_ativa" and payload.data_promessa_pagamento:
        resultado_hist += f" — Promessa para {payload.data_promessa_pagamento.strftime('%d/%m/%Y')}"
    if payload.status == "pago" and d.data_pagamento_confirmado:
        resultado_hist += f" — Pago em {d.data_pagamento_confirmado.strftime('%d/%m/%Y')}"

    h = HistoricoContato(
        divida_id=d.id,
        data=date.today(),
        canal="sistema",
        resultado=resultado_hist,
        operador_nome=payload.operador_nome,
    )
    db.add(h)
    db.commit()
    db.refresh(d)
    return _build_full_out(d)


@router.delete("/{divida_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_divida(divida_id: int, db: Session = Depends(get_db)):
    d = db.query(Divida).filter(Divida.id == divida_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")
    db.delete(d)
    db.commit()


@router.post("/{divida_id}/historico", response_model=HistoricoContatoOut, status_code=201)
def registrar_contato(
    divida_id: int, payload: HistoricoContatoCreate, db: Session = Depends(get_db)
):
    d = db.query(Divida).filter(Divida.id == divida_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")

    contact_date = payload.data or date.today()
    h = HistoricoContato(
        divida_id=divida_id,
        data=contact_date,
        canal=payload.canal,
        resultado=payload.resultado,
        operador_nome=payload.operador_nome,
    )
    db.add(h)

    # Update dias_sem_contato and ultimo_contato
    d.ultimo_contato = contact_date
    d.dias_sem_contato = 0

    db.commit()
    db.refresh(h)
    return HistoricoContatoOut.model_validate(h)
