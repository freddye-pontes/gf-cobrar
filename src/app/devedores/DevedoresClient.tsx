'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { NovoDevedorModal } from '@/components/modals/NovoDevedorModal'
import { ConfirmModal } from '@/components/modals/ConfirmModal'
import { devedoresApi, type APIDevedor } from '@/lib/api'
import {
  Search, Plus, User, Building2, Phone, Mail,
  MapPin, ChevronRight, Pencil, Filter, AlertTriangle, CheckCircle2, X, Trash2,
} from 'lucide-react'

interface Props {
  devedores: APIDevedor[]
}

function maskCPF(v: string) {
  return v.slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskCNPJ(v: string) {
  return v.slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function formatDoc(raw: string) {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return maskCPF(d)
  if (d.length === 14) return maskCNPJ(d)
  return raw
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

export function DevedoresClient({ devedores: initialDevedores }: Props) {
  const router = useRouter()
  const [devedores, setDevedores] = useState(initialDevedores)

  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'' | 'PF' | 'PJ'>('')
  const [cadastroFilter, setCadastroFilter] = useState<'' | 'COMPLETO' | 'CADASTRO_INCOMPLETO'>('')

  const [novoOpen, setNovoOpen] = useState(false)
  const [editDevedor, setEditDevedor] = useState<APIDevedor | null>(null)
  const [deleteDevedor, setDeleteDevedor] = useState<APIDevedor | null>(null)

  const hasFilters = !!(search || tipoFilter || cadastroFilter)

  function clearFilters() {
    setSearch(''); setTipoFilter(''); setCadastroFilter('')
  }

  async function refresh() {
    try {
      const updated = await devedoresApi.list()
      setDevedores(updated)
    } catch {}
    router.refresh()
  }

  const filtered = useMemo(() => {
    let result = devedores
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          d.nome.toLowerCase().includes(q) ||
          d.cpf_cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          (d.email ?? '').toLowerCase().includes(q)
      )
    }
    if (tipoFilter) result = result.filter((d) => d.tipo === tipoFilter)
    if (cadastroFilter) result = result.filter((d) => d.cadastro_status === cadastroFilter)
    return [...result].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [devedores, search, tipoFilter, cadastroFilter])

  const totalPF = devedores.filter((d) => d.tipo === 'PF').length
  const totalPJ = devedores.filter((d) => d.tipo === 'PJ').length
  const totalIncompleto = devedores.filter((d) => d.cadastro_status === 'CADASTRO_INCOMPLETO').length

  return (
    <>
      <AppLayout>
        <div className="min-h-full bg-void">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display font-bold text-lg md:text-xl text-ink-primary tracking-tight">
                  Cadastro de Devedores
                </h1>
                <p className="text-ink-muted text-xs font-mono mt-0.5 hidden sm:block">
                  {devedores.length} devedores · {totalPF} PF · {totalPJ} PJ
                  {totalIncompleto > 0 && (
                    <span className="text-amber-400 ml-2">· {totalIncompleto} incompleto{totalIncompleto > 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setNovoOpen(true)}
                className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 md:px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Devedor</span>
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
              {[
                { label: 'Total',        value: devedores.length,   color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)' },
                { label: 'Pessoa Física',value: totalPF,            color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)' },
                { label: 'Pessoa Jurídica',value: totalPJ,          color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
                { label: 'Cad. Incompleto',value: totalIncompleto,  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)' },
              ].map((s) => (
                <div key={s.label}
                  className="rounded-xl p-4 border cursor-default hover:brightness-110 transition-all"
                  style={{ background: s.bg, borderColor: s.border }}
                >
                  <p className="text-[10px] text-ink-muted font-mono uppercase tracking-wider">{s.label}</p>
                  <p className="font-bold text-2xl mt-1.5 font-display" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: '60ms', opacity: 0 }}>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
                <select
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value as '' | 'PF' | 'PJ')}
                  className="appearance-none bg-surface border border-border-subtle rounded-lg pl-8 pr-8 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent/50 cursor-pointer"
                >
                  <option value="">PF + PJ</option>
                  <option value="PF">Pessoa Física</option>
                  <option value="PJ">Pessoa Jurídica</option>
                </select>
              </div>

              <button
                onClick={() => setCadastroFilter((v) => v === 'CADASTRO_INCOMPLETO' ? '' : 'CADASTRO_INCOMPLETO')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  cadastroFilter === 'CADASTRO_INCOMPLETO'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-surface border-border-subtle text-ink-muted hover:text-ink-secondary'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Incompletos
              </button>

              {hasFilters && (
                <button onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-danger border border-danger/30 hover:bg-danger-dim transition-colors">
                  <X className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}

              <span className="ml-auto text-xs text-ink-muted font-mono hidden sm:block">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '120ms', opacity: 0 }}>
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[1fr_150px_160px_150px_80px_64px] gap-3 px-5 py-3 border-b"
                style={{ background: '#0d0d0d', borderColor: 'rgba(245,158,11,0.2)' }}>
                {['Devedor', 'Documento', 'Contato', 'Localização', 'Cadastro', ''].map((h) => (
                  <span key={h} className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color: h ? '#f59e0b' : 'transparent' }}>{h || '·'}</span>
                ))}
              </div>

              <div className="divide-y divide-border-subtle">
                {filtered.length === 0 ? (
                  <div className="py-16 text-center text-ink-muted text-sm">
                    Nenhum devedor encontrado.
                  </div>
                ) : (
                  filtered.map((d) => (
                    <div
                      key={d.id}
                      className="group hover:bg-elevated/50 transition-colors block md:grid md:grid-cols-[1fr_150px_160px_150px_80px_64px] gap-3 px-4 md:px-5 py-3.5 items-center"
                    >
                      {/* Col 1 — Nome + tipo */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-elevated border border-border-default flex items-center justify-center shrink-0">
                          {d.tipo === 'PJ'
                            ? <Building2 className="w-3.5 h-3.5 text-ink-muted" />
                            : <User className="w-3.5 h-3.5 text-ink-muted" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-ink-primary text-sm font-medium truncate">{d.nome}</p>
                            {d.cadastro_status === 'CADASTRO_INCOMPLETO' && (
                              <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Incompleto
                              </span>
                            )}
                          </div>
                          <p className="text-ink-muted text-[11px] font-mono">
                            {d.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                          </p>
                          {/* Mobile — doc + actions */}
                          <div className="flex items-center gap-3 mt-1 md:hidden">
                            <span className="font-mono text-[11px] text-ink-secondary">{formatDoc(d.cpf_cnpj)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Col 2 — Documento */}
                      <span className="hidden md:block font-mono text-xs text-ink-secondary">
                        {formatDoc(d.cpf_cnpj)}
                      </span>

                      {/* Col 3 — Contato */}
                      <div className="hidden md:flex flex-col gap-0.5 min-w-0">
                        {d.telefones?.[0] ? (
                          <div className="flex items-center gap-1 text-[11px] text-ink-secondary">
                            <Phone className="w-3 h-3 text-ink-muted shrink-0" />
                            <span className="font-mono truncate">{formatPhone(d.telefones[0])}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-disabled">—</span>
                        )}
                        {d.email && (
                          <div className="flex items-center gap-1 text-[11px] text-ink-muted">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{d.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Col 4 — Localização */}
                      <div className="hidden md:flex items-center gap-1 text-[11px] text-ink-secondary min-w-0">
                        {d.endereco?.cidade ? (
                          <>
                            <MapPin className="w-3 h-3 text-ink-muted shrink-0" />
                            <span className="truncate">{d.endereco.cidade}{d.endereco.estado ? `, ${d.endereco.estado}` : ''}</span>
                          </>
                        ) : (
                          <span className="text-ink-disabled">—</span>
                        )}
                      </div>

                      {/* Col 5 — Cadastro status */}
                      <div className="hidden md:flex items-center">
                        {d.cadastro_status === 'CADASTRO_INCOMPLETO' ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                            <AlertTriangle className="w-3 h-3" />
                            Incompleto
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald bg-emerald/10 border border-emerald/20 rounded-lg px-2 py-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completo
                          </span>
                        )}
                      </div>

                      {/* Col 6 — Actions */}
                      <div className="hidden md:flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditDevedor(d)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors"
                          title="Editar devedor"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteDevedor(d)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-dim transition-colors"
                          title="Excluir devedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/carteira/${d.id}`}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-accent-light hover:bg-elevated transition-colors"
                          title="Ver dívidas"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {/* Mobile — full row tap → edit */}
                      <div className="flex items-center justify-between mt-2 md:hidden">
                        <div className="flex items-center gap-2">
                          {d.telefones?.[0] && (
                            <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                              <Phone className="w-3 h-3" />{formatPhone(d.telefones[0])}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                          <button onClick={() => setEditDevedor(d)}
                            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteDevedor(d)}
                            className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-dim transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link href={`/carteira/${d.id}`}
                            className="p-1.5 rounded-lg text-ink-muted hover:text-accent-light hover:bg-elevated transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>

      <NovoDevedorModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        onSuccess={refresh}
      />

      {editDevedor && (
        <NovoDevedorModal
          open
          onClose={() => setEditDevedor(null)}
          onSuccess={refresh}
          devedor={editDevedor as any}
        />
      )}

      <ConfirmModal
        open={!!deleteDevedor}
        onClose={() => setDeleteDevedor(null)}
        title="Excluir Devedor"
        description={`Tem certeza que deseja excluir "${deleteDevedor?.nome}"? Todas as dívidas associadas também serão excluídas. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          await devedoresApi.delete(deleteDevedor!.id)
          setDevedores((prev) => prev.filter((d) => d.id !== deleteDevedor!.id))
          router.refresh()
        }}
      />
    </>
  )
}
