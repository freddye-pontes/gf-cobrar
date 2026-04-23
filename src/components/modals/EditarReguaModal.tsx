'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

export interface RegraEtapa {
  dia: number
  acao: string
  canal: 'whatsapp' | 'email' | 'telefone' | 'escalamento'
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

const canalOpcoes: { value: RegraEtapa['canal']; label: string }[] = [
  { value: 'whatsapp',    label: 'WhatsApp' },
  { value: 'email',       label: 'E-mail' },
  { value: 'telefone',    label: 'Ligação' },
  { value: 'escalamento', label: 'Sistema / Escalamento' },
]

const inputCls = 'w-full bg-elevated border border-border-default rounded-lg px-2.5 py-1.5 text-sm text-ink-primary focus:outline-none focus:border-accent'

export function EditarReguaModal({ open, onClose, etapas, credorNome, onSave }: Props) {
  const [draft, setDraft] = useState<RegraEtapa[]>([])

  useEffect(() => {
    if (open) setDraft(etapas.map((e) => ({ ...e })))
  }, [open])

  function update(idx: number, field: keyof RegraEtapa, value: unknown) {
    setDraft((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  function addEtapa() {
    const lastDia = draft[draft.length - 1]?.dia ?? 0
    setDraft((prev) => [...prev, {
      dia: lastDia + 7,
      acao: 'Nova Etapa',
      canal: 'whatsapp',
      descricao: '',
      automatico: false,
    }])
  }

  function removeEtapa(idx: number) {
    setDraft((prev) => prev.filter((_, i) => i !== idx))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setDraft((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveDown(idx: number) {
    if (idx === draft.length - 1) return
    setDraft((prev) => {
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  function handleSave() {
    const sorted = [...draft].sort((a, b) => a.dia - b.dia)
    onSave(sorted)
    onClose()
  }

  return (
    <Modal
      title={`Editar Régua — ${credorNome}`}
      open={open}
      onClose={onClose}
      size="lg"
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
      }
    >
      <div className="space-y-2">
        <p className="text-xs text-ink-muted mb-3">
          As etapas são ordenadas automaticamente pelo dia ao salvar.
        </p>

        {draft.map((etapa, idx) => (
          <div key={idx} className="bg-elevated border border-border-default rounded-xl p-4 space-y-3">
            {/* Row 1: controls + dia + ação + canal */}
            <div className="flex items-start gap-2">
              {/* Move buttons */}
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

              {/* Dia */}
              <div className="w-20 shrink-0">
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Dia</label>
                <input
                  type="number" min={0} value={etapa.dia}
                  onChange={(e) => update(idx, 'dia', Number(e.target.value))}
                  className={inputCls}
                />
              </div>

              {/* Ação */}
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Ação</label>
                <input
                  type="text" value={etapa.acao}
                  onChange={(e) => update(idx, 'acao', e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Canal */}
              <div className="w-44 shrink-0">
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Canal</label>
                <select value={etapa.canal} onChange={(e) => update(idx, 'canal', e.target.value as RegraEtapa['canal'])}
                  className={inputCls}>
                  {canalOpcoes.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Delete */}
              <button onClick={() => removeEtapa(idx)}
                className="mt-6 shrink-0 p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-dim border border-transparent hover:border-danger/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Row 2: descrição + automático */}
            <div className="flex items-start gap-3 pl-7">
              <div className="flex-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-1 block">Descrição</label>
                <input
                  type="text" value={etapa.descricao}
                  onChange={(e) => update(idx, 'descricao', e.target.value)}
                  placeholder="Descreva o que acontece nesta etapa..."
                  className={inputCls}
                />
              </div>
              <div className="shrink-0 pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" checked={etapa.automatico}
                    onChange={(e) => update(idx, 'automatico', e.target.checked)}
                    className="w-4 h-4 accent-[#3b82f6]"
                  />
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
