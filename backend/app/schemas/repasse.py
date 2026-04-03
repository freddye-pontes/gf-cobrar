from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class RepasseCreate(BaseModel):
    credor_id: int
    valor_bruto: float
    comissao: float
    valor_liquido: float
    periodo: str
    dividas_ids: list[str] = []


class RepasseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    credor_id: int
    valor_bruto: float
    comissao: float
    valor_liquido: float
    periodo: str
    status: str
    dividas_ids: list[str]
    created_at: datetime
    executado_em: Optional[datetime]

    # Joined
    credor_nome: Optional[str] = None
