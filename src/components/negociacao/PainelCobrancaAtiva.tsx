'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, CheckCircle2, Copy, Send, X, DollarSign, Loader2,
} from 'lucide-react'
import { cobrancasApi, type APICobranca, type APINegociacaoOut, type APIDividaOut } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ConfirmarPagamentoModal } from '@/components/modals/ConfirmarPagamentoModal'

interface Props {
  cobranca: APICobranca
  negociacao: APINegociacaoOut
  divida: APIDividaOut
}

const FORMA_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto bancário',
  link_parcelado: 'Cartão / Link parcelado',
}

export function PainelCobrancaAtiva({ cobranca, negociacao, divida }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [reenviarLoading, setReenviarLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPago = cobranca.status === 'pago'
  const isVencido =
    !isPago &&
    cobranca.data_vencimento &&
    new Date(cobranca.data_vencimento) < new Date(new Date().toDateString())

  async function handleCancelar() {
    if (!confirm('Cancelar este acordo? A dívida voltará para negociação.')) return
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
    const texto = cobranca.pix_copia_cola ?? cobranca.boleto_codigo ?? cobranca.link_pagamento ?? ''
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <>
      {/* Status header */}
      <div className={`rounded-xl border p-4 mb-4 ${isPago
        ? 'bg-emerald-dim border-emerald/20'
        : isVencido
        ? 'bg-danger-dim border-danger/20'
        : 'bg-amber-dim border-amber/20'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {isPago
            ? <CheckCircle2 className="w-4 h-4 text-emerald" />
            : <Clock className={`w-4 h-4 ${isVencido ? 'text-danger' : 'text-amber'}`} />
          }
          <span className={`text-sm font-semibold ${isPago ? 'text-emerald' : isVencido ? 'text-danger' : 'text-amber'}`}>
            {isPago ? 'Pagamento confirmado' : isVencido ? 'Cobrança vencida' : 'Aguardando pagamento'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <span className="text-ink-muted">Forma de pagamento</span>
          <span className="text-ink-primary font-medium">{FORMA_LABEL[cobranca.forma_pagamento] ?? cobranca.forma_pagamento}</span>
          <span className="text-ink-muted">Valor</span>
          <span className="text-ink-primary font-mono font-bold">{formatCurrency(cobranca.valor)}</span>
          <span className="text-ink-muted">Vencimento</span>
          <span className={`font-mono font-medium ${isVencido ? 'text-danger' : 'text-ink-primary'}`}>
            {formatDate(cobranca.data_vencimento)}
            {isVencido && ' (vencido)'}
          </span>
          <span className="text-ink-muted">Status</span>
          <span className={`font-medium capitalize ${isPago ? 'text-emerald' : isVencido ? 'text-danger' : 'text-amber'}`}>
            {isPago ? 'Pago' : 'Aguardando'}
          </span>
        </div>

        {/* Chave de pagamento copiável */}
        {!isPago && (cobranca.pix_copia_cola || cobranca.boleto_codigo || cobranca.link_pagamento) && (
          <div className="mt-3 bg-surface rounded-lg border border-border-subtle p-2.5 flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink-muted flex-1 truncate">
              {cobranca.pix_copia_cola ?? cobranca.boleto_codigo ?? cobranca.link_pagamento}
            </span>
            <button
              onClick={copiarChave}
              className="shrink-0 flex items-center gap-1 text-xs text-accent hover:text-accent-light transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-2">Pagamento e conciliação</p>
        <div className="space-y-2">
          {[
            {
              label: 'Cobrança Gerada',
              date: cobranca.created_at,
              done: true,
            },
            {
              label: 'Pagamento Identificado',
              date: cobranca.data_pagamento_confirmado,
              done: isPago,
            },
            {
              label: 'Baixa e Conciliação',
              date: cobranca.data_pagamento_confirmado,
              done: isPago,
            },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                step.done ? 'bg-emerald text-white' : 'bg-elevated border border-border-default text-ink-muted'
              }`}>
                {step.done ? '✓' : i + 1}
              </div>
              <span className="text-xs text-ink-secondary flex-1">{step.label}</span>
              <span className="text-[10px] font-mono text-ink-muted">
                {step.done && step.date ? formatDate(step.date) : 'Aguardando'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {!isPago && (
        <div className="space-y-2">
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald hover:bg-emerald-light text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Confirmar pagamento manualmente
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleReenviar}
              disabled={reenviarLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-elevated border border-border-default rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors disabled:opacity-50"
            >
              {reenviarLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Reenviar cobrança
            </button>
            <button
              onClick={handleCancelar}
              disabled={cancelLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-danger-dim border border-danger/20 rounded-lg text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
            >
              {cancelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Cancelar acordo
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <ConfirmarPagamentoModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onSuccess={refresh}
        cobrancaId={cobranca.id}
        valor={cobranca.valor}
      />
    </>
  )
}
