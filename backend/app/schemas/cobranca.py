from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, Literal


class CobrancaCreate(BaseModel):
    negociacao_id: int
    divida_id: int
    forma_pagamento: Literal["pix", "boleto", "link_parcelado"]
    valor: float
    data_vencimento: Optional[date] = None
    numero_parcelas: Optional[int] = None


class ConfirmarPagamentoPayload(BaseModel):
    data_pagamento: date
    forma_confirmacao: Literal["automatica", "manual", "upload_comprovante", "automatica_webhook"]
    comprovante_url: Optional[str] = None


class CobrancaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negociacao_id: int
    divida_id: int
    forma_pagamento: str
    valor: float
    data_vencimento: date
    numero_parcelas: Optional[int] = None
    status: str

    # Asaas
    asaas_id: Optional[str] = None
    asaas_payment_id: Optional[str] = None
    asaas_url_fatura: Optional[str] = None

    # PIX
    pix_qr_code: Optional[str] = None
    pix_qr_code_imagem: Optional[str] = None
    pix_copia_cola: Optional[str] = None

    # Boleto
    boleto_url: Optional[str] = None
    boleto_codigo: Optional[str] = None
    boleto_linha_digitavel: Optional[str] = None
    boleto_codigo_barras: Optional[str] = None

    # Link
    link_pagamento: Optional[str] = None

    # Conciliação
    data_pagamento_confirmado: Optional[date] = None
    forma_confirmacao: Optional[str] = None
    comprovante_url: Optional[str] = None

    # Envio
    enviado_whatsapp: bool = False
    enviado_email: bool = False
    canal_envio: Optional[str] = None
    data_envio: Optional[datetime] = None

    # Visualização Asaas
    checkout_visualizado: bool = False
    checkout_visualizado_em: Optional[datetime] = None
    asaas_status_raw: Optional[str] = None
    asaas_sincronizado_em: Optional[datetime] = None

    # Erro
    erro_mensagem: Optional[str] = None

    created_at: datetime
    updated_at: datetime
