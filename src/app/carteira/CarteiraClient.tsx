'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, getTipoLabel } from '@/lib/utils'
import { NovaDividaModal } from '@/components/modals/NovaDividaModal'
import { NovoDevedorModal } from '@/components/modals/NovoDevedorModal'
import { ImportarPlanilhaModal } from '@/components/modals/ImportarPlanilhaModal'
import {
  Search, Filter, Upload, ChevronRight,
  Building2, User, ArrowUpDown, Plus, UserPlus,
} from 'lucide-react'
import type { APIDividaListOut, APICredorOut } from '@/lib/api'
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
  const [sortBy, setSortBy] = useState<'valor' | 'dias' | 'vencimento'>('dias')
  const [novaDividaOpen, setNovaDividaOpen] = useState(false)
  const [novoDevedorOpen, setNovoDevedorOpen] = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)

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

    if (statusFilter) {
      result = result.filter((d) => d.status === statusFilter)
    }

    if (credorFilter) {
      result = result.filter((d) => d.credor_id === Number(credorFilter))
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'valor') return b.valor_atualizado - a.valor_atualizado
      if (sortBy === 'dias') return b.dias_sem_contato - a.dias_sem_contato
      return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
    })
  }, [dividas, search, statusFilter, credorFilter, sortBy])

  const totalFiltered = filtered.reduce((sum, d) => sum + d.valor_atualizado, 0)

  return (
    <>
    <div className="min-h-full bg-void">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-ink-primary tracking-tight">
              Carteira de Devedores
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
              onClick={() => setNovoDevedorOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-elevated hover:bg-overlay border border-border-default transition-colors text-ink-secondary text-sm font-medium rounded-lg px-3 py-2 md:px-4"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden md:inline">Novo Devedor</span>
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
            <input
              type="text"
              placeholder="Buscar devedor ou credor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | StatusDivida)}
              className="appearance-none bg-surface border border-border-subtle rounded-lg pl-8 pr-8 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
            <select
              value={credorFilter}
              onChange={(e) => setCredorFilter(e.target.value)}
              className="appearance-none bg-surface border border-border-subtle rounded-lg pl-8 pr-8 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              <option value="">Todos os credores</option>
              {credores.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.razao_social}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-surface border border-border-subtle rounded-lg p-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-ink-muted ml-1" />
            {([
              { key: 'dias' as const, label: 'Urgência' },
              { key: 'valor' as const, label: 'Valor' },
              { key: 'vencimento' as const, label: 'Vencimento' },
            ]).map((s) => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === s.key ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink-secondary'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table — desktop / Cards — mobile */}
        <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '80ms', opacity: 0 }}>
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[1fr_130px_140px_100px_120px_80px_60px_36px] gap-3 px-5 py-3 border-b border-border-subtle bg-elevated/50">
            {['Devedor', 'Chave', 'Credor', 'Tipo', 'Valor Atual', 'Status', 'Dias', ''].map((h) => (
              <span key={h} className="text-ink-muted text-[10px] font-mono uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-border-subtle">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-ink-muted text-sm">
                Nenhuma dívida encontrada com os filtros aplicados.
              </div>
            ) : (
              filtered.map((row) => (
                <Link key={row.id} href={`/carteira/${row.devedor_id}`}
                  className="group hover:bg-elevated/50 transition-colors table-row-hover block md:grid md:grid-cols-[1fr_130px_140px_100px_120px_80px_60px_36px] gap-3 px-4 md:px-5 py-3.5 items-center"
                >
                  {/* Mobile card layout */}
                  <div className="flex items-center justify-between md:contents">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-md bg-elevated border border-border-default flex items-center justify-center shrink-0">
                        {row.devedor_tipo === 'PJ' ? <Building2 className="w-3 h-3 text-ink-muted" /> : <User className="w-3 h-3 text-ink-muted" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-ink-primary text-sm font-medium truncate group-hover:text-accent-light transition-colors">
                          {row.devedor_nome ?? `Devedor #${row.devedor_id}`}
                        </p>
                        <p className="text-ink-muted text-xs truncate md:hidden">
                          {(row.credor_nome ?? '').replace(' S.A.', '').replace(' Ltda.', '')} · {formatCurrency(row.valor_atualizado)}
                        </p>
                        {row.chave_divida && (
                          <p className="font-mono text-[10px] text-accent/60 mt-0.5 truncate md:hidden">
                            {row.chave_divida}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:contents shrink-0 ml-2">
                      <StatusBadge status={row.status as StatusDivida} size="sm" />
                      <ChevronRight className="w-4 h-4 text-ink-disabled group-hover:text-ink-muted transition-colors" />
                    </div>
                  </div>
                  {/* Desktop-only columns */}
                  <span className="hidden md:flex items-center gap-1">
                    <span className="font-mono text-[11px] font-semibold text-accent-light bg-accent/10 border border-accent/20 rounded px-1.5 py-0.5 truncate">
                      {row.chave_divida}
                    </span>
                  </span>
                  <span className="hidden md:block text-ink-secondary text-xs truncate">
                    {(row.credor_nome ?? '').replace(' S.A.', '').replace(' Ltda.', '')}
                  </span>
                  <span className="hidden md:block text-ink-muted text-xs font-mono">{getTipoLabel(row.tipo as any)}</span>
                  <span className="hidden md:block font-mono text-sm font-medium text-ink-primary">{formatCurrency(row.valor_atualizado)}</span>
                  <span className="hidden md:block"><StatusBadge status={row.status as StatusDivida} size="sm" /></span>
                  <span className="hidden md:block font-mono text-xs font-bold" style={{ color: row.dias_sem_contato >= 7 ? '#ef4444' : row.dias_sem_contato >= 3 ? '#f59e0b' : '#7a9bc8' }}>
                    {row.dias_sem_contato}d
                  </span>
                  <ChevronRight className="hidden md:block w-4 h-4 text-ink-disabled group-hover:text-ink-muted transition-colors" />
                </Link>
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
      <NovoDevedorModal
        open={novoDevedorOpen}
        onClose={() => setNovoDevedorOpen(false)}
        onSuccess={() => router.refresh()}
      />
      <ImportarPlanilhaModal
        open={importarOpen}
        onClose={() => setImportarOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
