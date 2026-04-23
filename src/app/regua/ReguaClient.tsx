'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  GitBranch, MessageSquare, Mail, Phone, AlertTriangle,
  ChevronRight, Plus, Settings2, Check, Gavel,
} from 'lucide-react'
import type { APICredorOut } from '@/lib/api'
import { EditarReguaModal, type RegraEtapa } from '@/components/modals/EditarReguaModal'

const regrasPadrao: RegraEtapa[] = [
  { dia: 0, acao: 'Importação', canal: 'escalamento', descricao: 'Dívida importada ao sistema e indexada na carteira', automatico: true },
  { dia: 1, acao: 'Primeiro Contato', canal: 'whatsapp', descricao: 'Template amigável com informações da dívida e link de negociação', automatico: false },
  { dia: 3, acao: 'Segundo Contato', canal: 'whatsapp', descricao: 'Mensagem de lembrete + e-mail com boleto ou link de pagamento', automatico: false },
  { dia: 7, acao: 'Contato por Ligação', canal: 'telefone', descricao: 'Dívida entra na fila de ligação do operador com prioridade alta', automatico: false },
  { dia: 15, acao: 'Tentativa Alternativa', canal: 'telefone', descricao: 'Tentar números alternativos + novo WhatsApp com tom mais formal', automatico: false },
  { dia: 30, acao: 'Escalonamento', canal: 'escalamento', descricao: 'Notificação extrajudicial por e-mail formal e encaminhamento para análise judicial', automatico: true },
]

