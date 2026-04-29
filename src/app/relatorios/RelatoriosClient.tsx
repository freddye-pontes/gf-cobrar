'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/utils'
import { type APICredorOut } from '@/lib/api'
import { FileDown, Filter, Landmark } from 'lucide-react'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

type Tab = 'repasses'

interface RepasseRow {
  repasse_id: number
  numero_contrato: string
  devedor_nome: string
  devedor_doc: string
  tipo: string
  chave_divida: string
  valor_bruto: number
  valor_atualizado: number
  desconto_valor: number
  desconto_percentual: number
  valor_recuperado: number
  comissao_percentual: number
  comissao_valor: number
  valor_repasse: number
  credor_nome: string
  periodo: string
  status_repasse: string
  data_pagamento: string | null
}

interface Props { credores: APICredorOut[] }

const statusColors: Record<string, string> = {
  pendente: 'text-amber bg-amber/10 border-amber/20',
  aprovado: 'text-[#FF6600] bg-[#FF6600]/10 border-[#FF6600]/20',
  executado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

export function RelatoriosClient({ credores }: Props) {
  const tab: Tab = 'repasses'
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RepasseRow[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [hasSearched, setHasSearched] = useState(false)

  // Shared filters
  const [credorId, setCredorId] = useState('')
  const [periodoDeR, setPeriodoDeR] = useState('')
  const [periodoAteR, setPeriodoAteR] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  function buildQS(): string {
    const p = new URLSearchParams()
    if (credorId) p.set('credor_id', credorId)
    if (periodoDeR) p.set('periodo_de', periodoDeR)
    if (periodoAteR) p.set('periodo_ate', periodoAteR)
    if (statusFilter) p.set('status', statusFilter)
    return p.toString() ? `?${p.toString()}` : ''
  }

  function endpointForTab() {
    return tab === 'repasses' ? 'repasses/detalhado' : tab
  }

  async function handleBuscar() {
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/relatorios/${endpointForTab()}${buildQS()}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotals(json.totals ?? {})
      setHasSearched(true)
    } catch { setData([]); setTotals({}) }
    finally { setLoading(false) }
  }

  function handleExport() {
    const qs = buildQS()
    const sep = qs ? '&' : '?'
    window.open(`${BASE_URL}/relatorios/${endpointForTab()}${qs}${sep}format=xlsx`, '_blank')
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'repasses', label: 'Repasses', icon: <Landmark className="w-4 h-4" /> },
  ]

  return (
    <AppLayout>
      <div className="min-h-full bg-void">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-lg md:text-xl text-ink-primary tracking-tight">Relatórios</h1>
              <p className="text-ink-muted text-xs font-mono mt-0.5 hidden sm:block">Exportar relatórios financeiros em XLSX</p>
            </div>
            <button
              onClick={handleExport}
              disabled={!hasSearched || data.length === 0}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 md:px-4 py-2 disabled:opacity-40"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar XLSX</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">

          {/* Filters */}
          <div className="bg-surface border border-border-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-ink-muted" />
              <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Filtros</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Credor */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Credor</label>
                <select
                  value={credorId}
                  onChange={(e) => setCredorId(e.target.value)}
                  className="w-full bg-elevated border border-border-default rounded-lg px-2.5 py-1.5 text-sm text-ink-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Todos</option>
                  {credores.map((c) => (
                    <option key={c.id} value={c.id}>{c.razao_social}</option>
                  ))}
                </select>
              </div>

              {/* Período */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Período de</label>
                <input type="month" value={periodoDeR} onChange={(e) => setPeriodoDeR(e.target.value)}
                  className="w-full bg-elevated border border-border-default rounded-lg px-2.5 py-1.5 text-sm text-ink-primary focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Período até</label>
                <input type="month" value={periodoAteR} onChange={(e) => setPeriodoAteR(e.target.value)}
                  className="w-full bg-elevated border border-border-default rounded-lg px-2.5 py-1.5 text-sm text-ink-primary focus:outline-none focus:border-accent" />
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-elevated border border-border-default rounded-lg px-2.5 py-1.5 text-sm text-ink-primary focus:outline-none focus:border-accent">
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="executado">Executado</option>
                </select>
              </div>

              {/* Buscar button */}
              <div className="flex items-end">
                <button
                  onClick={handleBuscar}
                  disabled={loading}
                  className="w-full py-1.5 px-4 bg-accent hover:bg-accent-light text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Buscando...' : 'Gerar Relatório'}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
              {data.length === 0 ? (
                <div className="py-12 text-center text-ink-muted text-sm">Nenhum resultado encontrado.</div>
              ) : (
                <>
                  {/* ── Repasses table (detalhado por dívida) ── */}
                  {tab === 'repasses' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-subtle bg-elevated/50">
                            {[
                              ['Nº Contrato',    'left'],
                              ['Devedor',        'left'],
                              ['Tipo',           'left'],
                              ['Nº Dívida',      'left'],
                              ['Valor Bruto',    'right'],
                              ['Valor Atualizado','right'],
                              ['Desconto (R$)',   'right'],
                              ['Desc (%)',        'right'],
                              ['Valor Recuperado','right'],
                              ['Com %',           'right'],
                              ['Comissão R$',     'right'],
                              ['Repasse',         'right'],
                              ['Credor',          'left'],
                              ['Período',         'left'],
                              ['Status',          'center'],
                              ['Pago em',         'left'],
                            ].map(([h, align]) => (
                              <th key={h} className={`text-${align} px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-ink-muted whitespace-nowrap`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {(data as RepasseRow[]).map((r, i) => (
                            <tr key={i} className="hover:bg-elevated/30">
                              <td className="px-3 py-2.5 font-mono text-ink-muted text-xs">{r.numero_contrato || '—'}</td>
                              <td className="px-3 py-2.5 text-ink-primary font-medium text-xs max-w-[160px] truncate">{r.devedor_nome}</td>
                              <td className="px-3 py-2.5 text-ink-secondary text-xs capitalize">{r.tipo}</td>
                              <td className="px-3 py-2.5 font-mono text-ink-muted text-[10px]">{r.chave_divida}</td>
                              <td className="px-3 py-2.5 font-mono text-ink-secondary text-right text-xs">{formatCurrency(r.valor_bruto)}</td>
                              <td className="px-3 py-2.5 font-mono text-ink-primary text-right text-xs font-medium">{formatCurrency(r.valor_atualizado)}</td>
                              <td className="px-3 py-2.5 font-mono text-right text-xs">
                                <span className={r.desconto_valor > 0 ? 'text-amber' : 'text-ink-muted'}>
                                  {r.desconto_valor > 0 ? `-${formatCurrency(r.desconto_valor)}` : '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-right text-xs">
                                <span className={r.desconto_percentual > 0 ? 'text-amber' : 'text-ink-muted'}>
                                  {r.desconto_percentual > 0 ? `${r.desconto_percentual}%` : '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-emerald-400 text-right text-xs font-medium">{formatCurrency(r.valor_recuperado)}</td>
                              <td className="px-3 py-2.5 font-mono text-ink-muted text-right text-xs">{r.comissao_percentual}%</td>
                              <td className="px-3 py-2.5 font-mono text-amber text-right text-xs">-{formatCurrency(r.comissao_valor)}</td>
                              <td className="px-3 py-2.5 font-mono font-bold text-accent-light text-right text-xs">{formatCurrency(r.valor_repasse)}</td>
                              <td className="px-3 py-2.5 text-ink-secondary text-xs max-w-[120px] truncate">{r.credor_nome}</td>
                              <td className="px-3 py-2.5 font-mono text-ink-secondary text-xs">{r.periodo}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-[10px] font-mono border rounded px-1.5 py-0.5 ${statusColors[r.status_repasse] ?? ''}`}>
                                  {r.status_repasse?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-ink-muted text-xs">
                                {r.data_pagamento ? new Date(r.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-elevated/50 border-t-2 border-border-default font-bold">
                            <td colSpan={4} className="px-3 py-3 text-ink-primary text-xs">TOTAL — {data.length} dívida{data.length !== 1 ? 's' : ''}</td>
                            <td className="px-3 py-3 font-mono text-ink-secondary text-right text-xs">{formatCurrency(totals.valor_bruto ?? 0)}</td>
                            <td className="px-3 py-3 font-mono text-ink-primary text-right text-xs">{formatCurrency(totals.valor_atualizado ?? 0)}</td>
                            <td className="px-3 py-3 font-mono text-amber text-right text-xs">-{formatCurrency(totals.desconto_valor ?? 0)}</td>
                            <td />
                            <td className="px-3 py-3 font-mono text-emerald-400 text-right text-xs">{formatCurrency(totals.valor_recuperado ?? 0)}</td>
                            <td />
                            <td className="px-3 py-3 font-mono text-amber text-right text-xs">-{formatCurrency(totals.comissao_valor ?? 0)}</td>
                            <td className="px-3 py-3 font-mono text-accent-light text-right text-xs">{formatCurrency(totals.valor_repasse ?? 0)}</td>
                            <td colSpan={4} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                </>
              )}
            </div>
          )}

          {!hasSearched && (
            <div className="py-16 text-center text-ink-muted text-sm bg-surface border border-border-subtle rounded-xl">
              Selecione os filtros e clique em <span className="text-accent font-medium">Gerar Relatório</span>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
