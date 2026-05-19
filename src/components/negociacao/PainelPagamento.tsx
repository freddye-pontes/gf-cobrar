'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, CheckCircle2, Copy, Send, X, DollarSign,
  Loader2, TrendingDown,
} from 'lucide-react'
import { AsaasStatusPanel } from './AsaasStatusPanel'
import {
  cobrancasApi,
  type APICobranca,
  type APINegociacaoOut,
  type APIDividaOut,
} from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ConfirmarPagamentoModal } from '@/components/modals/ConfirmarPagamentoModal'

interface Props {
  cobranca: APICobranca | null
  negociacao: APINegociacaoOut | null
  divida: APIDividaOut | null
}

const FORMA_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto bancário',
  link_parcelado: 'Cartão / Link parcelado',
}

export function PainelPagamento({ cobranca, negociacao, divida }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [reenviarLoading, setReenviarLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPago = cobranca?.status === 'pago' || divida?.status === 'pago'
  const isVencido =
    !isPago &&
    cobranca?.data_vencimento &&
    new Date(cobranca.data_vencimento) < new Date(new Date().toDateString())

  async function handleCancelar() {
    if (!cobranca || !confirm('Cancelar este acordo?')) return
    setCancelLoading(true)
    try {
      await cobrancasApi.cancelar(cobranca.id)
      refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar')
    } finally {
      setCancelLoading(false)
    }
  }

  async function handleReenviar() {
    if (!cobranca) return
    setReenviarLoading(true)
    try {
      await cobrancasApi.reenviar(cobranca.id)
      refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao reenviar')
    } finally {
      setReenviarLoading(false)
    }
  }

  function copiarChave() {
    const texto =
      cobranca?.pix_copia_cola ??
      cobranca?.boleto_codigo ??
      cobranca?.link_pagamento ?? ''
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // ── Cálculos financeiros ────────────────────────────────────────────────────
  const valorOriginal = divida?.valor_original ?? 0
  const valorAtualizado = divida?.valor_atualizado ?? 0
  const valorAcordo = cobranca?.valor ?? negociacao?.valor_oferta ?? null
  const desconto = valorAcordo != null ? valorAtualizado - valorAcordo : null

  return (
    <div className="space-y-4 animate-fade-up" style={{ animationDelay: '120ms', opacity: 0 }}>

      {/* ── Situação do pagamento ──────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="font-display font-semibold text-ink-primary text-sm">Situação do pagamento</h3>
        </div>

        <div className="p-4">
          {!cobranca ? (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <p className="text-ink-muted text-sm">Nenhuma cobrança gerada</p>
              <p className="text-ink-muted text-xs mt-1">Gere um acordo na área central</p>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4 ${
                isPago
                  ? 'bg-emerald-dim border border-emerald/20'
                  : isVencido
                  ? 'bg-danger-dim border border-danger/20'
                  : 'bg-amber-dim border border-amber/20'
              }`}>
                {isPago
                  ? <CheckCircle2 className="w-4 h-4 text-emerald shrink-0" />
                  : <Clock className={`w-4 h-4 shrink-0 ${isVencido ? 'text-danger' : 'text-amber'}`} />
                }
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isPago ? 'text-emerald' : isVencido ? 'text-danger' : 'text-amber'}`}>
                    {isPago ? 'Pagamento confirmado' : isVencido ? 'Cobrança vencida' : 'Aguardando pagamento'}
                  </p>
                  {cobranca.created_at && (
                    <p className="text-[10px] text-ink-muted font-mono mt-0.5">
                      Cobrança enviada em {formatDate(cobranca.created_at)}
                    </p>
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div className="space-y-2 text-xs mb-4">
                {[
                  { label: 'Forma de pagamento', value: FORMA_LABEL[cobranca.forma_pagamento] ?? cobranca.forma_pagamento },
                  { label: 'Valor', value: formatCurrency(cobranca.valor), mono: true },
                  {
                    label: 'Vencimento',
                    value: formatDate(cobranca.data_vencimento),
                    color: isVencido ? 'text-danger font-semibold' : 'text-ink-primary',
                    suffix: isVencido ? ' (hoje)' : '',
                  },
                  {
                    label: 'Status',
                    value: isPago ? 'Pago' : 'Aguardando',
                    color: isPago ? 'text-emerald font-semibold' : 'text-amber font-semibold',
                  },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-ink-muted">{item.label}</span>
                    <span className={`font-mono ${item.color ?? 'text-ink-primary'}`}>
                      {item.value}{item.suffix ?? ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chave copiável */}
              {!isPago && (cobranca.pix_copia_cola || cobranca.boleto_codigo || cobranca.link_pagamento) && (
                <button
                  onClick={copiarChave}
                  className="w-full flex items-center gap-2 bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs hover:bg-overlay transition-colors mb-3"
                >
                  <Copy className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <span className="font-mono text-ink-muted flex-1 text-left truncate text-[10px]">
                    {cobranca.pix_copia_cola ?? cobranca.boleto_codigo ?? cobranca.link_pagamento}
                  </span>
                  <span className={`shrink-0 font-semibold ${copied ? 'text-emerald' : 'text-accent'}`}>
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </span>
                </button>
              )}

              {/* Botões de ação */}
              {!isPago && (
                <div className="space-y-2">
                  <button
                    onClick={handleReenviar}
                    disabled={reenviarLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs bg-elevated border border-border-default rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors disabled:opacity-50"
                  >
                    {reenviarLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Reenviar cobrança
                  </button>
                  <button
                    onClick={handleCancelar}
                    disabled={cancelLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs bg-danger-dim border border-danger/20 rounded-lg text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                  >
                    {cancelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Cancelar acordo
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="mt-2 text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* ── Sincronização Asaas (novo demonstrativo) ─────────────────────── */}
      {cobranca && <AsaasStatusPanel cobranca={cobranca} />}

      {/* ── Confirmar manualmente ─────────────────────────────────────────── */}
      {cobranca && !isPago && (
        <button
          onClick={() => setConfirmOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald hover:bg-emerald-light text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" />
          Confirmar pagamento manualmente
        </button>
      )}

      {/* ── Resumo financeiro ──────────────────────────────────────────────── */}
      {divida && (
        <div className="bg-surface border border-border-subtle rounded-xl p-4">
          <p className="text-xs font-semibold text-ink-primary mb-3">Resumo financeiro</p>
          <div className="space-y-2">
            {[
              { label: 'Valor original', value: formatCurrency(valorOriginal), color: 'text-ink-secondary' },
              { label: 'Valor atualizado', value: formatCurrency(valorAtualizado), color: 'text-ink-primary' },
              ...(desconto != null && desconto > 0 ? [{
                label: 'Desconto concedido',
                value: `- ${formatCurrency(desconto)}`,
                color: 'text-amber font-semibold',
              }] : []),
              ...(valorAcordo != null ? [{
                label: 'Valor do acordo',
                value: formatCurrency(valorAcordo),
                color: 'text-ink-primary',
              }] : []),
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">{item.label}</span>
                <span className={`font-mono ${item.color}`}>{item.value}</span>
              </div>
            ))}

            {/* Você recebe — destaque */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border-subtle">
              <span className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald" />
                Você recebe
              </span>
              <span className="font-mono font-bold text-emerald text-base">
                {formatCurrency(valorAcordo ?? valorAtualizado)}
              </span>
            </div>
          </div>
        </div>
      )}

      {cobranca && (
        <ConfirmarPagamentoModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onSuccess={refresh}
          cobrancaId={cobranca.id}
          valor={cobranca.valor}
        />
      )}
    </div>
  )
}
