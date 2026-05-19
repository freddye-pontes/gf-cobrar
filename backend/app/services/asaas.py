"""
Integração com a API Asaas.
Documentação: https://docs.asaas.com/
"""
import httpx
from typing import Optional
from app.core.config import settings


class AsaasError(Exception):
    def __init__(self, message: str, errors: list | None = None):
        self.message = message
        self.errors = errors or []
        super().__init__(message)


def _headers() -> dict:
    return {
        "accept": "application/json",
        "content-type": "application/json",
        "access_token": settings.ASAAS_API_KEY,
    }


def _client() -> httpx.Client:
    return httpx.Client(base_url=settings.ASAAS_BASE_URL, headers=_headers(), timeout=30)


def _check(resp: httpx.Response) -> dict:
    if resp.status_code >= 400:
        errors_list = []
        msg = f"Erro HTTP {resp.status_code}"
        try:
            body = resp.json()
            errors_list = body.get("errors", [])
            if errors_list:
                msg = errors_list[0].get("description", str(errors_list[0]))
            elif body.get("message"):
                msg = body["message"]
            elif body.get("detail"):
                msg = body["detail"]
            else:
                msg = resp.text[:200]
        except Exception:
            msg = resp.text[:200]
        raise AsaasError(message=msg, errors=errors_list)
    try:
        return resp.json()
    except Exception:
        return {}


# ── Clientes ──────────────────────────────────────────────────────────────────

def buscar_ou_criar_cliente(
    nome: str,
    cpf_cnpj: str,
    email: Optional[str] = None,
    telefone: Optional[str] = None,
    cep: Optional[str] = None,
) -> str:
    """Retorna o customer_id Asaas, criando o cliente se não existir."""
    digits = "".join(c for c in (cpf_cnpj or "") if c.isdigit())
    with _client() as c:
        resp = c.get("/customers", params={"cpfCnpj": digits, "limit": 1})
        body = _check(resp)
        if body.get("data"):
            return body["data"][0]["id"]

        payload: dict = {"name": nome, "cpfCnpj": digits}
        if email:
            payload["email"] = email
        if telefone:
            digits_tel = "".join(x for x in telefone if x.isdigit())
            payload["mobilePhone"] = digits_tel
        if cep:
            payload["postalCode"] = "".join(x for x in cep if x.isdigit())

        resp = c.post("/customers", json=payload)
        data = _check(resp)
        return data["id"]


# ── Cobranças ─────────────────────────────────────────────────────────────────

def criar_cobranca_pix(
    customer_id: str,
    valor: float,
    descricao: str,
    chave_divida: str,
    data_vencimento: str,  # YYYY-MM-DD
) -> dict:
    with _client() as c:
        payload = {
            "customer": customer_id,
            "billingType": "PIX",
            "value": round(float(valor), 2),
            "dueDate": data_vencimento,
            "description": descricao,
            "externalReference": chave_divida,
        }
        resp = c.post("/payments", json=payload)
        payment = _check(resp)
        payment_id = payment["id"]

        # Buscar QR Code
        pix_copia_cola = None
        pix_qr_code_imagem = None
        try:
            qr_resp = c.get(f"/payments/{payment_id}/pixQrCode")
            qr_data = _check(qr_resp)
            pix_copia_cola = qr_data.get("payload")
            pix_qr_code_imagem = qr_data.get("encodedImage")
        except AsaasError:
            pass

        return {
            "asaas_id": payment_id,
            "pix_copia_cola": pix_copia_cola,
            "pix_qr_code_imagem": pix_qr_code_imagem,
            "asaas_url_fatura": payment.get("invoiceUrl"),
            "status": "aguardando_pagamento",
        }


def criar_cobranca_boleto(
    customer_id: str,
    valor: float,
    descricao: str,
    chave_divida: str,
    data_vencimento: str,
) -> dict:
    with _client() as c:
        payload = {
            "customer": customer_id,
            "billingType": "BOLETO",
            "value": round(float(valor), 2),
            "dueDate": data_vencimento,
            "description": descricao,
            "externalReference": chave_divida,
        }
        resp = c.post("/payments", json=payload)
        payment = _check(resp)
        payment_id = payment["id"]

        boleto_linha_digitavel = None
        boleto_codigo_barras = None
        try:
            idf_resp = c.get(f"/payments/{payment_id}/identificationField")
            idf_data = _check(idf_resp)
            boleto_linha_digitavel = idf_data.get("identificationField")
            boleto_codigo_barras = idf_data.get("barCode")
        except AsaasError:
            pass

        return {
            "asaas_id": payment_id,
            "boleto_url": payment.get("bankSlipUrl"),
            "boleto_linha_digitavel": boleto_linha_digitavel,
            "boleto_codigo_barras": boleto_codigo_barras,
            "asaas_url_fatura": payment.get("invoiceUrl"),
            "status": "aguardando_pagamento",
        }


