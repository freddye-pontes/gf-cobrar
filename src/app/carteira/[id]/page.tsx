import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { devedoresApi, dividasApi, negociacoesApi } from '@/lib/api'
import {
  formatCurrency, formatDate, getTipoLabel,
  getTipoNegociacaoLabel, maskCpfCnpj,
} from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, MapPin, MessageSquare,
  FileText, Clock, AlertTriangle, CheckCircle2,
  Building2, User, CalendarCheck, Gavel, Lock, Hash,
} from 'lucide-react'
import type { StatusDivida, CanalContato } from '@/lib/types'
import { DevedorQuickActions, DividaActionButtons } from './DevedorActions'

const canalIcon: Record<CanalContato, React.ReactNode> = {
  whatsapp: <MessageSquare className="w-3.5 h-3.5 text-emerald" />,
  email: <Mail className="w-3.5 h-3.5 text-accent-light" />,
  telefone: <Phone className="w-3.5 h-3.5 text-amber" />,
  sistema: <FileText className="w-3.5 h-3.5 text-ink-muted" />,
}

const statusIcon: Record<string, React.ReactNode> = {
  em_aberto: <AlertTriangle className="w-4 h-4 text-accent-light" />,
  em_negociacao: <Clock className="w-4 h-4 text-amber-light" />,
  ptp_ativa: <CalendarCheck className="w-4 h-4 text-violet-light" />,
  pago: <CheckCircle2 className="w-4 h-4 text-emerald-light" />,
  judicial: <Gavel className="w-4 h-4 text-danger-light" />,
  encerrado: <CheckCircle2 className="w-4 h-4 text-ink-muted" />,
}

