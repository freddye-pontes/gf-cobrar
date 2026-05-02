'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const META_DIA = 15000
const RECUPERADO_DIA = 7320
const OPERADOR_NOME = 'Gustavo Cardoso'
const CAMPANHA = 'Recuperação 01/2026'

export function BarraOperador() {
  const router = useRouter()
  const pct = Math.round((RECUPERADO_DIA / META_DIA) * 100)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border-subtle px-4 md:px-6 py-2.5 flex items-center gap-4 md:gap-8 shadow-sm">
      {/* Operador */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald animate-pulse-dot" />
        <span className="text-xs text-ink-secondary">
          <span className="font-semibold text-ink-primary">{OPERADOR_NOME}</span>
          <span className="text-ink-muted ml-1 hidden sm:inline">· Online</span>
        </span>
      </div>

      <div className="hidden md:flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-ink-muted font-mono uppercase tracking-wider">Campanha ativa:</span>
        <span className="text-xs text-ink-secondary font-medium ml-1">{CAMPANHA}</span>
      </div>

      {/* Meta do dia */}
      <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
        <span className="text-[10px] text-ink-muted font-mono uppercase tracking-wider whitespace-nowrap">Meta do dia:</span>
        <span className="text-xs font-mono text-ink-secondary whitespace-nowrap">{formatCurrency(META_DIA)}</span>
        <div className="flex-1 max-w-[120px] h-1.5 bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span className="text-xs font-mono text-emerald font-semibold whitespace-nowrap">
          {formatCurrency(RECUPERADO_DIA)} <span className="text-ink-muted font-normal">({pct}%)</span>
        </span>
      </div>

      {/* Encerrar */}
      <button
        onClick={() => router.push('/carteira')}
        className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger bg-danger-dim border border-danger/20 rounded-lg hover:bg-danger/20 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Encerrar atendimento</span>
        <span className="sm:hidden">Sair</span>
      </button>
    </div>
  )
}
