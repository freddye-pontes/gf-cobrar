'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

export interface RegraEtapa {
  id?: number
  dia: number
  acao: string
  canais: string[]
  canal?: string  // legado — primeiro canal
  descricao: string
  automatico: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  etapas: RegraEtapa[]
  credorNome: string
  onSave: (etapas: RegraEtapa[]) => void
}

const CANAIS_OPCOES = [
  { value: 'whatsapp',    label: 'WhatsApp',  color: '#34d399' },
  { value: 'email',       label: 'E-mail',    color: '#3b82f6' },
  { value: 'telefone',    label: 'Ligação',   color: '#fbbf24' },
  { value: 'escalamento', label: 'Sistema',   color: '#a78bfa' },
]

const inputCls = 'w-full bg-elevated border border-border-default rounded-lg px-2.5 py-1.5 text-sm text-ink-primary focus:outline-none focus:border-accent'

export function EditarReguaModal({ open, onClose, etapas, credorNome, onSave }: Props) {
  const [draft, setDraft] = useState<RegraEtapa[]>([])

  useEffect(() => {
    if (open) setDraft(etapas.map((e) => ({
      ...e,
      canais: e.canais?.length ? e.canais : (e.canal ? [e.canal] : ['whatsapp']),
    })))
  }, [open])

  function update(idx: number, field: keyof RegraEtapa, value: unknown) {
    setDraft((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  function toggleCanal(idx: number, canal: string) {
    setDraft((prev) => prev.map((e, i) => {
      if (i !== idx) return e
      const canais = e.canais.includes(canal)
        ? e.canais.filter((c) => c !== canal)
        : [...e.canais, canal]
      return { ...e, canais: canais.length ? canais : [canal] }
    }))
  }

  function addEtapa() {
    const lastDia = draft[draft.length - 1]?.dia ?? 0
    setDraft((prev) => [...prev, { dia: lastDia + 7, acao: 'Nova Etapa', canais: ['whatsapp'], descricao: '', automatico: false }])
  }

  function removeEtapa(idx: number) {
    setDraft((prev) => prev.filter((_, i) => i !== idx))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setDraft((prev) => { const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; return next })
  }

  function moveDown(idx: number) {
    if (idx === draft.length - 1) return
    setDraft((prev) => { const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; return next })
  }

  function handleSave() {
    onSave([...draft].sort((a, b) => a.dia - b.dia))
    onClose()
  }

  return (
    <Modal title={`Editar Régua — ${credorNome}`} open={open} onClose={onClose} size="lg"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors">
            Salvar Régua
          </button>
        </>
      }>
      <div className="space-y-2">
        <p className="text-xs text-ink-muted mb-3">As etapas são ordenadas automaticamente pelo dia ao salvar.</p>

        {draft.map((etapa, idx) => (
          <div key={idx} className="bg-elevated border border-border-default rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="p-0.5 rounded text-ink-muted hover:text-ink-primary disabled:opacity-30">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveDown(idx)} disabled={idx === draft.length - 1}
                  className="p-0.5 rounded text-ink-muted hover:text-ink-primary disabled:opacity-30">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-20 shrink-0">
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Dia</label>
                <input type="number" min={0} value={etapa.dia}
                  onChange={(e) => update(idx, 'dia', Number(e.target.value))} className={inputCls} />
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Ação</label>
                <input type="text" value={etapa.acao}
                  onChange={(e) => update(idx, 'acao', e.target.value)} className={inputCls} />
              </div>

              <button onClick={() => removeEtapa(idx)}
                className="mt-6 shrink-0 p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-dim border border-transparent hover:border-danger/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Canais — múltipla seleção */}
            <div className="pl-7">
              <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-2 block">Canais</label>
              <div className="flex flex-wrap gap-2">
                {CANAIS_OPCOES.map((op) => {
                  const ativo = etapa.canais.includes(op.value)
                  return (
                    <button key={op.value} type="button" onClick={() => toggleCanal(idx, op.value)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors"
                      style={ativo
                        ? { borderColor: op.color, background: op.color + '20', color: op.color }
                        : { borderColor: 'var(--color-border-default)', color: 'var(--color-ink-muted)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: ativo ? op.color : 'var(--color-border-emphasis)' }} />
                      {op.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Descrição + Automático */}
            <div className="flex items-start gap-3 pl-7">
              <div className="flex-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Descrição</label>
                <input type="text" value={etapa.descricao}
                  onChange={(e) => update(idx, 'descricao', e.target.value)}
                  placeholder="Descreva o que acontece nesta etapa..." className={inputCls} />
              </div>
              <div className="shrink-0 pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={etapa.automatico}
                    onChange={(e) => update(idx, 'automatico', e.target.checked)}
                    className="w-4 h-4 accent-[#3b82f6]" />
                  <span className="text-xs text-ink-secondary whitespace-nowrap">Automático</span>
                </label>
              </div>
            </div>
          </div>
        ))}

        <button onClick={addEtapa}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border-default rounded-xl text-sm text-ink-muted hover:text-ink-primary hover:border-accent/40 hover:bg-elevated/30 transition-colors">
          <Plus className="w-4 h-4" />
          Adicionar Etapa
        </button>
      </div>
    </Modal>
  )
}
