from sqlalchemy import String, Numeric, Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.divida import Divida
    from app.models.repasse import Repasse


class Credor(Base):
    __tablename__ = "credores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    razao_social: Mapped[str] = mapped_column(String(200))
    cnpj: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    pix_key: Mapped[Optional[str]] = mapped_column(String(200), default="")
    contato_nome: Mapped[Optional[str]] = mapped_column(String(200), default="")
    contato_email: Mapped[Optional[str]] = mapped_column(String(200), default="")
    comissao_percentual: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    limite_desconto: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    dividas: Mapped[list["Divida"]] = relationship(back_populates="credor")
    repasses: Mapped[list["Repasse"]] = relationship(back_populates="credor")
