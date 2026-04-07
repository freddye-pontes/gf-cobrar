'use client'

import { formatCurrencyCompact } from '@/lib/utils'
import { Calendar, TrendingDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { APIChartPoint, APIStatusCarteira, APIAgingBucket } from '@/lib/api'

interface Props {
  chartData: APIChartPoint[]
  statusCarteira: APIStatusCarteira[]
  agingData: APIAgingBucket[]
  ptpsQuebradaPct: number | null
  ptpsAtivas: number
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

const AGING_COLORS = ['#34d399', '#fbbf24', '#f97316', '#ef4444']

const tooltipStyle = {
  background: '#0f1f3d',
  border: '1px solid #1e3566',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'JetBrains Mono',
  color: '#dce8fc',
}

export function DashboardCharts({ chartData, statusCarteira, agingData, ptpsQuebradaPct, ptpsAtivas }: Props) {
  const totalDividas = statusCarteira.reduce((acc, s) => acc + s.count, 0)
  const hasChartData = chartData.some((p) => p.recuperado > 0)

  return (
    <div className="space-y-4">
      {/* ── Recuperação Mensal (Bar) ─────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '300ms', opacity: 0 }}>
        <div className="mb-4">
          <h3 className="font-display font-semibold text-ink-primary text-sm">Recuperação Mensal</h3>
          <p className="text-ink-muted text-xs mt-0.5">Últimos 6 meses</p>
        </div>
        {!hasChartData ? (
          <p className="text-ink-muted text-xs py-6 text-center">Sem pagamentos registrados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2d50" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#3d5580', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3d5580', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value: number) => [formatCurrencyCompact(value), 'Recuperado']} />
              <Bar dataKey="recuperado" fill="#10b981" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.recuperado > 0 ? '#10b981' : '#1e3566'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Aging da Dívida ────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '330ms', opacity: 0 }}>
        <div className="mb-4">
          <h3 className="font-display font-semibold text-ink-primary text-sm">Envelhecimento da Dívida</h3>
          <p className="text-ink-muted text-xs mt-0.5">Distribuição por dias sem contato</p>
        </div>
        {agingData.every((b) => b.count === 0) ? (
          <p className="text-ink-muted text-xs py-4 text-center">Sem dívidas ativas.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={agingData} margin={{ top: 2, right: 4, left: -28, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d50" vertical={false} />
                <XAxis dataKey="faixa" tick={{ fill: '#3d5580', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#3d5580', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value} dívidas · ${formatCurrencyCompact(props.payload.total)}`,
                    'Aging',
                  ]} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {agingData.map((_entry, i) => (
                    <Cell key={i} fill={AGING_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-2 flex-wrap">
              {agingData.map((b, i) => (
                <div key={b.faixa} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: AGING_COLORS[i] }} />
                  <span className="text-[10px] font-mono text-ink-muted">{b.faixa}: {b.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Status da Carteira ──────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '360ms', opacity: 0 }}>
        <h3 className="font-display font-semibold text-ink-primary text-sm mb-3">Status da Carteira</h3>
        {statusCarteira.length === 0 ? (
          <p className="text-ink-muted text-xs">Sem dados</p>
        ) : (
          <div className="space-y-2">
            {statusCarteira.map((s) => {
              const pct = totalDividas > 0 ? Math.round((s.count / totalDividas) * 100) : 0
              const color = STATUS_COLORS[s.status] ?? '#475569'
              const label = STATUS_LABELS[s.status] ?? s.status
              return (
                <div key={s.status} className="flex items-center gap-2">
                  <span className="text-ink-muted text-xs w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="font-mono text-xs text-ink-secondary w-4 text-right shrink-0">{s.count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── PTPs — Índice de Quebra ─────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '390ms', opacity: 0 }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-violet" />
          <h3 className="font-display font-semibold text-ink-primary text-sm">PTPs — Acordos</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-elevated/60 rounded-lg px-3 py-2.5">
            <p className="text-xl font-bold font-display text-violet-light">{ptpsAtivas}</p>
            <p className="text-[10px] text-ink-muted font-mono mt-0.5">PTPs ativas</p>
          </div>
          <div className={`rounded-lg px-3 py-2.5 ${ptpsQuebradaPct !== null && ptpsQuebradaPct > 50 ? 'bg-danger-dim border border-danger/20' : 'bg-elevated/60'}`}>
            {ptpsQuebradaPct !== null ? (
              <>
                <div className="flex items-center gap-1">
                  <TrendingDown className={`w-3.5 h-3.5 ${ptpsQuebradaPct > 50 ? 'text-danger' : 'text-amber'}`} />
                  <p className={`text-xl font-bold font-display ${ptpsQuebradaPct > 50 ? 'text-danger' : 'text-amber-light'}`}>
                    {ptpsQuebradaPct}%
                  </p>
                </div>
                <p className="text-[10px] text-ink-muted font-mono mt-0.5">Índice de quebra</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold font-display text-ink-muted">—</p>
                <p className="text-[10px] text-ink-muted font-mono mt-0.5">Sem histórico ainda</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
