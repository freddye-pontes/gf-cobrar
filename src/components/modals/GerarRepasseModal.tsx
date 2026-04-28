'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { repassesApi, dividasApi, type APIDividaListOut } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  credorId: number
  credorNome: string
  comissaoPercentual: number
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export function GerarRepasseModal({ open, onClose, onSuccess, credorId, credorNome, comissaoPercentual }: Props) {
  const [dividasPagas, setDividasPagas] = useState<APIDividaListOut[]>([])
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [loadingDividas, setLoadingDividas] = useState(false)
  const [periodo, setPeriodo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const now = new Date()
    setPeriodo(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    setLoadingDividas(true)
    dividasApi.list({ credor_id: credorId, status: 'pago', sem_repasse: true })
      .then((data) => { setDividasPagas(data); setSelecionadas(new Set(data.map((d) => d.id))) })
      .catch(() => {})
      .finally(() => setLoadingDividas(false))
  }, [open, credorId])

  function toggleDivida(id: number) {
    setSelecionadas((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function toggleAll() {
    setSelecionadas((prev) =>
      prev.size === dividasPagas.length ? new Set() : new Set(dividasPagas.map((d) => d.id))
    )
  }

  const selecionadasList = dividasPagas.filter((d) => selecionadas.has(d.id))

  // Valor base = negociado (após desconto) se existir, senão atualizado
  const valorBase = (d: APIDividaListOut) => d.valor_negociado ?? d.valor_atualizado
  const pctDivida = (d: APIDividaListOut) => d.comissao_percentual ?? comissaoPercentual

  const valorBruto = selecionadasList.reduce((s, d) => s + valorBase(d), 0)
  const descontoTotal = selecionadasList.reduce((s, d) => s + (d.valor_atualizado - valorBase(d)), 0)
  const comissaoTotal = selecionadasList.reduce((s, d) => s + (valorBase(d) * pctDivida(d) / 100), 0)
  const valorLiquido = valorBruto - comissaoTotal

  function reset() { setSelecionadas(new Set()); setPeriodo(''); setError('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!periodo.trim()) { setError('Informe o período.'); return }
    if (selecionadas.size === 0) { setError('Selecione ao menos uma dívida.'); return }
    setLoading(true); setError('')
    try {
      await repassesApi.create({
        credor_id: credorId,
        valor_bruto: valorBruto,
        comissao: comissaoTotal,
        valor_liquido: valorLiquido,
        periodo: periodo.trim(),
        dividas_ids: Array.from(selecionadas).map(String),
      })
      reset(); onSuccess(); onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao gerar repasse.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Gerar Lote de Repasse" open={open} onClose={() => { reset(); onClose() }} size="lg"
      footer={
        <>
          <button type="button" onClick={() => { reset(); onClose() }} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button form="repasse-form" type="submit" disabled={loading || selecionadas.size === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50">
            {loading ? 'Gerando...' : 'Gerar Repasse'}
          </button>
        </>
      }>
      <form id="repasse-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
          Credor: <span className="text-ink-primary font-bold">{credorNome}</span>
          <span className="ml-3">· Comissão base: <span className="text-amber">{comissaoPercentual}%</span></span>
        </div>

        <FormField label="Período" required hint="Formato: AAAA-MM (ex: 2026-03)">
          <input type="text" value={periodo} onChange={(e) => setPeriodo(e.target.value)}
            placeholder="2026-03" className={inputCls} />
        </FormField>

        <FormField label="Dívidas Pagas" hint="Selecione as dívidas a incluir neste lote">
          {loadingDividas ? (
            <p className="text-ink-muted text-xs py-2">Carregando...</p>
          ) : dividasPagas.length === 0 ? (
            <p className="text-ink-muted text-xs py-2 bg-elevated rounded-lg px-3">Nenhuma dívida paga para este credor.</p>
          ) : (
            <div className="border border-border-default rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-elevated border-b border-border-default text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                <input type="checkbox"
                  checked={selecionadas.size === dividasPagas.length && dividasPagas.length > 0}
                  onChange={toggleAll} className="w-3.5 h-3.5 accent-[#3b82f6] shrink-0" />
                <span className="flex-1">Devedor</span>
                <span className="w-24 text-right">Original</span>
                <span className="w-20 text-right">Negociado</span>
                <span className="w-16 text-right">Com%</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border-subtle">
                {dividasPagas.map((d) => {
                  const vBase = valorBase(d)
                  const pct = pctDivida(d)
                  const temDesconto = d.valor_atualizado > vBase
                  return (
                    <label key={d.id} className="flex items-center gap-2 px-3 py-2 hover:bg-elevated/50 cursor-pointer">
                      <input type="checkbox" checked={selecionadas.has(d.id)} onChange={() => toggleDivida(d.id)}
                        className="w-3.5 h-3.5 accent-[#3b82f6] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-ink-primary text-xs font-medium truncate">{d.devedor_nome}</p>
                        <p className="text-ink-muted text-[10px] font-mono">{d.chave_divida}</p>
                      </div>
                      <span className="font-mono text-xs text-ink-secondary w-24 text-right">R$ {fmt(d.valor_atualizado)}</span>
                      <span className={`font-mono text-xs w-20 text-right ${temDesconto ? 'text-amber' : 'text-emerald'}`}>
                        R$ {fmt(vBase)}
                      </span>
                      <span className="font-mono text-xs text-ink-muted w-16 text-right">{pct}%</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </FormField>

        {selecionadas.size > 0 && (
          <div className="bg-elevated border border-border-default rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Valor Bruto ({selecionadas.size} dívidas)</span>
              <span className="font-mono text-ink-primary">R$ {fmt(valorBruto)}</span>
            </div>
            {descontoTotal > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Desconto total aplicado</span>
                <span className="font-mono text-amber">- R$ {fmt(descontoTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-ink-muted">Comissão (por faixa de aging)</span>
              <span className="font-mono text-amber">- R$ {fmt(comissaoTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-border-subtle pt-1.5 mt-1.5">
              <span className="text-ink-primary">Valor Líquido ao Credor</span>
              <span className="font-mono text-emerald">R$ {fmt(valorLiquido)}</span>
            </div>
          </div>
        )}

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
