'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { credoresApi, type APICredorOut } from '@/lib/api'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface FaixaAging { faixa: string; ate_dias: number | null; comissao: number }

const AGING_PADRAO: FaixaAging[] = [
  { faixa: 'baixa',   ate_dias: 30,   comissao: 10 },
  { faixa: 'media',   ate_dias: 90,   comissao: 15 },
  { faixa: 'alta',    ate_dias: 180,  comissao: 25 },
  { faixa: 'critica', ate_dias: null, comissao: 30 },
]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  credor?: APICredorOut
}

export function NovoCredorModal({ open, onClose, onSuccess, credor }: Props) {
  const isEdit = Boolean(credor)

  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [observacao, setObservacao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [agingOpen, setAgingOpen] = useState(false)
  const [reguaAging, setReguaAging] = useState<FaixaAging[]>(AGING_PADRAO)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (credor) {
      setRazaoSocial(credor.razao_social)
      setCnpj(credor.cnpj)
      setPixKey(credor.pix_key ?? '')
      setContatoNome(credor.contato_nome ?? '')
      setContatoEmail(credor.contato_email ?? '')
      setObservacao((credor as any).observacao ?? '')
      setAtivo(credor.ativo)
      const ra = (credor as any).regua_aging
      setReguaAging(ra?.length ? ra : AGING_PADRAO)
    }
  }, [credor, open])

  function maskCNPJ(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 14)
    return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }

  function reset() {
    setRazaoSocial(''); setCnpj(''); setPixKey('')
    setContatoNome(''); setContatoEmail('')
    setObservacao(''); setAtivo(true); setError('')
    setReguaAging(AGING_PADRAO); setAgingOpen(false)
  }

  function updateFaixa(idx: number, field: keyof FaixaAging, value: unknown) {
    setReguaAging((prev) => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f))
  }

  function addFaixa() {
    setReguaAging((prev) => [...prev, { faixa: 'nova', ate_dias: null, comissao: 0 }])
  }

  function removeFaixa(idx: number) {
    setReguaAging((prev) => prev.filter((_, i) => i !== idx))
  }

  // Derive comissao_percentual from the first aging tier as default for backend
  const comissaoPadrao = reguaAging[0]?.comissao ?? 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!razaoSocial.trim()) { setError('Informe a razão social.'); return }
    if (!cnpj.trim()) { setError('Informe o CNPJ.'); return }

    setLoading(true); setError('')
    const payload = {
      razao_social: razaoSocial.trim(),
      cnpj: cnpj.replace(/\D/g, ''),
      pix_key: pixKey.trim(),
      contato_nome: contatoNome.trim(),
      contato_email: contatoEmail.trim(),
      observacao: observacao.trim() || null,
      comissao_percentual: comissaoPadrao,
      limite_desconto: 0,
      ativo,
      regua_aging: reguaAging,
    }
    try {
      if (isEdit && credor) {
        await credoresApi.update(credor.id, payload)
      } else {
        await credoresApi.create(payload)
      }
      reset(); onSuccess(); onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar credor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Editar Credor' : 'Novo Credor'} open={open}
      onClose={() => { reset(); onClose() }} size="lg"
      footer={
        <>
          <button type="button" onClick={() => { reset(); onClose() }} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button form="credor-form" type="submit" disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50">
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Credor'}
          </button>
        </>
      }>
      <form id="credor-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Razão Social" required>
          <input type="text" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)}
            placeholder="Ex: Banco Meridional S.A." className={inputCls} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="CNPJ" required>
            <input type="text" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              placeholder="00.000.000/0001-00" className={inputCls} />
          </FormField>
          <FormField label="Chave PIX">
            <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)}
              placeholder="E-mail, CPF ou CNPJ" className={inputCls} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nome do Contato">
            <input type="text" value={contatoNome} onChange={(e) => setContatoNome(e.target.value)}
              placeholder="Nome do responsável" className={inputCls} />
          </FormField>
          <FormField label="E-mail do Contato">
            <input type="email" value={contatoEmail} onChange={(e) => setContatoEmail(e.target.value)}
              placeholder="contato@empresa.com.br" className={inputCls} />
          </FormField>
        </div>

        <FormField label="Observação" hint="Informações adicionais sobre este credor">
          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)}
            placeholder="Condições especiais, notas internas..." rows={2} className={inputCls + ' resize-none'} />
        </FormField>

        {/* Aging tiers */}
        <div className="border border-border-default rounded-xl overflow-hidden">
          <button type="button" onClick={() => setAgingOpen(!agingOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-elevated text-sm text-ink-secondary hover:text-ink-primary transition-colors">
            <span className="font-medium">Régua de Aging (Comissão por Faixa)</span>
            {agingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {agingOpen && (
            <div className="p-4 space-y-2">
              <p className="text-xs text-ink-muted mb-3">
                A comissão de cada dívida é calculada automaticamente pela faixa de aging (dias em atraso).
              </p>
              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono uppercase tracking-wider text-ink-muted px-1 mb-1">
                <span>Faixa</span><span>Até (dias)</span><span>Comissão %</span><span />
              </div>
              {reguaAging.map((f, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                  <input type="text" value={f.faixa} onChange={(e) => updateFaixa(idx, 'faixa', e.target.value)}
                    placeholder="ex: alta" className={inputCls + ' text-xs'} />
                  <input type="number" min="1" value={f.ate_dias ?? ''} onChange={(e) => updateFaixa(idx, 'ate_dias', e.target.value ? Number(e.target.value) : null)}
                    placeholder="sem limite" className={inputCls + ' text-xs'} />
                  <input type="number" min="0" max="100" step="0.5" value={f.comissao} onChange={(e) => updateFaixa(idx, 'comissao', Number(e.target.value))}
                    className={inputCls + ' text-xs'} />
                  <button type="button" onClick={() => removeFaixa(idx)} disabled={reguaAging.length <= 1}
                    className="p-1.5 rounded text-ink-muted hover:text-danger disabled:opacity-30 transition-colors justify-self-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addFaixa}
                className="flex items-center gap-1.5 text-xs text-accent-light hover:text-accent transition-colors mt-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar Faixa
              </button>
            </div>
          )}
        </div>

        {isEdit && (
          <div className="flex items-center gap-3">
            <input type="checkbox" id="ativo-check" checked={ativo} onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 accent-[#3b82f6]" />
            <label htmlFor="ativo-check" className="text-sm text-ink-secondary cursor-pointer">Credor ativo</label>
          </div>
        )}

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
