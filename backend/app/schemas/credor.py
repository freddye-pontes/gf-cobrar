from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional


class FaixaAging(BaseModel):
    faixa: str          # baixa | media | alta | critica
    ate_dias: Optional[int] = None   # None = sem limite (última faixa)
    comissao: float


class CredorBase(BaseModel):
    razao_social: str
    cnpj: str
    pix_key: Optional[str] = ""
    contato_nome: Optional[str] = ""
    contato_email: Optional[str] = ""
    comissao_percentual: float = 0.0
    limite_desconto: float = 0.0
    observacao: Optional[str] = None
    ativo: bool = True
    regua_aging: Optional[list[FaixaAging]] = None


class CredorCreate(CredorBase):
    pass


class CredorUpdate(BaseModel):
    razao_social: Optional[str] = None
    cnpj: Optional[str] = None
    pix_key: Optional[str] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    comissao_percentual: Optional[float] = None
    limite_desconto: Optional[float] = None
    observacao: Optional[str] = None
    ativo: Optional[bool] = None
    regua_aging: Optional[list[FaixaAging]] = None


class CredorOut(CredorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    regua_aging: Optional[list] = None

    # Computed fields (calculated from dividas)
    total_carteira: float = 0.0
    total_recuperado: float = 0.0
    total_pendente: float = 0.0


class CredorListOut(BaseModel):
    """Version lighter for listings"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    razao_social: str
    cnpj: str
    comissao_percentual: float
    limite_desconto: float
    ativo: bool
    regua_aging: Optional[list] = None
    total_carteira: float = 0.0
    total_recuperado: float = 0.0
