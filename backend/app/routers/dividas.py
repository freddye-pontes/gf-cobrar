from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date

from app.database import get_db
from app.models import Divida, HistoricoContato, Devedor, Credor
from app.schemas.divida import (
    DividaCreate, DividaUpdate, DividaOut, DividaListOut,
    HistoricoContatoCreate, HistoricoContatoOut, StatusUpdate,
)

router = APIRouter(prefix="/dividas", tags=["dividas"])

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


def _build_list_out(d: Divida) -> DividaListOut:
    out = DividaListOut.model_validate(d)
    if d.devedor:
        out.devedor_nome = d.devedor.nome
        out.devedor_tipo = d.devedor.tipo
    if d.credor:
        out.credor_nome = d.credor.razao_social
    if d.historico:
        ultimo = max(d.historico, key=lambda h: h.data)
        out.ultimo_canal = ultimo.canal
    return out


def _build_full_out(d: Divida) -> DividaOut:
    out = DividaOut.model_validate(d)
    if d.devedor:
        out.devedor_nome = d.devedor.nome
        out.devedor_tipo = d.devedor.tipo
    if d.credor:
        out.credor_nome = d.credor.razao_social
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
    return [_build_list_out(d) for d in q.offset(skip).limit(limit).all()]


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
    return [_build_list_out(d) for d in dividas]


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
    return _build_full_out(d)


@router.post("/", response_model=DividaOut, status_code=status.HTTP_201_CREATED)
def criar_divida(payload: DividaCreate, db: Session = Depends(get_db)):
    devedor = db.query(Devedor).filter(Devedor.id == payload.devedor_id).first()
    credor = db.query(Credor).filter(Credor.id == payload.credor_id).first()
    if not devedor:
        raise HTTPException(status_code=404, detail="Devedor não encontrado")
    if not credor:
        raise HTTPException(status_code=404, detail="Credor não encontrado")

    d = Divida(**payload.model_dump())
    db.add(d)
    db.flush()

    # Auto-add system history record
    h = HistoricoContato(
        divida_id=d.id,
        data=date.today(),
        canal="sistema",
        resultado="Dívida importada ao sistema",
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

    d.status = payload.status
    d.acoes_recomendadas = STATUS_ACOES.get(payload.status, d.acoes_recomendadas)

    if payload.nota or payload.operador_nome:
        h = HistoricoContato(
            divida_id=d.id,
            data=date.today(),
            canal="sistema",
            resultado=payload.nota or f"Status alterado para {payload.status}",
            operador_nome=payload.operador_nome,
        )
        db.add(h)

    db.commit()
    db.refresh(d)
    return _build_full_out(d)


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
