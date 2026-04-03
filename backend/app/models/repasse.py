from sqlalchemy import String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.credor import Credor


class Repasse(Base):
    __tablename__ = "repasses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    credor_id: Mapped[int] = mapped_column(ForeignKey("credores.id"), index=True)

    valor_bruto: Mapped[float] = mapped_column(Numeric(15, 2))
    comissao: Mapped[float] = mapped_column(Numeric(15, 2))
    valor_liquido: Mapped[float] = mapped_column(Numeric(15, 2))

    periodo: Mapped[str] = mapped_column(String(100))
    # pendente | aprovado | executado
    status: Mapped[str] = mapped_column(String(20), default="pendente", index=True)

    # IDs das dívidas incluídas neste lote (armazenados como array de inteiros)
    dividas_ids: Mapped[list] = mapped_column(ARRAY(String), default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    executado_em: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationship
    credor: Mapped["Credor"] = relationship(back_populates="repasses")
