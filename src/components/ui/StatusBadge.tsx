import { getStatusLabel, getStatusColors } from '@/lib/utils'
import type { StatusDivida } from '@/lib/types'

interface StatusBadgeProps {
  status: StatusDivida
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = getStatusColors(status)
  const label = getStatusLabel(status)

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono font-medium rounded-md border"
      style={{
        background: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
        letterSpacing: '0.04em',
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          width: size === 'sm' ? '5px' : '6px',
          height: size === 'sm' ? '5px' : '6px',
          background: colors.text,
          boxShadow: `0 0 4px ${colors.text}`,
        }}
      />
      {label.toUpperCase()}
    </span>
  )
}
