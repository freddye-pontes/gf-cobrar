from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.divida import Divida


class Devedor(Base):
    __tablename__ = "devedores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), index=True)
    tipo: Mapped[str] = mapped_column(String(2))          # PF | PJ
    cpf_cnpj: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    telefones: Mapped[list] = mapped_column(ARRAY(String), default=list)
    email: Mapped[Optional[str]] = mapped_column(String(200))

    # Endereço (desnormalizado para simplicidade MVP)
    logradouro: Mapped[str] = mapped_column(String(200), default="")
    numero: Mapped[str] = mapped_column(String(20), default="")
    complemento: Mapped[Optional[str]] = mapped_column(String(100))
    bairro: Mapped[str] = mapped_column(String(100), default="")
    cidade: Mapped[str] = mapped_column(String(100), default="")
    estado: Mapped[str] = mapped_column(String(2), default="")
    cep: Mapped[str] = mapped_column(String(10), default="")

    cadastro_status: Mapped[str] = mapped_column(String(30), default="COMPLETO")  # COMPLETO | CADASTRO_INCOMPLETO

    score_spc: Mapped[Optional[int]] = mapped_column(Integer)
    perfil: Mapped[str] = mapped_column(String(20), default="varejo")  # B2B | varejo | recorrente

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    dividas: Mapped[list["Divida"]] = relationship(back_populates="devedor")
