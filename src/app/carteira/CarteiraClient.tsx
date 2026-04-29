'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmModal } from '@/components/modals/ConfirmModal'
import { formatCurrency } from '@/lib/utils'
import { NovaDividaModal } from '@/components/modals/NovaDividaModal'
import { ImportarPlanilhaModal } from '@/components/modals/ImportarPlanilhaModal'
import { NovaNegociacaoModal } from '@/components/modals/NovaNegociacaoModal'
import { dividasApi, type APIDividaListOut, type APICredorOut } from '@/lib/api'
import {
  Search, Filter, Upload, ChevronRight,
  Building2, User, ArrowUpDown, Plus, X, Calendar, AlertTriangle, Trash2, Handshake,
} from 'lucide-react'
import type { StatusDivida } from '@/lib/types'

const STATUS_OPTIONS: { value: '' | StatusDivida; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'em_aberto', label: 'Em Aberto' },
  { value: 'em_negociacao', label: 'Negociando' },
  { value: 'ptp_ativa', label: 'PTP Ativa' },
  { value: 'pago', label: 'Pago' },
  { value: 'judicial', label: 'Judicial' },
  { value: 'encerrado', label: 'Encerrado' },
]

interface Props {
  dividas: APIDividaListOut[]
  credores: APICredorOut[]
}

