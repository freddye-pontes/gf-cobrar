'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { credoresApi, type APICredorOut } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Pass credor to edit existing, undefined to create new */
  credor?: APICredorOut
}

export function NovoCredorModal({ open, onClose, onSuccess, credor }: Props) {
  const isEdit = Boolean(credor)

  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [comissao, setComissao] = useState('')
  const [limiteDesconto, setLimiteDesconto] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Populate fields when editing
  useEffect(() => {
    if (credor) {
      setRazaoSocial(credor.razao_social)
      setCnpj(credor.cnpj)
      setPixKey(credor.pix_key ?? '')
      setContatoNome(credor.contato_nome ?? '')
      setContatoEmail(credor.contato_email ?? '')
      setComissao(String(credor.comissao_percentual))
      setLimiteDesconto(String(credor.limite_desconto))
      setAtivo(credor.ativo)
    }
  }, [credor])

  function reset() {
    setRazaoSocial(''); setCnpj(''); setPixKey('')
    setContatoNome(''); setContatoEmail('')
    setComissao(''); setLimiteDesconto('')
    setAtivo(true); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!razaoSocial.trim()) { setError('Informe a razão social.'); return }
    if (!cnpj.trim()) { setError('Informe o CNPJ.'); return }
    if (!comissao) { setError('Informe o percentual de comissão.'); return }
    if (!limiteDesconto) { setError('Informe o limite de desconto.'); return }

    setLoading(true); setError('')
    const payload = {
      razao_social: razaoSocial.trim(),
      cnpj: cnpj.trim(),
      pix_key: pixKey.trim(),
      contato_nome: contatoNome.trim(),
      contato_email: contatoEmail.trim(),
      comissao_percentual: parseFloat(comissao),
      limite_desconto: parseFloat(limiteDesconto),
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
          <button
            type="button"
            onClick={() => { reset(); onClose() }}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            form="credor-form"
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50"
          >
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
            <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)}
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

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Comissão (%)" required hint="Percentual sobre valor recuperado">
            <input type="number" step="0.1" min="0" max="100" value={comissao}
              onChange={(e) => setComissao(e.target.value)} placeholder="Ex: 15" className={inputCls} />
          </FormField>
          <FormField label="Limite de Desconto (%)" required hint="Máximo que operadores podem oferecer">
            <input type="number" step="0.1" min="0" max="100" value={limiteDesconto}
              onChange={(e) => setLimiteDesconto(e.target.value)} placeholder="Ex: 30" className={inputCls} />
          </FormField>
        </div>

        {isEdit && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="ativo-check"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 accent-[#3b82f6]"
            />
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
