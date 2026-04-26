from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from datetime import date, timedelta
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Divida, Credor
from app.models.devedor import Devedor
from app.models.negociacao import Negociacao
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class TrendInfo(BaseModel):
    value: str          # e.g. "+12%" or "-5%"
    positive: bool


class KPIResponse(BaseModel):
    total_carteira: float
    recuperado_mes: float
    ptps_ativas: int
    sem_contato_d7: int
    tarefas_hoje: int
    taxa_recuperacao: float
    # Trends
    trend_recuperado: Optional[TrendInfo] = None
    trend_carteira: Optional[TrendInfo] = None
    # PTP conversion
    ptps_quebradas_pct: Optional[float] = None   # % de PTPs quebradas


class ChartPoint(BaseModel):
    mes: str
    recuperado: float
    carteira: float


class AgingBucket(BaseModel):
    faixa: str          # "1-30d", "31-90d", "91-180d", "+180d"
    label: str          # "Baixa", "Média", "Alta", "Crítica"
    comissao: float     # 10, 15, 25, 30
    count: int
    total: float


def _mes_range(hoje: date, meses_atras: int):
    """Returns (start, end) for a given month offset."""
    d = hoje.replace(day=1)
    for _ in range(meses_atras):
        d = (d - timedelta(days=1)).replace(day=1)
    fim = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return d, fim


@router.get("/kpis", response_model=KPIResponse)
def get_kpis(db: Session = Depends(get_db)):
    hoje = date.today()
    inicio_mes, fim_mes = _mes_range(hoje, 0)
    inicio_mes_ant, fim_mes_ant = _mes_range(hoje, 1)

    # ── Total em carteira ─────────────────────────────────────────────────────
    total_carteira = float(
        db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
        .filter(Divida.status.notin_(["encerrado", "pago"]))
        .scalar() or 0
    )

    # Carteira mês anterior (snapshot approximation: same query)
    total_carteira_ant = float(
        db.query(func.coalesce(func.sum(Divida.valor_original), 0))
        .filter(Divida.created_at < fim_mes_ant)
        .scalar() or 0
    )

    # ── Recuperado este mês ───────────────────────────────────────────────────
    recuperado_mes = float(
        db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
        .filter(Divida.status == "pago", Divida.updated_at >= inicio_mes)
        .scalar() or 0
    )

    recuperado_mes_ant = float(
        db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
        .filter(
            Divida.status == "pago",
            Divida.updated_at >= inicio_mes_ant,
            Divida.updated_at < fim_mes_ant,
        )
        .scalar() or 0
    )

    # ── PTPs ──────────────────────────────────────────────────────────────────
    ptps_ativas = int(
        db.query(func.count(Divida.id)).filter(Divida.status == "ptp_ativa").scalar() or 0
    )

    # PTP quebra rate: negociações quebradas / (quebradas + concluidas)
    neg_quebradas = int(
        db.query(func.count(Negociacao.id)).filter(Negociacao.status == "quebrada").scalar() or 0
    )
    neg_total_finalizadas = int(
        db.query(func.count(Negociacao.id))
        .filter(Negociacao.status.in_(["quebrada", "concluida"]))
        .scalar() or 0
    )
    ptps_quebradas_pct = (
        round(neg_quebradas / neg_total_finalizadas * 100, 1) if neg_total_finalizadas else None
    )

    # ── Sem contato D+7 ───────────────────────────────────────────────────────
    sem_contato_d7 = int(
        db.query(func.count(Divida.id))
        .filter(
            Divida.status.notin_(["pago", "encerrado", "judicial"]),
            Divida.dias_sem_contato >= 7,
        )
        .scalar() or 0
    )

    # ── Tarefas hoje ──────────────────────────────────────────────────────────
    tarefas_hoje = int(
        db.query(func.count(Divida.id))
        .filter(
            Divida.status.notin_(["pago", "encerrado"]),
            Divida.dias_sem_contato >= 1,
        )
        .scalar() or 0
    )

    taxa = round(recuperado_mes / total_carteira * 100, 1) if total_carteira else 0.0

    # ── Trends ────────────────────────────────────────────────────────────────
    def calc_trend(current: float, previous: float, positive_is_up: bool = True) -> Optional[TrendInfo]:
        if previous == 0:
            return None
        pct = (current - previous) / previous * 100
        sign = "+" if pct >= 0 else ""
        return TrendInfo(
            value=f"{sign}{pct:.1f}%",
            positive=(pct >= 0) == positive_is_up,
        )

    trend_recuperado = calc_trend(recuperado_mes, recuperado_mes_ant, positive_is_up=True)
    trend_carteira = calc_trend(total_carteira, total_carteira_ant, positive_is_up=False)

    return KPIResponse(
        total_carteira=total_carteira,
        recuperado_mes=recuperado_mes,
        ptps_ativas=ptps_ativas,
        sem_contato_d7=sem_contato_d7,
        tarefas_hoje=tarefas_hoje,
        taxa_recuperacao=taxa,
        trend_recuperado=trend_recuperado,
        trend_carteira=trend_carteira,
        ptps_quebradas_pct=ptps_quebradas_pct,
    )


