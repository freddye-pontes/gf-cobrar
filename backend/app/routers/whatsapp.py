"""
WhatsApp via Evolution API.

POST /whatsapp/enviar/{divida_id}         — disparo manual de 1 dívida
POST /whatsapp/disparar-lote              — disparo em lote (régua automática)
GET  /whatsapp/status                     — status da instância conectada
GET  /whatsapp/historico/{divida_id}      — histórico de mensagens enviadas
"""
import os
import httpx
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.divida import Divida, HistoricoContato
from app.models.devedor import Devedor

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

EVOLUTION_URL = os.getenv("EVOLUTION_URL", "http://localhost:8080")
EVOLUTION_KEY = os.getenv("EVOLUTION_KEY", "gf-cobrar-evolution-key-2026")
EVOLUTION_INSTANCE = os.getenv("EVOLUTION_INSTANCE", "gf-cobrar-principal")


# ── Templates de mensagem ──────────────────────────────────────────────────────

def _formatar_valor(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _mensagem_primeiro_contato(devedor_nome: str, credor_nome: str, valor: float, chave: str) -> str:
    primeiro_nome = devedor_nome.split()[0].title()
    return (
        f"Olá, {primeiro_nome}! 👋\n\n"
        f"A *GF Recebíveis* entrou em contato a pedido de *{credor_nome}*.\n\n"
        f"Identificamos uma pendência financeira no valor de *{_formatar_valor(valor)}* "
        f"associada ao seu CPF/CNPJ.\n\n"
        f"📋 Referência: `{chave}`\n\n"
        f"Temos condições especiais de negociação disponíveis. "
        f"Responda *SIM* para saber mais ou *NÃO* caso já tenha regularizado. "
        f"Estamos aqui para ajudar! 🤝"
    )


def _mensagem_segundo_contato(devedor_nome: str, credor_nome: str, valor: float, chave: str) -> str:
    primeiro_nome = devedor_nome.split()[0].title()
    return (
        f"Oi, {primeiro_nome}! Aqui é da *GF Recebíveis* novamente. 📩\n\n"
        f"Ainda não recebemos seu retorno sobre a pendência com *{credor_nome}* "
        f"no valor de *{_formatar_valor(valor)}*.\n\n"
        f"💡 Podemos oferecer:\n"
        f"• Desconto à vista\n"
        f"• Parcelamento sem juros\n"
        f"• Negociação personalizada\n\n"
        f"Referência: `{chave}`\n\n"
        f"Responda *QUERO NEGOCIAR* e um operador entrará em contato. "
        f"Regularize agora e evite restrições no seu CPF! ✅"
    )


def _mensagem_lembrete_ptp(devedor_nome: str, valor: float, data_ptp: str) -> str:
    primeiro_nome = devedor_nome.split()[0].title()
    return (
        f"Olá, {primeiro_nome}! 📅\n\n"
        f"Este é um lembrete amigável da *GF Recebíveis*.\n\n"
        f"Você tem um compromisso de pagamento agendado para *{data_ptp}* "
        f"no valor de *{_formatar_valor(valor)}*.\n\n"
        f"Caso precise reagendar ou tenha dúvidas, responda esta mensagem. "
        f"Contamos com você! 💪"
    )


def _mensagem_escalamento(devedor_nome: str, credor_nome: str, valor: float, chave: str) -> str:
    primeiro_nome = devedor_nome.split()[0].title()
    return (
        f"⚠️ *Aviso Importante — GF Recebíveis*\n\n"
        f"{primeiro_nome}, esta é uma notificação extrajudicial referente à dívida "
        f"com *{credor_nome}* no valor de *{_formatar_valor(valor)}*.\n\n"
        f"Referência: `{chave}`\n\n"
        f"A ausência de regularização resultará no encaminhamento para análise judicial "
        f"e restrição definitiva em órgãos de proteção ao crédito.\n\n"
        f"⏰ Entre em contato *agora* para evitar medidas adicionais.\n"
        f"Responda *NEGOCIAR* para falar com um especialista."
    )


TEMPLATES = {
    "primeiro_contato": _mensagem_primeiro_contato,
    "segundo_contato": _mensagem_segundo_contato,
    "escalamento": _mensagem_escalamento,
}


# ── Evolution API client ───────────────────────────────────────────────────────

def _headers():
    return {"apikey": EVOLUTION_KEY, "Content-Type": "application/json"}


def _limpar_telefone(telefone: str) -> str:
    digits = "".join(c for c in telefone if c.isdigit())
    if not digits.startswith("55"):
        digits = "55" + digits
    return digits + "@s.whatsapp.net"


def _enviar_whatsapp(numero: str, mensagem: str) -> dict:
    numero_fmt = _limpar_telefone(numero)
    payload = {
        "number": numero_fmt,
        "options": {"delay": 1200, "presence": "composing"},
        "textMessage": {"text": mensagem},
    }
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{EVOLUTION_URL}/message/sendText/{EVOLUTION_INSTANCE}",
            json=payload,
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


# ── Schemas ────────────────────────────────────────────────────────────────────

class EnviarRequest(BaseModel):
    template: str = "primeiro_contato"  # primeiro_contato | segundo_contato | escalamento
    numero_override: Optional[str] = None  # força número diferente


class DisparoLoteRequest(BaseModel):
    credor_id: Optional[int] = None
    template: str = "primeiro_contato"
    status_filtro: str = "em_aberto"   # em_aberto | ptp_ativa | em_negociacao
    limite: int = 50


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
def status_instancia():
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                f"{EVOLUTION_URL}/instance/connectionState/{EVOLUTION_INSTANCE}",
                headers=_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "conectado": data.get("instance", {}).get("state") == "open",
                "estado": data.get("instance", {}).get("state"),
                "instancia": EVOLUTION_INSTANCE,
            }
    except Exception as e:
        return {"conectado": False, "estado": "erro", "detalhe": str(e)}


