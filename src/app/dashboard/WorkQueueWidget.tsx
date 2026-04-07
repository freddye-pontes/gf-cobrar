'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, getUrgenciaColors } from '@/lib/utils'
import type { APIDividaListOut } from '@/lib/api'
import type { StatusDivida } from '@/lib/types'
import {
  MessageSquare, Phone, FileText, ArrowRight,
  Search, MessageCircle, Mail, PhoneCall, Monitor,
} from 'lucide-react'

const CANAL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-3 h-3 text-emerald" />,
  email:    <Mail className="w-3 h-3 text-accent-light" />,
  telefone: <PhoneCall className="w-3 h-3 text-amber" />,
  sistema:  <Monitor className="w-3 h-3 text-ink-muted" />,
}

const CANAL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email:    'E-mail',
  telefone: 'Ligação',
  sistema:  'Sistema',
}

function getUrgencia(d: APIDividaListOut): 'alta' | 'media' | 'baixa' {
  if (d.status === 'ptp_ativa' || d.dias_sem_contato >= 7) return 'alta'
  if (d.status === 'em_negociacao' || d.dias_sem_contato >= 3) return 'media'
  return 'baixa'
}

function getEtiqueta(d: APIDividaListOut): string {
  if (d.status === 'ptp_ativa') return 'PTP VENCE'
  if (d.dias_sem_contato >= 7) return `D+${d.dias_sem_contato}`
  if (d.status === 'em_negociacao') return 'NEGOCIANDO'
  if (d.dias_sem_contato >= 3) return `D+${d.dias_sem_contato}`
  return 'NOVO'
}

function formatUltimoContato(dias: number, canal: string | null): string {
  if (dias === 0) return 'Hoje'
  if (dias === 1) return `${CANAL_LABEL[canal ?? ''] ?? 'Contato'} ontem`
  if (dias < 7) return `${CANAL_LABEL[canal ?? ''] ?? 'Contato'} há ${dias}d`
  return `Sem contato há ${dias}d`
}

interface Props {
  workQueue: APIDividaListOut[]
  isOffline: boolean
}

export function WorkQueueWidget({ workQueue, isOffline }: Props) {
  const [search, setSearch] = useState('')
  const [minDias, setMinDias] = useState<number>(0)
  const [minValor, setMinValor] = useState<number>(0)

  const filtered = useMemo(() => {
    return workQueue.filter((item) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !(item.devedor_nome ?? '').toLowerCase().includes(q) &&
          !(item.credor_nome ?? '').toLowerCase().includes(q)
        ) return false
      }
      if (minDias > 0 && item.dias_sem_contato < minDias) return false
      if (minValor > 0 && item.valor_atualizado < minValor) return false
      return true
    })
  }, [workQueue, search, minDias, minValor])

  return (
    <div className="xl:col-span-2 bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '250ms', opacity: 0 }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-ink-primary text-sm tracking-wide">Fila de Trabalho</h2>
            <p className="text-ink-muted text-xs mt-0.5">
              Ordenada por urgência · {filtered.length}/{workQueue.length} itens
            </p>
          </div>
          <Link href="/carteira"
            className="text-accent-light text-xs font-medium hover:text-accent transition-colors flex items-center gap-1">
            Ver carteira completa <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar devedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-elevated border border-border-subtle rounded-lg pl-7 pr-3 py-1.5 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <select
            value={minDias}
            onChange={(e) => setMinDias(Number(e.target.value))}
            className="text-xs bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-ink-secondary focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            <option value={0}>Todos os D+</option>
            <option value={1}>D+1 ou mais</option>
            <option value={3}>D+3 ou mais</option>
            <option value={7}>D+7 ou mais</option>
            <option value={30}>D+30 ou mais</option>
          </select>
          <select
            value={minValor}
            onChange={(e) => setMinValor(Number(e.target.value))}
            className="text-xs bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-ink-secondary focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            <option value={0}>Qualquer valor</option>
            <option value={1000}>Acima R$ 1k</option>
            <option value={5000}>Acima R$ 5k</option>
            <option value={10000}>Acima R$ 10k</option>
            <option value={50000}>Acima R$ 50k</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-ink-muted text-sm">
          {isOffline
            ? 'Não foi possível carregar a fila — backend offline.'
            : search || minDias > 0 || minValor > 0
            ? 'Nenhum item com esses filtros.'
            : 'Nenhuma tarefa pendente.'}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {filtered.slice(0, 15).map((item, index) => {
            const urgencia = getUrgencia(item)
            const etiqueta = getEtiqueta(item)
            const cor = getUrgenciaColors(urgencia)
            return (
              <div key={item.id}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-elevated/50 transition-colors cursor-pointer group">
                {/* Priority number */}
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold"
                  style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}44` }}>
                  {index + 1}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-ink-primary text-sm font-medium truncate">
                      {item.devedor_nome ?? `Devedor #${item.devedor_id}`}
                    </span>
                    {item.devedor_tipo && (
                      <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-1.5 py-0.5 text-ink-muted shrink-0">
                        {item.devedor_tipo}
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold rounded px-1.5 py-0.5 shrink-0"
                      style={{ color: cor, background: `${cor}18`, border: `1px solid ${cor}35` }}>
                      {etiqueta}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-ink-muted text-xs truncate">
                      {item.credor_nome ?? `Credor #${item.credor_id}`}
                    </span>
                    <span className="text-ink-disabled text-xs">·</span>
                    <span className="font-mono text-xs text-ink-secondary font-medium">
                      {formatCurrency(item.valor_atualizado)}
                    </span>
                    {/* Último contato com ícone do canal */}
                    {item.dias_sem_contato >= 0 && (
                      <>
                        <span className="text-ink-disabled text-xs">·</span>
                        <span className="flex items-center gap-1 text-xs text-ink-muted">
                          {item.ultimo_canal && CANAL_ICONS[item.ultimo_canal]}
                          <span className={item.dias_sem_contato >= 7 ? 'text-danger' : item.dias_sem_contato >= 3 ? 'text-amber' : ''}>
                            {formatUltimoContato(item.dias_sem_contato, item.ultimo_canal)}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-ink-secondary mt-1">{item.acoes_recomendadas}</p>
                </div>

                {/* Status + actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={item.status as StatusDivida} size="sm" />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-md bg-emerald-dim border border-emerald/20 text-emerald hover:bg-emerald/20 transition-colors" title="WhatsApp">
                      <MessageSquare className="w-3 h-3" />
                    </button>
                    <button className="p-1.5 rounded-md bg-accent-dim border border-accent/20 text-accent-light hover:bg-accent/20 transition-colors" title="Ligar">
                      <Phone className="w-3 h-3" />
                    </button>
                    <Link href={`/carteira/${item.devedor_id}`}
                      className="p-1.5 rounded-md bg-elevated border border-border-default text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors" title="Ver perfil">
                      <FileText className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
