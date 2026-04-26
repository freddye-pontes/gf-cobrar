'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import { NovoCredorModal } from '@/components/modals/NovoCredorModal'
import { GerarRepasseModal } from '@/components/modals/GerarRepasseModal'
import { ConfirmModal } from '@/components/modals/ConfirmModal'
import { credoresApi, repassesApi, type APICredorOut, type APIRepasseOut } from '@/lib/api'
import {
  Building2, Plus, ChevronDown, ChevronUp, Pencil, Trash2,
  DollarSign, Percent, Send, CheckCircle2, Clock, AlertCircle, Loader2,
} from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

interface DividaDetalhe {
  repasse_id: number
  devedor_nome: string
  chave_divida: string
  valor_original: number
  desconto_percentual: number
  valor_negociado: number
  comissao_percentual: number
  comissao_valor: number
  valor_repasse: number
  data_pagamento: string | null
}

const repStatusConfig = {
  pendente: { label: 'Pendente', color: '#fbbf24', icon: <Clock className="w-3.5 h-3.5" /> },
  aprovado: { label: 'Aprovado', color: '#3b82f6', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  executado: { label: 'Executado', color: '#34d399', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
} as const

interface Props {
  credores: APICredorOut[]
  repasses: APIRepasseOut[]
}

export function CreditoresClient({ credores, repasses }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [expanded, setExpanded] = useState<number | null>(null)
  const [dividasDetalhe, setDividasDetalhe] = useState<Record<number, DividaDetalhe[]>>({})
  const [loadingDetalhe, setLoadingDetalhe] = useState<number | null>(null)

  async function carregarDetalhe(credorId: number) {
    if (dividasDetalhe[credorId]) return
    setLoadingDetalhe(credorId)
    try {
      const res = await fetch(`${BASE}/relatorios/repasses/detalhado?credor_id=${credorId}`)
      if (res.ok) {
        const data = await res.json()
        setDividasDetalhe((prev) => ({ ...prev, [credorId]: data.data ?? [] }))
      }
    } finally { setLoadingDetalhe(null) }
  }

  function handleExpand(credorId: number) {
    const next = expanded === credorId ? null : credorId
    setExpanded(next)
    if (next !== null) carregarDetalhe(next)
  }

  // Modal state
  const [novoCredorOpen, setNovoCredorOpen] = useState(false)
  const [editCreador, setEditCreador] = useState<APICredorOut | null>(null)
  const [repasseModal, setRepasseModal] = useState<APICredorOut | null>(null)
  const [aprovarRepasse, setAprovarRepasse] = useState<APIRepasseOut | null>(null)
  const [deleteCreador, setDeleteCreador] = useState<APICredorOut | null>(null)

  const totalCarteira = credores.reduce((s, c) => s + c.total_carteira, 0)
  const totalRecuperado = credores.reduce((s, c) => s + c.total_recuperado, 0)
  const taxaMedia = totalCarteira > 0 ? ((totalRecuperado / totalCarteira) * 100).toFixed(1) : '0.0'

  return (
    <>
    <AppLayout>
      <div className="min-h-full bg-void">
        <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-lg md:text-xl text-ink-primary tracking-tight">
                Gestão de Credores
              </h1>
              <p className="text-ink-muted text-xs font-mono mt-0.5 hidden sm:block">
                {credores.length} credores · {formatCurrencyCompact(totalCarteira)} em carteira · {taxaMedia}% recuperado
              </p>
            </div>
            <button
              onClick={() => setNovoCredorOpen(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 md:px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Credor</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
            {[
              { label: 'Total em Carteira',     value: formatCurrencyCompact(totalCarteira),  Icon: DollarSign,   color: '#3b82f6', glow: 'rgba(59,130,246,0.5)',  bg: 'rgba(59,130,246,0.08)'  },
              { label: 'Total Recuperado',       value: formatCurrencyCompact(totalRecuperado),Icon: CheckCircle2, color: '#34d399', glow: 'rgba(52,211,153,0.5)',  bg: 'rgba(16,185,129,0.08)' },
              { label: 'Taxa Média Recuperação', value: `${taxaMedia}%`,                       Icon: Percent,      color: '#fbbf24', glow: 'rgba(251,191,36,0.5)',  bg: 'rgba(245,158,11,0.08)' },
            ].map((s) => (
              <div key={s.label}
                className="relative overflow-hidden rounded-xl p-4 border transition-all duration-200 hover:brightness-110 cursor-default"
                style={{
                  background: `linear-gradient(135deg, ${s.bg} 0%, #1a1a1a 100%)`,
                  borderColor: s.bg.replace('0.08', '0.25'),
                }}
              >
                {/* Glow decorativo */}
                <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
                  style={{ background: s.color }} />
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                  <p className="text-[10.5px] text-ink-muted font-mono uppercase tracking-wider leading-tight">{s.label}</p>
                  <span className="p-1.5 rounded-lg flex-shrink-0" style={{ background: s.bg.replace('0.08', '0.15'), color: s.color }}>
                    <s.Icon className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="font-bold leading-none relative z-10"
                  style={{ color: s.color, fontSize: s.value.length > 9 ? '1.2rem' : '1.4rem' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Creditors list */}
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: '80ms', opacity: 0 }}>
            {credores.map((credor) => {
              const isExpanded = expanded === credor.id
              const credorRepasses = repasses.filter((r) => r.credor_id === credor.id)
              const taxaRecuperacao = credor.total_carteira > 0
                ? ((credor.total_recuperado / credor.total_carteira) * 100).toFixed(1)
                : '0.0'
              const pendentesRepasse = credorRepasses.filter((r) => r.status !== 'executado').length

              return (
                <div key={credor.id} className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
                  <div
                    className="flex items-start gap-4 p-5 cursor-pointer hover:bg-elevated/30 transition-colors relative"
                    onClick={() => handleExpand(credor.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-elevated border border-border-default flex items-center justify-center shrink-0">
                      <Building2 className="text-ink-secondary" size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-ink-primary font-semibold text-sm font-display">
                          {credor.razao_social}
                        </span>
                        <span className={`text-[10px] font-mono rounded px-1.5 py-0.5 ${credor.ativo ? 'bg-emerald-dim border border-emerald/20 text-emerald' : 'bg-danger-dim border border-danger/20 text-danger'}`}>
                          {credor.ativo ? 'ATIVO' : 'INATIVO'}
                        </span>
                        {pendentesRepasse > 0 && (
                          <span className="text-[10px] font-mono bg-amber-dim border border-amber/20 text-amber rounded px-1.5 py-0.5 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {pendentesRepasse} repasse(s) pendente(s)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                        <span className="text-ink-muted font-mono">{credor.cnpj}</span>
                        <span className="text-border-emphasis">·</span>
                        <span className="text-ink-muted">{credor.contato_email}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="flex-1 h-1.5 bg-void rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald transition-all"
                            style={{ width: `${taxaRecuperacao}%` }}
                          />
                        </div>
                        <span className="text-emerald text-xs font-mono font-bold shrink-0">
                          {taxaRecuperacao}% rec.
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:grid grid-cols-3 gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-ink-muted text-[10px] font-mono uppercase">Carteira</p>
                        <p className="font-mono text-ink-primary text-sm font-bold mt-0.5">
                          {formatCurrencyCompact(credor.total_carteira)}
                        </p>
                      </div>
                      <div>
                        <p className="text-ink-muted text-[10px] font-mono uppercase">Recuperado</p>
                        <p className="font-mono text-emerald text-sm font-bold mt-0.5">
                          {formatCurrencyCompact(credor.total_recuperado)}
                        </p>
                      </div>
                      <div>
                        <p className="text-ink-muted text-[10px] font-mono uppercase">Comissão</p>
                        <p className="font-mono text-amber text-sm font-bold mt-0.5">
                          {credor.comissao_percentual}%
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setEditCreador(credor) }}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors shrink-0 mt-0.5"
                      title="Editar credor"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteCreador(credor) }}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-dim transition-colors shrink-0 mt-0.5"
                      title="Excluir credor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-ink-muted shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-ink-muted shrink-0 mt-1" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border-subtle bg-elevated/20">
                      <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="md:col-span-1">
                          <h4 className="text-ink-muted text-[10px] font-mono uppercase tracking-wider mb-3">
                            Configurações
                          </h4>
                          <div className="space-y-2">
                            {[
                              { label: 'Chave PIX', value: credor.pix_key ?? '—' },
                              { label: 'Comissão', value: `${credor.comissao_percentual}% sobre recuperado` },
                              { label: 'Limite desconto', value: `Até ${credor.limite_desconto}%` },
                              { label: 'Contato', value: credor.contato_nome ?? '—' },
                            ].map((item) => (
                              <div key={item.label} className="flex items-start justify-between gap-2">
                                <span className="text-ink-muted text-xs">{item.label}</span>
                                <span className="font-mono text-ink-secondary text-xs text-right">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="md:col-span-3">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-ink-muted text-[10px] font-mono uppercase tracking-wider">Repasses</h4>
                            <button onClick={() => setRepasseModal(credor)}
                              className="flex items-center gap-1.5 text-accent-light text-xs hover:text-accent transition-colors">
                              <Send className="w-3 h-3" /> Gerar Lote
                            </button>
                          </div>

                          {loadingDetalhe === credor.id ? (
                            <div className="flex items-center gap-2 py-4 text-ink-muted text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando dívidas...
                            </div>
                          ) : credorRepasses.length === 0 ? (
                            <p className="text-ink-muted text-xs">Nenhum repasse registrado.</p>
                          ) : (
                            <div className="space-y-3">
                              {credorRepasses.map((rep) => {
                                const cfg = repStatusConfig[rep.status as keyof typeof repStatusConfig] ?? repStatusConfig.pendente
                                const dividasRep = (dividasDetalhe[credor.id] ?? []).filter((d) => d.repasse_id === rep.id)
                                return (
                                  <div key={rep.id} className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                                    {/* Repasse header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                                      <div className="flex items-center gap-3">
                                        <span className="text-ink-primary text-sm font-semibold font-mono">{rep.periodo}</span>
                                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold" style={{ color: cfg.color }}>
                                          {cfg.icon} {cfg.label.toUpperCase()}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 text-right">
                                        <div>
                                          <p className="text-[10px] text-ink-muted">Bruto</p>
                                          <p className="font-mono text-xs text-ink-secondary">{formatCurrency(rep.valor_bruto)}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-ink-muted">Comissão ({credor.comissao_percentual}%)</p>
                                          <p className="font-mono text-xs text-amber">-{formatCurrency(rep.comissao)}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-ink-muted">Líquido</p>
                                          <p className="font-mono text-sm font-bold text-emerald">{formatCurrency(rep.valor_liquido)}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Individual debts */}
                                    {dividasRep.length > 0 && (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-elevated/50 text-ink-muted font-mono uppercase tracking-wider">
                                              <th className="px-3 py-2 text-left">Devedor</th>
                                              <th className="px-3 py-2 text-left">Chave</th>
                                              <th className="px-3 py-2 text-right">Original</th>
                                              <th className="px-3 py-2 text-right">Negociado</th>
                                              <th className="px-3 py-2 text-right">Com%</th>
                                              <th className="px-3 py-2 text-right">Comissão R$</th>
                                              <th className="px-3 py-2 text-right">Repasse</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-border-subtle">
                                            {dividasRep.map((d, i) => (
                                              <tr key={i} className="hover:bg-elevated/30">
                                                <td className="px-3 py-2 text-ink-primary font-medium truncate max-w-[140px]">{d.devedor_nome}</td>
                                                <td className="px-3 py-2 font-mono text-ink-muted text-[10px]">{d.chave_divida}</td>
                                                <td className="px-3 py-2 font-mono text-ink-secondary text-right">{formatCurrency(d.valor_original)}</td>
                                                <td className="px-3 py-2 font-mono text-ink-primary text-right">
                                                  {formatCurrency(d.valor_negociado)}
                                                  {d.desconto_percentual > 0 && <span className="ml-1 text-amber">(-{d.desconto_percentual}%)</span>}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-ink-muted text-right">{d.comissao_percentual}%</td>
                                                <td className="px-3 py-2 font-mono text-amber text-right">{formatCurrency(d.comissao_valor)}</td>
                                                <td className="px-3 py-2 font-mono font-bold text-emerald text-right">{formatCurrency(d.valor_repasse)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {rep.status === 'pendente' && (
                                      <div className="px-4 py-3 border-t border-border-subtle">
                                        <button onClick={() => setAprovarRepasse(rep)}
                                          className="w-full bg-emerald-dim border border-emerald/20 text-emerald text-xs font-medium rounded-lg py-2 hover:bg-emerald/20 transition-colors">
                                          Aprovar e Executar Repasse
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>

      {/* Modals */}
      <NovoCredorModal
        open={novoCredorOpen}
        onClose={() => setNovoCredorOpen(false)}
        onSuccess={refresh}
      />

      <NovoCredorModal
        open={Boolean(editCreador)}
        onClose={() => setEditCreador(null)}
        onSuccess={refresh}
        credor={editCreador ?? undefined}
      />

      {repasseModal && (
        <GerarRepasseModal
          open
          onClose={() => setRepasseModal(null)}
          onSuccess={refresh}
          credorId={repasseModal.id}
          credorNome={repasseModal.razao_social}
          comissaoPercentual={repasseModal.comissao_percentual}
        />
      )}

      <ConfirmModal
        open={Boolean(aprovarRepasse)}
        onClose={() => setAprovarRepasse(null)}
        title="Aprovar e Executar Repasse"
        description={`Confirmar repasse de ${formatCurrency(aprovarRepasse?.valor_liquido ?? 0)} para o credor? Esta ação marcará o repasse como executado.`}
        confirmLabel="Aprovar e Executar"
        onConfirm={async () => {
          await repassesApi.aprovar(aprovarRepasse!.id)
          await repassesApi.executar(aprovarRepasse!.id)
          refresh()
        }}
      />

      <ConfirmModal
        open={Boolean(deleteCreador)}
        onClose={() => setDeleteCreador(null)}
        title="Excluir Credor"
        description={`Tem certeza que deseja excluir "${deleteCreador?.razao_social}"? Todas as dívidas e negociações associadas também serão excluídas. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          await credoresApi.delete(deleteCreador!.id)
          refresh()
        }}
      />
    </>
  )
}
