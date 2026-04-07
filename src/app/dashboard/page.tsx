import { AppLayout } from '@/components/layout/AppLayout'
import { KPICard } from '@/components/ui/KPICard'
import { dashboardApi, dividasApi, type APIDividaListOut, type APIStatusCarteira, type APIAgingBucket } from '@/lib/api'
import { formatCurrencyCompact } from '@/lib/utils'
import {
  DollarSign, TrendingUp, Clock, AlertTriangle, CheckSquare, Zap,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardCharts } from './DashboardCharts'
import { WorkQueueWidget } from './WorkQueueWidget'

export default async function DashboardPage() {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  const [kpis, chartData, statusCarteira, workQueue, agingData] = await Promise.all([
    dashboardApi.kpis().catch(() => null),
    dashboardApi.chart().catch(() => []),
    dashboardApi.statusCarteira().catch(() => [] as APIStatusCarteira[]),
    dividasApi.workQueue().catch(() => [] as APIDividaListOut[]),
    dashboardApi.aging().catch(() => [] as APIAgingBucket[]),
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
              <Link href="/carteira"
                className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 md:px-4 py-2">
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
              trend={kpis?.trend_carteira ?? undefined}
              animDelay="0ms"
            />
            <KPICard
              label="Recuperado no Mês"
              value={formatCurrencyCompact(kpis?.recuperado_mes ?? 0)}
              icon={TrendingUp}
              sublabel={`${kpis?.taxa_recuperacao ?? 0}% da carteira`}
              accentColor="emerald"
              trend={kpis?.trend_recuperado ?? undefined}
              animDelay="50ms"
            />
            <KPICard
              label="PTPs Ativas"
              value={String(kpis?.ptps_ativas ?? 0)}
              icon={Clock}
              sublabel={
                kpis?.ptps_quebradas_pct != null
                  ? `${kpis.ptps_quebradas_pct}% índice de quebra`
                  : 'Promessas de pagamento'
              }
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
            <WorkQueueWidget workQueue={workQueue} isOffline={isOffline} />

            <DashboardCharts
              chartData={chartData}
              statusCarteira={statusCarteira}
              agingData={agingData}
              ptpsQuebradaPct={kpis?.ptps_quebradas_pct ?? null}
              ptpsAtivas={kpis?.ptps_ativas ?? 0}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
