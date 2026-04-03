import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  icon: LucideIcon
  sublabel?: string
  accentColor?: 'blue' | 'amber' | 'emerald' | 'danger' | 'violet'
  trend?: { value: string; positive: boolean }
  className?: string
  animDelay?: string
}

const accentMap = {
  blue: {
    icon: 'text-accent-light',
    iconBg: 'bg-accent-dim',
    border: 'border-accent/20',
    glow: 'hover:glow-accent',
    value: 'text-accent-light',
  },
  amber: {
    icon: 'text-amber',
    iconBg: 'bg-amber-dim',
    border: 'border-amber/20',
    glow: 'hover:glow-amber',
    value: 'text-amber-light',
  },
  emerald: {
    icon: 'text-emerald',
    iconBg: 'bg-emerald-dim',
    border: 'border-emerald/20',
    glow: 'hover:glow-emerald',
    value: 'text-emerald-light',
  },
  danger: {
    icon: 'text-danger',
    iconBg: 'bg-danger-dim',
    border: 'border-danger/20',
    glow: 'hover:glow-danger',
    value: 'text-danger-light',
  },
  violet: {
    icon: 'text-violet',
    iconBg: 'bg-violet-dim',
    border: 'border-violet/20',
    glow: '',
    value: 'text-violet-light',
  },
}

export function KPICard({
  label,
  value,
  icon: Icon,
  sublabel,
  accentColor = 'blue',
  trend,
  className,
  animDelay,
}: KPICardProps) {
  const accent = accentMap[accentColor]

  return (
    <div
      className={cn(
        'relative bg-surface border rounded-xl p-4 transition-all duration-300',
        'hover:bg-elevated cursor-default animate-fade-up',
        accent.border,
        accent.glow,
        className
      )}
      style={{ animationDelay: animDelay, opacity: 0 }}
    >
      {/* Scan lines effect */}
      <div className="absolute inset-0 rounded-xl scan-lines pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-ink-muted text-xs font-mono uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className={cn('font-display font-bold text-2xl leading-none', accent.value)}>
            {value}
          </p>
          {sublabel && (
            <p className="text-ink-muted text-xs mt-1.5 font-body">{sublabel}</p>
          )}
          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1 mt-2 text-xs font-mono',
              trend.positive ? 'text-emerald' : 'text-danger'
            )}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.value} vs mês ant.</span>
            </div>
          )}
        </div>
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', accent.iconBg)}>
          <Icon className={cn('w-4.5 h-4.5', accent.icon)} size={18} />
        </div>
      </div>
    </div>
  )
}