@router.post("/enviar/{divida_id}")
def enviar_mensagem(
    divida_id: int,
    body: EnviarRequest,
    db: Session = Depends(get_db),
):
    divida = (
        db.query(Divida)
        .options(joinedload(Divida.devedor), joinedload(Divida.credor))
        .filter(Divida.id == divida_id)
        .first()
    )
    if not divida:
        raise HTTPException(404, "Dívida não encontrada")

    devedor = divida.devedor
    telefone = body.numero_override or (devedor.telefones[0] if devedor.telefones else None)
    if not telefone:
        raise HTTPException(400, "Devedor não possui telefone cadastrado")

    template_fn = TEMPLATES.get(body.template)
    if not template_fn:
        raise HTTPException(400, f"Template '{body.template}' não existe")

    credor_nome = divida.credor.razao_social if divida.credor else "Credor"
    mensagem = template_fn(
        devedor.nome,
        credor_nome,
        float(divida.valor_atualizado),
        divida.chave_divida,
    )

    try:
        resultado = _enviar_whatsapp(telefone, mensagem)
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"Erro Evolution API: {e.response.text}")
    except Exception as e:
        raise HTTPException(502, f"Falha ao enviar: {str(e)}")

    # Registra no histórico
    historico = HistoricoContato(
        divida_id=divida_id,
        data=date.today(),
        canal="whatsapp",
        resultado=f"[{body.template}] Enviado para {telefone}. msgId={resultado.get('key', {}).get('id', '')}",
        operador_nome="Sistema",
    )
    db.add(historico)
    divida.ultimo_contato = date.today()
    db.commit()

    return {
        "ok": True,
        "divida_id": divida_id,
        "devedor": devedor.nome,
        "telefone": telefone,
        "template": body.template,
        "evolution_response": resultado,
    }


def _processar_divida_background(divida_id: int, template: str, db_url: str):
    """Executa envio em background para não bloquear o endpoint de lote."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        divida = (
            db.query(Divida)
            .options(joinedload(Divida.devedor), joinedload(Divida.credor))
            .filter(Divida.id == divida_id)
            .first()
        )
        if not divida or not divida.devedor or not divida.devedor.telefones:
            return

        telefone = divida.devedor.telefones[0]
        template_fn = TEMPLATES.get(template)
        if not template_fn:
            return

        credor_nome = divida.credor.razao_social if divida.credor else "Credor"
        mensagem = template_fn(
            divida.devedor.nome,
            credor_nome,
            float(divida.valor_atualizado),
            divida.chave_divida,
        )
        resultado = _enviar_whatsapp(telefone, mensagem)

        historico = HistoricoContato(
            divida_id=divida_id,
            data=date.today(),
            canal="whatsapp",
            resultado=f"[{template}] lote. msgId={resultado.get('key', {}).get('id', '')}",
            operador_nome="Sistema",
        )
        db.add(historico)
        divida.ultimo_contato = date.today()
        db.commit()
    except Exception:
        pass
    finally:
        db.close()


@router.post("/disparar-lote")
def disparar_lote(
    body: DisparoLoteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    q = (
        db.query(Divida)
        .options(joinedload(Divida.devedor))
        .filter(Divida.status == body.status_filtro)
    )
    if body.credor_id:
        q = q.filter(Divida.credor_id == body.credor_id)

    dividas = q.limit(body.limite).all()

    agendados = []
    ignorados = []
    for d in dividas:
        if not d.devedor or not d.devedor.telefones:
            ignorados.append({"id": d.id, "motivo": "sem telefone"})
            continue
        from app.database import DATABASE_URL
        background_tasks.add_task(
            _processar_divida_background, d.id, body.template, DATABASE_URL
        )
        agendados.append({"id": d.id, "devedor": d.devedor.nome})

    return {
        "ok": True,
        "template": body.template,
        "agendados": len(agendados),
        "ignorados": len(ignorados),
        "detalhes_agendados": agendados,
        "detalhes_ignorados": ignorados,
    }


@router.get("/historico/{divida_id}")
def historico_mensagens(divida_id: int, db: Session = Depends(get_db)):
    registros = (
        db.query(HistoricoContato)
        .filter(
            HistoricoContato.divida_id == divida_id,
            HistoricoContato.canal == "whatsapp",
        )
        .order_by(HistoricoContato.data.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "data": r.data.isoformat() if r.data else None,
            "resultado": r.resultado,
            "operador": r.operador_nome,
        }
        for r in registros
    ]