@router.get("/chart", response_model=list[ChartPoint])
def get_chart(db: Session = Depends(get_db)):
    """Returns recovery by month for the last 6 months."""
    hoje = date.today()
    result = []
    for i in range(5, -1, -1):
        inicio, fim = _mes_range(hoje, i)

        recuperado = float(
            db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
            .filter(Divida.status == "pago", Divida.updated_at >= inicio, Divida.updated_at < fim)
            .scalar() or 0
        )

        carteira = float(
            db.query(func.coalesce(func.sum(Divida.valor_atualizado), 0))
            .filter(Divida.status != "encerrado")
            .scalar() or 0
        )

        label = inicio.strftime("%b/%y").capitalize()
        result.append(ChartPoint(mes=label, recuperado=recuperado, carteira=carteira))

    return result


@router.get("/status-carteira")
def status_carteira(db: Session = Depends(get_db)):
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


@router.get("/aging", response_model=list[AgingBucket])
def get_aging(db: Session = Depends(get_db)):
    """Debt aging by days overdue (data_vencimento vs today)."""
    hoje = date.today()

    # (faixa_label, label, comissao_pct, min_days_overdue, max_days_overdue)
    buckets = [
        ("1-30d",   "Baixa",   10.0,  1,   30),
        ("31-90d",  "Média",   15.0,  31,  90),
        ("91-180d", "Alta",    25.0,  91,  180),
        ("+180d",   "Crítica", 30.0,  181, 99999),
    ]

    result = []
    for faixa, label, comissao, min_d, max_d in buckets:
        # Convert day range to vencimento date range:
        # dias_vencido = hoje - data_vencimento
        # min_d <= dias_vencido → data_vencimento <= hoje - min_d
        # dias_vencido <= max_d → data_vencimento >= hoje - max_d
        max_venc = hoje - timedelta(days=min_d)
        q = db.query(
            func.count(Divida.id).label("count"),
            func.coalesce(func.sum(Divida.valor_atualizado), 0).label("total"),
        ).filter(
            Divida.status.notin_(["pago", "encerrado"]),
            Divida.data_vencimento <= max_venc,
        )
        if max_d < 99999:
            min_venc = hoje - timedelta(days=max_d)
            q = q.filter(Divida.data_vencimento >= min_venc)

        row = q.first()
        result.append(AgingBucket(
            faixa=faixa,
            label=label,
            comissao=comissao,
            count=row.count if row else 0,
            total=float(row.total) if row else 0.0,
        ))

    return result


@router.get("/alertas/ptp")
def alertas_ptp(db: Session = Depends(get_db)):
    """Returns PTPs with past or today's promise date and no confirmed payment."""
    hoje = date.today()
    dividas = (
        db.query(Divida)
        .options(joinedload(Divida.devedor), joinedload(Divida.credor))
        .filter(
            Divida.status == "ptp_ativa",
            Divida.data_promessa_pagamento <= hoje,
            Divida.data_pagamento_confirmado == None,
        )
        .order_by(Divida.data_promessa_pagamento)
        .all()
    )
    return [
        {
            "id": d.id,
            "chave_divida": d.chave_divida,
            "devedor_nome": d.devedor.nome if d.devedor else "",
            "credor_nome": d.credor.razao_social if d.credor else "",
            "valor_atualizado": float(d.valor_atualizado),
            "data_promessa_pagamento": d.data_promessa_pagamento.isoformat() if d.data_promessa_pagamento else None,
            "vencida": d.data_promessa_pagamento < hoje if d.data_promessa_pagamento else False,
        }
        for d in dividas
    ]
