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

    # pendente | aguardando_pagamento | pago | cancelado | expirado
    status: Mapped[str] = mapped_column(String(30), default="aguardando_pagamento", index=True)

    # PIX
    pix_qr_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pix_copia_cola: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Boleto
    boleto_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    boleto_codigo: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Link parcelado
    link_pagamento: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    numero_parcelas: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Conciliação
    data_pagamento_confirmado: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # automatica | manual | upload_comprovante
    forma_confirmacao: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    comprovante_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Envio
    enviado_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    enviado_email: Mapped[bool] = mapped_column(Boolean, default=False)
    canal_envio: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    data_envio: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    negociacao: Mapped["Negociacao"] = relationship(back_populates="cobrancas")