export function CarteiraClient({ dividas, credores }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | StatusDivida>('')
  const [credorFilter, setCredorFilter] = useState('')
  const [agingFilter, setAgingFilter] = useState<'' | 'baixa' | 'media' | 'alta' | 'critica'>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroCadastro, setFiltroCadastro] = useState(false)
  const [sortBy, setSortBy] = useState<'valor' | 'dias' | 'vencimento'>('dias')

  const [novaDividaOpen, setNovaDividaOpen] = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)
  const [deleteDivida, setDeleteDivida] = useState<APIDividaListOut | null>(null)
  const [negociarDivida, setNegociarDivida] = useState<APIDividaListOut | null>(null)

  const hasActiveFilters = !!(search || statusFilter || credorFilter || agingFilter || dataInicio || dataFim || filtroCadastro)

  function clearFilters() {
    setSearch(''); setStatusFilter(''); setCredorFilter('')
    setAgingFilter(''); setDataInicio(''); setDataFim(''); setFiltroCadastro(false)
  }

  const filtered = useMemo(() => {
    let result = dividas
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          (d.devedor_nome ?? '').toLowerCase().includes(q) ||
          (d.credor_nome ?? '').toLowerCase().includes(q),
      )
    }
    if (statusFilter) result = result.filter((d) => d.status === statusFilter)
    if (credorFilter) result = result.filter((d) => d.credor_id === Number(credorFilter))
    if (agingFilter) result = result.filter((d) => d.faixa_aging === agingFilter)
    if (filtroCadastro) result = result.filter((d) => d.devedor_cadastro_status === 'CADASTRO_INCOMPLETO')
    if (dataInicio) result = result.filter((d) => d.data_vencimento >= dataInicio)
    if (dataFim) result = result.filter((d) => d.data_vencimento <= dataFim)
    return [...result].sort((a, b) => {
      if (sortBy === 'valor') return b.valor_atualizado - a.valor_atualizado
      if (sortBy === 'dias') return b.dias_sem_contato - a.dias_sem_contato
      return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
    })
  }, [dividas, search, statusFilter, credorFilter, agingFilter, dataInicio, dataFim, filtroCadastro, sortBy])

  const totalFiltered = filtered.reduce((sum, d) => sum + d.valor_atualizado, 0)

  return (
    <>
    <div className="min-h-full bg-void">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-ink-primary tracking-tight">
              Carteira de Dívidas
            </h1>
            <p className="text-ink-muted text-xs font-mono mt-0.5">
              {filtered.length} dívidas · {formatCurrency(totalFiltered)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportarOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-elevated hover:bg-overlay border border-border-default transition-colors text-ink-secondary text-sm font-medium rounded-lg px-4 py-2">
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Importar CSV</span>
            </button>
            <button
              onClick={() => setNovaDividaOpen(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 py-2 md:px-4"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Dívida</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5 animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
            <input type="text" placeholder="Buscar devedor ou credor..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/50 transition-colors" />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | StatusDivida)}
              className="appearance-none bg-surface border border-border-subtle rounded-lg pl-8 pr-8 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent/50 cursor-pointer">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
            <select value={credorFilter} onChange={(e) => setCredorFilter(e.target.value)}
              className="appearance-none bg-surface border border-border-subtle rounded-lg pl-8 pr-8 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent/50 cursor-pointer">
              <option value="">Todos os credores</option>
              {credores.map((c) => <option key={c.id} value={String(c.id)}>{c.razao_social}</option>)}
            </select>
          </div>

          <div className="relative">
            <select value={agingFilter} onChange={(e) => setAgingFilter(e.target.value as any)}
              className="appearance-none bg-surface border border-border-subtle rounded-lg pl-3 pr-8 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent/50 cursor-pointer">
              <option value="">Todas as faixas</option>
              <option value="baixa">Baixa (1–30d)</option>
              <option value="media">Média (31–90d)</option>
              <option value="alta">Alta (91–180d)</option>
              <option value="critica">Crítica (+180d)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-surface border border-border-subtle rounded-lg px-2 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
              className="bg-transparent text-xs text-ink-secondary focus:outline-none w-[110px]" />
            <span className="text-ink-disabled text-xs">→</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              className="bg-transparent text-xs text-ink-secondary focus:outline-none w-[110px]" />
          </div>

          <button onClick={() => setFiltroCadastro((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              filtroCadastro ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-surface border-border-subtle text-ink-muted hover:text-ink-secondary'
            }`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            Incompletos
          </button>

          <div className="flex items-center gap-1 bg-surface border border-border-subtle rounded-lg p-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-ink-muted ml-1" />
            {([
              { key: 'dias' as const, label: 'Urgência' },
              { key: 'valor' as const, label: 'Valor' },
              { key: 'vencimento' as const, label: 'Vencimento' },
            ]).map((s) => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === s.key ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink-secondary'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-danger border border-danger/30 hover:bg-danger-dim transition-colors">
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '80ms', opacity: 0 }}>
          <div className="hidden md:grid grid-cols-[1fr_130px_140px_110px_120px_80px_64px] gap-3 px-5 py-3 border-b"
            style={{ background: '#F1F5F9', borderColor: '#E2E8F0' }}>
            {['Devedor', 'Chave', 'Credor', 'Aging', 'Valor Atual', 'Status', ''].map((h) => (
              <span key={h} className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: h ? '#64748B' : 'transparent' }}>{h || '·'}</span>
            ))}
          </div>

          <div className="divide-y divide-border-subtle">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-ink-muted text-sm">
                Nenhuma dívida encontrada com os filtros aplicados.
              </div>
            ) : (
              filtered.map((row) => (
                <div key={row.id}
                  className="group hover:bg-elevated/50 transition-colors block md:grid md:grid-cols-[1fr_130px_140px_110px_120px_80px_64px] gap-3 px-4 md:px-5 py-3.5 items-center"
                >
                  {/* Col 1 — Devedor */}
                  <Link href={`/carteira/${row.devedor_id}`} className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-elevated border border-border-default flex items-center justify-center shrink-0">
                      {row.devedor_tipo === 'PJ' ? <Building2 className="w-3 h-3 text-ink-muted" /> : <User className="w-3 h-3 text-ink-muted" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-ink-primary text-sm font-medium truncate group-hover:text-accent-light transition-colors">
                          {row.devedor_nome ?? `Devedor #${row.devedor_id}`}
                        </p>
                        {row.devedor_cadastro_status === 'CADASTRO_INCOMPLETO' && (
                          <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Incompleto
                          </span>
                        )}
                      </div>
                      <p className="text-ink-muted text-xs truncate md:hidden">
                        {(row.credor_nome ?? '').replace(' S.A.', '').replace(' Ltda.', '')} · {formatCurrency(row.valor_atualizado)}
                      </p>
                      {row.chave_divida && (
                        <p className="font-mono text-[10px] text-accent/60 mt-0.5 truncate md:hidden">{row.chave_divida}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:hidden shrink-0 ml-auto">
                      <StatusBadge status={row.status as StatusDivida} size="sm" />
                      <ChevronRight className="w-4 h-4 text-ink-disabled" />
                    </div>
                  </Link>

                  {/* Col 2 — Chave */}
                  <span className="hidden md:flex items-center">
                    <span className="font-mono text-[11px] font-semibold text-white bg-accent/10 border border-accent/20 rounded px-1.5 py-0.5 truncate">
                      {row.chave_divida}
                    </span>
                  </span>
                  {/* Col 3 — Credor */}
                  <span className="hidden md:block text-ink-secondary text-xs truncate">
                    {(row.credor_nome ?? '').replace(' S.A.', '').replace(' Ltda.', '')}
                  </span>
                  {/* Col 4 — Aging */}
                  <span className="hidden md:flex flex-col gap-0.5">
                    <span className={`text-[10px] font-semibold font-mono uppercase tracking-wide ${
                      row.faixa_aging === 'critica' ? 'text-red-400' :
                      row.faixa_aging === 'alta'    ? 'text-orange-400' :
                      row.faixa_aging === 'media'   ? 'text-yellow-400' :
                      row.faixa_aging === 'baixa'   ? 'text-green-400' : 'text-ink-muted'
                    }`}>
                      {row.faixa_aging === 'critica' ? 'Crítica' : row.faixa_aging === 'alta' ? 'Alta' :
                       row.faixa_aging === 'media' ? 'Média' : row.faixa_aging === 'baixa' ? 'Baixa' : 'Em dia'}
                    </span>
                    {row.faixa_aging !== 'em_dia' && (
                      <span className="text-[10px] text-ink-muted font-mono">{row.dias_atraso}d · {row.comissao_sugerida}%</span>
                    )}
                    {row.comissao_sugerida > 0 && (
                      <span className="text-[10px] font-mono text-amber">
                        Comissão: {((row.valor_atualizado * row.comissao_sugerida) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </span>
                  {/* Col 5 — Valor */}
                  <span className="hidden md:block font-mono text-sm font-medium text-ink-primary">{formatCurrency(row.valor_atualizado)}</span>
                  {/* Col 6 — Status */}
                  <span className="hidden md:block"><StatusBadge status={row.status as StatusDivida} size="sm" /></span>
                  {/* Col 7 — Actions */}
                  <div className="hidden md:flex items-center gap-1 justify-end">
                    {['em_aberto', 'em_negociacao'].includes(row.status) && (
                      <button
                        onClick={() => setNegociarDivida(row)}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-accent-light hover:bg-accent-dim transition-colors"
                        title="Negociar"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteDivida(row)}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-dim transition-colors"
                      title="Excluir dívida"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link href={`/carteira/${row.devedor_id}`}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

      <NovaDividaModal
        open={novaDividaOpen}
        onClose={() => setNovaDividaOpen(false)}
        onSuccess={() => router.refresh()}
      />
      <NovaNegociacaoModal
        open={!!negociarDivida}
        onClose={() => setNegociarDivida(null)}
        onSuccess={() => { setNegociarDivida(null); router.refresh() }}
        preselectedDividaId={negociarDivida?.id}
      />
      <ImportarPlanilhaModal
        open={importarOpen}
        onClose={() => setImportarOpen(false)}
        onSuccess={() => router.refresh()}
      />
      <ConfirmModal
        open={!!deleteDivida}
        onClose={() => setDeleteDivida(null)}
        title="Excluir Dívida"
        description={`Tem certeza que deseja excluir a dívida ${deleteDivida?.chave_divida ?? ''} de ${deleteDivida?.devedor_nome ?? ''}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          await dividasApi.delete(deleteDivida!.id)
          router.refresh()
        }}
      />
    </>
  )
}
