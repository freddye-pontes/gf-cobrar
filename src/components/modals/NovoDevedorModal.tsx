'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { devedoresApi, type APIDevedor } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  devedor?: APIDevedor
}

// ── Máscaras ────────────────────────────────────────────────────────────────
function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

// ── Validações ───────────────────────────────────────────────────────────────
function validateCPF(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r >= 10 ? 0 : r
  }
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10])
}

function validateCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (digits: string, weights: number[]) => {
    const s = digits.split('').reduce((acc, c, i) => acc + parseInt(c) * weights[i], 0)
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return calc(d.slice(0, 12), w1) === parseInt(d[12]) && calc(d.slice(0, 13), w2) === parseInt(d[13])
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
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
  const [cepLoading, setCepLoading] = useState(false)

  const [emailError, setEmailError] = useState('')
  const [docError, setDocError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (devedor) {
      setNome(devedor.nome)
      setTipo(devedor.tipo as 'PF' | 'PJ')
      const rawDoc = devedor.cpf_cnpj.replace(/\D/g, '')
      setCpfCnpj(devedor.tipo === 'PF' ? maskCPF(rawDoc) : maskCNPJ(rawDoc))
      setTelefone(maskPhone(devedor.telefones?.[0] ?? ''))
      setEmail(devedor.email ?? '')
      setLogradouro(devedor.endereco?.logradouro ?? '')
      setNumero(devedor.endereco?.numero ?? '')
      setBairro(devedor.endereco?.bairro ?? '')
      setCidade(devedor.endereco?.cidade ?? '')
      setEstado(devedor.endereco?.estado ?? '')
      setCep(maskCEP(devedor.endereco?.cep ?? ''))
    }
  }, [devedor])

  // Reset doc when tipo changes
  useEffect(() => {
    setCpfCnpj('')
    setDocError('')
  }, [tipo])

  async function handleCepBlur() {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setLogradouro(data.logradouro ?? '')
        setBairro(data.bairro ?? '')
        setCidade(data.localidade ?? '')
        setEstado(data.uf ?? '')
      }
    } catch {}
    finally { setCepLoading(false) }
  }

  function handleDocChange(v: string) {
    const masked = tipo === 'PF' ? maskCPF(v) : maskCNPJ(v)
    setCpfCnpj(masked)
    setDocError('')
  }

  function handleDocBlur() {
    const digits = cpfCnpj.replace(/\D/g, '')
    if (!digits) return
    if (tipo === 'PF' && digits.length === 11 && !validateCPF(cpfCnpj)) {
      setDocError('CPF inválido.')
    } else if (tipo === 'PJ' && digits.length === 14 && !validateCNPJ(cpfCnpj)) {
      setDocError('CNPJ inválido.')
    }
  }

  function handleEmailBlur() {
    if (email && !validateEmail(email)) {
      setEmailError('E-mail inválido.')
    } else {
      setEmailError('')
    }
  }

  function reset() {
    setNome(''); setTipo('PF'); setCpfCnpj(''); setTelefone('')
    setEmail(''); setLogradouro(''); setNumero(''); setBairro('')
    setCidade(''); setEstado(''); setCep('')
    setEmailError(''); setDocError(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('Informe o nome.'); return }
    if (!cpfCnpj.trim()) { setError(`Informe o ${tipo === 'PF' ? 'CPF' : 'CNPJ'}.`); return }
    if (docError) { setError(docError); return }
    if (email && emailError) { setError(emailError); return }

    setLoading(true); setError('')
    const payload = {
      nome: nome.trim(),
      tipo,
      cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
      telefones: telefone.trim() ? [telefone.replace(/\D/g, '')] : [],
      email: email.trim() || null,
      endereco: {
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        cep: cep.replace(/\D/g, '') || null,
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
          <button type="button" onClick={() => { reset(); onClose() }} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button form="devedor-form" type="submit" disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50">
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
          <FormField label={tipo === 'PF' ? 'CPF' : 'CNPJ'} required
            hint={docError ? undefined : tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}>
            <input
              type="text"
              value={cpfCnpj}
              onChange={(e) => handleDocChange(e.target.value)}
              onBlur={handleDocBlur}
              placeholder={tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
              className={inputCls + (docError ? ' border-danger/60' : '')}
            />
            {docError && <p className="text-danger text-xs mt-1">{docError}</p>}
          </FormField>
        </div>

        <FormField label="Nome completo / Razão Social" required>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder={tipo === 'PF' ? 'Nome completo' : 'Razão social'}
            className={inputCls} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Telefone / WhatsApp">
            <input type="text" value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(11) 99999-9999" className={inputCls} />
          </FormField>
          <FormField label="E-mail">
            <input type="text" value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
              onBlur={handleEmailBlur}
              placeholder="email@exemplo.com"
              className={inputCls + (emailError ? ' border-danger/60' : '')} />
            {emailError && <p className="text-danger text-xs mt-1">{emailError}</p>}
          </FormField>
        </div>

        <div className="border-t border-border-subtle pt-3">
          <p className="text-xs text-ink-muted font-mono uppercase tracking-wider mb-3">Endereço (opcional)</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="CEP" hint={cepLoading ? 'Buscando...' : 'Auto-preenche endereço'}>
                <div className="relative">
                  <input type="text" value={cep}
                    onChange={(e) => setCep(maskCEP(e.target.value))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000" className={inputCls} />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted animate-spin" />
                  )}
                </div>
              </FormField>
              <div className="col-span-2">
                <FormField label="Logradouro">
                  <input type="text" value={logradouro} onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Rua, Av..." className={inputCls} />
                </FormField>
              </div>
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
                <input type="text" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())}
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