const canalConfig = {
  whatsapp:   { label: 'WhatsApp', icon: MessageSquare, color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)' },
  email:      { label: 'E-mail',   icon: Mail,          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
  telefone:   { label: 'Ligação',  icon: Phone,         color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
  escalamento:{ label: 'Sistema',  icon: Gavel,         color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
}

interface Props {
  credores: APICredorOut[]
}

export function ReguaClient({ credores }: Props) {
  const [selectedCredorId, setSelectedCredorId] = useState(credores[0]?.id ?? 0)
  const credor = credores.find((c) => c.id === selectedCredorId) ?? credores[0]
  const [editarOpen, setEditarOpen] = useState(false)
  const [etapas, setEtapas] = useState<RegraEtapa[]>(regrasPadrao)

  return (
    <AppLayout>
      <div className="min-h-full bg-void">
        <div className="sticky top-0 z-10 bg-void/95 backdrop-blur border-b border-border-subtle px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg md:text-xl text-ink-primary tracking-tight">
                Régua de Cobrança
              </h1>
              <p className="text-ink-muted text-xs font-mono mt-0.5 hidden sm:block">
                Fluxo de contato automático por credor
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedCredorId}
                onChange={(e) => setSelectedCredorId(Number(e.target.value))}
                className="appearance-none bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent/50 max-w-[140px] sm:max-w-none truncate"
              >
                {credores.map((c) => (
                  <option key={c.id} value={c.id}>{c.razao_social}</option>
                ))}
              </select>
              <button
                onClick={() => setEditarOpen(true)}
                className="flex items-center gap-2 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-medium rounded-lg px-3 md:px-4 py-2">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar Régua</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* Credor info */}
          {credor && (
            <div className="bg-surface border border-border-subtle rounded-xl p-4 mb-6 flex items-center gap-4 animate-fade-up" style={{ animationDelay: '0ms', opacity: 0 }}>
              <GitBranch className="w-5 h-5 text-accent-light shrink-0" />
              <div className="flex-1">
                <p className="text-ink-primary text-sm font-semibold">{credor.razao_social}</p>
                <p className="text-ink-muted text-xs mt-0.5">
                  Desconto máximo: <span className="text-amber font-mono">{credor.limite_desconto}%</span>
                  <span className="mx-2 text-border-emphasis">·</span>
                  Comissão: <span className="text-emerald font-mono">{credor.comissao_percentual}%</span>
                  <span className="mx-2 text-border-emphasis">·</span>
                  <span className="text-ink-secondary">Régua padrão aplicada</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-dim border border-emerald/20 rounded-lg px-3 py-1.5">
                <Check className="w-3.5 h-3.5 text-emerald" />
                <span className="text-emerald text-xs font-medium">Ativa</span>
              </div>
            </div>
          )}

          {/* Adaptive responses + Pause rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '80ms', opacity: 0 }}>
              <h3 className="font-display font-semibold text-ink-primary text-sm mb-4">Adaptação por Resposta</h3>
              <div className="space-y-3">
                {[
                  { resp: 'Promessa de Pagamento (PTP)', acao: 'Fluxo pausado → lembrete no dia acordado → confirma pagamento', color: '#a78bfa' },
                  { resp: 'Quer Negociar', acao: 'Encaminha para operador → abre módulo de negociação', color: '#fbbf24' },
                  { resp: 'Sem Contato / Recusa', acao: 'Tenta telefones alternativos → escalamento automático', color: '#f87171' },
                  { resp: 'Pagamento Confirmado', acao: 'Dívida encerrada → calcula comissão → agenda repasse', color: '#34d399' },
                ].map((item) => (
                  <div key={item.resp} className="flex items-start gap-3">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: item.color }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: item.color }}>{item.resp}</p>
                      <p className="text-ink-muted text-xs mt-0.5">{item.acao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border-subtle rounded-xl p-5 animate-fade-up" style={{ animationDelay: '120ms', opacity: 0 }}>
              <h3 className="font-display font-semibold text-ink-primary text-sm mb-4">Regras de Pausa</h3>
              <div className="space-y-3">
                {[
                  { rule: 'PTP Ativa', detail: 'Régua pausada enquanto houver promessa vigente', icon: '⏸' },
                  { rule: 'Em Negociação', detail: 'Contato automático suspenso durante negociação ativa', icon: '🤝' },
                  { rule: 'Pago / Encerrado', detail: 'Dívida removida da régua automaticamente', icon: '✓' },
                  { rule: 'Judicial', detail: 'Todos os contatos automáticos cessam', icon: '⚖' },
                ].map((item) => (
                  <div key={item.rule} className="flex items-start gap-3 p-3 rounded-lg bg-elevated border border-border-subtle">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-ink-primary text-xs font-medium">{item.rule}</p>
                      <p className="text-ink-muted text-xs mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden animate-fade-up" style={{ animationDelay: '160ms', opacity: 0 }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h3 className="font-display font-semibold text-ink-primary text-sm">Fluxo de Etapas</h3>
              <button onClick={() => setEditarOpen(true)} className="flex items-center gap-1.5 text-accent-light text-xs hover:text-accent transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Adicionar Etapa
              </button>
            </div>

            <div className="p-5">
              <div className="relative">
                <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border-default" />
                <div className="space-y-1">
                  {etapas.map((etapa, i) => {
                    const cfg = canalConfig[etapa.canal]
                    const Icon = cfg.icon
                    return (
                      <div key={i} className="relative flex items-start gap-4 py-3 pl-2 pr-3 rounded-lg hover:bg-elevated/30 transition-colors group">
                        <div
                          className="relative z-10 w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs" style={{ color: cfg.color }}>D+{etapa.dia}</span>
                            <span className="text-ink-primary text-sm font-medium">{etapa.acao}</span>
                            <span className="text-[10px] font-mono rounded px-1.5 py-0.5" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                              {cfg.label}
                            </span>
                            {etapa.automatico && (
                              <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-1.5 py-0.5 text-ink-muted">AUTO</span>
                            )}
                          </div>
                          <p className="text-ink-muted text-xs mt-1">{etapa.descricao}</p>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-elevated border border-border-default text-ink-muted hover:text-ink-secondary mt-1 shrink-0">
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Pós-MVP notice */}
          <div className="mt-4 flex items-start gap-3 bg-violet-dim border border-violet/20 rounded-xl p-4 animate-fade-up" style={{ animationDelay: '200ms', opacity: 0 }}>
            <AlertTriangle className="w-4 h-4 text-violet shrink-0 mt-0.5" />
            <div>
              <p className="text-violet-light text-sm font-medium">Automação Total — Pós-MVP</p>
              <p className="text-violet/70 text-xs mt-0.5">
                No MVP, o disparo de WhatsApp e ligações é semi-automático (operador confirma cada ação). A automação completa com disparo autônomo por régua e chatbot estará disponível na próxima fase.
              </p>
            </div>
          </div>
        </div>
      </div>

      <EditarReguaModal
        open={editarOpen}
        onClose={() => setEditarOpen(false)}
        etapas={etapas}
        credorNome={credor?.razao_social ?? ''}
        onSave={(novasEtapas) => setEtapas(novasEtapas)}
      />
    </AppLayout>
  )
}
