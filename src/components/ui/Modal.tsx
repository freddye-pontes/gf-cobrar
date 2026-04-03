'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ title, open, onClose, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full sm:${widths[size]} bg-surface border-t sm:border border-border-subtle rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]`}
        style={{ animation: 'fadeUp 0.15s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
          <h2 className="font-display font-bold text-ink-primary text-base">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border-subtle shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
