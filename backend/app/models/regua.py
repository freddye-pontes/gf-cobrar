from sqlalchemy import String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.credor import Credor


class ReguaEtapa(Base):
    __tablename__ = "regua_etapas"

    id: Mapped[int] = mapped_column(primary_key=True)
    credor_id: Mapped[int] = mapped_column(ForeignKey("credores.id", ondelete="CASCADE"), index=True)
    dia: Mapped[int]
    acao: Mapped[str] = mapped_column(String(100))
    canais: Mapped[list] = mapped_column(ARRAY(String), default=list)
    descricao: Mapped[str] = mapped_column(Text, default="")
    automatico: Mapped[bool] = mapped_column(Boolean, default=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)

    credor: Mapped["Credor"] = relationship(back_populates="regua_etapas")
