from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Devedor
from app.schemas.devedor import DevedorCreate, DevedorUpdate, DevedorOut, EnderecoSchema

router = APIRouter(prefix="/devedores", tags=["devedores"])


def _to_out(m: Devedor) -> DevedorOut:
    return DevedorOut.from_orm_with_endereco(m)


@router.get("/buscar-documento/{cpf_cnpj}", response_model=DevedorOut)
def buscar_por_documento(cpf_cnpj: str, db: Session = Depends(get_db)):
    """Busca devedor por CPF/CNPJ (somente dígitos). Usado para autocomplete no NovaDividaModal."""
    digits = "".join(c for c in cpf_cnpj if c.isdigit())
    d = db.query(Devedor).filter(Devedor.cpf_cnpj == digits).first()
    if not d:
        raise HTTPException(status_code=404, detail="Devedor não encontrado")
    return _to_out(d)


@router.patch("/{devedor_id}/status-cadastro", response_model=DevedorOut)
def atualizar_status_cadastro(
    devedor_id: int,
    db: Session = Depends(get_db),
):
    """Marca o devedor como COMPLETO após o operador preencher dados faltantes."""
    d = db.query(Devedor).filter(Devedor.id == devedor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Devedor não encontrado")
    d.cadastro_status = "COMPLETO"
    db.commit()
    db.refresh(d)
    return _to_out(d)


@router.get("/", response_model=list[DevedorOut])
def listar_devedores(
    search: str | None = Query(None),
    perfil: str | None = Query(None),
    cadastro_status: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Devedor)
    if search:
        q = q.filter(Devedor.nome.ilike(f"%{search}%"))
    if perfil:
        q = q.filter(Devedor.perfil == perfil)
    if cadastro_status:
        q = q.filter(Devedor.cadastro_status == cadastro_status)
    return [_to_out(d) for d in q.order_by(Devedor.nome).offset(skip).limit(limit).all()]


@router.get("/{devedor_id}", response_model=DevedorOut)
def get_devedor(devedor_id: int, db: Session = Depends(get_db)):
    d = db.query(Devedor).filter(Devedor.id == devedor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Devedor não encontrado")
    return _to_out(d)


@router.post("/", response_model=DevedorOut, status_code=status.HTTP_201_CREATED)
def criar_devedor(payload: DevedorCreate, db: Session = Depends(get_db)):
    existe = db.query(Devedor).filter(Devedor.cpf_cnpj == payload.cpf_cnpj).first()
    if existe:
        raise HTTPException(status_code=409, detail="CPF/CNPJ já cadastrado")
    end = payload.endereco
    d = Devedor(
        nome=payload.nome,
        tipo=payload.tipo,
        cpf_cnpj=payload.cpf_cnpj,
        telefones=payload.telefones,
        email=payload.email,
        score_spc=payload.score_spc,
        perfil=payload.perfil,
        logradouro=end.logradouro if end else None,
        numero=end.numero if end else None,
        complemento=end.complemento if end else None,
        bairro=end.bairro if end else None,
        cidade=end.cidade if end else None,
        estado=end.estado if end else None,
        cep=end.cep if end else None,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _to_out(d)


@router.put("/{devedor_id}", response_model=DevedorOut)
def atualizar_devedor(devedor_id: int, payload: DevedorUpdate, db: Session = Depends(get_db)):
    d = db.query(Devedor).filter(Devedor.id == devedor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Devedor não encontrado")
    data = payload.model_dump(exclude_none=True)
    if "endereco" in data:
        end: EnderecoSchema = payload.endereco  # type: ignore
        for k in ("logradouro", "numero", "complemento", "bairro", "cidade", "estado", "cep"):
            setattr(d, k, getattr(end, k, None))
        del data["endereco"]
    for field, value in data.items():
        setattr(d, field, value)
    db.commit()
    db.refresh(d)
    return _to_out(d)
