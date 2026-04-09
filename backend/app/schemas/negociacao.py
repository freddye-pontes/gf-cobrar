from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional


class NegociacaoBase(BaseModel):
    divida_id: int
    tipo: str               # desconto | parcelamento | ptp
    valor_original: float
    valor_oferta: float
    desconto_percentual: Optional[float] = None
    numero_parcelas: Optional[int] = None
    valor_parcela: Optional[float] = None
    data_promessa: Optional[date] = None
    comissao_percentual: Optional[float] = None
    responsavel_nome: str
    notas: str = ""


class NegociacaoCreate(NegociacaoBase):
    pass


class NegociacaoUpdate(BaseModel):
    status: Optional[str] = None        # ativa | concluida | quebrada
    valor_oferta: Optional[float] = None
    desconto_percentual: Optional[float] = None
    numero_parcelas: Optional[int] = None
    valor_parcela: Optional[float] = None
    data_promessa: Optional[date] = None
    data_conclusao: Optional[date] = None
    notas: Optional[str] = None


class NegociacaoOut(NegociacaoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    data_conclusao: Optional[date]
    created_at: datetime
    updated_at: datetime

    # Joined
    devedor_nome: Optional[str] = None
    credor_nome: Optional[str] = None
    divida_status: Optional[str] = None
    devedor_tipo: Optional[str] = None
