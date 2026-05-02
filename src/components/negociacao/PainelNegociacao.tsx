'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, Layers, CalendarClock, AlertTriangle,
  Zap, AlignJustify, CreditCard, CheckCircle2, Loader2,
  Send, FileText, ArrowRightLeft, Lock, MessageSquare, Calendar,
} from 'lucide-react'
import {
  negociacoesApi, cobrancasApi,
  type APIDividaOut, type APINegociacaoOut,
  type APICobranca, type APISimulacaoAcordo,
} from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PainelCobrancaAtiva } from './PainelCobrancaAtiva'
import { RegistrarContatoModal } from '@/components/modals/RegistrarContatoModal'
import { MudarStatusModal } from '@/components/modals/MudarStatusModal'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

type Modalidade = 'a_vista' | 'parcelado'
type FormaPgto = 'pix' | 'boleto' | 'link_parcelado'

interface Props {
  divida: APIDividaOut
  negociacao: APINegociacaoOut | null
  simulacao: APISimulacaoAcordo | null
  cobrancaAtiva: APICobranca | null
  credorNome: string
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function fmt2(v: number) { return v.toFixed(2) }

export function PainelNegociacao({ divida, negociacao, simulacao, cobrancaAtiva, credorNome }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const sim = simulacao
  const valorBase = divida.valor_atualizado
  const maxParcelas = sim?.max_parcelas ?? 6
  const limitePct = sim?.limite_desconto_pct ?? 0

  // ── Estado principal ────────────────────────────────────────────────────────
  const [modalidade, setModalidade] = useState<Modalidade>('a_vista')
  const [formaPgto, setFormaPgto] = useState<FormaPgto>('pix')

  // Desconto
  const [descontoValor, setDescontoValor] = useState('')
  const [descontoPct, setDescontoPct] = useState('')

  // Parcelas
  const [numParcelas, setNumParcelas] = useState(maxParcelas)

  // Datas
  const todayStr = new Date().toISOString().split('T')[0]
  const [dataVencimento, setDataVencimento] = useState(todayStr)   // à vista
  const [dataPrimeira, setDataPrimeira] = useState(todayStr)       // parcelado

  // UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contatoOpen, setContatoOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [wppLoading, setWppLoading] = useState(false)
  const [wppSent, setWppSent] = useState(false)

  const isPago = ['pago', 'encerrado'].includes(divida.status)

  // ── Recalcular quando muda simulação ───────────────────────────────────────
  useEffect(() => {
    if (sim) {
      setDescontoValor(fmt2(sim.oferta_a_vista.desconto_reais))
      setDescontoPct(fmt2(sim.oferta_a_vista.desconto_pct))
      setNumParcelas(sim.max_parcelas)
    }
  }, [sim?.oferta_a_vista.desconto_reais])

  // ── Cálculos de valor ──────────────────────────────────────────────────────
  const descontoR = parseFloat(descontoValor) || 0
  const valorAcordo = Math.max(0, valorBase - descontoR)
  const descontoFinalPct = valorBase > 0 ? (descontoR / valorBase) * 100 : 0
  const acimaDolimite = descontoFinalPct > limitePct + 0.01 && limitePct > 0

  const valorParcela = numParcelas > 0 ? valorAcordo / numParcelas : valorAcordo

  // Datas do parcelamento
  const datasParcelamento: string[] = []
  for (let i = 0; i < numParcelas; i++) {
    datasParcelamento.push(addMonths(dataPrimeira, i))
  }

  // ── Handlers de desconto (bidirecional) ────────────────────────────────────
  function onDescontoValorChange(v: string) {
    setDescontoValor(v)
    const d = parseFloat(v) || 0
    setDescontoPct(valorBase > 0 ? fmt2((d / valorBase) * 100) : '0.00')
  }

  function onDescontoPctChange(v: string) {
    setDescontoPct(v)
    const p = parseFloat(v) || 0
    setDescontoValor(fmt2(valorBase * (p / 100)))
  }

  function onModalidadeChange(m: Modalidade) {
    setModalidade(m)
    if (m === 'a_vista') {
      // Zerar desconto se não houver limite
      if (limitePct === 0) { setDescontoValor('0.00'); setDescontoPct('0.00') }
    }
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  async function enviarWpp() {
    setWppLoading(true)
    try {
      await fetch(`${API}/whatsapp/enviar/${divida.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'primeiro_contato' }),
      })
      setWppSent(true)
      setTimeout(() => setWppSent(false), 3000)
      refresh()
    } finally { setWppLoading(false) }
  }

  // ── Gerar cobrança ─────────────────────────────────────────────────────────
  async function gerarCobranca() {
    if (acimaDolimite) return
    setLoading(true)
    setError(null)
    try {
      let negId = negociacao?.id

      if (!negId) {
        const novaData: Record<string, unknown> = {
          divida_id: divida.id,
          tipo: modalidade === 'parcelado' ? 'parcelamento' : 'desconto',
          valor_original: valorBase,
          valor_oferta: valorAcordo,
          desconto_percentual: descontoFinalPct > 0 ? parseFloat(fmt2(descontoFinalPct)) : null,
          numero_parcelas: modalidade === 'parcelado' ? numParcelas : null,
          valor_parcela: modalidade === 'parcelado' ? parseFloat(fmt2(valorParcela)) : null,
          data_promessa: modalidade === 'parcelado' ? dataPrimeira : dataVencimento,
          responsavel_nome: 'Operador',
          notas: modalidade === 'parcelado'
            ? `Parcelado em ${numParcelas}x. Datas: ${datasParcelamento.join(', ')}`
            : '',
        }
        const negCriada = await negociacoesApi.create(novaData)
        negId = negCriada.id
      }

      const dataVenc = modalidade === 'a_vista' ? dataVencimento : dataPrimeira

      await cobrancasApi.create({
        negociacao_id: negId,
        divida_id: divida.id,
        forma_pagamento: formaPgto,
        valor: valorAcordo,
        data_vencimento: dataVenc,
        numero_parcelas: modalidade === 'parcelado' ? numParcelas : null,
      })

      refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar cobrança.')
    } finally { setLoading(false) }
  }

  const condicaoLabel = modalidade === 'a_vista'
    ? `À vista via ${formaPgto === 'pix' ? 'PIX' : formaPgto === 'boleto' ? 'Boleto' : 'Link'}`
    : `${numParcelas}x via ${formaPgto === 'pix' ? 'PIX' : formaPgto === 'boleto' ? 'Boleto' : 'Link'}`

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mt-4 pt-4 border-t border-border-subtle space-y-4">

      {/* Estado: cobrança ativa */}
      {cobrancaAtiva && negociacao ? (
        <PainelCobrancaAtiva cobranca={cobrancaAtiva} negociacao={negociacao} divida={divida} />
      ) : isPago ? (
        <div className="flex items-center gap-2 py-2 px-3 bg-emerald-dim border border-emerald/20 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald" />
          <span className="text-sm text-emerald font-semibold">Dívida paga</span>
          {divida.data_pagamento_confirmado && (
            <span className="text-xs text-emerald/70 ml-auto font-mono">{formatDate(divida.data_pagamento_confirmado)}</span>
          )}
        </div>
      ) : (
        <>
          {/* SEÇÃO A — Regras do credor */}
          {sim && (
            <div className="bg-elevated rounded-xl border border-border-subtle p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Regras da negociação — {credorNome}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: ShieldCheck, label: 'Máx. desconto', value: `${sim.limite_desconto_pct}%` },
                  { icon: Layers, label: 'Máx. parcelas', value: `${sim.max_parcelas}x` },
                  { icon: CreditCard, label: 'Entrada mínima', value: `${sim.entrada_minima_pct}%` },
                  { icon: CalendarClock, label: 'Atraso atual', value: `${sim.dias_atraso} dias` },
                ].map(item => (
                  <div key={item.label} className="bg-surface rounded-lg border border-border-subtle p-2 text-center">
                    <p className="text-[9px] text-ink-muted font-mono uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-bold text-ink-primary mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO B — Modalidade */}
          <div>
            <p className="text-xs text-ink-muted font-mono mb-2">1. Escolha o acordo</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => onModalidadeChange('a_vista')}
                className={`rounded-xl border p-3 text-left transition-all ${modalidade === 'a_vista'
                  ? 'border-emerald bg-emerald-dim ring-1 ring-emerald/30'
                  : 'border-border-default bg-surface hover:border-border-emphasis'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink-primary">À vista</span>
                  {descontoFinalPct > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-emerald/10 text-emerald rounded px-1.5 py-0.5">
                      {descontoFinalPct.toFixed(1)}% OFF
                    </span>
                  )}
                </div>
                <p className="font-mono font-bold text-base text-emerald">{formatCurrency(valorAcordo)}</p>
                <p className="text-[10px] text-ink-muted font-mono">Desconto: {formatCurrency(descontoR)}</p>
              </button>

              <button
                onClick={() => onModalidadeChange('parcelado')}
                className={`rounded-xl border p-3 text-left transition-all ${modalidade === 'parcelado'
                  ? 'border-accent bg-accent-dim ring-1 ring-accent/30'
                  : 'border-border-default bg-surface hover:border-border-emphasis'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink-primary">Parcelado</span>
                  <span className="text-[10px] font-mono font-bold bg-accent/10 text-accent rounded px-1.5 py-0.5">
                    {numParcelas}x
                  </span>
                </div>
                <p className="font-mono font-bold text-base text-accent">
                  {numParcelas}x de {formatCurrency(valorParcela)}
                </p>
                <p className="text-[10px] text-ink-muted font-mono">Total: {formatCurrency(valorAcordo)}</p>
              </button>
            </div>

            {/* Desconto bidirecional */}
            <div className="bg-elevated border border-border-subtle rounded-xl p-3 space-y-2.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Desconto</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-ink-muted block mb-1">Em R$</label>
                  <input
                    type="number" step="0.01" min="0" max={valorBase}
                    value={descontoValor}
                    onChange={e => onDescontoValorChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full text-xs bg-surface border border-border-default rounded-lg px-2.5 py-2 text-ink-primary focus:outline-none focus:border-accent/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-ink-muted block mb-1">Em %</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={descontoPct}
                    onChange={e => onDescontoPctChange(e.target.value)}
                    placeholder="0.0"
                    className={`w-full text-xs bg-surface border rounded-lg px-2.5 py-2 text-ink-primary focus:outline-none transition-colors ${
                      acimaDolimite ? 'border-danger focus:border-danger' : 'border-border-default focus:border-accent/60'
                    }`}
                  />
                </div>
              </div>
              {acimaDolimite && (
                <p className="flex items-center gap-1 text-danger text-[10px]">
                  <AlertTriangle className="w-3 h-3" />
                  Limite do credor: {limitePct}% — desconto atual acima do permitido
                </p>
              )}
            </div>

            {/* Seletor de parcelas (só no parcelado) */}
            {modalidade === 'parcelado' && (
              <div className="bg-elevated border border-border-subtle rounded-xl p-3 mt-2 space-y-2.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Número de parcelas</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setNumParcelas(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        numParcelas === n
                          ? 'bg-accent text-white shadow-sm'
                          : 'bg-surface border border-border-default text-ink-secondary hover:border-accent/50'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                {numParcelas > 1 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Valor de cada parcela:</span>
                    <span className="font-mono font-bold text-accent">{formatCurrency(valorParcela)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Datas de pagamento */}
            <div className="bg-elevated border border-border-subtle rounded-xl p-3 mt-2 space-y-2.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {modalidade === 'a_vista' ? 'Data de vencimento' : 'Data do primeiro pagamento'}
              </p>

              {modalidade === 'a_vista' ? (
                <input
                  type="date"
                  value={dataVencimento}
                  min={todayStr}
                  onChange={e => setDataVencimento(e.target.value)}
                  className="w-full text-xs bg-surface border border-border-default rounded-lg px-2.5 py-2 text-ink-primary focus:outline-none focus:border-accent/60 transition-colors"
                />
              ) : (
                <>
                  <input
                    type="date"
                    value={dataPrimeira}
                    min={todayStr}
                    onChange={e => setDataPrimeira(e.target.value)}
                    className="w-full text-xs bg-surface border border-border-default rounded-lg px-2.5 py-2 text-ink-primary focus:outline-none focus:border-accent/60 transition-colors"
                  />
                  {/* Calendário de parcelas */}
                  {dataPrimeira && numParcelas > 1 && (
                    <div className="mt-1">
                      <p className="text-[10px] text-ink-muted mb-1.5">Cronograma de pagamentos:</p>
                      <div className="space-y-1">
                        {datasParcelamento.map((data, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-surface rounded-lg px-2.5 py-1.5 border border-border-subtle">
                            <span className="text-ink-muted font-mono">Parcela {i + 1}/{numParcelas}</span>
                            <span className="font-mono text-ink-secondary">{formatDate(data)}</span>
                            <span className="font-mono font-bold text-accent">{formatCurrency(valorParcela)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs font-bold px-2.5 py-1.5 border-t border-border-subtle mt-1">
                          <span className="text-ink-secondary">Total</span>
                          <span className="font-mono text-emerald">{formatCurrency(valorAcordo)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SEÇÃO C — Forma de pagamento */}
          <div>
            <p className="text-xs text-ink-muted font-mono mb-2">2. Escolha a forma de pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: 'pix', icon: Zap, label: 'PIX', sub: 'Aprovação imediata' },
                { val: 'boleto', icon: AlignJustify, label: 'Boleto bancário', sub: 'Vencimento em 2 dias' },
                { val: 'link_parcelado', icon: CreditCard, label: 'Cartão / Link', sub: `Até ${maxParcelas}x` },
              ] as const).map(opt => {
                const Icon = opt.icon
                const selected = formaPgto === opt.val
                return (
                  <button key={opt.val} onClick={() => setFormaPgto(opt.val)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${selected
                      ? 'border-emerald bg-emerald-dim ring-1 ring-emerald/30'
                      : 'border-border-default bg-surface hover:border-border-emphasis'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${selected ? 'text-emerald' : 'text-ink-secondary'}`} />
                      <span className={`text-[11px] font-semibold ${selected ? 'text-emerald' : 'text-ink-primary'}`}>{opt.label}</span>
                    </div>
                    <p className="text-[9px] text-ink-muted">{opt.sub}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SEÇÃO D — Resumo */}
          <div className="bg-elevated border border-border-subtle rounded-xl p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-2">Resumo do acordo selecionado</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-ink-muted text-[10px]">Valor do acordo</p>
                <p className="font-mono font-bold text-ink-primary">{formatCurrency(valorAcordo)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-[10px]">Desconto</p>
                <p className="font-mono font-bold text-amber">
                  {formatCurrency(descontoR)} <span className="text-[10px]">({descontoFinalPct.toFixed(1)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-ink-muted text-[10px]">Você recebe</p>
                <p className="font-mono font-bold text-emerald">{formatCurrency(valorAcordo)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-[10px]">Condição</p>
                <p className="font-semibold text-ink-secondary">{condicaoLabel}</p>
              </div>
            </div>
          </div>

          {/* BOTÃO PRINCIPAL */}
          <button
            onClick={gerarCobranca}
            disabled={loading || acimaDolimite}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald hover:bg-emerald-light text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? 'Gerando cobrança...' : 'Gerar cobrança e enviar para o devedor'}
          </button>
          <p className="text-[10px] text-ink-muted text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            O acordo será registrado e o devedor receberá a cobrança selecionada.
          </p>

          {error && (
            <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </>
      )}

      {/* Ações secundárias */}
      {!isPago && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
          <button onClick={enviarWpp} disabled={wppLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-dim border border-emerald/20 rounded-lg text-emerald hover:bg-emerald/20 transition-colors disabled:opacity-50">
            {wppLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : wppSent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
            {wppSent ? 'Enviado!' : 'WhatsApp'}
          </button>
          <button onClick={() => setContatoOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-elevated border border-border-default rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors">
            <FileText className="w-3.5 h-3.5" /> Registrar Contato
          </button>
          <button onClick={() => setStatusOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-elevated border border-border-default rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Mudar Status
          </button>
        </div>
      )}

      <RegistrarContatoModal open={contatoOpen} onClose={() => setContatoOpen(false)} onSuccess={refresh} dividaId={divida.id} />
      <MudarStatusModal open={statusOpen} onClose={() => setStatusOpen(false)} onSuccess={refresh} dividaId={divida.id} statusAtual={divida.status} credorNome={credorNome} />
    </div>
  )
}
