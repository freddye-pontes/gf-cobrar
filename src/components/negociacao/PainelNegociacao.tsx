'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, Layers, CalendarClock, AlertTriangle,
  Zap, AlignJustify, CreditCard, CheckCircle2, Loader2,
  Send, FileText, ArrowRightLeft, Lock, MessageSquare,
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

export function PainelNegociacao({ divida, negociacao, simulacao, cobrancaAtiva, credorNome }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  // Acordo
  const [modalidade, setModalidade] = useState<Modalidade>('a_vista')
  const [formaPgto, setFormaPgto] = useState<FormaPgto>('pix')
  const [valorCustom, setValorCustom] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals secundários
  const [contatoOpen, setContatoOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [wppLoading, setWppLoading] = useState(false)
  const [wppSent, setWppSent] = useState(false)

  const isPago = ['pago', 'encerrado'].includes(divida.status)

  // Calcular valores do acordo
  const sim = simulacao
  const valorBase = divida.valor_atualizado

  const valorAVista = sim ? sim.oferta_a_vista.valor : valorBase
  const descontoAVista = sim ? sim.oferta_a_vista.desconto_reais : 0
  const descontoPct = sim ? sim.oferta_a_vista.desconto_pct : 0
  const parcelaValor = sim ? sim.oferta_parcelado.valor_parcela : valorBase / 6
  const parcelaTotal = sim ? sim.oferta_parcelado.total : valorBase
  const numParcelas = sim ? sim.oferta_parcelado.parcelas : 6

  const valorAcordoFinal = parseFloat(valorCustom) || (modalidade === 'a_vista' ? valorAVista : parcelaTotal)
  const limitePct = sim?.limite_desconto_pct ?? 0
  const descontoFinalPct = valorBase > 0 ? ((valorBase - valorAcordoFinal) / valorBase) * 100 : 0
  const acimaDolimite = descontoFinalPct > limitePct + 0.01

  const condicaoLabel =
    modalidade === 'a_vista'
      ? `À vista via ${formaPgto === 'pix' ? 'PIX' : formaPgto === 'boleto' ? 'Boleto' : 'Link'}`
      : `${numParcelas}x via ${formaPgto === 'pix' ? 'PIX' : formaPgto === 'boleto' ? 'Boleto' : 'Link'}`

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
    } finally {
      setWppLoading(false)
    }
  }

  async function gerarCobranca() {
    if (acimaDolimite) return
    setLoading(true)
    setError(null)
    try {
      let negId = negociacao?.id

      // Se não existe negociação, criar uma
      if (!negId) {
        const hoje = new Date().toISOString().split('T')[0]
        const novaData: Record<string, unknown> = {
          divida_id: divida.id,
          tipo: modalidade === 'parcelado' ? 'parcelamento' : 'desconto',
          valor_original: valorBase,
          valor_oferta: valorAcordoFinal,
          desconto_percentual: descontoFinalPct > 0 ? descontoFinalPct : null,
          numero_parcelas: modalidade === 'parcelado' ? numParcelas : null,
          valor_parcela: modalidade === 'parcelado' ? parcelaValor : null,
          responsavel_nome: 'Operador',
          notas: '',
        }
        if (modalidade === 'parcelado') {
          novaData.data_promessa = hoje
        }
        const negCriada = await negociacoesApi.create(novaData)
        negId = negCriada.id
      }

      // Calcular vencimento
      const vencimento = new Date()
      vencimento.setDate(vencimento.getDate() + (formaPgto === 'pix' ? 1 : 2))
      const dataVencimento = vencimento.toISOString().split('T')[0]

      await cobrancasApi.create({
        negociacao_id: negId,
        divida_id: divida.id,
        forma_pagamento: formaPgto,
        valor: valorAcordoFinal,
        data_vencimento: dataVencimento,
        numero_parcelas: modalidade === 'parcelado' ? numParcelas : null,
      })

      refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar cobrança.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle space-y-4">

      {/* ── ESTADO: cobrança ativa ── */}
      {cobrancaAtiva && negociacao ? (
        <PainelCobrancaAtiva
          cobranca={cobrancaAtiva}
          negociacao={negociacao}
          divida={divida}
        />
      ) : isPago ? (
        <div className="flex items-center gap-2 py-2 px-3 bg-emerald-dim border border-emerald/20 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald" />
          <span className="text-sm text-emerald font-semibold">Dívida paga</span>
          {divida.data_pagamento_confirmado && (
            <span className="text-xs text-emerald/70 ml-auto font-mono">
              {formatDate(divida.data_pagamento_confirmado)}
            </span>
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

          {/* SEÇÃO B — Seletor de acordo */}
          <div>
            <p className="text-xs text-ink-muted font-mono mb-2">1. Escolha o acordo</p>
            <div className="grid grid-cols-2 gap-2">
              {/* À vista */}
              <button
                onClick={() => setModalidade('a_vista')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  modalidade === 'a_vista'
                    ? 'border-emerald bg-emerald-dim ring-1 ring-emerald/30'
                    : 'border-border-default bg-surface hover:border-border-emphasis'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink-primary">À vista com desconto</span>
                  <span className="text-[10px] font-mono font-bold bg-emerald/10 text-emerald rounded px-1.5 py-0.5">
                    {descontoPct.toFixed(0)}% OFF
                  </span>
                </div>
                <p className="font-mono font-bold text-lg text-emerald">{formatCurrency(valorAVista)}</p>
                <p className="text-[10px] text-ink-muted font-mono mt-0.5">Desconto: {formatCurrency(descontoAVista)}</p>
              </button>

              {/* Parcelado */}
              <button
                onClick={() => setModalidade('parcelado')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  modalidade === 'parcelado'
                    ? 'border-accent bg-accent-dim ring-1 ring-accent/30'
                    : 'border-border-default bg-surface hover:border-border-emphasis'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink-primary">Parcelado</span>
                  <span className="text-[10px] font-mono font-bold bg-accent/10 text-accent rounded px-1.5 py-0.5">
                    {numParcelas}x
                  </span>
                </div>
                <p className="font-mono font-bold text-lg text-accent">
                  {numParcelas}x de {formatCurrency(parcelaValor)}
                </p>
                <p className="text-[10px] text-ink-muted font-mono mt-0.5">Total: {formatCurrency(parcelaTotal)}</p>
              </button>
            </div>

            {/* Ajuste fino de valor */}
            <div className="mt-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorCustom}
                onChange={e => setValorCustom(e.target.value)}
                placeholder={`Ajustar valor (padrão: ${formatCurrency(modalidade === 'a_vista' ? valorAVista : parcelaTotal)})`}
                className={`w-full text-xs bg-elevated border rounded-lg px-3 py-2 text-ink-primary placeholder-ink-muted focus:outline-none transition-colors ${
                  acimaDolimite ? 'border-danger focus:border-danger' : 'border-border-default focus:border-accent/60'
                }`}
              />
              {acimaDolimite && (
                <p className="flex items-center gap-1 text-danger text-[10px] mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  Além do limite do credor ({limitePct}% de desconto)
                </p>
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
                { val: 'link_parcelado', icon: CreditCard, label: 'Cartão / Link', sub: `Parcele em até ${numParcelas}x` },
              ] as const).map(opt => {
                const Icon = opt.icon
                const selected = formaPgto === opt.val
                return (
                  <button
                    key={opt.val}
                    onClick={() => setFormaPgto(opt.val)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      selected
                        ? 'border-emerald bg-emerald-dim ring-1 ring-emerald/30'
                        : 'border-border-default bg-surface hover:border-border-emphasis'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${selected ? 'text-emerald' : 'text-ink-secondary'}`} />
                      <span className={`text-[11px] font-semibold ${selected ? 'text-emerald' : 'text-ink-primary'}`}>
                        {opt.label}
                      </span>
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
                <p className="font-mono font-bold text-ink-primary">{formatCurrency(valorAcordoFinal)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-[10px]">Desconto</p>
                <p className="font-mono font-bold text-amber">
                  {formatCurrency(valorBase - valorAcordoFinal)}{' '}
                  <span className="text-[10px]">({descontoFinalPct.toFixed(1)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-ink-muted text-[10px]">Você recebe</p>
                <p className="font-mono font-bold text-emerald">{formatCurrency(valorAcordoFinal)}</p>
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
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />
            }
            {loading ? 'Gerando cobrança...' : 'Gerar cobrança e enviar para o devedor'}
          </button>
          <p className="text-[10px] text-ink-muted text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            O acordo será registrado e o devedor receberá a cobrança selecionada.
          </p>

          {error && (
            <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </>
      )}

      {/* ── Ações secundárias (sempre visíveis) ── */}
      {!isPago && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
          <button
            onClick={enviarWpp}
            disabled={wppLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-dim border border-emerald/20 rounded-lg text-emerald hover:bg-emerald/20 transition-colors disabled:opacity-50"
          >
            {wppLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : wppSent
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <MessageSquare className="w-3.5 h-3.5" />
            }
            {wppSent ? 'Enviado!' : 'WhatsApp'}
          </button>
          <button
            onClick={() => setContatoOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-elevated border border-border-default rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Registrar Contato
          </button>
          <button
            onClick={() => setStatusOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-elevated border border-border-default rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-overlay transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Mudar Status
          </button>
        </div>
      )}

      <RegistrarContatoModal
        open={contatoOpen}
        onClose={() => setContatoOpen(false)}
        onSuccess={refresh}
        dividaId={divida.id}
      />
      <MudarStatusModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onSuccess={refresh}
        dividaId={divida.id}
        statusAtual={divida.status}
        credorNome={credorNome}
      />
    </div>
  )
}