def criar_link_parcelado(
    customer_id: str,
    valor: float,
    descricao: str,
    chave_divida: str,
    numero_parcelas: int,
    data_vencimento: str,
) -> dict:
    parcelas = max(1, int(numero_parcelas))
    valor_parcela = round(float(valor) / parcelas, 2)

    with _client() as c:
        payload = {
            "customer": customer_id,
            "billingType": "CREDIT_CARD",
            "value": round(float(valor), 2),
            "dueDate": data_vencimento,
            "description": descricao,
            "externalReference": chave_divida,
            "installmentCount": parcelas,
            "installmentValue": valor_parcela,
        }
        resp = c.post("/payments", json=payload)
        payment = _check(resp)
        payment_id = payment.get("id") or (payment.get("installments", [{}])[0].get("id"))

        return {
            "asaas_id": payment_id,
            "link_pagamento": payment.get("invoiceUrl"),
            "asaas_url_fatura": payment.get("invoiceUrl"),
            "status": "aguardando_pagamento",
            "numero_parcelas": parcelas,
        }


def cancelar_cobranca(asaas_id: str) -> bool:
    try:
        with _client() as c:
            resp = c.delete(f"/payments/{asaas_id}")
            return resp.status_code in (200, 204)
    except Exception:
        return False


def consultar_status(asaas_id: str) -> str:
    with _client() as c:
        resp = c.get(f"/payments/{asaas_id}")
        data = _check(resp)
        return data.get("status", "UNKNOWN")


# Status Asaas → label PT-BR
ASAAS_STATUS_MAP = {
    "PENDING": "Aguardando pagamento",
    "AWAITING_RISK_ANALYSIS": "Em análise de risco",
    "APPROVED_BY_RISK_ANALYSIS": "Aprovado",
    "RECEIVED": "Recebido",
    "CONFIRMED": "Confirmado",
    "OVERDUE": "Vencido",
    "REFUNDED": "Estornado",
    "RECEIVED_IN_CASH": "Recebido em dinheiro",
    "REFUND_REQUESTED": "Estorno solicitado",
    "CHARGEBACK_REQUESTED": "Chargeback solicitado",
    "DUNNING_RECEIVED": "Negativação recebida",
    "DELETED": "Removido",
}


def consultar_status_completo(asaas_id: str) -> dict:
    """Retorna status completo da cobrança no Asaas incluindo datas de eventos."""
    with _client() as c:
        resp = c.get(f"/payments/{asaas_id}")
        data = _check(resp)

        status_raw = data.get("status", "UNKNOWN")
        pago = status_raw in ("RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH")

        return {
            "asaas_id": asaas_id,
            "status_raw": status_raw,
            "status_label": ASAAS_STATUS_MAP.get(status_raw, status_raw),
            "pago": pago,
            "valor": data.get("value"),
            "data_vencimento": data.get("dueDate"),
            "data_pagamento": data.get("paymentDate") or data.get("confirmedDate"),
            "data_credito": data.get("creditDate"),
            "fatura_url": data.get("invoiceUrl"),
            "invoice_viewed_date": data.get("invoiceViewedDate"),
            "bank_slip_viewed_date": data.get("bankSlipViewedDate"),
            "billing_type": data.get("billingType"),
            "net_value": data.get("netValue"),
        }


def registrar_webhook(url: str) -> bool:
    payload = {
        "url": url,
        "email": "administrativo@gfrecebiveis.com.br",
        "enabled": True,
        "interrupted": False,
        "authToken": settings.ASAAS_WEBHOOK_TOKEN or "gf-cobrar-webhook",
        "apiVersion": 3,
        "events": [
            "PAYMENT_RECEIVED",
            "PAYMENT_CONFIRMED",
            "PAYMENT_OVERDUE",
            "PAYMENT_DELETED",
            "PAYMENT_REFUNDED",
            "PAYMENT_CHECKOUT_VIEWED",
            "PAYMENT_BANK_SLIP_VIEWED",
        ],
    }
    try:
        with _client() as c:
            resp = c.post("/webhook", json=payload)
            return resp.status_code in (200, 201)
    except Exception:
        return False
