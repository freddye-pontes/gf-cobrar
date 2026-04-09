'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { credoresApi, type APICredorOut } from '@/lib/api'

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
    }
  }, [credor])

  function maskCNPJ(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 14)
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }

  function reset() {
    setRazaoSocial(''); setCnpj(''); setPixKey('')
    setContatoNome(''); setContatoEmail('')
    setObservacao(''); setAtivo(true); setError('')
  }

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
      comissao_percentual: 0,
      limite_desconto: 0,
      ativo,
    }
    try {
      if (isEdit && credor) {
        await credoresApi.update(credor.id, payload)
      } else {
        await credoresApi.create(payload)
      }
      reset()
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar credor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Credor' : 'Novo Credor'}
      open={open}
      onClose={() => { reset(); onClose() }}
      size="lg"
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
      }
    >
      <form id="credor-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Razão Social" required>
          <input type="text" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)}
            placeholder="Ex: Banco Meridional S.A." className={inputCls} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="CNPJ" required>
            <input type="text" value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
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
            placeholder="Condições especiais, contatos adicionais, notas internas..."
            rows={3} className={inputCls + ' resize-none'} />
        </FormField>

        {isEdit && (
          <div className="flex items-center gap-3">
            <input type="checkbox" id="ativo-check" checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 accent-[#3b82f6]" />
            <label htmlFor="ativo-check" className="text-sm text-ink-secondary cursor-pointer">
              Credor ativo
            </label>
          </div>
        )}

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
