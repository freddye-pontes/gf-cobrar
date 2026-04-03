from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class EnderecoSchema(BaseModel):
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    cidade: str
    estado: str
    cep: str


class DevedorBase(BaseModel):
    nome: str
    tipo: str                       # PF | PJ
    cpf_cnpj: str
    telefones: list[str] = []
    email: Optional[str] = None
    endereco: EnderecoSchema
    score_spc: Optional[int] = None
    perfil: str = "varejo"          # B2B | varejo | recorrente


class DevedorCreate(DevedorBase):
    pass


class DevedorUpdate(BaseModel):
    nome: Optional[str] = None
    telefones: Optional[list[str]] = None
    email: Optional[str] = None
    endereco: Optional[EnderecoSchema] = None
    score_spc: Optional[int] = None
    perfil: Optional[str] = None


class DevedorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    tipo: str
    cpf_cnpj: str
    telefones: list[str]
    email: Optional[str]
    endereco: EnderecoSchema
    score_spc: Optional[int]
    perfil: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_with_endereco(cls, obj: object) -> "DevedorOut":
        """Build flat-to-nested endereco from ORM model."""
        from app.models.devedor import Devedor as DevedorModel
        m: DevedorModel = obj  # type: ignore
        return cls(
            id=m.id,
            nome=m.nome,
            tipo=m.tipo,
            cpf_cnpj=m.cpf_cnpj,
            telefones=m.telefones or [],
            email=m.email,
            endereco=EnderecoSchema(
                logradouro=m.logradouro,
                numero=m.numero,
                complemento=m.complemento,
                bairro=m.bairro,
                cidade=m.cidade,
                estado=m.estado,
                cep=m.cep,
            ),
            score_spc=m.score_spc,
            perfil=m.perfil,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
