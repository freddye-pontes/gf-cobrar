from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.database import get_db
from app.models import Credor, Divida
from app.schemas.credor import CredorCreate, CredorUpdate, CredorOut, CredorListOut

router = APIRouter(prefix="/credores", tags=["credores"])


def _enrich(credor: Credor, db: Session) -> dict:
    """Calculates totals from dividas."""
    rows = (
        db.query(
            func.coalesce(func.sum(Divida.valor_atualizado), 0).label("total"),
            func.coalesce(
                func.sum(
                    case((Divida.status == "pago", Divida.valor_atualizado), else_=0)
                ),
                0,
            ).label("recuperado"),
        )
        .filter(Divida.credor_id == credor.id)
        .one()
    )
    return {
        "total_carteira": float(rows.total),
        "total_recuperado": float(rows.recuperado),
        "total_pendente": float(rows.total) - float(rows.recuperado),
    }


@router.get("/", response_model=list[CredorListOut])
def listar_credores(db: Session = Depends(get_db)):
    credores = db.query(Credor).order_by(Credor.razao_social).all()
    result = []
    for c in credores:
        totals = _enrich(c, db)
        data = CredorListOut.model_validate(c)
        data.total_carteira = totals["total_carteira"]
        data.total_recuperado = totals["total_recuperado"]
        result.append(data)
    return result


@router.get("/{credor_id}", response_model=CredorOut)
def get_credor(credor_id: int, db: Session = Depends(get_db)):
    credor = db.query(Credor).filter(Credor.id == credor_id).first()
    if not credor:
        raise HTTPException(status_code=404, detail="Credor não encontrado")
    totals = _enrich(credor, db)
    data = CredorOut.model_validate(credor)
    data.total_carteira = totals["total_carteira"]
    data.total_recuperado = totals["total_recuperado"]
    data.total_pendente = totals["total_pendente"]
    return data


@router.post("/", response_model=CredorOut, status_code=status.HTTP_201_CREATED)
def criar_credor(payload: CredorCreate, db: Session = Depends(get_db)):
    existe = db.query(Credor).filter(Credor.cnpj == payload.cnpj).first()
    if existe:
        raise HTTPException(status_code=409, detail="CNPJ já cadastrado")
    credor = Credor(**payload.model_dump())
    db.add(credor)
    db.commit()
    db.refresh(credor)
    data = CredorOut.model_validate(credor)
    data.total_carteira = 0.0
    data.total_recuperado = 0.0
    data.total_pendente = 0.0
    return data


@router.put("/{credor_id}", response_model=CredorOut)
def atualizar_credor(credor_id: int, payload: CredorUpdate, db: Session = Depends(get_db)):
    credor = db.query(Credor).filter(Credor.id == credor_id).first()
    if not credor:
        raise HTTPException(status_code=404, detail="Credor não encontrado")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(credor, field, value)
    db.commit()
    db.refresh(credor)
    totals = _enrich(credor, db)
    data = CredorOut.model_validate(credor)
    data.total_carteira = totals["total_carteira"]
    data.total_recuperado = totals["total_recuperado"]
    data.total_pendente = totals["total_pendente"]
    return data
