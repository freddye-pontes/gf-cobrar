from sqlalchemy import String, Numeric, Integer, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from typing import Optional, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.divida import Divida
    from app.models.cobranca import Cobranca


class Negociacao(Base):
    __tablename__ = "negociacoes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    divida_id: Mapped[int] = mapped_column(ForeignKey("dividas.id"), unique=True, index=True)

    # desconto | parcelamento | ptp
    tipo: Mapped[str] = mapped_column(String(20))
    # ativa | concluida | quebrada
    status: Mapped[str] = mapped_column(String(20), default="ativa", index=True)
    # Status granular: ativa | em_contato | aguardando_pagamento | ptp_ativa | pago | quebrada | cancelada
    status_detalhe: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    valor_original: Mapped[float] = mapped_column(Numeric(15, 2))
    valor_oferta: Mapped[float] = mapped_column(Numeric(15, 2))
    desconto_percentual: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    numero_parcelas: Mapped[Optional[int]] = mapped_column(Integer)
    valor_parcela: Mapped[Optional[float]] = mapped_column(Numeric(15, 2))
    valor_entrada: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    data_promessa: Mapped[Optional[date]] = mapped_column(Date)
    data_promessa_ptp: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_conclusao: Mapped[Optional[date]] = mapped_column(Date)

    comissao_percentual: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    responsavel_nome: Mapped[str] = mapped_column(String(100))
    notas: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    divida: Mapped["Divida"] = relationship(back_populates="negociacao")
    cobrancas: Mapped[list["Cobranca"]] = relationship(
        back_populates="negociacao", cascade="all, delete-orphan"
    )
