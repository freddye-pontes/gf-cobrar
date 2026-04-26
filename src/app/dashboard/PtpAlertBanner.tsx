import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { APIPtpAlerta } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Props {
  alertas: APIPtpAlerta[]
}

export function PtpAlertBanner({ alertas }: Props) {
  const vencidas = alertas.filter((a) => a.vencida)
  const hoje = alertas.filter((a) => !a.vencida)

  return (
    <div className="bg-danger-dim border border-danger/30 rounded-xl p-4 animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-danger font-semibold text-sm">
            {vencidas.length > 0
              ? `${vencidas.length} Promessa${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''} sem pagamento`
              : `${hoje.length} Promessa${hoje.length > 1 ? 's' : ''} de pagamento vence hoje`}
          </p>
          <div className="mt-2 space-y-1">
            {alertas.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.vencida ? 'bg-danger' : 'bg-amber'}`} />
                <span className="text-ink-secondary font-medium truncate">{a.devedor_nome}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-muted">{formatCurrency(a.valor_atualizado)}</span>
                <span className="text-ink-muted">·</span>
                <span className={a.vencida ? 'text-danger' : 'text-amber'}>
                  {a.vencida ? `Prometido em ${new Date(a.data_promessa_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Hoje'}
                </span>
              </div>
            ))}
            {alertas.length > 4 && (
              <p className="text-ink-muted text-xs">+{alertas.length - 4} mais...</p>
            )}
          </div>
        </div>
        <Link href="/carteira?status=ptp_ativa"
          className="shrink-0 flex items-center gap-1.5 text-xs text-danger border border-danger/30 hover:bg-danger/10 rounded-lg px-3 py-1.5 transition-colors">
          Ver PTPs <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
