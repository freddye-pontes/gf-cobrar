'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Pencil } from 'lucide-react'
import { type APIDevedor } from '@/lib/api'
import { IntelligenciaDevedorModal } from '@/components/modals/IntelligenciaDevedorModal'
import { formatCurrency } from '@/lib/utils'

interface Props {
  devedor: APIDevedor
}

const PERFIL_LABEL: Record<string, string> = {
  assalariado_clt: 'Assalariado (CLT)',
  autonomo: 'Autônomo',
  empresario: 'Empresário',
  aposentado: 'Aposentado',
  desempregado: 'Desempregado',
}

const CHANCE_COLOR: Record<string, string> = {
  alta: 'bg-emerald-dim text-emerald border-emerald/20',
  media: 'bg-amber-dim text-amber border-amber/20',
  baixa: 'bg-danger-dim text-danger border-danger/20',
}

const HIST_COLOR: Record<string, string> = {
  bom: 'text-emerald',
  regular: 'text-amber',
  ruim: 'text-danger',
}

export function PainelInteligencia({ devedor }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const score = devedor.score_recuperabilidade
  const chance = devedor.chance_recuperacao
  const scoreColor =
    score == null ? '#94A3B8'
    : score >= 70 ? '#10B981'
    : score >= 40 ? '#D97706'
    : '#E63946'

  return (
    <>
      <div className="bg-surface border border-border-subtle rounded-xl p-4 animate-fade-up" style={{ animationDelay: '100ms', opacity: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink-primary text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" />
            Inteligência do Devedor
          </h3>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent-dim"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
        </div>

        <div className="space-y-2.5">
          {/* Score de Recuperação */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Score de Recuperação</span>
            <div className="flex items-center gap-2">
              {chance && (
                <span className={`text-[10px] font-mono font-bold uppercase border rounded px-1.5 py-0.5 ${CHANCE_COLOR[chance] ?? 'bg-elevated text-ink-muted border-border-default'}`}>
                  {chance === 'alta' ? 'Alta' : chance === 'media' ? 'Média' : 'Baixa'}
                </span>
              )}
              <span className="font-mono font-bold text-sm" style={{ color: scoreColor }}>
                {score ?? '—'}
              </span>
            </div>
          </div>

          {/* Barra de score */}
          {score != null && (
            <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${score}%`, background: scoreColor }}
              />
            </div>
          )}

          {/* Probabilidade */}
          {chance && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-muted">Probabilidade de Acordo</span>
              <span className={`text-xs font-semibold ${CHANCE_COLOR[chance]?.split(' ')[1] ?? 'text-ink-muted'}`}>
                {chance === 'alta' ? 'Alta' : chance === 'media' ? 'Média' : 'Baixa'}
                {score != null && ` · ${Math.round(score * 0.95)}%`}
              </span>
            </div>
          )}

          {/* Perfil financeiro */}
          {devedor.perfil_financeiro && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-muted">Perfil</span>
              <span className="text-xs text-ink-secondary font-medium">
                {PERFIL_LABEL[devedor.perfil_financeiro] ?? devedor.perfil_financeiro}
              </span>
            </div>
          )}

          {/* Renda estimada */}
          {(devedor.renda_estimada_min || devedor.renda_estimada_max) && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-muted">Renda estimada</span>
              <span className="text-xs font-mono text-ink-secondary">
                {devedor.renda_estimada_min ? formatCurrency(devedor.renda_estimada_min) : '—'}
                {devedor.renda_estimada_max ? ` – ${formatCurrency(devedor.renda_estimada_max)}` : ''}
              </span>
            </div>
          )}

          {/* Histórico de pagamento */}
          {devedor.historico_pagamento && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-muted">Histórico de pagamento</span>
              <span className={`text-xs font-semibold capitalize ${HIST_COLOR[devedor.historico_pagamento] ?? 'text-ink-muted'}`}>
                {devedor.historico_pagamento === 'bom' ? 'Bom'
                  : devedor.historico_pagamento === 'regular' ? 'Regular'
                  : 'Ruim'}
              </span>
            </div>
          )}

          {/* Nenhum dado */}
          {score == null && !chance && !devedor.perfil_financeiro && (
            <p className="text-xs text-ink-muted italic text-center py-2">
              Nenhum dado preenchido ainda.
            </p>
          )}
        </div>
      </div>

      <IntelligenciaDevedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => router.refresh()}
        devedor={devedor}
      />
    </>
  )
}
