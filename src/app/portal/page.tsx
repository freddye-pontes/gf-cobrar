'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatCurrencyCompact, getStatusColors, getStatusLabel } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  credoresApi, dividasApi, repassesApi,
  type APICredorOut, type APIDividaListOut, type APIRepasseOut,
} from '@/lib/api'
import {
  Building2, LogOut, Eye, EyeOff, BarChart2,
  DollarSign, Percent, FileText, CheckCircle2,
  Lock, ExternalLink,
} from 'lucide-react'
import type { StatusDivida } from '@/lib/types'

export default function PortalPage() {
  const [credores, setCredores] = useState<APICredorOut[]>([])
  const [selectedCredorId, setSelectedCredorId] = useState<number | null>(null)
  const [dividas, setDividas] = useState<APIDividaListOut[]>([])
  const [repasses, setRepasses] = useState<APIRepasseOut[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [showNames, setShowNames] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load credores on mount
  useEffect(() => {
    credoresApi.list().then((data) => {
      setCredores(data)
      if (data.length > 0) setSelectedCredorId(data[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Load dividas + repasses when credor changes
  useEffect(() => {
    if (!selectedCredorId) return
    Promise.all([
      dividasApi.list({ credor_id: selectedCredorId }),
      repassesApi.list(selectedCredorId),
    ]).then(([divs, reps]) => {
      setDividas(divs)
      setRepasses(reps)
    }).catch(() => {})
  }, [selectedCredorId])

  const credor = credores.find((c) => c.id === selectedCredorId)

  const statusCounts = dividas.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1
    return acc
  }, {})

  const taxaRecuperacao = credor && credor.total_carteira > 0
    ? ((credor.total_recuperado / credor.total_carteira) * 100).toFixed(1)
    : '0.0'

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent glow-accent mb-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-ink-primary tracking-tight">
              Portal do Credor
            </h1>
            <p className="text-ink-muted text-sm mt-1.5">Acesso exclusivo e somente leitura</p>
          </div>

          <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 bg-elevated border border-border-default rounded-lg p-3">
              <Lock className="w-4 h-4 text-ink-muted shrink-0" />
              <p className="text-ink-muted text-xs">
                Credores só visualizam sua própria carteira. Nenhuma alteração é permitida.
              </p>
            </div>

            <div>
              <label className="block text-ink-muted text-xs font-mono uppercase tracking-wider mb-2">
                Selecionar Credor (Demo)
              </label>
              <select
                value={selectedCredorId ?? ''}
                onChange={(e) => setSelectedCredorId(Number(e.target.value))}
                disabled={loading}
                className="w-full appearance-none bg-elevated border border-border-default rounded-lg px-4 py-3 text-sm text-ink-primary focus:outline-none focus:border-accent/50 disabled:opacity-50"
              >
                {loading && <option>Carregando...</option>}
                {credores.map((c) => (
                  <option key={c.id} value={c.id}>{c.razao_social}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-ink-muted text-xs font-mono uppercase tracking-wider mb-2">E-mail</label>
              <input
                type="email"
                defaultValue={credor?.contato_email ?? ''}
                className="w-full bg-elevated border border-border-default rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/50"
                placeholder="seu@email.com.br"
              />
            </div>

            <div>
              <label className="block text-ink-muted text-xs font-mono uppercase tracking-wider mb-2">Senha</label>
              <input
                type="password"
                defaultValue="••••••••"
                className="w-full bg-elevated border border-border-default rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/50"
              />
            </div>

            <button
              onClick={() => setLoggedIn(true)}
              disabled={!credor}
              className="w-full bg-accent hover:bg-accent-light transition-colors text-white font-medium rounded-lg py-3 text-sm disabled:opacity-50"
            >
              Acessar Portal
            </button>
          </div>

          <p className="text-center text-ink-disabled text-xs mt-4 font-mono">
            GF Recebíveis — Portal Externo · LGPD Compliant
          </p>
        </div>
      </div>
    )
  }

  // ── Portal dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void">
      {/* Portal header */}
      <div className="bg-surface border-b border-border-subtle px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-accent-light" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-ink-primary text-sm truncate">{credor?.razao_social}</p>
              <p className="text-ink-muted text-[10px] font-mono hidden sm:block">Portal Somente Leitura · {credor?.contato_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-dim border border-emerald/20 rounded-lg px-3 py-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald" />
              <span className="text-emerald text-xs font-mono">Somente leitura</span>
            </div>
            <button
              onClick={() => setLoggedIn(false)}
              className="flex items-center gap-1.5 text-ink-muted hover:text-ink-secondary transition-colors text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
          {[
            { label: 'Total em Carteira', value: formatCurrencyCompact(credor?.total_carteira ?? 0), Icon: DollarSign, color: '#3b82f6' },
            { label: 'Total Recuperado', value: formatCurrencyCompact(credor?.total_recuperado ?? 0), Icon: CheckCircle2, color: '#34d399' },
            { label: 'Taxa de Recuperação', value: `${taxaRecuperacao}%`, Icon: Percent, color: '#fbbf24' },
            { label: 'Dívidas na Carteira', value: String(dividas.length), Icon: BarChart2, color: '#a78bfa' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-surface border border-border-subtle rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.Icon className="w-4 h-4" style={{ color: kpi.color }} />
                <p className="text-ink-muted text-[10px] font-mono uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="font-display font-bold text-xl" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Debts table */}
          <div className="lg:col-span-2 bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '80ms', opacity: 0 }}>
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink-primary text-sm">Dívidas em Carteira</h3>
              <div className="flex items-center gap-1.5 text-ink-muted text-xs">
                <Lock className="w-3 h-3" />
                <span className="font-mono text-[10px]">Somente visualização</span>
              </div>
            </div>
            <div className="divide-y divide-border-subtle">
              {dividas.length === 0 ? (
                <div className="py-10 text-center text-ink-muted text-sm">Nenhuma dívida encontrada.</div>
              ) : (
                dividas.map((divida) => {
                  const nome = divida.devedor_nome ?? `Devedor #${divida.devedor_id}`
                  const nomeExibido = showNames
                    ? nome
                    : nome.split(' ')[0] + ' ' + '*'.repeat(Math.max(0, nome.length - nome.split(' ')[0].length - 1))

                  return (
                    <div key={divida.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-ink-primary text-sm font-medium truncate">{nomeExibido}</p>
                          {divida.devedor_tipo && (
                            <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-1.5 py-0.5 text-ink-muted">
                              {divida.devedor_tipo}
                            </span>
                          )}
                        </div>
                        <p className="text-ink-muted text-xs font-mono mt-0.5">
                          Venc. {divida.data_vencimento}
                          {divida.ultimo_contato && (
                            <span className="ml-3 text-ink-disabled">
                              Últ. contato: {divida.ultimo_contato}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-bold text-ink-primary">{formatCurrency(divida.valor_atualizado)}</p>
                        <div className="mt-1">
                          <StatusBadge status={divida.status as StatusDivida} size="sm" />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between">
              <button
                onClick={() => setShowNames(!showNames)}
                className="flex items-center gap-1.5 text-ink-muted hover:text-ink-secondary transition-colors text-xs"
              >
                {showNames ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showNames ? 'Ocultar nomes completos' : 'Exibir nomes completos'}
              </button>
              <span className="text-ink-disabled text-[10px] font-mono">LGPD — Acesso restrito</span>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Status breakdown */}
            <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '120ms', opacity: 0 }}>
              <h3 className="font-display font-semibold text-ink-primary text-sm mb-4">Status da Carteira</h3>
              <div className="space-y-2.5">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const colors = getStatusColors(status as StatusDivida)
                  const pct = dividas.length > 0 ? Math.round((count / dividas.length) * 100) : 0
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: colors.text }}>{getStatusLabel(status as StatusDivida)}</span>
                        <span className="font-mono text-xs text-ink-secondary">{count}</span>
                      </div>
                      <div className="h-1.5 bg-void rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors.text }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Repasses */}
            <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '160ms', opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-accent-light" />
                <h3 className="font-display font-semibold text-ink-primary text-sm">Histórico de Repasses</h3>
              </div>
              {repasses.length === 0 ? (
                <p className="text-ink-muted text-xs">Nenhum repasse registrado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {repasses.map((rep) => (
                    <div key={rep.id} className="bg-elevated rounded-lg p-3 border border-border-subtle">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-ink-secondary text-xs font-medium">{rep.periodo}</span>
                        <span className={`text-[10px] font-mono font-bold ${
                          rep.status === 'executado' ? 'text-emerald' :
                          rep.status === 'aprovado' ? 'text-accent-light' : 'text-amber'
                        }`}>
                          {rep.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-mono font-bold text-emerald text-base">{formatCurrency(rep.valor_liquido)}</p>
                      <p className="text-ink-muted text-xs mt-0.5 font-mono">
                        Bruto: {formatCurrency(rep.valor_bruto)} · Comissão: {formatCurrency(rep.comissao)}
                      </p>
                      {rep.executado_em && (
                        <p className="text-ink-disabled text-[10px] font-mono mt-1">
                          Executado em {rep.executado_em.split('T')[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 bg-accent-dim border border-accent/15 rounded-xl p-4 animate-fade-up" style={{ animationDelay: '200ms', opacity: 0 }}>
              <ExternalLink className="w-4 h-4 text-accent-light shrink-0 mt-0.5" />
              <p className="text-ink-secondary text-xs leading-relaxed">
                Para contestações ou solicitações, entre em contato diretamente com a assessoria pelo e-mail registrado.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-6">
        <p className="text-[10px] font-mono text-ink-disabled">GF Recebíveis — Portal Externo · LGPD Compliant</p>
      </div>
    </div>
  )
}
