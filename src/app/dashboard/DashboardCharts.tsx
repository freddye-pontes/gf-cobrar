'use client'

import { formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { APIChartPoint, APIStatusCarteira } from '@/lib/api'

interface Props {
  chartData: APIChartPoint[]
  statusCarteira: APIStatusCarteira[]
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

export function DashboardCharts({ chartData, statusCarteira }: Props) {
  const totalDividas = statusCarteira.reduce((acc, s) => acc + s.count, 0)

  return (
    <div className="space-y-4">
      {/* Recovery Chart */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '300ms', opacity: 0 }}>
        <div className="mb-4">
          <h3 className="font-display font-semibold text-ink-primary text-sm">Recuperação Mensal</h3>
          <p className="text-ink-muted text-xs mt-0.5">Últimos 6 meses</p>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2d50" />
            <XAxis
              dataKey="mes"
              tick={{ fill: '#3d5580', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#3d5580', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0f1f3d',
                border: '1px solid #1e3566',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                color: '#dce8fc',
              }}
              formatter={(value: number) => [formatCurrencyCompact(value), 'Recuperado']}
            />
            <Area
              type="monotone"
              dataKey="recuperado"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#recGrad)"
              dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#34d399' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status da Carteira */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '350ms', opacity: 0 }}>
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
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span className="font-mono text-xs text-ink-secondary w-4 text-right shrink-0">{s.count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PTPs Próximas — placeholder até ter endpoint dedicado */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '400ms', opacity: 0 }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-violet" />
          <h3 className="font-display font-semibold text-ink-primary text-sm">PTPs Próximas</h3>
        </div>
        <p className="text-ink-muted text-xs">
          Acesse{' '}
          <a href="/negociacao" className="text-accent-light hover:text-accent underline underline-offset-2">
            Negociações
          </a>{' '}
          para ver todas as PTPs ativas.
        </p>
      </div>
    </div>
  )
}
