'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { devedoresApi, credoresApi, dividasApi, type APIDevedor, type APICredorOut } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Pre-select a credor (e.g. when opening from credores page) */
  preselectedCredorId?: number
  /** Pre-select a devedor (e.g. when opening from debtor profile) */
  preselectedDevedorId?: number
}

const TIPOS = [
  { value: 'boleto',   label: 'Boleto' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'cartao',   label: 'Cartão' },
  { value: 'servico',  label: 'Serviço' },
]

export function NovaDividaModal({
  open, onClose, onSuccess,
  preselectedCredorId, preselectedDevedorId,
}: Props) {
  const [devedores, setDevedores] = useState<APIDevedor[]>([])
  const [credores, setCredores] = useState<APICredorOut[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const [devedorId, setDevedorId] = useState(preselectedDevedorId ?? 0)
  const [credorId, setCredorId] = useState(preselectedCredorId ?? 0)
  const [valorOriginal, setValorOriginal] = useState('')
  const [valorAtualizado, setValorAtualizado] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')
  const [tipo, setTipo] = useState('boleto')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync valorAtualizado with valorOriginal when user hasn't changed it yet
  const [atualizadoTouched, setAtualizadoTouched] = useState(false)
  useEffect(() => {
    if (!atualizadoTouched) setValorAtualizado(valorOriginal)
  }, [valorOriginal, atualizadoTouched])

  useEffect(() => {
    if (!open) return
    setLoadingData(true)
    Promise.all([devedoresApi.list(), credoresApi.list()])
      .then(([devs, creds]) => {
        setDevedores(devs)
        setCredores(creds)
        if (!preselectedDevedorId && devs.length > 0) setDevedorId(devs[0].id)
        if (!preselectedCredorId && creds.length > 0) setCredorId(creds[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [open, preselectedCredorId, preselectedDevedorId])

  function reset() {
    setValorOriginal(''); setValorAtualizado(''); setAtualizadoTouched(false)
    setDataVencimento(''); setDataEmissao(''); setTipo('boleto')
    setNumeroContrato(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!devedorId) { setError('Selecione o devedor.'); return }
    if (!credorId) { setError('Selecione o credor.'); return }
    if (!valorOriginal) { setError('Informe o valor original.'); return }
    if (!dataVencimento) { setError('Informe a data de vencimento.'); return }
    if (!dataEmissao) { setError('Informe a data de emissão.'); return }

    setLoading(true); setError('')
    try {
      await dividasApi.create({
        devedor_id: devedorId,
        credor_id: credorId,
        valor_original: parseFloat(valorOriginal),
        valor_atualizado: parseFloat(valorAtualizado || valorOriginal),
        data_vencimento: dataVencimento,
        data_emissao: dataEmissao,
        tipo,
        numero_contrato: numeroContrato.trim() || null,
      })
      reset()
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar dívida.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Nova Dívida"
      open={open}
      onClose={() => { reset(); onClose() }}
      size="lg"
      footer={
        <>
          <button type="button" onClick={() => { reset(); onClose() }} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button form="divida-form" type="submit" disabled={loading || loadingData}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50">
            {loading ? 'Salvando...' : 'Adicionar à Carteira'}
          </button>
        </>
      }
    >
      <form id="divida-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Devedor */}
        {!preselectedDevedorId ? (
          <FormField label="Devedor" required>
            <select value={devedorId} onChange={(e) => setDevedorId(Number(e.target.value))}
              disabled={loadingData} className={selectCls}>
              {loadingData && <option>Carregando...</option>}
              {devedores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} — {d.cpf_cnpj}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
            Devedor: <span className="text-ink-primary font-bold">
              {devedores.find((d) => d.id === preselectedDevedorId)?.nome ?? `#${preselectedDevedorId}`}
            </span>
          </div>
        )}

        {/* Credor */}
        {!preselectedCredorId ? (
          <FormField label="Credor" required>
            <select value={credorId} onChange={(e) => setCredorId(Number(e.target.value))}
              disabled={loadingData} className={selectCls}>
              {loadingData && <option>Carregando...</option>}
              {credores.map((c) => (
                <option key={c.id} value={c.id}>{c.razao_social}</option>
              ))}
            </select>
          </FormField>
        ) : (
          <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
            Credor: <span className="text-ink-primary font-bold">
              {credores.find((c) => c.id === preselectedCredorId)?.razao_social ?? `#${preselectedCredorId}`}
            </span>
          </div>
        )}

        {/* Tipo + Nº Contrato */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo" required>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Nº Contrato / Referência">
            <input type="text" value={numeroContrato}
              onChange={(e) => setNumeroContrato(e.target.value)}
              placeholder="Ex: CTR-2026-0042" className={inputCls} />
          </FormField>
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Valor Original (R$)" required>
            <input type="number" step="0.01" min="0" value={valorOriginal}
              onChange={(e) => setValorOriginal(e.target.value)}
              placeholder="0,00" className={inputCls} />
          </FormField>
          <FormField label="Valor Atualizado (R$)" hint="Igual ao original se não houver correção">
            <input type="number" step="0.01" min="0" value={valorAtualizado}
              onChange={(e) => { setValorAtualizado(e.target.value); setAtualizadoTouched(true) }}
              placeholder="0,00" className={inputCls} />
          </FormField>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data de Emissão" required>
            <input type="date" value={dataEmissao}
              onChange={(e) => setDataEmissao(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Data de Vencimento" required>
            <input type="date" value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)} className={inputCls} />
          </FormField>
        </div>

        {error && (
          <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>
        )}
      </form>
    </Modal>
  )
}
