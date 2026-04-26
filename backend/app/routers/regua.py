"""
Régua de Cobrança por Credor.

GET /regua/{credor_id}  — retorna etapas do credor (fallback: padrão)
PUT /regua/{credor_id}  — salva/substitui etapas do credor
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import Credor, ReguaEtapa

router = APIRouter(prefix="/regua", tags=["regua"])


# ── Etapas padrão (fallback quando credor não tem régua própria) ───────────────

ETAPAS_PADRAO = [
    {"dia": 0,  "acao": "Importação",        "canais": ["sistema"],    "descricao": "Dívida importada ao sistema e indexada na carteira",                          "automatico": True,  "ordem": 0},
    {"dia": 1,  "acao": "Primeiro Contato",  "canais": ["whatsapp"],   "descricao": "Template amigável com informações da dívida e link de negociação",            "automatico": False, "ordem": 1},
    {"dia": 3,  "acao": "Segundo Contato",   "canais": ["whatsapp", "email"], "descricao": "Mensagem de lembrete + e-mail com boleto ou link de pagamento",        "automatico": False, "ordem": 2},
    {"dia": 7,  "acao": "Contato por Ligação","canais": ["telefone"],  "descricao": "Dívida entra na fila de ligação do operador com prioridade alta",             "automatico": False, "ordem": 3},
    {"dia": 15, "acao": "Tentativa Alternativa","canais": ["telefone","whatsapp"],"descricao": "Tentar números alternativos + novo WhatsApp com tom mais formal",   "automatico": False, "ordem": 4},
    {"dia": 30, "acao": "Escalonamento",     "canais": ["escalamento"],"descricao": "Notificação extrajudicial por e-mail formal e encaminhamento para análise judicial","automatico": True,"ordem": 5},
]


# ── Schemas ────────────────────────────────────────────────────────────────────

class EtapaIn(BaseModel):
    dia: int
    acao: str
    canais: list[str]
    descricao: str = ""
    automatico: bool = False
    ordem: int = 0


class EtapaOut(EtapaIn):
    id: Optional[int] = None


class ReguaOut(BaseModel):
    credor_id: int
    personalizada: bool
    etapas: list[EtapaOut]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/{credor_id}", response_model=ReguaOut)
def get_regua(credor_id: int, db: Session = Depends(get_db)):
    credor = db.query(Credor).filter(Credor.id == credor_id).first()
    if not credor:
        raise HTTPException(404, "Credor não encontrado")

    etapas = db.query(ReguaEtapa).filter(ReguaEtapa.credor_id == credor_id).order_by(ReguaEtapa.ordem, ReguaEtapa.dia).all()

    if etapas:
        return ReguaOut(
            credor_id=credor_id,
            personalizada=True,
            etapas=[EtapaOut(id=e.id, dia=e.dia, acao=e.acao, canais=e.canais or [], descricao=e.descricao, automatico=e.automatico, ordem=e.ordem) for e in etapas],
        )

    return ReguaOut(
        credor_id=credor_id,
        personalizada=False,
        etapas=[EtapaOut(**e) for e in ETAPAS_PADRAO],
    )


@router.put("/{credor_id}", response_model=ReguaOut)
def salvar_regua(credor_id: int, etapas: list[EtapaIn], db: Session = Depends(get_db)):
    credor = db.query(Credor).filter(Credor.id == credor_id).first()
    if not credor:
        raise HTTPException(404, "Credor não encontrado")

    # Delete all existing steps for this creditor
    db.query(ReguaEtapa).filter(ReguaEtapa.credor_id == credor_id).delete()

    # Insert new steps
    novas = []
    for i, e in enumerate(sorted(etapas, key=lambda x: x.dia)):
        nova = ReguaEtapa(
            credor_id=credor_id,
            dia=e.dia,
            acao=e.acao,
            canais=e.canais,
            descricao=e.descricao,
            automatico=e.automatico,
            ordem=i,
        )
        db.add(nova)
        novas.append(nova)

    db.commit()
    for n in novas:
        db.refresh(n)

    return ReguaOut(
        credor_id=credor_id,
        personalizada=True,
        etapas=[EtapaOut(id=n.id, dia=n.dia, acao=n.acao, canais=n.canais or [], descricao=n.descricao, automatico=n.automatico, ordem=n.ordem) for n in novas],
    )
