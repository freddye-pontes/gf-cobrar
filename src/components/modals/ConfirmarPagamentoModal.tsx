'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { cobrancasApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  cobrancaId: number
  valor: number
}

export function ConfirmarPagamentoModal({ open, onClose, onSuccess, cobrancaId, valor }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [dataPayment, setDataPayment] = useState(today)
  const [formaConfirmacao, setFormaConfirmacao] = useState<'manual' | 'upload_comprovante'>('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setDataPayment(today)
    setFormaConfirmacao('manual')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await cobrancasApi.confirmar(cobrancaId, {
        data_pagamento: dataPayment,
        forma_confirmacao: formaConfirmacao,
      })
      reset()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar pagamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Confirmar Pagamento"
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
            form="confirm-pago-form"
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald hover:bg-emerald-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Confirmando...' : 'Confirmar e Baixar Dívida'}
          </button>
        </>
      }
    >
      <form id="confirm-pago-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-emerald-dim border border-emerald/20 rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
          Valor a confirmar:{' '}
          <span className="text-emerald font-bold text-sm">{formatCurrency(valor)}</span>
        </div>

        <FormField label="Data do Pagamento" required>
          <input
            type="date"
            value={dataPayment}
            onChange={e => setDataPayment(e.target.value)}
            className={inputCls}
          />
        </FormField>

        <FormField label="Forma de Confirmação" required>
          <div className="space-y-2">
            {[
              { val: 'manual', label: 'Confirmação manual (operador verificou)' },
              { val: 'upload_comprovante', label: 'Comprovante enviado pelo devedor' },
            ].map(opt => (
              <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="forma"
                  value={opt.val}
                  checked={formaConfirmacao === opt.val}
                  onChange={() => setFormaConfirmacao(opt.val as typeof formaConfirmacao)}
                  className="accent-[#FF6600]"
                />
                <span className="text-sm text-ink-secondary group-hover:text-ink-primary transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </FormField>

        {error && (
          <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
