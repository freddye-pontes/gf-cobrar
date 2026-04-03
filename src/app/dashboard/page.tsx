import { AppLayout } from '@/components/layout/AppLayout'
import { KPICard } from '@/components/ui/KPICard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { dashboardApi, dividasApi, type APIDividaListOut, type APIStatusCarteira } from '@/lib/api'
import { formatCurrency, formatCurrencyCompact, getUrgenciaColors } from '@/lib/utils'
import type { StatusDivida } from '@/lib/types'
import {
  DollarSign, TrendingUp, Clock, AlertTriangle,
  CheckSquare, MessageSquare, Phone, FileText,
  ArrowRight, Calendar, Zap,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { DashboardCharts } from './DashboardCharts'

// Urgência derivada dos dados da API
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

const STATUS_LABELS: Record<string, string> = {
  em_aberto: 'Em Aberto',
  em_negociacao: 'Negociando',
  ptp_ativa: 'PTP Ativa',
  judicial: 'Judicial',
  pago: 'Pago',
  encerrado: 'Encerrado',
}

const STATUS_COLORS: Record<string, string> = {
  em_aberto: '#3b82f6',
  em_negociacao: '#fbbf24',
  ptp_ativa: '#a78bfa',
  judicial: '#f87171',
  pago: '#34d399',
  encerrado: '#475569',
}

export default async function DashboardPage() {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Fetch data from API (parallel)
  const [kpis, chartData, statusCarteira, workQueue] = await Promise.all([
    dashboardApi.kpis().catch(() => null),
    dashboardApi.chart().catch(() => []),
    dashboardApi.statusCarteira().catch(() => [] as APIStatusCarteira[]),
    dividasApi.workQueue().catch(() => [] as APIDividaListOut[]),
  ])

  const isOffline = kpis === null

  return (
    <AppLayout>
      <div className="min-h-full bg-void">
        {/* Page Header */}
        <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg md:text-xl text-ink-primary tracking-tight">
                Dashboard Operacional
              </h1>
              <p className="text-ink-muted text-xs font-mono mt-0.5 capitalize hidden sm:block">{today}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 bg-surface border border-border-subtle rounded-lg px-3 py-2">
                <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-danger' : 'bg-emerald animate-pulse-dot'}`} />
                <span className="text-ink-secondary text-xs font-mono">
                  {isOffline ? 'API offline' : 'Sistema online'}
                </span>
              </div>
              <Link
                href="/carteira"
                className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 md:px-4 py-2"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Importar CSV</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <KPICard
              label="Total em Carteira"
              value={formatCurrencyCompact(kpis?.total_carteira ?? 0)}
              icon={DollarSign}
              sublabel="carteira ativa"
              accentColor="blue"
              animDelay="0ms"
            />
            <KPICard
              label="Recuperado no Mês"
              value={formatCurrencyCompact(kpis?.recuperado_mes ?? 0)}
              icon={TrendingUp}
              sublabel={`${kpis?.taxa_recuperacao ?? 0}% da carteira`}
              accentColor="emerald"
              animDelay="50ms"
            />
            <KPICard
              label="PTPs Ativas"
              value={String(kpis?.ptps_ativas ?? 0)}
              icon={Clock}
              sublabel="Promessas de pagamento"
              accentColor="violet"
              animDelay="100ms"
            />
            <KPICard
              label="Sem Contato D+7"
              value={String(kpis?.sem_contato_d7 ?? 0)}
              icon={AlertTriangle}
              sublabel="Atenção imediata"
              accentColor="danger"
              animDelay="150ms"
            />
            <KPICard
              label="Tarefas Hoje"
              value={String(kpis?.tarefas_hoje ?? 0)}
              icon={CheckSquare}
              sublabel="Na fila priorizada"
              accentColor="amber"
              animDelay="200ms"
            />
          </div>

          {/* Main content: Work Queue + Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Work Queue */}
            <div className="xl:col-span-2 bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '250ms', opacity: 0 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                <div>
                  <h2 className="font-display font-semibold text-ink-primary text-sm tracking-wide">
                    Fila de Trabalho
                  </h2>
                  <p className="text-ink-muted text-xs mt-0.5">
                    Ordenada por urgência · {workQueue.length} itens
                  </p>
                </div>
                <Link
                  href="/carteira"
                  className="text-accent-light text-xs font-medium hover:text-accent transition-colors flex items-center gap-1"
                >
                  Ver carteira completa <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {workQueue.length === 0 ? (
                <div className="px-5 py-10 text-center text-ink-muted text-sm">
                  {isOffline ? 'Não foi possível carregar a fila — verifique se o backend está rodando.' : 'Nenhuma tarefa pendente.'}
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {workQueue.slice(0, 15).map((item, index) => {
                    const urgencia = getUrgencia(item)
                    const etiqueta = getEtiqueta(item)
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-4 px-5 py-3.5 hover:bg-elevated/50 transition-colors cursor-pointer group ${urgencia === 'alta' ? 'priority-alta' : urgencia === 'media' ? 'priority-media' : 'priority-baixa'}`}
                      >
                        {/* Priority number */}
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold"
                          style={{
                            background: `${getUrgenciaColors(urgencia)}22`,
                            color: getUrgenciaColors(urgencia),
                            border: `1px solid ${getUrgenciaColors(urgencia)}44`,
                          }}
                        >
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
                            <span
                              className="text-[10px] font-mono font-bold rounded px-1.5 py-0.5 shrink-0"
                              style={{
                                color: getUrgenciaColors(urgencia),
                                background: `${getUrgenciaColors(urgencia)}18`,
                                border: `1px solid ${getUrgenciaColors(urgencia)}35`,
                              }}
                            >
                              {etiqueta}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-ink-muted text-xs truncate">
                              {item.credor_nome ?? `Credor #${item.credor_id}`}
                            </span>
                            <span className="text-ink-disabled text-xs">·</span>
                            <span className="font-mono text-xs text-ink-secondary font-medium">
                              {formatCurrency(item.valor_atualizado)}
                            </span>
                          </div>
                          <p className="text-xs text-ink-secondary mt-1">{item.acoes_recomendadas}</p>
                        </div>

                        {/* Status + actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusBadge status={item.status as StatusDivida} size="sm" />
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 rounded-md bg-emerald-dim border border-emerald/20 text-emerald hover:bg-emerald/20 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                            <button
                              className="p-1.5 rounded-md bg-accent-dim border border-accent/20 text-accent-light hover:bg-accent/20 transition-colors"
                              title="Ligar"
                            >
                              <Phone className="w-3 h-3" />
                            </button>
                            <Link
                              href={`/carteira/${item.devedor_id}`}
                              className="p-1.5 rounded-md bg-elevated border border-border-default text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors"
                              title="Ver perfil"
                            >
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

            {/* Right column — charts (client component for Recharts) */}
            <DashboardCharts
              chartData={chartData}
              statusCarteira={statusCarteira}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
