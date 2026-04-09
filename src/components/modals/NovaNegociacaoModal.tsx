'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { dividasApi, negociacoesApi, type APIDividaListOut } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Pre-selects a specific divida (e.g. when opening from detail page) */
  preselectedDividaId?: number
}

const TIPOS = [
  { value: 'desconto', label: 'Desconto à Vista' },
  { value: 'parcelamento', label: 'Parcelamento' },
  { value: 'ptp', label: 'Promessa de Pagamento (PTP)' },
]

export function NovaNegociacaoModal({ open, onClose, onSuccess, preselectedDividaId }: Props) {
  const [dividas, setDividas] = useState<APIDividaListOut[]>([])
  const [loadingDividas, setLoadingDividas] = useState(false)

  const [dividaId, setDividaId] = useState(preselectedDividaId ?? 0)
  const [tipo, setTipo] = useState('desconto')
  const [valorOriginal, setValorOriginal] = useState(0)
  const [valorOferta, setValorOferta] = useState('')
  const [descontoPercentual, setDescontoPercentual] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState('')
  const [valorParcela, setValorParcela] = useState('')
  const [dataPromessa, setDataPromessa] = useState('')
  const [comissao, setComissao] = useState('')
  const [comissaoSugerida, setComissaoSugerida] = useState<number | null>(null)
  const [faixaAging, setFaixaAging] = useState<string>('')
  const [responsavel, setResponsavel] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load available dividas when modal opens
  useEffect(() => {
    if (!open) return
    setLoadingDividas(true)
    Promise.all([
      dividasApi.list(),
      negociacoesApi.list('ativa'),
    ]).then(([allDividas, ativas]) => {
      const ativaIds = new Set(ativas.map((n) => n.divida_id))
      const available = allDividas.filter(
        (d) => !ativaIds.has(d.id) && !['pago', 'encerrado'].includes(d.status)
      )
      setDividas(available)
      if (!preselectedDividaId && available.length > 0) {
        setDividaId(available[0].id)
        setValorOriginal(available[0].valor_atualizado)
      }
    }).catch(() => {}).finally(() => setLoadingDividas(false))
  }, [open, preselectedDividaId])

  // Update valor original + aging commission when divida changes
  useEffect(() => {
    const d = dividas.find((d) => d.id === dividaId)
    if (d) {
      setValorOriginal(d.valor_atualizado)
      setComissaoSugerida(d.comissao_sugerida ?? null)
      setFaixaAging(d.faixa_aging ?? '')
      setComissao(String(d.comissao_sugerida ?? ''))
    }
  }, [dividaId, dividas])

  // Auto-calculate desconto when valorOferta changes
  useEffect(() => {
    if (tipo === 'desconto' && valorOriginal > 0 && valorOferta) {
      const pct = ((valorOriginal - parseFloat(valorOferta)) / valorOriginal) * 100
      setDescontoPercentual(pct > 0 ? pct.toFixed(1) : '0')
    }
  }, [valorOferta, valorOriginal, tipo])

  // Auto-calculate valorParcela
  useEffect(() => {
    if (tipo === 'parcelamento' && valorOferta && numeroParcelas) {
      const vp = parseFloat(valorOferta) / parseInt(numeroParcelas)
      setValorParcela(vp.toFixed(2))
    }
  }, [valorOferta, numeroParcelas, tipo])

  function reset() {
    setTipo('desconto')
    setValorOferta('')
    setDescontoPercentual('')
    setNumeroParcelas('')
    setValorParcela('')
    setDataPromessa('')
    setComissao('')
    setComissaoSugerida(null)
    setFaixaAging('')
    setResponsavel('')
    setNotas('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dividaId) { setError('Selecione uma dívida.'); return }
    if (!valorOferta) { setError('Informe o valor acordado.'); return }
    if (!responsavel.trim()) { setError('Informe o responsável.'); return }
    if (tipo === 'ptp' && !dataPromessa) { setError('Informe a data da promessa.'); return }

    setLoading(true)
    setError('')
    try {
      await negociacoesApi.create({
        divida_id: dividaId,
        tipo,
        valor_original: valorOriginal,
        valor_oferta: parseFloat(valorOferta),
        desconto_percentual: descontoPercentual ? parseFloat(descontoPercentual) : null,
        numero_parcelas: numeroParcelas ? parseInt(numeroParcelas) : null,
        valor_parcela: valorParcela ? parseFloat(valorParcela) : null,
        data_promessa: dataPromessa || null,
        comissao_percentual: comissao ? parseFloat(comissao) : null,
        responsavel_nome: responsavel.trim(),
        notas: notas.trim(),
      })
      reset()
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar negociação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Nova Negociação"
      open={open}
      onClose={() => { reset(); onClose() }}
      size="lg"
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
            form="neg-form"
            type="submit"
            disabled={loading || loadingDividas}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Negociação'}
          </button>
        </>
      }
    >
      <form id="neg-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Dívida */}
        {!preselectedDividaId && (
          <FormField label="Dívida" required>
            <select
              value={dividaId}
              onChange={(e) => setDividaId(Number(e.target.value))}
              disabled={loadingDividas}
              className={selectCls}
            >
              {loadingDividas && <option>Carregando...</option>}
              {dividas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.devedor_nome} — {d.credor_nome} (R$ {d.valor_atualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          </FormField>
        )}

        {preselectedDividaId && valorOriginal > 0 && (
          <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
            Valor original da dívida:{' '}
            <span className="text-ink-primary font-bold">
              R$ {valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Tipo */}
        <FormField label="Tipo de Negociação" required>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>

        {/* Comissão */}
        <FormField
          label="Comissão (%)"
          required
          hint={
            faixaAging && comissaoSugerida != null
              ? `Sugerido pela faixa ${faixaAging === 'critica' ? 'Crítica' : faixaAging === 'alta' ? 'Alta' : faixaAging === 'media' ? 'Média' : 'Baixa'} (${comissaoSugerida}%${faixaAging === 'critica' ? ' a 50%' : ''})`
              : 'Percentual sobre o valor recuperado'
          }
        >
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={comissao}
              onChange={(e) => setComissao(e.target.value)}
              placeholder="Ex: 15"
              className={inputCls}
            />
            {faixaAging && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                faixaAging === 'critica' ? 'bg-red-500/20 text-red-400' :
                faixaAging === 'alta'    ? 'bg-orange-500/20 text-orange-400' :
                faixaAging === 'media'   ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {faixaAging === 'critica' ? 'Crítica' : faixaAging === 'alta' ? 'Alta' : faixaAging === 'media' ? 'Média' : 'Baixa'}
              </span>
            )}
          </div>
        </FormField>

        {/* Valor acordado */}
        <FormField
          label="Valor Acordado (R$)"
          required
          hint={valorOriginal > 0 ? `Original: R$ ${valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorOferta}
            onChange={(e) => setValorOferta(e.target.value)}
            placeholder="0,00"
            className={inputCls}
          />
        </FormField>

        {/* Desconto (tipo=desconto) */}
        {tipo === 'desconto' && (
          <FormField label="Desconto (%)" hint="Calculado automaticamente pelo valor acordado">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={descontoPercentual}
              onChange={(e) => setDescontoPercentual(e.target.value)}
              placeholder="0.0"
              className={inputCls}
            />
          </FormField>
        )}

        {/* Parcelas (tipo=parcelamento) */}
        {tipo === 'parcelamento' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nº de Parcelas" required>
              <input
                type="number"
                min="2"
                max="60"
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(e.target.value)}
                placeholder="Ex: 12"
                className={inputCls}
              />
            </FormField>
            <FormField label="Valor da Parcela (R$)" hint="Calculado automaticamente">
              <input
                type="number"
                step="0.01"
                value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value)}
                placeholder="0,00"
                className={inputCls}
              />
            </FormField>
          </div>
        )}

        {/* Data promessa (tipo=ptp) */}
        {tipo === 'ptp' && (
          <FormField label="Data da Promessa" required>
            <input
              type="date"
              value={dataPromessa}
              onChange={(e) => setDataPromessa(e.target.value)}
              className={inputCls}
            />
          </FormField>
        )}

        {/* Responsável */}
        <FormField label="Responsável" required>
          <input
            type="text"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do operador responsável"
            className={inputCls}
          />
        </FormField>

        {/* Notas */}
        <FormField label="Notas / Observações">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Detalhes da negociação..."
            rows={3}
            className={inputCls + ' resize-none'}
          />
        </FormField>

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
