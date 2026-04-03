from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date

from app.database import get_db
from app.models import Negociacao, Divida
from app.schemas.negociacao import NegociacaoCreate, NegociacaoUpdate, NegociacaoOut

router = APIRouter(prefix="/negociacoes", tags=["negociacoes"])


def _enrich(n: Negociacao) -> NegociacaoOut:
    out = NegociacaoOut.model_validate(n)
    if n.divida:
        out.divida_status = n.divida.status
        if n.divida.devedor:
            out.devedor_nome = n.divida.devedor.nome
            out.devedor_tipo = n.divida.devedor.tipo
        if n.divida.credor:
            out.credor_nome = n.divida.credor.razao_social
    return out


@router.get("/", response_model=list[NegociacaoOut])
def listar_negociacoes(
    status_filter: str | None = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = (
        db.query(Negociacao)
        .options(
            joinedload(Negociacao.divida)
            .joinedload(Divida.devedor),
            joinedload(Negociacao.divida)
            .joinedload(Divida.credor),
        )
        .order_by(Negociacao.updated_at.desc())
    )
    if status_filter:
        q = q.filter(Negociacao.status == status_filter)
    return [_enrich(n) for n in q.offset(skip).limit(limit).all()]


@router.get("/{neg_id}", response_model=NegociacaoOut)
def get_negociacao(neg_id: int, db: Session = Depends(get_db)):
    n = (
        db.query(Negociacao)
        .options(
            joinedload(Negociacao.divida).joinedload(Divida.devedor),
            joinedload(Negociacao.divida).joinedload(Divida.credor),
        )
        .filter(Negociacao.id == neg_id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Negociação não encontrada")
    return _enrich(n)


@router.post("/", response_model=NegociacaoOut, status_code=status.HTTP_201_CREATED)
def criar_negociacao(payload: NegociacaoCreate, db: Session = Depends(get_db)):
    divida = db.query(Divida).filter(Divida.id == payload.divida_id).first()
    if not divida:
        raise HTTPException(status_code=404, detail="Dívida não encontrada")

    # Enforce one active negotiation per divida
    existing = db.query(Negociacao).filter(
        Negociacao.divida_id == payload.divida_id,
        Negociacao.status == "ativa",
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Já existe uma negociação ativa para esta dívida")

    n = Negociacao(**payload.model_dump())
    db.add(n)

    # Transition divida status
    if divida.status == "em_aberto":
        divida.status = "em_negociacao" if payload.tipo != "ptp" else "ptp_ativa"

    db.commit()
    db.refresh(n)
    return _enrich(n)


@router.put("/{neg_id}", response_model=NegociacaoOut)
def atualizar_negociacao(neg_id: int, payload: NegociacaoUpdate, db: Session = Depends(get_db)):
    n = db.query(Negociacao).filter(Negociacao.id == neg_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Negociação não encontrada")

    updates = payload.model_dump(exclude_none=True)

    # When concluding, set date if not provided
    if updates.get("status") == "concluida" and not updates.get("data_conclusao"):
        updates["data_conclusao"] = date.today()

    for field, value in updates.items():
        setattr(n, field, value)

    # Sync divida status
    if "status" in updates:
        divida = db.query(Divida).filter(Divida.id == n.divida_id).first()
        if divida:
            if updates["status"] == "concluida":
                divida.status = "pago"
            elif updates["status"] == "quebrada":
                divida.status = "em_aberto"

    db.commit()
    db.refresh(n)
    return _enrich(n)
