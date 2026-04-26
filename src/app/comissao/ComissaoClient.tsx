'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, DollarSign, Percent, FileBarChart2 } from 'lucide-react'
import { GerarRepasseModal } from '@/components/modals/GerarRepasseModal'
import { useRouter } from 'next/navigation'
import type { APICredorOut } from '@/lib/api'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

interface PreviewCredor {
  credor_id: number
  credor_nome: string
  comissao_pct: number
  qtd_dividas: number
  valor_bruto: number
  comissao: number
  valor_liquido: number
  dividas: PreviewDivida[]
}

interface PreviewDivida {
  id: number
  chave_divida: string
  devedor_nome: string
  valor_original: number
  valor_negociado: number
  desconto_aplicado: number
  comissao_percentual: number
  comissao_valor: number
  valor_repasse: number
  data_pagamento: string | null
}

interface Props { credores: APICredorOut[] }

export function ComissaoClient({ credores }: Props) {
  const router = useRouter()
  const [data, setData] = useState<PreviewCredor[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [repasseCredor, setRepasseCredor] = useState<APICredorOut | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/relatorios/comissao/preview`)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const totalBruto = data.reduce((s, c) => s + c.valor_bruto, 0)
  const totalComissao = data.reduce((s, c) => s + c.comissao, 0)
  const totalLiquido = data.reduce((s, c) => s + c.valor_liquido, 0)

  return (
    <div className="min-h-full bg-void">
      <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-bold text-lg md:text-xl text-ink-primary tracking-tight">Comissões Pendentes</h1>
            <p className="text-ink-muted text-xs font-mono mt-0.5 hidden sm:block">Dívidas pagas ainda não incluídas em repasse</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Valor Recuperado', value: fmt(totalBruto), icon: TrendingUp, color: 'text-emerald' },
            { label: 'Comissão Total', value: fmt(totalComissao), icon: Percent, color: 'text-amber' },
            { label: 'Valor a Repassar', value: fmt(totalLiquido), icon: DollarSign, color: 'text-accent-light' },
          ].map((card) => (
            <div key={card.label} className="bg-surface border border-border-subtle rounded-xl p-4 flex items-center gap-3">
              <card.icon className={`w-5 h-5 shrink-0 ${card.color}`} />
              <div>
                <p className="text-ink-muted text-xs">{card.label}</p>
                <p className={`font-mono font-bold text-base ${card.color}`}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-ink-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Calculando comissões...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <FileBarChart2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma dívida paga pendente de repasse.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((c) => {
              const credor = credores.find((cr) => cr.id === c.credor_id)
              const isOpen = expanded === c.credor_id
              return (
                <div key={c.credor_id} className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                  {/* Credor header */}
                  <button onClick={() => setExpanded(isOpen ? null : c.credor_id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-elevated/30 transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-ink-primary font-semibold text-sm">{c.credor_nome}</p>
                      <p className="text-ink-muted text-xs mt-0.5">{c.qtd_dividas} dívida{c.qtd_dividas !== 1 ? 's' : ''} · Comissão {c.comissao_pct}%</p>
                    </div>
                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <p className="text-[10px] text-ink-muted">Bruto</p>
                        <p className="font-mono text-sm text-ink-primary">{fmt(c.valor_bruto)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-muted">Comissão</p>
                        <p className="font-mono text-sm text-amber">{fmt(c.comissao)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-muted">A Repassar</p>
                        <p className="font-mono text-sm font-bold text-emerald">{fmt(c.valor_liquido)}</p>
                      </div>
                      {credor && (
                        <button onClick={(e) => { e.stopPropagation(); setRepasseCredor(credor) }}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-light text-white text-xs font-medium rounded-lg transition-colors">
                          Gerar Repasse
                        </button>
                      )}
                    </div>
                  </button>

                  {/* Dividas detail */}
                  {isOpen && (
                    <div className="border-t border-border-subtle">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-elevated text-ink-muted font-mono uppercase tracking-wider">
                              {['Devedor', 'Chave', 'Original', 'Negociado', 'Desc%', 'Com%', 'Comissão', 'Repasse', 'Pago em'].map((h) => (
                                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-subtle">
                            {c.dividas.map((d) => (
                              <tr key={d.id} className="hover:bg-elevated/30">
                                <td className="px-3 py-2 text-ink-primary font-medium truncate max-w-[160px]">{d.devedor_nome}</td>
                                <td className="px-3 py-2 font-mono text-ink-muted">{d.chave_divida}</td>
                                <td className="px-3 py-2 font-mono text-ink-secondary">{fmt(d.valor_original)}</td>
                                <td className="px-3 py-2 font-mono text-ink-primary">{fmt(d.valor_negociado)}</td>
                                <td className="px-3 py-2 font-mono text-amber">{d.desconto_aplicado > 0 ? `${d.desconto_aplicado}%` : '—'}</td>
                                <td className="px-3 py-2 font-mono text-ink-muted">{d.comissao_percentual}%</td>
                                <td className="px-3 py-2 font-mono text-amber">{fmt(d.comissao_valor)}</td>
                                <td className="px-3 py-2 font-mono font-bold text-emerald">{fmt(d.valor_repasse)}</td>
                                <td className="px-3 py-2 text-ink-muted">{d.data_pagamento ? new Date(d.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {repasseCredor && (
        <GerarRepasseModal
          open={!!repasseCredor}
          onClose={() => setRepasseCredor(null)}
          onSuccess={() => { setRepasseCredor(null); carregar(); router.refresh() }}
          credorId={repasseCredor.id}
          credorNome={repasseCredor.razao_social}
          comissaoPercentual={repasseCredor.comissao_percentual}
        />
      )}
    </div>
  )
}
