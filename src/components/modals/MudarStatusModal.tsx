'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, selectCls, inputCls } from '@/components/ui/FormField'
import { dividasApi } from '@/lib/api'

const STATUS_LABELS: Record<string, string> = {
  em_aberto: 'Em Aberto',
  em_negociacao: 'Em Negociação',
  ptp_ativa: 'PTP Ativa',
  pago: 'Pago',
  judicial: 'Judicial',
  encerrado: 'Encerrado',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  em_aberto:     ['em_negociacao', 'ptp_ativa', 'pago', 'judicial', 'encerrado'],
  em_negociacao: ['em_aberto', 'ptp_ativa', 'pago', 'judicial', 'encerrado'],
  ptp_ativa:     ['em_aberto', 'em_negociacao', 'pago', 'judicial'],
  pago:          ['encerrado'],
  judicial:      ['encerrado', 'em_negociacao'],
  encerrado:     [],
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  dividaId: number
  statusAtual: string
  credorNome?: string
}

export function MudarStatusModal({ open, onClose, onSuccess, dividaId, statusAtual, credorNome }: Props) {
  const opcoes = STATUS_TRANSITIONS[statusAtual] ?? []
  const [novoStatus, setNovoStatus] = useState(opcoes[0] ?? '')
  const [nota, setNota] = useState('')
  const [operador, setOperador] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync novoStatus when statusAtual or open changes (prevents stale value)
  useEffect(() => {
    const opts = STATUS_TRANSITIONS[statusAtual] ?? []
    setNovoStatus(opts[0] ?? '')
    setNota('')
    setOperador('')
    setError('')
  }, [statusAtual, open])

  function reset() {
    const opts = STATUS_TRANSITIONS[statusAtual] ?? []
    setNovoStatus(opts[0] ?? '')
    setNota('')
    setOperador('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!novoStatus) return
    setLoading(true)
    setError('')
    try {
      await dividasApi.updateStatus(dividaId, {
        status: novoStatus,
        nota: nota.trim() || undefined,
        operador_nome: operador.trim() || undefined,
      })
      reset()
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao atualizar status.')
    } finally {
      setLoading(false)
    }
  }

  if (opcoes.length === 0) return null

  return (
    <Modal
      title="Alterar Status da Dívida"
      open={open}
      onClose={() => { reset(); onClose() }}
      size="sm"
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
            form="status-form"
            type="submit"
            disabled={loading || !novoStatus}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </>
      }
    >
      <form id="status-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
          Status atual: <span className="text-ink-primary font-bold">{STATUS_LABELS[statusAtual] ?? statusAtual}</span>
          {credorNome && <span className="ml-3 text-ink-disabled">· {credorNome}</span>}
        </div>

        <FormField label="Novo Status" required>
          <select
            value={novoStatus}
            onChange={(e) => setNovoStatus(e.target.value)}
            className={selectCls}
          >
            {opcoes.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Nota (opcional)">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Motivo da alteração..."
            rows={2}
            className={inputCls + ' resize-none'}
          />
        </FormField>

        <FormField label="Operador">
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
