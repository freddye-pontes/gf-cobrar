'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { dividasApi } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  dividaId: number
  devedorNome?: string
}

const CANAIS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Ligação' },
  { value: 'sistema', label: 'Sistema / Manual' },
]

export function RegistrarContatoModal({ open, onClose, onSuccess, dividaId, devedorNome }: Props) {
  const [canal, setCanal] = useState('whatsapp')
  const [resultado, setResultado] = useState('')
  const [operador, setOperador] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setCanal('whatsapp')
    setResultado('')
    setOperador('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resultado.trim()) { setError('Descreva o resultado do contato.'); return }
    setLoading(true)
    setError('')
    try {
      await dividasApi.addHistorico(dividaId, {
        canal,
        resultado: resultado.trim(),
        operador_nome: operador.trim() || undefined,
      })
      reset()
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao registrar contato.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Registrar Contato"
      open={open}
      onClose={() => { reset(); onClose() }}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={() => { reset(); onClose() }}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            form="contato-form"
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Registrar'}
          </button>
        </>
      }
    >
      {devedorNome && (
        <p className="text-ink-muted text-xs mb-4 font-mono">Devedor: <span className="text-ink-secondary">{devedorNome}</span></p>
      )}
      <form id="contato-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Canal" required>
          <select value={canal} onChange={(e) => setCanal(e.target.value)} className={selectCls}>
            {CANAIS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </FormField>

        <FormField label="Resultado / Observação" required>
          <textarea
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            placeholder="Ex: Atendeu, prometeu pagar até dia 10..."
            rows={3}
            className={inputCls + ' resize-none'}
          />
        </FormField>

        <FormField label="Operador" hint="Deixe em branco para usar o operador logado">
          <input
            type="text"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            placeholder="Nome do operador"
            className={inputCls}
          />
        </FormField>

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
