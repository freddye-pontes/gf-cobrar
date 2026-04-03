from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from datetime import date, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.models import Divida, Credor

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class KPIResponse(BaseModel):
    total_carteira: float
    recuperado_mes: float
    ptps_ativas: int
    sem_contato_d7: int
    tarefas_hoje: int
    taxa_recuperacao: float


class ChartPoint(BaseModel):
    mes: str
    recuperado: float
    carteira: float


@router.get("/kpis", response_model=KPIResponse)
def get_kpis(db: Session = Depends(get_db)):
    hoje = date.today()
    inicio_mes = hoje.replace(day=1)

    # Total em carteira (excluindo encerradas)
    total_carteira = (
        db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
        .filter(Divida.status != "encerrado")
        .scalar()
    ) or 0

    # Recuperado no mês (pagas este mês)
    recuperado_mes = (
        db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
        .filter(
            Divida.status == "pago",
            Divida.updated_at >= inicio_mes,
        )
        .scalar()
    ) or 0

    # PTPs ativas
    ptps_ativas = (
        db.query(func.count(Divida.id)).filter(Divida.status == "ptp_ativa").scalar()
    ) or 0

    # Sem contato D+7
    sem_contato_d7 = (
        db.query(func.count(Divida.id))
        .filter(
            Divida.status.notin_(["pago", "encerrado", "judicial"]),
            Divida.dias_sem_contato >= 7,
        )
        .scalar()
    ) or 0

    # Tarefas hoje = PTP vencendo hoje/amanhã + D+7 + negociando há +3 dias
    tarefas_hoje = (
        db.query(func.count(Divida.id))
        .filter(
            Divida.status.notin_(["pago", "encerrado"]),
            Divida.dias_sem_contato >= 1,
        )
        .scalar()
    ) or 0

    taxa = (float(recuperado_mes) / float(total_carteira) * 100) if total_carteira else 0

    return KPIResponse(
        total_carteira=float(total_carteira),
        recuperado_mes=float(recuperado_mes),
        ptps_ativas=int(ptps_ativas),
        sem_contato_d7=int(sem_contato_d7),
        tarefas_hoje=int(tarefas_hoje),
        taxa_recuperacao=round(taxa, 1),
    )


@router.get("/chart", response_model=list[ChartPoint])
def get_chart(db: Session = Depends(get_db)):
    """Returns recovery by month for the last 6 months."""
    hoje = date.today()
    result = []
    for i in range(5, -1, -1):
        # First day of month i months ago
        mes_ref = hoje.replace(day=1) - timedelta(days=30 * i)
        mes_ref = mes_ref.replace(day=1)
        proximo_mes = (mes_ref.replace(day=28) + timedelta(days=4)).replace(day=1)

        recuperado = (
            db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
            .filter(
                Divida.status == "pago",
                Divida.updated_at >= mes_ref,
                Divida.updated_at < proximo_mes,
            )
            .scalar()
        ) or 0

        carteira = (
            db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
            .filter(Divida.status != "encerrado")
            .scalar()
        ) or 0

        label = mes_ref.strftime("%b/%y").capitalize()
        result.append(ChartPoint(mes=label, recuperado=float(recuperado), carteira=float(carteira)))

    return result


@router.get("/status-carteira")
def status_carteira(db: Session = Depends(get_db)):
    """Count and total value per status."""
    rows = (
        db.query(
            Divida.status,
            func.count(Divida.id).label("count"),
            func.coalesce(func.sum(Divida.valor_atualizado), 0).label("total"),
        )
        .group_by(Divida.status)
        .all()
    )
    return [{"status": r.status, "count": r.count, "total": float(r.total)} for r in rows]
