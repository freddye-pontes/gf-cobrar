'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { dividasApi, negociacoesApi, type APIDividaListOut } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedDividaId?: number
}

const TIPOS = [
  { value: 'desconto',     label: 'Desconto à Vista' },
  { value: 'parcelamento', label: 'Parcelamento' },
  { value: 'ptp',          label: 'Promessa de Pagamento (PTP)' },
]

function fmt2(v: number) { return v.toFixed(2) }
function pct1(v: number) { return v.toFixed(1) }

export function NovaNegociacaoModal({ open, onClose, onSuccess, preselectedDividaId }: Props) {
  const [dividas, setDividas] = useState<APIDividaListOut[]>([])
  const [loadingDividas, setLoadingDividas] = useState(false)

  const [dividaId, setDividaId] = useState(preselectedDividaId ?? 0)
  const [tipo, setTipo] = useState('desconto')
  const [valorOriginal, setValorOriginal] = useState(0)  // = valor_atualizado da dívida

  // Three inter-dependent discount fields
  const [valorOferta, setValorOferta] = useState('')
  const [descontoValor, setDescontoValor] = useState('')
  const [descontoPercentual, setDescontoPercentual] = useState('')

  const [numeroParcelas, setNumeroParcelas] = useState('')
  const [valorParcela, setValorParcela] = useState('')
  const [dataPromessa, setDataPromessa] = useState('')
  const [comissao, setComissao] = useState('')
  const [comissaoSugerida, setComissaoSugerida] = useState<number | null>(null)
  const [faixaAging, setFaixaAging] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    if (preselectedDividaId) {
      // When a specific divida is pre-selected, fetch it directly
      setLoadingDividas(true)
      dividasApi.get(preselectedDividaId)
        .then((d) => {
          setDividaId(d.id)
          setValorOriginal(d.valor_atualizado)
          setComissaoSugerida((d as any).comissao_sugerida ?? null)
          setFaixaAging((d as any).faixa_aging ?? '')
          setComissao(String((d as any).comissao_sugerida ?? ''))
        })
        .catch(() => {})
        .finally(() => setLoadingDividas(false))
    } else {
      // Generic: load available dividas for the dropdown
      setLoadingDividas(true)
      Promise.all([dividasApi.list(), negociacoesApi.list('ativa')])
        .then(([allDividas, ativas]) => {
          const ativaIds = new Set(ativas.map((n) => n.divida_id))
          const available = allDividas.filter(
            (d) => !ativaIds.has(d.id) && !['pago', 'encerrado'].includes(d.status)
          )
          setDividas(available)
          if (available.length > 0) {
            setDividaId(available[0].id)
            setValorOriginal(available[0].valor_atualizado)
          }
        }).catch(() => {}).finally(() => setLoadingDividas(false))
    }
  }, [open, preselectedDividaId])

  useEffect(() => {
    const d = dividas.find((d) => d.id === dividaId)
    if (d) {
      setValorOriginal(d.valor_atualizado)
      setComissaoSugerida(d.comissao_sugerida ?? null)
      setFaixaAging(d.faixa_aging ?? '')
      setComissao(String(d.comissao_sugerida ?? ''))
    }
  }, [dividaId, dividas])

  useEffect(() => {
    if (tipo === 'parcelamento' && valorOferta && numeroParcelas) {
      const vp = parseFloat(valorOferta) / parseInt(numeroParcelas)
      setValorParcela(fmt2(vp))
    }
  }, [valorOferta, numeroParcelas, tipo])

  // ── Bidirectional discount calculations ──

  function onValorOfertaChange(raw: string) {
    setValorOferta(raw)
    const v = parseFloat(raw)
    if (!isNaN(v) && valorOriginal > 0) {
      const desc = valorOriginal - v
      setDescontoValor(desc > 0 ? fmt2(desc) : '0.00')
      setDescontoPercentual(desc > 0 ? pct1((desc / valorOriginal) * 100) : '0.0')
    }
  }

  function onDescontoValorChange(raw: string) {
    setDescontoValor(raw)
    const d = parseFloat(raw)
    if (!isNaN(d) && valorOriginal > 0) {
      const oferta = valorOriginal - d
      setValorOferta(oferta > 0 ? fmt2(oferta) : fmt2(valorOriginal))
      setDescontoPercentual(d > 0 ? pct1((d / valorOriginal) * 100) : '0.0')
    }
  }

  function onDescontoPctChange(raw: string) {
    setDescontoPercentual(raw)
    const pct = parseFloat(raw)
    if (!isNaN(pct) && valorOriginal > 0) {
      const descV = valorOriginal * (pct / 100)
      const oferta = valorOriginal - descV
      setDescontoValor(fmt2(descV))
      setValorOferta(fmt2(oferta))
    }
  }

  function reset() {
    setTipo('desconto')
    setValorOferta(''); setDescontoValor(''); setDescontoPercentual('')
    setNumeroParcelas(''); setValorParcela(''); setDataPromessa('')
    setComissao(''); setComissaoSugerida(null); setFaixaAging('')
    setResponsavel(''); setNotas(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dividaId) { setError('Selecione uma dívida.'); return }
    if (!valorOferta) { setError('Informe o valor acordado.'); return }
    if (!responsavel.trim()) { setError('Informe o responsável.'); return }
    if (tipo === 'ptp' && !dataPromessa) { setError('Informe a data da promessa.'); return }

    setLoading(true); setError('')
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
      reset(); onSuccess(); onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar negociação.')
    } finally {
      setLoading(false)
    }
  }

  const faixaLabel = faixaAging === 'critica' ? 'Crítica' : faixaAging === 'alta' ? 'Alta' : faixaAging === 'media' ? 'Média' : faixaAging === 'baixa' ? 'Baixa' : ''
  const faixaColor = faixaAging === 'critica' ? 'bg-red-500/20 text-red-400' : faixaAging === 'alta' ? 'bg-orange-500/20 text-orange-400' : faixaAging === 'media' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'

  return (
    <Modal title="Nova Negociação" open={open} onClose={() => { reset(); onClose() }} size="lg"
      footer={
        <>
          <button type="button" onClick={() => { reset(); onClose() }} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button form="neg-form" type="submit" disabled={loading || loadingDividas}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50">
            {loading ? 'Salvando...' : 'Criar Negociação'}
          </button>
        </>
      }>
      <form id="neg-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Dívida */}
        {!preselectedDividaId && (
          <FormField label="Dívida" required>
            <select value={dividaId} onChange={(e) => setDividaId(Number(e.target.value))}
              disabled={loadingDividas} className={selectCls}>
              {loadingDividas && <option>Carregando...</option>}
              {dividas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.devedor_nome} — {d.credor_nome} (R$ {d.valor_atualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          </FormField>
        )}

        {/* Valor base da dívida */}
        {valorOriginal > 0 && (
          <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
            Valor Atualizado da Dívida:{' '}
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
        <FormField label="Comissão (%)" required
          hint={faixaLabel && comissaoSugerida != null
            ? `Sugerido pela faixa ${faixaLabel} (${comissaoSugerida}%)`
            : 'Percentual sobre o valor recuperado'}>
          <div className="relative">
            <input type="number" step="0.1" min="0" max="100" value={comissao}
              onChange={(e) => setComissao(e.target.value)} placeholder="Ex: 15" className={inputCls} />
            {faixaLabel && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${faixaColor}`}>
                {faixaLabel}
              </span>
            )}
          </div>
        </FormField>

        {/* Valor acordado + Desconto (sempre visíveis, bidirecionais) */}
        <div className="space-y-3">
          <FormField label="Valor Acordado (R$)" required
            hint={valorOriginal > 0 ? `Atualizado: R$ ${valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined}>
            <input type="number" step="0.01" min="0" value={valorOferta}
              onChange={(e) => onValorOfertaChange(e.target.value)} placeholder="0,00" className={inputCls} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Desconto (R$)" hint="Altera o valor acordado automaticamente">
              <input type="number" step="0.01" min="0" value={descontoValor}
                onChange={(e) => onDescontoValorChange(e.target.value)} placeholder="0,00" className={inputCls} />
            </FormField>
            <FormField label="Desconto (%)" hint="Altera o valor acordado automaticamente">
              <input type="number" step="0.1" min="0" max="100" value={descontoPercentual}
                onChange={(e) => onDescontoPctChange(e.target.value)} placeholder="0.0" className={inputCls} />
            </FormField>
          </div>

          {/* Preview do valor recuperado */}
          {valorOferta && parseFloat(valorOferta) > 0 && (
            <div className="flex items-center justify-between bg-emerald/5 border border-emerald/20 rounded-lg px-3 py-2 text-xs font-mono">
              <span className="text-ink-muted">Valor Recuperado</span>
              <span className="text-emerald font-bold">
                R$ {parseFloat(valorOferta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Parcelas */}
        {tipo === 'parcelamento' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nº de Parcelas" required>
              <input type="number" min="2" max="60" value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(e.target.value)} placeholder="Ex: 12" className={inputCls} />
            </FormField>
            <FormField label="Valor da Parcela (R$)" hint="Calculado automaticamente">
              <input type="number" step="0.01" value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value)} placeholder="0,00" className={inputCls} />
            </FormField>
          </div>
        )}

        {/* Data promessa */}
        {tipo === 'ptp' && (
          <FormField label="Data da Promessa" required>
            <input type="date" value={dataPromessa}
              onChange={(e) => setDataPromessa(e.target.value)} className={inputCls} />
          </FormField>
        )}

        {/* Responsável */}
        <FormField label="Responsável" required>
          <input type="text" value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Nome do operador responsável" className={inputCls} />
        </FormField>

        {/* Notas */}
        <FormField label="Notas / Observações">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
            placeholder="Detalhes da negociação..." rows={3} className={inputCls + ' resize-none'} />
        </FormField>

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
