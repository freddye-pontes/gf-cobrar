from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, Literal


class CobrancaCreate(BaseModel):
    negociacao_id: int
    divida_id: int
    forma_pagamento: Literal["pix", "boleto", "link_parcelado"]
    valor: float
    data_vencimento: date
    numero_parcelas: Optional[int] = None


class ConfirmarPagamentoPayload(BaseModel):
    data_pagamento: date
    forma_confirmacao: Literal["automatica", "manual", "upload_comprovante"]
    comprovante_url: Optional[str] = None


class CobrancaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negociacao_id: int
    divida_id: int
    forma_pagamento: str
    valor: float
    data_vencimento: date
    status: str
    pix_qr_code: Optional[str] = None
    pix_copia_cola: Optional[str] = None
    boleto_url: Optional[str] = None
    boleto_codigo: Optional[str] = None
    link_pagamento: Optional[str] = None
    numero_parcelas: Optional[int] = None
    data_pagamento_confirmado: Optional[date] = None
    forma_confirmacao: Optional[str] = None
    comprovante_url: Optional[str] = None
    enviado_whatsapp: bool
    enviado_email: bool
    canal_envio: Optional[str] = None
    data_envio: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
