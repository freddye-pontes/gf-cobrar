'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Phone, FileText, ArrowRightLeft, Handshake, FilePlus } from 'lucide-react'
import { RegistrarContatoModal } from '@/components/modals/RegistrarContatoModal'
import { MudarStatusModal } from '@/components/modals/MudarStatusModal'
import { NovaNegociacaoModal } from '@/components/modals/NovaNegociacaoModal'
import { NovaDividaModal } from '@/components/modals/NovaDividaModal'

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

  // Use first non-closed divida for quick actions
  const primaryDivida = dividas.find((d) => !['pago', 'encerrado'].includes(d.status)) ?? dividas[0]

  return (
    <>
      {/* Quick actions panel */}
      <div className="bg-surface border border-border-subtle rounded-xl p-4 animate-fade-up" style={{ animationDelay: '80ms', opacity: 0 }}>
        <h3 className="font-display font-semibold text-ink-primary text-sm mb-3">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 bg-emerald-dim border border-emerald/20 text-emerald rounded-lg py-2.5 text-sm font-medium hover:bg-emerald/20 transition-colors">
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
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

  const podeNegociar = ['em_aberto', 'em_negociacao'].includes(divida.status)

  return (
    <>
      <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle">
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
