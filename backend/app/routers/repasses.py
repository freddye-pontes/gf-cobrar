from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.database import get_db
from app.models import Repasse, Credor
from app.schemas.repasse import RepasseCreate, RepasseOut

router = APIRouter(prefix="/repasses", tags=["repasses"])


def _enrich(r: Repasse) -> RepasseOut:
    out = RepasseOut.model_validate(r)
    if r.credor:
        out.credor_nome = r.credor.razao_social
    return out


@router.get("/", response_model=list[RepasseOut])
def listar_repasses(
    credor_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = (
        db.query(Repasse)
        .options(joinedload(Repasse.credor))
        .order_by(Repasse.created_at.desc())
    )
    if credor_id:
        q = q.filter(Repasse.credor_id == credor_id)
    if status_filter:
        q = q.filter(Repasse.status == status_filter)
    return [_enrich(r) for r in q.offset(skip).limit(limit).all()]


@router.get("/{repasse_id}", response_model=RepasseOut)
def get_repasse(repasse_id: int, db: Session = Depends(get_db)):
    r = (
        db.query(Repasse)
        .options(joinedload(Repasse.credor))
        .filter(Repasse.id == repasse_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Repasse não encontrado")
    return _enrich(r)


@router.post("/", response_model=RepasseOut, status_code=status.HTTP_201_CREATED)
def criar_repasse(payload: RepasseCreate, db: Session = Depends(get_db)):
    from app.models.divida import Divida as DividaModel
    from sqlalchemy.orm import joinedload as jl

    credor = db.query(Credor).filter(Credor.id == payload.credor_id).first()
    if not credor:
        raise HTTPException(status_code=404, detail="Credor não encontrado")

    # Recalculate financials from dividas — do not trust frontend values
    divida_ids = [int(x) for x in (payload.dividas_ids or []) if str(x).isdigit()]
    dividas = (
        db.query(DividaModel)
        .options(jl(DividaModel.credor))
        .filter(DividaModel.id.in_(divida_ids))
        .all()
    ) if divida_ids else []

    valor_bruto = 0.0
    comissao_total = 0.0
    for d in dividas:
        base = float(d.valor_negociado or d.valor_atualizado)
        pct = float(d.comissao_percentual or (d.credor.comissao_percentual if d.credor else 0) or 0)
        comissao_total += round(base * (pct / 100), 2)
        valor_bruto += base

    valor_liquido = round(valor_bruto - comissao_total, 2)

    r = Repasse(
        credor_id=payload.credor_id,
        valor_bruto=valor_bruto,
        comissao=comissao_total,
        valor_liquido=valor_liquido,
        periodo=payload.periodo,
        dividas_ids=payload.dividas_ids,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _enrich(r)


@router.put("/{repasse_id}/aprovar", response_model=RepasseOut)
def aprovar_repasse(repasse_id: int, db: Session = Depends(get_db)):
    r = db.query(Repasse).filter(Repasse.id == repasse_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Repasse não encontrado")
    if r.status != "pendente":
        raise HTTPException(status_code=422, detail="Repasse não está pendente")
    r.status = "aprovado"
    db.commit()
    db.refresh(r)
    return _enrich(r)


@router.put("/{repasse_id}/executar", response_model=RepasseOut)
def executar_repasse(repasse_id: int, db: Session = Depends(get_db)):
    r = db.query(Repasse).filter(Repasse.id == repasse_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Repasse não encontrado")
    if r.status not in ("pendente", "aprovado"):
        raise HTTPException(status_code=422, detail="Repasse já foi executado")
    r.status = "executado"
    r.executado_em = datetime.now()
    db.commit()
    db.refresh(r)
    return _enrich(r)
