'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirmar', danger = false,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao executar ação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={title}
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-danger hover:bg-red-500'
                : 'bg-accent hover:bg-accent-light'
            }`}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${danger ? 'text-danger' : 'text-amber'}`} />
        <p className="text-ink-secondary text-sm leading-relaxed">{description}</p>
      </div>
      {error && <p className="mt-3 text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  )
}
