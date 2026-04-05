'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { devedoresApi, type APIDevedor } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  devedor?: APIDevedor
}

export function NovoDevedorModal({ open, onClose, onSuccess, devedor }: Props) {
  const isEdit = Boolean(devedor)

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'PF' | 'PJ'>('PF')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cep, setCep] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (devedor) {
      setNome(devedor.nome)
      setTipo(devedor.tipo as 'PF' | 'PJ')
      setCpfCnpj(devedor.cpf_cnpj)
      setTelefone(devedor.telefones?.[0] ?? '')
      setEmail(devedor.email ?? '')
      setLogradouro(devedor.endereco?.logradouro ?? '')
      setNumero(devedor.endereco?.numero ?? '')
      setBairro(devedor.endereco?.bairro ?? '')
      setCidade(devedor.endereco?.cidade ?? '')
      setEstado(devedor.endereco?.estado ?? '')
      setCep(devedor.endereco?.cep ?? '')
    }
  }, [devedor])

  function reset() {
    setNome(''); setTipo('PF'); setCpfCnpj(''); setTelefone('')
    setEmail(''); setLogradouro(''); setNumero(''); setBairro('')
    setCidade(''); setEstado(''); setCep(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('Informe o nome.'); return }
    if (!cpfCnpj.trim()) { setError(`Informe o ${tipo === 'PF' ? 'CPF' : 'CNPJ'}.`); return }

    setLoading(true); setError('')
    const payload = {
      nome: nome.trim(),
      tipo,
      cpf_cnpj: cpfCnpj.trim(),
      telefones: telefone.trim() ? [telefone.trim()] : [],
      email: email.trim() || null,
      endereco: {
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        cep: cep.trim() || null,
      },
    }

    try {
      if (isEdit && devedor) {
        await devedoresApi.update(devedor.id, payload)
      } else {
        await devedoresApi.create(payload)
      }
      reset()
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar devedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Devedor' : 'Novo Devedor'}
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
            form="devedor-form"
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Devedor'}
          </button>
        </>
      }
    >
      <form id="devedor-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo" required>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'PF' | 'PJ')} className={selectCls}>
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
          </FormField>
          <FormField label={tipo === 'PF' ? 'CPF' : 'CNPJ'} required>
            <input type="text" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder={tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
              className={inputCls} />
          </FormField>
        </div>

        <FormField label="Nome completo / Razão Social" required>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder={tipo === 'PF' ? 'Nome completo' : 'Razão social'}
            className={inputCls} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Telefone / WhatsApp">
            <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999" className={inputCls} />
          </FormField>
          <FormField label="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com" className={inputCls} />
          </FormField>
        </div>

        <div className="border-t border-border-subtle pt-3">
          <p className="text-xs text-ink-muted font-mono uppercase tracking-wider mb-3">Endereço (opcional)</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="CEP">
                <input type="text" value={cep} onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000" className={inputCls} />
              </FormField>
              <FormField label="Logradouro">
                <input type="text" value={logradouro} onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Rua, Av..." className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Número">
                <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)}
                  placeholder="123" className={inputCls} />
              </FormField>
              <FormField label="Bairro">
                <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro" className={inputCls} />
              </FormField>
              <FormField label="Estado">
                <input type="text" value={estado} onChange={(e) => setEstado(e.target.value)}
                  placeholder="SP" maxLength={2} className={inputCls} />
              </FormField>
            </div>
            <FormField label="Cidade">
              <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade" className={inputCls} />
            </FormField>
          </div>
        </div>

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