export default async function DevedorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const devedorId = parseInt(id)

  if (isNaN(devedorId)) notFound()

  // Fetch devedor + dividas list in parallel
  const [devedor, dividasList] = await Promise.all([
    devedoresApi.get(devedorId).catch(() => null),
    dividasApi.list({ devedor_id: devedorId }).catch(() => []),
  ])

  if (!devedor) notFound()

  // Fetch full dividas (with historico) + negociacoes in parallel
  const [dividas, allNegociacoes] = await Promise.all([
    Promise.all(dividasList.map((d) => dividasApi.get(d.id).catch(() => null))).then(
      (ds) => ds.filter(Boolean) as NonNullable<(typeof ds)[0]>[],
    ),
    negociacoesApi.list().catch(() => []),
  ])

  const dividaIds = new Set(dividasList.map((d) => d.id))
  const negociacoes = allNegociacoes.filter((n) => dividaIds.has(n.divida_id))

  const totalEmAberto = dividas
    .filter((d) => d.status !== 'pago' && d.status !== 'encerrado')
    .reduce((s, d) => s + d.valor_atualizado, 0)

  const scoreColor = !devedor.score_spc
    ? '#7a9bc8'
    : devedor.score_spc >= 400
    ? '#34d399'
    : devedor.score_spc >= 250
    ? '#fbbf24'
    : '#f87171'

  const { endereco } = devedor

  return (
    <AppLayout>
      <div className="min-h-full bg-void">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/carteira"
              className="flex items-center gap-1.5 text-ink-muted hover:text-ink-secondary transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Carteira
            </Link>
            <span className="text-border-default">/</span>
            <span className="text-ink-primary text-sm font-medium">{devedor.nome}</span>
          </div>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
          {/* Left: Debtor profile */}
          <div className="space-y-4">
            {/* Identity card */}
            <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-elevated border border-border-default flex items-center justify-center shrink-0">
                  {devedor.tipo === 'PJ' ? (
                    <Building2 className="w-5 h-5 text-ink-secondary" />
                  ) : (
                    <User className="w-5 h-5 text-ink-secondary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-bold text-ink-primary text-base leading-tight">
                    {devedor.nome}
                  </h2>
                  <p className="font-mono text-ink-muted text-xs mt-1">{maskCpfCnpj(devedor.cpf_cnpj)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-2 py-0.5 text-ink-secondary uppercase">
                      {devedor.tipo}
                    </span>
                    {devedor.perfil && (
                      <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-2 py-0.5 text-ink-secondary uppercase">
                        {devedor.perfil}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total em aberto */}
              <div className="bg-danger-dim border border-danger/20 rounded-lg p-3 mb-4">
                <p className="text-ink-muted text-xs mb-1">Total em Aberto</p>
                <p className="font-display font-bold text-danger-light text-xl">
                  {formatCurrency(totalEmAberto)}
                </p>
                <p className="text-ink-muted text-xs mt-1">{dividas.length} dívida(s) no sistema</p>
              </div>

              {/* Score SPC */}
              {devedor.score_spc !== null && devedor.score_spc !== undefined && (
                <div className="bg-elevated border border-border-default rounded-lg p-3 mb-4">
                  <p className="text-ink-muted text-xs mb-2">Score SPC/Serasa</p>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-2xl" style={{ color: scoreColor }}>
                      {devedor.score_spc}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-void rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(devedor.score_spc / 1000) * 100}%`, background: scoreColor }}
                        />
                      </div>
                      <p className="text-ink-muted text-[10px] mt-1">
                        {devedor.score_spc >= 400 ? 'Risco Baixo' : devedor.score_spc >= 250 ? 'Risco Médio' : 'Risco Alto'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact info */}
              <div className="space-y-2.5">
                {devedor.telefones.map((tel, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span className="font-mono text-ink-secondary text-sm">{tel}</span>
                    {i === 0 && (
                      <span className="text-[9px] text-ink-muted border border-border-subtle rounded px-1">PRINCIPAL</span>
                    )}
                  </div>
                ))}
                {devedor.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span className="font-mono text-ink-secondary text-xs truncate">{devedor.email}</span>
                  </div>
                )}
                {endereco.logradouro && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
                    <span className="text-ink-secondary text-xs">
                      {endereco.logradouro}, {endereco.numero}
                      {endereco.complemento && `, ${endereco.complemento}`}
                      {endereco.cidade && ` — ${endereco.cidade}/${endereco.estado}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions — client component */}
            <DevedorQuickActions
              devedorNome={devedor.nome}
              devedorId={devedor.id}
              dividas={dividas.map((d) => ({
                id: d.id,
                status: d.status,
                credorNome: d.credor_nome ?? '',
              }))}
            />
          </div>

          {/* Right: Debts + History */}
          <div className="xl:col-span-2 space-y-5">
            <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '100ms', opacity: 0 }}>
              <div className="px-5 py-4 border-b border-border-subtle">
                <h3 className="font-display font-semibold text-ink-primary text-sm">Dívidas</h3>
              </div>

              {dividas.length === 0 ? (
                <div className="py-16 text-center text-ink-muted text-sm">
                  Nenhuma dívida encontrada para este devedor.
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {dividas.map((divida) => {
                    const negociacao = negociacoes.find((n) => n.divida_id === divida.id && n.status === 'ativa')

                    return (
                      <div key={divida.id} className="p-5">
                        {/* Chave imutável da dívida */}
                        <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-border-subtle">
                          <Hash className="w-3 h-3 text-ink-muted" />
                          <span className="font-mono text-xs font-bold text-accent-light tracking-wider">
                            {divida.chave_divida}
                          </span>
                          {divida.chave_externa && (
                            <span className="text-[10px] font-mono text-ink-muted ml-2">
                              ref. ext: {divida.chave_externa}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{statusIcon[divida.status]}</div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-ink-primary text-sm font-medium">
                                  {divida.credor_nome ?? `Credor #${divida.credor_id}`}
                                </span>
                                <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-1.5 py-0.5 text-ink-muted">
                                  {getTipoLabel(divida.tipo as any)}
                                </span>
                                {divida.numero_contrato && (
                                  <span className="text-[10px] font-mono text-ink-disabled">
                                    {divida.numero_contrato}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-ink-muted mt-1">
                                Vencimento: {formatDate(divida.data_vencimento)}
                                {divida.dias_sem_contato > 0 && (
                                  <span
                                    className="ml-3 font-mono font-bold"
                                    style={{ color: divida.dias_sem_contato >= 7 ? '#ef4444' : '#f59e0b' }}
                                  >
                                    {divida.dias_sem_contato}d sem contato
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-ink-primary text-base">
                              {formatCurrency(divida.valor_atualizado)}
                            </p>
                            <p className="text-ink-muted text-xs font-mono">
                              orig. {formatCurrency(divida.valor_original)}
                            </p>
                            <div className="mt-1.5">
                              <StatusBadge status={divida.status as StatusDivida} size="sm" />
                            </div>
                          </div>
                        </div>

                        {/* Recommended action */}
                        {divida.acoes_recomendadas && (
                          <div className="bg-elevated/50 rounded-lg px-3 py-2 mb-3 border border-border-subtle">
                            <p className="text-ink-secondary text-xs">
                              <span className="text-ink-muted">→ </span>
                              {divida.acoes_recomendadas}
                            </p>
                          </div>
                        )}

                        {/* Active negotiation */}
                        {negociacao && (
                          <div className="bg-amber-dim border border-amber/20 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between">
                              <p className="text-amber text-xs font-semibold">
                                Negociação Ativa — {getTipoNegociacaoLabel(negociacao.tipo as any)}
                              </p>
                              <span className="font-mono text-xs text-amber-light font-bold">
                                {formatCurrency(negociacao.valor_oferta)}
                              </span>
                            </div>
                            {negociacao.numero_parcelas && (
                              <p className="text-amber/70 text-xs mt-1">
                                {negociacao.numero_parcelas}x de {formatCurrency(negociacao.valor_parcela ?? 0)}
                              </p>
                            )}
                            {negociacao.data_promessa && (
                              <p className="text-amber/70 text-xs mt-1">
                                Promessa para: {formatDate(negociacao.data_promessa)}
                              </p>
                            )}
                            {negociacao.notas && (
                              <p className="text-amber/60 text-xs mt-1.5 line-clamp-2">{negociacao.notas}</p>
                            )}
                            <p className="text-amber/50 text-[10px] mt-1">Resp: {negociacao.responsavel_nome}</p>
                          </div>
                        )}

                        {/* Per-divida actions — client component */}
                        <DividaActionButtons
                          divida={{ id: divida.id, status: divida.status, credorNome: divida.credor_nome ?? '' }}
                        />

                        {/* History — append-only / immutable */}
                        <div className="mt-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Lock className="w-3 h-3 text-ink-muted" />
                            <p className="text-ink-muted text-[10px] font-mono uppercase tracking-wider">
                              Histórico imutável ({divida.historico.length})
                            </p>
                          </div>
                          {divida.historico.length === 0 ? (
                            <p className="text-ink-disabled text-xs">Sem registros de contato.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {[...divida.historico].reverse().map((h) => (
                                <div key={h.id} className="flex items-start gap-2.5">
                                  <div className="shrink-0 mt-0.5">
                                    {canalIcon[h.canal as CanalContato] ?? canalIcon.sistema}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-ink-secondary text-xs">{h.resultado}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-ink-disabled text-[10px] font-mono">{formatDate(h.data)}</span>
                                      {h.operador_nome && (
                                        <span className="text-ink-disabled text-[10px]">· {h.operador_nome}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
