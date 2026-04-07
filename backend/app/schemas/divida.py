from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional


class HistoricoContatoCreate(BaseModel):
    canal: str          # whatsapp | email | telefone | sistema
    resultado: str
    operador_nome: Optional[str] = None
    data: Optional[date] = None  # default = today if None


class HistoricoContatoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    divida_id: int
    data: date
    canal: str
    resultado: str
    operador_nome: Optional[str]


class DividaBase(BaseModel):
    devedor_id: int
    credor_id: int
    valor_original: float
    valor_atualizado: float
    data_vencimento: date
    data_emissao: date
    tipo: str                           # boleto | contrato | cartao | servico
    status: str = "em_aberto"
    chave_externa: Optional[str] = None
    numero_contrato: Optional[str] = None
    acoes_recomendadas: str = ""


class DividaCreate(DividaBase):
    pass


class DividaUpdate(BaseModel):
    valor_atualizado: Optional[float] = None
    status: Optional[str] = None
    acoes_recomendadas: Optional[str] = None
    dias_sem_contato: Optional[int] = None
    ultimo_contato: Optional[date] = None


class StatusUpdate(BaseModel):
    status: str
    nota: Optional[str] = None
    operador_nome: Optional[str] = None


class DividaListOut(BaseModel):
    """Compact view for list pages."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    devedor_id: int
    credor_id: int
    valor_original: float
    valor_atualizado: float
    data_vencimento: date
    tipo: str
    status: str
    chave_externa: Optional[str] = None
    numero_contrato: Optional[str]
    dias_sem_contato: int
    ultimo_contato: Optional[date]
    acoes_recomendadas: str

    # Joined names (populated manually in router)
    devedor_nome: Optional[str] = None
    credor_nome: Optional[str] = None
    devedor_tipo: Optional[str] = None


class DividaOut(DividaListOut):
    """Full view with history."""
    data_emissao: date
    created_at: datetime
    historico: list[HistoricoContatoOut] = []
