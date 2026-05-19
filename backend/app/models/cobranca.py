from sqlalchemy import String, Numeric, Date, DateTime, Text, ForeignKey, Boolean, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from typing import Optional, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.negociacao import Negociacao


class Cobranca(Base):
    __tablename__ = "cobrancas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    negociacao_id: Mapped[int] = mapped_column(ForeignKey("negociacoes.id"), index=True)
    divida_id: Mapped[int] = mapped_column(ForeignKey("dividas.id"), index=True)

    # pix | boleto | link_parcelado
    forma_pagamento: Mapped[str] = mapped_column(String(30))
    valor: Mapped[float] = mapped_column(Numeric(15, 2))
    data_vencimento: Mapped[date] = mapped_column(Date)
    numero_parcelas: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # pendente | aguardando_pagamento | pago | cancelado | expirado | erro
    status: Mapped[str] = mapped_column(String(30), default="pendente", index=True)

    # Asaas IDs
    asaas_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True, index=True)
    asaas_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    asaas_url_fatura: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # PIX
    pix_qr_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)       # base64 imagem
    pix_qr_code_imagem: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # alias explícito
    pix_copia_cola: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Boleto
    boleto_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    boleto_codigo: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    boleto_linha_digitavel: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    boleto_codigo_barras: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Link parcelado
    link_pagamento: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Conciliação
    data_pagamento_confirmado: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    forma_confirmacao: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    comprovante_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Envio
    enviado_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    enviado_email: Mapped[bool] = mapped_column(Boolean, default=False)
    canal_envio: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    data_envio: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Visualização (eventos Asaas)
    checkout_visualizado: Mapped[bool] = mapped_column(Boolean, default=False)
    checkout_visualizado_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Sync Asaas
    asaas_status_raw: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    asaas_sincronizado_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Erro
    erro_mensagem: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    negociacao: Mapped["Negociacao"] = relationship(back_populates="cobrancas")
