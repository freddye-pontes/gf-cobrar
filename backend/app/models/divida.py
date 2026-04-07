from sqlalchemy import (
    String, Integer, Numeric, Date, DateTime, Text,
    ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from typing import Optional, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.devedor import Devedor
    from app.models.credor import Credor
    from app.models.negociacao import Negociacao


class Divida(Base):
    __tablename__ = "dividas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    devedor_id: Mapped[int] = mapped_column(ForeignKey("devedores.id"), index=True)
    credor_id: Mapped[int] = mapped_column(ForeignKey("credores.id"), index=True)

    valor_original: Mapped[float] = mapped_column(Numeric(15, 2))
    valor_atualizado: Mapped[float] = mapped_column(Numeric(15, 2))
    data_vencimento: Mapped[date] = mapped_column(Date, index=True)
    data_emissao: Mapped[date] = mapped_column(Date)

    # boleto | contrato | cartao | servico
    tipo: Mapped[str] = mapped_column(String(20))
    # em_aberto | em_negociacao | ptp_ativa | pago | judicial | encerrado
    status: Mapped[str] = mapped_column(String(20), default="em_aberto", index=True)

    chave_externa: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    numero_contrato: Mapped[Optional[str]] = mapped_column(String(100))
    dias_sem_contato: Mapped[int] = mapped_column(Integer, default=0)
    ultimo_contato: Mapped[Optional[date]] = mapped_column(Date)
    acoes_recomendadas: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    devedor: Mapped["Devedor"] = relationship(back_populates="dividas")
    credor: Mapped["Credor"] = relationship(back_populates="dividas")
    historico: Mapped[list["HistoricoContato"]] = relationship(
        back_populates="divida",
        order_by="HistoricoContato.data",
        cascade="all, delete-orphan",
    )
    negociacao: Mapped[Optional["Negociacao"]] = relationship(
        back_populates="divida", uselist=False
    )


class HistoricoContato(Base):
    __tablename__ = "historico_contatos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    divida_id: Mapped[int] = mapped_column(ForeignKey("dividas.id"), index=True)

    data: Mapped[date] = mapped_column(Date, index=True)
    # whatsapp | email | telefone | sistema
    canal: Mapped[str] = mapped_column(String(20))
    resultado: Mapped[str] = mapped_column(Text)
    operador_nome: Mapped[Optional[str]] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationship
    divida: Mapped["Divida"] = relationship(back_populates="historico")
