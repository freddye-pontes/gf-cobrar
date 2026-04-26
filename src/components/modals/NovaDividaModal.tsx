'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { devedoresApi, credoresApi, dividasApi, type APIDevedor, type APICredorOut } from '@/lib/api'
import { Loader2, CheckCircle2, AlertTriangle, Search, FileText, User } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedCredorId?: number
  preselectedDevedorId?: number
}

const TIPOS = [
  { value: 'boleto',   label: 'Boleto' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'cartao',   label: 'Cartão' },
  { value: 'servico',  label: 'Serviço' },
]

function maskDoc(v: string) {
  const digits = v.replace(/\D/g, '')
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits.slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function NovaDividaModal({ open, onClose, onSuccess, preselectedCredorId, preselectedDevedorId }: Props) {
  const [credores, setCredores] = useState<APICredorOut[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Search mode
  const [searchMode, setSearchMode] = useState<'doc' | 'nome'>('doc')

  // Doc search
  const [docInput, setDocInput] = useState('')
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')

  // Name search
  const [nomeInput, setNomeInput] = useState('')
  const [nomeResults, setNomeResults] = useState<APIDevedor[]>([])
  const [nomeLoading, setNomeLoading] = useState(false)
  const nomeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [foundDevedor, setFoundDevedor] = useState<APIDevedor | null>(null)
  const [preselectedDevedorName, setPreselectedDevedorName] = useState('')

  const [devedorId, setDevedorId] = useState(preselectedDevedorId ?? 0)
  const [credorId, setCredorId] = useState(preselectedCredorId ?? 0)
  const [valorOriginal, setValorOriginal] = useState('')
  const [valorAtualizado, setValorAtualizado] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')
  const [tipo, setTipo] = useState('boleto')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [atualizadoTouched, setAtualizadoTouched] = useState(false)

  useEffect(() => {
    if (!atualizadoTouched) setValorAtualizado(valorOriginal)
  }, [valorOriginal, atualizadoTouched])

  useEffect(() => {
    if (!open) return
    setLoadingData(true)
    const promises: Promise<unknown>[] = [credoresApi.list()]
    if (preselectedDevedorId) promises.push(devedoresApi.get(preselectedDevedorId))
    Promise.all(promises)
      .then(([creds, dev]) => {
        setCredores(creds as APICredorOut[])
        if (!preselectedCredorId && (creds as APICredorOut[]).length > 0)
          setCredorId((creds as APICredorOut[])[0].id)
        if (dev) setPreselectedDevedorName((dev as APIDevedor).nome)
      })
      .catch(() => {})
      .finally(() => setLoadingData(false))
  }, [open, preselectedCredorId, preselectedDevedorId])

  async function handleDocLookup(value: string) {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 11 && digits.length !== 14) return
    setLookupStatus('loading')
    setFoundDevedor(null)
    setDevedorId(0)
    try {
      const dev = await devedoresApi.buscarDocumento(digits)
      setFoundDevedor(dev)
      setDevedorId(dev.id)
      setLookupStatus('found')
    } catch {
      setLookupStatus('not_found')
    }
  }

  function handleDocChange(v: string) {
    const masked = maskDoc(v)
    setDocInput(masked)
    setLookupStatus('idle')
    setFoundDevedor(null)
    setDevedorId(0)
    const digits = v.replace(/\D/g, '')
    if (digits.length === 11 || digits.length === 14) handleDocLookup(digits)
  }

  function handleNomeChange(v: string) {
    setNomeInput(v)
    setNomeResults([])
    setFoundDevedor(null)
    setDevedorId(0)
    if (nomeDebounce.current) clearTimeout(nomeDebounce.current)
    if (v.trim().length < 2) return
    nomeDebounce.current = setTimeout(async () => {
      setNomeLoading(true)
      try {
        const results = await devedoresApi.list({ search: v.trim() })
        setNomeResults(results.slice(0, 8))
      } catch {}
      finally { setNomeLoading(false) }
    }, 400)
  }

  function selectDevedorFromNome(dev: APIDevedor) {
    setFoundDevedor(dev)
    setDevedorId(dev.id)
    setNomeInput(dev.nome)
    setNomeResults([])
  }

  function reset() {
    setDocInput(''); setLookupStatus('idle'); setFoundDevedor(null)
    setNomeInput(''); setNomeResults([])
    setValorOriginal(''); setValorAtualizado(''); setAtualizadoTouched(false)
    setDataVencimento(''); setDataEmissao(''); setTipo('boleto')
    setNumeroContrato(''); setError('')
    setDevedorId(preselectedDevedorId ?? 0)
    setSearchMode('doc')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!devedorId) { setError('Selecione o devedor.'); return }
    if (!credorId) { setError('Selecione o credor.'); return }
    if (!valorOriginal) { setError('Informe o valor original.'); return }
    if (!dataVencimento) { setError('Informe a data de vencimento.'); return }
    if (!dataEmissao) { setError('Informe a data de emissão.'); return }

    setLoading(true); setError('')
    try {
      await dividasApi.create({
        devedor_id: devedorId, credor_id: credorId,
        valor_original: parseFloat(valorOriginal),
        valor_atualizado: parseFloat(valorAtualizado || valorOriginal),
        data_vencimento: dataVencimento, data_emissao: dataEmissao,
        tipo, numero_contrato: numeroContrato.trim() || null,
      })
      reset(); onSuccess(); onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar dívida.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nova Dívida" open={open} onClose={() => { reset(); onClose() }} size="lg"
      footer={
        <>
          <button type="button" onClick={() => { reset(); onClose() }} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button form="divida-form" type="submit" disabled={loading || loadingData}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50">
            {loading ? 'Salvando...' : 'Adicionar à Carteira'}
          </button>
        </>
      }>
      <form id="divida-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Devedor section */}
        {!preselectedDevedorId ? (
          <div className="space-y-2">
            {/* Search mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-elevated rounded-lg border border-border-default w-fit">
              <button type="button" onClick={() => { setSearchMode('doc'); setFoundDevedor(null); setDevedorId(0); setNomeInput(''); setNomeResults([]) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${searchMode === 'doc' ? 'bg-accent text-white' : 'text-ink-secondary hover:text-ink-primary'}`}>
                <FileText className="w-3 h-3" /> CPF / CNPJ
              </button>
              <button type="button" onClick={() => { setSearchMode('nome'); setFoundDevedor(null); setDevedorId(0); setDocInput(''); setLookupStatus('idle') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${searchMode === 'nome' ? 'bg-accent text-white' : 'text-ink-secondary hover:text-ink-primary'}`}>
                <User className="w-3 h-3" /> Nome
              </button>
            </div>

            {searchMode === 'doc' ? (
              <FormField label="CPF / CNPJ do Devedor" required hint="Digite para buscar automaticamente">
                <div className="relative">
                  <input type="text" value={docInput} onChange={(e) => handleDocChange(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    className={inputCls + (lookupStatus === 'not_found' ? ' border-amber-500/60' : lookupStatus === 'found' ? ' border-emerald/60' : '')} />
                  {lookupStatus === 'loading' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted animate-spin" />}
                  {lookupStatus === 'found' && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald" />}
                  {lookupStatus === 'not_found' && <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />}
                </div>
                {lookupStatus === 'found' && foundDevedor && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald bg-emerald/5 border border-emerald/20 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{foundDevedor.nome}</span>
                    {foundDevedor.cadastro_status === 'CADASTRO_INCOMPLETO' && (
                      <span className="ml-1 text-amber-400 font-normal">· cadastro incompleto</span>
                    )}
                  </div>
                )}
                {lookupStatus === 'not_found' && (
                  <p className="text-amber-400 text-xs mt-1">Devedor não encontrado. Cadastre-o primeiro em &quot;Novo Devedor&quot;.</p>
                )}
              </FormField>
            ) : (
              <FormField label="Nome do Devedor" required hint="Digite ao menos 2 caracteres">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
                  <input type="text" value={nomeInput} onChange={(e) => handleNomeChange(e.target.value)}
                    placeholder="Ex: João Silva..."
                    className={inputCls + ' pl-8' + (foundDevedor ? ' border-emerald/60' : '')} />
                  {nomeLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted animate-spin" />}
                  {foundDevedor && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald" />}
                </div>
                {nomeResults.length > 0 && !foundDevedor && (
                  <div className="mt-1 border border-border-default rounded-lg bg-surface overflow-hidden shadow-lg">
                    {nomeResults.map((dev) => (
                      <button key={dev.id} type="button" onClick={() => selectDevedorFromNome(dev)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-elevated transition-colors border-b border-border-subtle last:border-0">
                        <div className="w-6 h-6 rounded-full bg-elevated border border-border-default flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-ink-secondary">{dev.nome[0]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-ink-primary font-medium truncate">{dev.nome}</p>
                          <p className="text-ink-muted text-xs">{dev.cpf_cnpj} · {dev.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
                        </div>
                        {dev.cadastro_status === 'CADASTRO_INCOMPLETO' && (
                          <span className="text-[10px] text-amber-400 shrink-0">incompleto</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {foundDevedor && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald bg-emerald/5 border border-emerald/20 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{foundDevedor.nome}</span>
                    <span className="text-ink-muted ml-1">{foundDevedor.cpf_cnpj}</span>
                    <button type="button" onClick={() => { setFoundDevedor(null); setDevedorId(0); setNomeInput('') }}
                      className="ml-auto text-ink-muted hover:text-ink-primary text-[10px]">trocar</button>
                  </div>
                )}
              </FormField>
            )}
          </div>
        ) : (
          <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
            Devedor: <span className="text-ink-primary font-bold">{preselectedDevedorName || `#${preselectedDevedorId}`}</span>
          </div>
        )}

        {/* Credor */}
        {!preselectedCredorId ? (
          <FormField label="Credor" required>
            <select value={credorId} onChange={(e) => setCredorId(Number(e.target.value))} disabled={loadingData} className={selectCls}>
              {loadingData && <option>Carregando...</option>}
              {credores.map((c) => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
            </select>
          </FormField>
        ) : (
          <div className="bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-ink-muted">
            Credor: <span className="text-ink-primary font-bold">
              {credores.find((c) => c.id === preselectedCredorId)?.razao_social ?? `#${preselectedCredorId}`}
            </span>
          </div>
        )}

        {/* Tipo + Contrato */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo" required>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Nº Contrato / Referência">
            <input type="text" value={numeroContrato} onChange={(e) => setNumeroContrato(e.target.value)}
              placeholder="Ex: CTR-2026-0042" className={inputCls} />
          </FormField>
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Valor Original (R$)" required>
            <input type="number" step="0.01" min="0" value={valorOriginal}
              onChange={(e) => setValorOriginal(e.target.value)} placeholder="0,00" className={inputCls} />
          </FormField>
          <FormField label="Valor Atualizado (R$)" hint="Igual ao original se sem correção">
            <input type="number" step="0.01" min="0" value={valorAtualizado}
              onChange={(e) => { setValorAtualizado(e.target.value); setAtualizadoTouched(true) }}
              placeholder="0,00" className={inputCls} />
          </FormField>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data de Emissão" required>
            <input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Data de Vencimento" required>
            <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} className={inputCls} />
          </FormField>
        </div>

        {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
