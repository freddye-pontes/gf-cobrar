from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class EnderecoSchema(BaseModel):
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None


class DevedorBase(BaseModel):
    nome: str
    tipo: str                       # PF | PJ
    cpf_cnpj: str
    telefones: list[str] = []
    email: Optional[str] = None
    endereco: Optional[EnderecoSchema] = None
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
    cadastro_status: Optional[str] = None


class DevedorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    tipo: str
    cpf_cnpj: str
    telefones: list[str]
    email: Optional[str]
    endereco: Optional[EnderecoSchema] = None
    score_spc: Optional[int]
    perfil: str
    cadastro_status: str = "COMPLETO"
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
                logradouro=m.logradouro or None,
                numero=m.numero or None,
                complemento=m.complemento or None,
                bairro=m.bairro or None,
                cidade=m.cidade or None,
                estado=m.estado or None,
                cep=m.cep or None,
            ),
            score_spc=m.score_spc,
            perfil=m.perfil,
            cadastro_status=m.cadastro_status,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
