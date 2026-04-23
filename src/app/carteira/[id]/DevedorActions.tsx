'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Phone, FileText, ArrowRightLeft, Handshake, FilePlus, Send, Loader2, Check } from 'lucide-react'
import { RegistrarContatoModal } from '@/components/modals/RegistrarContatoModal'
import { MudarStatusModal } from '@/components/modals/MudarStatusModal'
import { NovaNegociacaoModal } from '@/components/modals/NovaNegociacaoModal'
import { NovaDividaModal } from '@/components/modals/NovaDividaModal'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

interface DividaInfo {
  id: number
  status: string
  credorNome: string
}

interface Props {
  devedorNome: string
  devedorId: number
  dividas: DividaInfo[]
}

export function DevedorQuickActions({ devedorNome, devedorId, dividas }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [contatoModal, setContatoModal] = useState<{ dividaId: number } | null>(null)
  const [statusModal, setStatusModal] = useState<DividaInfo | null>(null)
  const [negModal, setNegModal] = useState<{ dividaId: number } | null>(null)
  const [novaDividaOpen, setNovaDividaOpen] = useState(false)
  const [wppLoading, setWppLoading] = useState(false)
  const [wppSent, setWppSent] = useState(false)
  const [wppError, setWppError] = useState<string | null>(null)

  // Use first non-closed divida for quick actions
  const primaryDivida = dividas.find((d) => !['pago', 'encerrado'].includes(d.status)) ?? dividas[0]

  async function enviarWhatsApp() {
    if (!primaryDivida || wppLoading) return
    setWppLoading(true)
    setWppError(null)
    try {
      const res = await fetch(`${API}/whatsapp/enviar/${primaryDivida.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'primeiro_contato' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `Erro ${res.status}`)
      }
      setWppSent(true)
      setTimeout(() => setWppSent(false), 4000)
      refresh()
    } catch (e: unknown) {
      setWppError(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setWppLoading(false)
    }
  }

  return (
    <>
      {/* Quick actions panel */}
      <div className="bg-surface border border-border-subtle rounded-xl p-4 animate-fade-up" style={{ animationDelay: '80ms', opacity: 0 }}>
        <h3 className="font-display font-semibold text-ink-primary text-sm mb-3">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={enviarWhatsApp}
            disabled={!primaryDivida || wppLoading}
            className="flex items-center justify-center gap-2 bg-emerald-dim border border-emerald/20 text-emerald rounded-lg py-2.5 text-sm font-medium hover:bg-emerald/20 transition-colors disabled:opacity-50"
          >
            {wppLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : wppSent ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            {wppSent ? 'Enviado!' : 'WhatsApp'}
          </button>
          {wppError && <p className="col-span-2 text-xs text-danger mt-1">{wppError}</p>}
          <button className="flex items-center justify-center gap-2 bg-accent-dim border border-accent/20 text-accent-light rounded-lg py-2.5 text-sm font-medium hover:bg-accent/20 transition-colors">
            <Phone className="w-4 h-4" />
            Ligar
          </button>
          <button
            onClick={() => primaryDivida && setContatoModal({ dividaId: primaryDivida.id })}
            disabled={!primaryDivida}
            className="flex items-center justify-center gap-2 bg-elevated border border-border-default text-ink-secondary rounded-lg py-2.5 text-sm font-medium hover:bg-overlay transition-colors disabled:opacity-40"
          >
            <FileText className="w-4 h-4" />
            Registrar Contato
          </button>
          <button
            onClick={() => setNovaDividaOpen(true)}
            className="flex items-center justify-center gap-2 bg-elevated border border-border-default text-ink-secondary rounded-lg py-2.5 text-sm font-medium hover:bg-overlay transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            Nova Dívida
          </button>
        </div>
      </div>

      {/* Per-divida action buttons (rendered inline via portal) */}
      {dividas.map((d) => (
        <div key={d.id} id={`divida-actions-${d.id}`} className="contents">
          {/* Buttons injected via data attrs — see DividaActionButtons below */}
        </div>
      ))}

      {/* Modals */}
      {contatoModal && (
        <RegistrarContatoModal
          open
          onClose={() => setContatoModal(null)}
          onSuccess={refresh}
          dividaId={contatoModal.dividaId}
          devedorNome={devedorNome}
        />
      )}

      {statusModal && (
        <MudarStatusModal
          open
          onClose={() => setStatusModal(null)}
          onSuccess={refresh}
          dividaId={statusModal.id}
          statusAtual={statusModal.status}
          credorNome={statusModal.credorNome}
        />
      )}

      {negModal && (
        <NovaNegociacaoModal
          open
          onClose={() => setNegModal(null)}
          onSuccess={refresh}
          preselectedDividaId={negModal.dividaId}
        />
      )}

      <NovaDividaModal
        open={novaDividaOpen}
        onClose={() => setNovaDividaOpen(false)}
        onSuccess={refresh}
        preselectedDevedorId={devedorId}
      />
    </>
  )
}

/** Inline action row per divida — rendered inside the server component list */
export function DividaActionButtons({ divida }: { divida: DividaInfo }) {
  const router = useRouter()
  const refresh = () => router.refresh()
  const [contatoOpen, setContatoOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [negOpen, setNegOpen] = useState(false)
  const [wppLoading, setWppLoading] = useState(false)
  const [wppSent, setWppSent] = useState(false)
  const [template, setTemplate] = useState('primeiro_contato')

  const podeNegociar = ['em_aberto', 'em_negociacao'].includes(divida.status)

  async function enviarWpp() {
    setWppLoading(true)
    try {
      const res = await fetch(`${API}/whatsapp/enviar/${divida.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      })
      if (!res.ok) throw new Error()
      setWppSent(true)
      setTimeout(() => setWppSent(false), 3000)
      refresh()
    } finally {
      setWppLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-1">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="text-xs bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-ink-secondary focus:outline-none focus:border-accent"
          >
            <option value="primeiro_contato">1º Contato</option>
            <option value="segundo_contato">2º Contato</option>
            <option value="escalamento">Escalamento</option>
          </select>
          <button
            onClick={enviarWpp}
            disabled={wppLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-dim border border-emerald/20 rounded-lg text-emerald hover:bg-emerald/20 transition-colors disabled:opacity-50"
          >
            {wppLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : wppSent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {wppSent ? 'Enviado!' : 'WhatsApp'}
          </button>
        </div>
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
        {podeNegociar && (
          <button
            onClick={() => setNegOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-dim border border-accent/20 rounded-lg text-accent-light hover:bg-accent/20 transition-colors"
          >
            <Handshake className="w-3.5 h-3.5" />
            Nova Negociação
          </button>
        )}
      </div>

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
        credorNome={divida.credorNome}
      />
      {podeNegociar && (
        <NovaNegociacaoModal
          open={negOpen}
          onClose={() => setNegOpen(false)}
          onSuccess={refresh}
          preselectedDividaId={divida.id}
        />
      )}
    </>
  )
}
