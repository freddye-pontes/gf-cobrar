'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type KpiVariant = 'blue' | 'emerald' | 'teal' | 'amber' | 'danger' | 'violet' | 'orange' | 'slate'

interface KPICardProps {
  label:      string
  value:      string
  sublabel?:  string
  icon:       LucideIcon
  variant?:   KpiVariant
  trend?:     { value: string; positive: boolean }
  animDelay?: string
  className?: string
}

const variantMap: Record<KpiVariant, {
  bg: string
  border: string
  text: string
  badge: string
  glow: string
}> = {
  blue:    { bg: 'from-blue-900/50 to-bg-card',    border: 'border-blue-700/30',    text: 'text-blue-400',    badge: 'bg-blue-400/15',    glow: 'rgba(59,130,246,0.15)' },
  emerald: { bg: 'from-emerald-900/50 to-bg-card', border: 'border-emerald-700/30', text: 'text-emerald-400', badge: 'bg-emerald-400/15', glow: 'rgba(16,185,129,0.15)' },
  teal:    { bg: 'from-cyan-900/50 to-bg-card',    border: 'border-cyan-700/30',    text: 'text-cyan-400',    badge: 'bg-cyan-400/15',    glow: 'rgba(6,182,212,0.15)'  },
  amber:   { bg: 'from-amber-900/50 to-bg-card',   border: 'border-amber-700/30',   text: 'text-amber-400',   badge: 'bg-amber-400/15',   glow: 'rgba(245,158,11,0.15)' },
  danger:  { bg: 'from-red-900/50 to-bg-card',     border: 'border-red-700/30',     text: 'text-red-400',     badge: 'bg-red-400/15',     glow: 'rgba(239,68,68,0.15)'  },
  violet:  { bg: 'from-purple-900/50 to-bg-card',  border: 'border-purple-700/30',  text: 'text-purple-400',  badge: 'bg-purple-400/15',  glow: 'rgba(139,92,246,0.15)' },
  orange:  { bg: 'from-orange-900/50 to-bg-card',  border: 'border-orange-700/30',  text: 'text-orange-400',  badge: 'bg-orange-400/15',  glow: 'rgba(249,115,22,0.15)' },
  slate:   { bg: 'from-slate-800/50 to-bg-card',   border: 'border-border-default', text: 'text-ink-primary', badge: 'bg-white/10',        glow: 'rgba(255,255,255,0.05)'},
}

export function KPICard({
  label,
  value,
  sublabel,
  icon: Icon,
  variant = 'slate',
  trend,
  animDelay,
  className = '',
}: KPICardProps) {
  const s = variantMap[variant]
  const fontSize = value.length > 12 ? '1rem' : value.length > 9 ? '1.2rem' : '1.4rem'

  return (
    <div
      className={`relative bg-gradient-to-br ${s.bg} border ${s.border} rounded-xl p-4 flex flex-col gap-3 min-w-0 overflow-hidden hover:brightness-105 transition-all duration-200 animate-fade-up cursor-default ${className}`}
      style={{ animationDelay: animDelay, opacity: 0 }}
    >
      {/* Glow decorativo */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-25 pointer-events-none"
        style={{ background: s.glow }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <p className="text-[10.5px] text-ink-muted uppercase tracking-wider font-medium leading-tight">
          {label}
        </p>
        <span className={`p-1.5 rounded-lg ${s.badge} ${s.text} flex-shrink-0`}>
          <Icon size={14} strokeWidth={2} />
        </span>
      </div>

      {/* Valor principal */}
      <p
        className={`font-bold leading-none ${s.text} relative z-10`}
        style={{ fontSize }}
      >
        {value}
      </p>

      {/* Rodapé: sublabel + trend */}
      <div className="flex items-center justify-between gap-2 mt-auto relative z-10">
        {sublabel && (
          <span className="text-[10.5px] text-ink-muted truncate">{sublabel}</span>
        )}
        {trend && <MomBadge value={trend.value} positive={trend.positive} />}
      </div>
    </div>
  )
}

function MomBadge({ value, positive }: { value: string | null; positive: boolean }) {
  if (value === null) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-ink-muted">
        <Minus className="w-3 h-3" /> —
      </span>
    )
  }
  const Icon = positive ? TrendingUp : TrendingDown
  const color = positive ? 'text-emerald-400' : 'text-red-400'
  return (
    <span className={`flex items-center gap-1 text-[11px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {value}
    </span>
  )
}
