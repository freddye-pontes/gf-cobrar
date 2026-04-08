'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmModal } from '@/components/modals/ConfirmModal'
import { NovaNegociacaoModal } from '@/components/modals/NovaNegociacaoModal'
import { formatCurrency, formatDate, getTipoNegociacaoLabel } from '@/lib/utils'
import { negociacoesApi, type APINegociacaoOut } from '@/lib/api'
import {
  CheckCircle2, XCircle, Clock,
  User, Building2, ChevronDown, ChevronUp, Plus,
} from 'lucide-react'
import type { StatusDivida } from '@/lib/types'

type StatusNeg = 'ativa' | 'concluida' | 'quebrada'

const statusConfig: Record<StatusNeg, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  ativa:    { label: 'Ativa',    color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)',  icon: <Clock className="w-3.5 h-3.5" /> },
  concluida:{ label: 'Concluída',color: '#34d399', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  quebrada: { label: 'Quebrada', color: '#f87171', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',  icon: <XCircle className="w-3.5 h-3.5" /> },
}

interface Props { negociacoes: APINegociacaoOut[] }

export function NegociacaoClient({ negociacoes }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<'' | StatusNeg>('')
  const [expanded, setExpanded] = useState<number | null>(null)

  // Modal state
  const [novaOpen, setNovaOpen] = useState(false)
  const [confirmPago, setConfirmPago] = useState<APINegociacaoOut | null>(null)
  const [confirmQuebrada, setConfirmQuebrada] = useState<APINegociacaoOut | null>(null)

  const refresh = () => router.refresh()

  const filtered = statusFilter ? negociacoes.filter((n) => n.status === statusFilter) : negociacoes
  const ativas = negociacoes.filter((n) => n.status === 'ativa').length
  const concluidas = negociacoes.filter((n) => n.status === 'concluida').length
  const totalEmNegociacao = negociacoes.filter((n) => n.status === 'ativa').reduce((s, n) => s + n.valor_oferta, 0)

  return (
    <AppLayout>
      <div className="min-h-full bg-void">
        <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-lg md:text-xl text-ink-primary tracking-tight">Negociação</h1>
              <p className="text-ink-muted text-xs font-mono mt-0.5 hidden sm:block">
                {ativas} ativas · {concluidas} concluídas · {formatCurrency(totalEmNegociacao)} em mesa
              </p>
            </div>
            <button
              onClick={() => setNovaOpen(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 md:px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Negociação</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {(Object.keys(statusConfig) as StatusNeg[]).map((s) => {
              const cfg = statusConfig[s]
              const count = negociacoes.filter((n) => n.status === s).length
              const total = negociacoes.filter((n) => n.status === s).reduce((acc, n) => acc + n.valor_oferta, 0)
              const isActive = statusFilter === s
              return (
                <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                  className="relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200 hover:brightness-110 border"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.bg} 0%, #1a1a1a 100%)`,
                    borderColor: isActive ? cfg.border : 'rgba(45,45,45,0.8)',
                    boxShadow: isActive ? `0 0 20px ${cfg.bg}` : 'none',
                  }}
                >
                  {/* Glow decorativo */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-30 pointer-events-none"
                    style={{ background: cfg.color }} />
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                    <span className="text-[10.5px] font-mono uppercase tracking-wider" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="p-1.5 rounded-lg" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon}
                    </span>
                  </div>
                  <p className="font-bold text-[1.4rem] leading-none relative z-10" style={{ color: cfg.color }}>{count}</p>
                  <p className="text-ink-muted text-[10.5px] mt-1.5 relative z-10">{formatCurrency(total)}</p>
                </button>
              )
            })}
          </div>

          {/* Cards */}
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: '100ms', opacity: 0 }}>
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-ink-muted text-sm bg-surface border border-border-subtle rounded-xl">
                Nenhuma negociação encontrada.
              </div>
            ) : (
              filtered.map((neg) => {
                const isExpanded = expanded === neg.id
                const cfg = statusConfig[neg.status as StatusNeg] ?? statusConfig.ativa
                return (
                  <div key={neg.id} className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                    <div
                      className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-elevated/30 transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : neg.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-elevated border border-border-default flex items-center justify-center shrink-0">
                          {neg.devedor_tipo === 'PJ'
                            ? <Building2 className="text-ink-secondary" size={18} />
                            : <User className="text-ink-secondary" size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-ink-primary font-medium text-sm">{neg.devedor_nome ?? `Dívida #${neg.divida_id}`}</span>
                            {neg.devedor_tipo && (
                              <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-1.5 py-0.5 text-ink-muted">{neg.devedor_tipo}</span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono rounded-md border px-1.5 py-0.5"
                              style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                              {cfg.icon}{cfg.label.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-ink-muted text-xs">{neg.credor_nome ?? ''}</span>
                            <span className="text-border-emphasis text-xs">·</span>
                            <span className="text-ink-secondary text-xs font-mono">{getTipoNegociacaoLabel(neg.tipo as any)}</span>
                            {neg.divida_status && (
                              <><span className="text-border-emphasis text-xs">·</span>
                                <StatusBadge status={neg.divida_status as StatusDivida} size="sm" /></>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 shrink-0">
                        <div className="text-right">
                          <p className="font-mono font-bold text-ink-primary text-sm md:text-base">{formatCurrency(neg.valor_oferta)}</p>
                          {!!neg.desconto_percentual && (
                            <p className="font-mono text-xs text-emerald">-{neg.desconto_percentual.toFixed(1)}% desconto</p>
                          )}
                          {!!neg.numero_parcelas && (
                            <p className="font-mono text-xs text-ink-secondary">{neg.numero_parcelas}x {formatCurrency(neg.valor_parcela ?? 0)}</p>
                          )}
                          {neg.data_promessa && (
                            <p className="font-mono text-xs text-amber">PTP: {formatDate(neg.data_promessa)}</p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-muted mt-1" /> : <ChevronDown className="w-4 h-4 text-ink-muted mt-1" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border-subtle px-5 pb-5 pt-4 bg-elevated/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <div>
                            <p className="text-ink-muted text-[10px] font-mono uppercase tracking-wider mb-1">Valor Original</p>
                            <p className="font-mono text-ink-primary text-sm font-medium">{formatCurrency(neg.valor_original)}</p>
                          </div>
                          <div>
                            <p className="text-ink-muted text-[10px] font-mono uppercase tracking-wider mb-1">Valor Acordado</p>
                            <p className="font-mono font-bold text-sm" style={{ color: cfg.color }}>{formatCurrency(neg.valor_oferta)}</p>
                          </div>
                          <div>
                            <p className="text-ink-muted text-[10px] font-mono uppercase tracking-wider mb-1">Responsável</p>
                            <p className="text-ink-secondary text-sm">{neg.responsavel_nome}</p>
                          </div>
                          <div>
                            <p className="text-ink-muted text-[10px] font-mono uppercase tracking-wider mb-1">Atualizado em</p>
                            <p className="font-mono text-ink-secondary text-sm">{formatDate(neg.updated_at)}</p>
                          </div>
                        </div>
                        {neg.notas && (
                          <div className="bg-elevated rounded-lg p-3 mb-4">
                            <p className="text-ink-muted text-[10px] font-mono uppercase tracking-wider mb-1.5">Notas</p>
                            <p className="text-ink-secondary text-xs leading-relaxed">{neg.notas}</p>
                          </div>
                        )}
                        {neg.status === 'ativa' && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmPago(neg) }}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-dim border border-emerald/20 text-emerald rounded-lg py-2 text-sm font-medium hover:bg-emerald/20 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Confirmar Pagamento
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmQuebrada(neg) }}
                              className="flex items-center justify-center gap-2 bg-danger-dim border border-danger/20 text-danger rounded-lg py-2 px-4 text-sm font-medium hover:bg-danger/20 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Quebrou PTP
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <NovaNegociacaoModal
        open={novaOpen}
        onClose={() => setNovaOpen(false)}
        onSuccess={refresh}
      />

      <ConfirmModal
        open={Boolean(confirmPago)}
        onClose={() => setConfirmPago(null)}
        title="Confirmar Pagamento"
        description={`Confirmar que ${confirmPago?.devedor_nome ?? 'o devedor'} pagou o valor de ${formatCurrency(confirmPago?.valor_oferta ?? 0)}? A dívida será marcada como PAGA.`}
        confirmLabel="Confirmar Pagamento"
        onConfirm={async () => {
          await negociacoesApi.update(confirmPago!.id, { status: 'concluida' })
          refresh()
        }}
      />

      <ConfirmModal
        open={Boolean(confirmQuebrada)}
        onClose={() => setConfirmQuebrada(null)}
        title="Registrar PTP Quebrada"
        description={`Marcar a negociação de ${confirmQuebrada?.devedor_nome ?? 'o devedor'} como quebrada? A dívida voltará para Em Aberto.`}
        confirmLabel="Quebrou PTP"
        danger
        onConfirm={async () => {
          await negociacoesApi.update(confirmQuebrada!.id, { status: 'quebrada' })
          refresh()
        }}
      />
    </AppLayout>
  )
}
