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
  leftBorder: string
  text: string
  badge: string
}> = {
  blue:    { leftBorder: 'border-l-[#FF6600]', text: 'text-[#FF6600]',    badge: 'bg-[#FF6600]/10'    },
  emerald: { leftBorder: 'border-l-[#10B981]', text: 'text-[#10B981]',    badge: 'bg-[#10B981]/10'    },
  teal:    { leftBorder: 'border-l-[#0891B2]', text: 'text-[#0891B2]',    badge: 'bg-[#0891B2]/10'    },
  amber:   { leftBorder: 'border-l-[#D97706]', text: 'text-[#D97706]',    badge: 'bg-[#D97706]/10'    },
  danger:  { leftBorder: 'border-l-[#E63946]', text: 'text-[#E63946]',    badge: 'bg-[#E63946]/10'    },
  violet:  { leftBorder: 'border-l-[#7C3AED]', text: 'text-[#7C3AED]',    badge: 'bg-[#7C3AED]/10'    },
  orange:  { leftBorder: 'border-l-[#FF6600]', text: 'text-[#FF6600]',    badge: 'bg-[#FF6600]/10'    },
  slate:   { leftBorder: 'border-l-[#64748B]', text: 'text-[#64748B]',    badge: 'bg-[#64748B]/10'    },
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
      className={`relative bg-white border border-[#E2E8F0] border-l-4 ${s.leftBorder} rounded-xl p-4 flex flex-col gap-3 min-w-0 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 animate-fade-up cursor-default ${className}`}
      style={{ animationDelay: animDelay, opacity: 0 }}
    >

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] text-[#64748B] uppercase tracking-wider font-medium leading-tight">
          {label}
        </p>
        <span className={`p-1.5 rounded-lg ${s.badge} ${s.text} flex-shrink-0`}>
          <Icon size={14} strokeWidth={2} />
        </span>
      </div>

      {/* Valor principal */}
      <p
        className={`font-bold leading-none text-[#1A1A1A]`}
        style={{ fontSize }}
      >
        {value}
      </p>

      {/* Rodapé: sublabel + trend */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {sublabel && (
          <span className="text-[10.5px] text-[#94A3B8] truncate">{sublabel}</span>
        )}
        {trend && <MomBadge value={trend.value} positive={trend.positive} />}
      </div>
    </div>
  )
}

function MomBadge({ value, positive }: { value: string | null; positive: boolean }) {
  if (value === null) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
        <Minus className="w-3 h-3" /> —
      </span>
    )
  }
  const Icon = positive ? TrendingUp : TrendingDown
  const color = positive ? 'text-[#10B981]' : 'text-[#E63946]'
  return (
    <span className={`flex items-center gap-1 text-[11px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {value}
    </span>
  )
}
