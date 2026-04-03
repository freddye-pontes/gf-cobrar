interface Props {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, hint, error, required, children }: Props) {
  return (
    <div>
      <label className="block text-ink-muted text-xs font-mono uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-ink-disabled text-xs mt-1">{hint}</p>}
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  )
}

// Shared input class — import and reuse across forms
export const inputCls =
  'w-full bg-elevated border border-border-default rounded-lg px-3 py-2.5 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent/60 transition-colors'

export const selectCls =
  'w-full appearance-none bg-elevated border border-border-default rounded-lg px-3 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-accent/60 transition-colors cursor-pointer'
