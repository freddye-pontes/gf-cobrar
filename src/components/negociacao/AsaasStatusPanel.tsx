'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, CheckCircle2, Eye, Clock, AlertTriangle,
  Loader2, Zap, AlignJustify, CreditCard, ExternalLink,
} from 'lucide-react'
import { cobrancasApi, type APICobranca, type APIAsaasSyncResult } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface Props {
  cobranca: APICobranca
}

const BILLING_LABEL: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto Bancário',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  UNDEFINED: 'À escolha do devedor',
}

const BILLING_ICON: Record<string, React.ReactNode> = {
  PIX: <Zap className="w-3.5 h-3.5" />,
  BOLETO: <AlignJustify className="w-3.5 h-3.5" />,
  CREDIT_CARD: <CreditCard className="w-3.5 h-3.5" />,
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-amber',
  RECEIVED: 'text-emerald',
  CONFIRMED: 'text-emerald',
  OVERDUE: 'text-danger',
  REFUNDED: 'text-ink-muted',
  DELETED: 'text-ink-muted',
}

export function AsaasStatusPanel({ cobranca }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sync, setSync] = useState<APIAsaasSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sincronizar() {
    if (!cobranca.asaas_id) return
    setLoading(true)
    setError(null)
    try {
      const result = await cobrancasApi.sincronizar(cobranca.id)
      setSync(result)
      if (result.pago) router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao sincronizar')
    } finally {
      setLoading(false)
    }
  }

  const statusRaw = sync?.status_raw ?? cobranca.asaas_status_raw ?? 'PENDING'
  const statusLabel = sync?.status_label ?? (cobranca.asaas_status_raw
    ? cobranca.asaas_status_raw.replace(/_/g, ' ')
    : 'Aguardando pagamento')
  const isPago = statusRaw === 'RECEIVED' || statusRaw === 'CONFIRMED' || cobranca.status === 'pago'
  const isVisualizado = sync?.checkout_visualizado ?? cobranca.checkout_visualizado
  const visualizadoEm = sync?.checkout_visualizado_em ?? cobranca.checkout_visualizado_em
  const sincronizadoEm = sync?.sincronizado_em ?? cobranca.asaas_sincronizado_em

  return (
    <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="font-display font-semibold text-ink-primary text-sm">
          Sincronização Asaas
        </h3>
        <button
          onClick={sincronizar}
          disabled={loading || !cobranca.asaas_id}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-dim border border-accent/20 text-accent rounded-lg hover:bg-accent/15 transition-colors disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
          {loading ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* Timeline de eventos */}
        <div className="space-y-3">
          {/* 1. Cobrança Gerada */}
          <div className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
              cobranca.asaas_id ? 'bg-emerald border-emerald' : 'bg-elevated border-border-default'
            }`}>
              {cobranca.asaas_id
                ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                : <span className="text-[10px] text-ink-muted font-bold">1</span>
              }
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-primary">Cobrança Gerada</p>
                <span className="text-[10px] font-mono text-ink-muted">
                  {cobranca.asaas_id ? formatDateTime(cobranca.created_at) : '—'}
                </span>
              </div>
              {cobranca.asaas_id && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono text-ink-muted">{cobranca.asaas_id}</span>
                  {cobranca.asaas_url_fatura && (
                    <a
                      href={cobranca.asaas_url_fatura}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-light"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Linha conectora */}
          <div className="ml-3.5 w-px h-3 bg-border-subtle" />

          {/* 2. Fatura Visualizada */}
          <div className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
              isVisualizado
                ? 'bg-accent border-accent'
                : 'bg-elevated border-border-default'
            }`}>
              {isVisualizado
                ? <Eye className="w-3.5 h-3.5 text-white" />
                : <span className="text-[10px] text-ink-muted font-bold">2</span>
              }
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold ${isVisualizado ? 'text-ink-primary' : 'text-ink-muted'}`}>
                  Fatura Visualizada
                </p>
                <span className="text-[10px] font-mono text-ink-muted">
                  {isVisualizado && visualizadoEm ? formatDateTime(visualizadoEm) : 'Aguardando'}
                </span>
              </div>
              <p className="text-[10px] text-ink-muted mt-0.5">
                {isVisualizado ? 'O devedor abriu a fatura de pagamento' : 'O devedor ainda não visualizou'}
              </p>
            </div>
          </div>

          {/* Linha conectora */}
          <div className="ml-3.5 w-px h-3 bg-border-subtle" />

          {/* 3. Pagamento Efetuado */}
          <div className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
              isPago
                ? 'bg-emerald border-emerald'
                : 'bg-elevated border-border-default'
            }`}>
              {isPago
                ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                : <span className="text-[10px] text-ink-muted font-bold">3</span>
              }
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold ${isPago ? 'text-emerald' : 'text-ink-muted'}`}>
                  Pagamento Efetuado
                </p>
                <span className="text-[10px] font-mono text-ink-muted">
                  {isPago && (sync?.data_pagamento ?? cobranca.data_pagamento_confirmado)
                    ? formatDateTime(sync?.data_pagamento ?? cobranca.data_pagamento_confirmado ?? '')
                    : 'Aguardando'}
                </span>
              </div>
              <p className="text-[10px] text-ink-muted mt-0.5">
                {isPago ? 'Pagamento confirmado e dívida baixada' : 'Aguardando confirmação do pagamento'}
              </p>
            </div>
          </div>
        </div>

        {/* Status atual Asaas */}
        {cobranca.asaas_id && (
          <div className="border-t border-border-subtle pt-3 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Status Asaas</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isPago
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />
                  : statusRaw === 'OVERDUE'
                  ? <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                  : <Clock className="w-3.5 h-3.5 text-amber" />
                }
                <span className={`text-xs font-semibold ${STATUS_COLOR[statusRaw] ?? 'text-amber'}`}>
                  {statusLabel}
                </span>
              </div>
              {sincronizadoEm && (
                <span className="text-[10px] font-mono text-ink-muted">
                  Sync: {formatDateTime(sincronizadoEm)}
                </span>
              )}
            </div>

            {/* Detalhes pós-sync */}
            {sync && (
              <div className="space-y-1.5 bg-elevated rounded-lg p-2.5 border border-border-subtle">
                {sync.billing_type && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted flex items-center gap-1">
                      {BILLING_ICON[sync.billing_type]}
                      Forma de pagamento
                    </span>
                    <span className="text-ink-secondary font-medium">
                      {BILLING_LABEL[sync.billing_type] ?? sync.billing_type}
                    </span>
                  </div>
                )}
                {sync.net_value != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Valor líquido recebido</span>
                    <span className="font-mono font-bold text-emerald">{formatCurrency(sync.net_value)}</span>
                  </div>
                )}
                {sync.data_credito && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Crédito em conta</span>
                    <span className="font-mono text-ink-secondary">{formatDateTime(sync.data_credito)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!cobranca.asaas_id && (
          <p className="text-xs text-ink-muted text-center py-2">
            Cobrança sem ID Asaas — gerada com dados mock.
          </p>
        )}

        {error && (
          <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
