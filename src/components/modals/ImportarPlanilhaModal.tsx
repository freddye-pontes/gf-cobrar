'use client'

import { useState, useRef, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { selectCls } from '@/components/ui/FormField'
import { credoresApi, type APICredorOut } from '@/lib/api'
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, X, AlertTriangle } from 'lucide-react'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

const SYSTEM_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: 'id_externo',       label: 'ID Externo (Chave)',     required: false },
  { key: 'nome_devedor',     label: 'Nome do Devedor',        required: true  },
  { key: 'cpf_cnpj',         label: 'CPF / CNPJ',             required: true  },
  { key: 'tipo_pessoa',      label: 'Tipo (PF / PJ)',         required: false },
  { key: 'email',            label: 'E-mail',                  required: false },
  { key: 'telefone',         label: 'Telefone / WhatsApp',    required: false },
  { key: 'tipo_divida',      label: 'Tipo da Dívida',         required: false },
  { key: 'valor_original',   label: 'Valor Original',         required: true  },
  { key: 'valor_atualizado', label: 'Valor Atualizado',       required: false },
  { key: 'data_emissao',     label: 'Data de Emissão',        required: false },
  { key: 'data_vencimento',  label: 'Data de Vencimento',     required: true  },
  { key: 'numero_contrato',  label: 'Nº Contrato / Ref.',     required: false },
]

interface PreviewData {
  headers: string[]
  preview_rows: Record<string, string>[]
  auto_mapping: Record<string, string | null>
  total_rows: number
}

interface ImportResult {
  criados: number
  ignorados: number
  erros: string[]
  devedores_criados: number
  devedores_existentes: number
  devedores_incompletos: number
}

type Step = 'upload' | 'mapping' | 'result'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportarPlanilhaModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [credores, setCredores] = useState<APICredorOut[]>([])
  const [credorId, setCredorId] = useState<number>(0)

  const [result, setResult] = useState<ImportResult | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload'); setFile(null); setPreview(null)
    setMapping({}); setResult(null); setError('')
    setCredorId(0)
  }

  // ── Upload & Preview ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setError('')
    setLoading(true)
    try {
      const [previewRes, credoresRes] = await Promise.all([
        fetchPreview(f),
        credoresApi.list(),
      ])
      setPreview(previewRes)
      setMapping(Object.fromEntries(
        Object.entries(previewRes.auto_mapping).filter(([, v]) => v != null) as [string, string][]
      ))
      setCredores(credoresRes)
      if (credoresRes.length > 0) setCredorId(credoresRes[0].id)
      setStep('mapping')
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao ler arquivo.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function fetchPreview(f: File): Promise<PreviewData> {
    const form = new FormData()
    form.append('file', f)
    const res = await fetch(`${BASE_URL}/importar/preview`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `Erro ${res.status}`)
    }
    return res.json()
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  // ── Executar importação ──────────────────────────────────────────────────────
  async function executar() {
    if (!file || !credorId) return
    setLoading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('mapeamento', JSON.stringify(mapping))
      form.append('credor_id', String(credorId))
      const res = await fetch(`${BASE_URL}/importar/executar`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `Erro ${res.status}`)
      }
      const data: ImportResult = await res.json()
      setResult(data)
      setStep('result')
      if (data.criados > 0) onSuccess()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao importar.')
    } finally {
      setLoading(false)
    }
  }

  // ── Download template ────────────────────────────────────────────────────────
  function downloadTemplate() {
    window.open(`${BASE_URL}/importar/template`, '_blank')
  }

  // ── Download error log ────────────────────────────────────────────────────────
  function downloadErrorLog() {
    if (!result || result.erros.length === 0) return
    const content = result.erros.join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `erros_importacao_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const footerUpload = (
    <button onClick={downloadTemplate}
      className="flex items-center gap-2 text-sm text-ink-secondary hover:text-accent transition-colors">
      <Download className="w-4 h-4" />
      Baixar planilha modelo
    </button>
  )

  const footerMapping = (
    <>
      <button onClick={() => setStep('upload')} disabled={loading}
        className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50">
        Voltar
      </button>
      <button onClick={executar} disabled={loading || !credorId}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50">
        {loading ? 'Importando...' : `Importar ${preview?.total_rows ?? ''} registros`}
      </button>
    </>
  )

  const footerResult = (
    <>
      <button onClick={reset}
        className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors">
        Nova Importação
      </button>
      <button onClick={() => { reset(); onClose() }}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors">
        Fechar
      </button>
    </>
  )

  return (
    <Modal
      title="Importar Planilha"
      open={open}
      onClose={() => { reset(); onClose() }}
      size="lg"
      footer={step === 'upload' ? footerUpload : step === 'mapping' ? footerMapping : footerResult}
    >
      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Importe devedores e dívidas a partir de uma planilha Excel (.xlsx) ou CSV.
            Baixe o modelo abaixo para garantir o formato correto.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
              ${dragging ? 'border-accent bg-accent/5' : 'border-border-default hover:border-accent/50 hover:bg-elevated/40'}`}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {loading ? (
              <div className="text-ink-muted text-sm animate-pulse">Lendo arquivo...</div>
            ) : file ? (
              <>
                <FileSpreadsheet className="w-10 h-10 text-accent" />
                <p className="text-ink-primary font-medium text-sm">{file.name}</p>
                <p className="text-ink-muted text-xs">Clique para trocar</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-ink-disabled" />
                <p className="text-ink-primary text-sm font-medium">Arraste o arquivo ou clique para selecionar</p>
                <p className="text-ink-muted text-xs">Excel (.xlsx) ou CSV suportado</p>
              </>
            )}
          </div>

          {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      )}

      {/* ── STEP 2: Mapeamento ── */}
      {step === 'mapping' && preview && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">
              <span className="text-ink-primary font-medium">{preview.total_rows} registros</span> detectados em{' '}
              <span className="font-mono text-accent text-xs">{file?.name}</span>
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-muted">Credor:</label>
              <select value={credorId} onChange={(e) => setCredorId(Number(e.target.value))}
                className="text-xs bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-ink-primary focus:outline-none focus:border-accent/60">
                {credores.map((c) => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
              </select>
            </div>
          </div>

          {/* Mapeamento de colunas */}
          <div className="bg-elevated/50 border border-border-subtle rounded-xl p-4 space-y-2">
            <p className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-3">Mapear Colunas</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {SYSTEM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className={`text-xs w-36 shrink-0 ${field.required ? 'text-ink-primary' : 'text-ink-muted'}`}>
                    {field.label}
                    {field.required && <span className="text-danger ml-0.5">*</span>}
                  </span>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setMapping((m) => {
                        const next = { ...m }
                        if (val) next[field.key] = val
                        else delete next[field.key]
                        return next
                      })
                    }}
                    className="flex-1 text-xs appearance-none bg-surface border border-border-subtle rounded-lg px-2 py-1.5 text-ink-primary focus:outline-none focus:border-accent/60 cursor-pointer"
                  >
                    <option value="">— Ignorar —</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview das primeiras linhas */}
          <div>
            <p className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-2">Prévia (5 primeiras linhas)</p>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="text-xs w-full">
                <thead className="bg-elevated/50">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-mono text-ink-muted whitespace-nowrap border-b border-border-subtle">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {preview.preview_rows.map((row, i) => (
                    <tr key={i} className="hover:bg-elevated/30">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-1.5 text-ink-secondary whitespace-nowrap max-w-[140px] truncate">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      )}

      {/* ── STEP 3: Resultado ── */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success shrink-0" />
              <div>
                <p className="text-2xl font-bold text-success">{result.criados}</p>
                <p className="text-xs text-ink-muted">dívidas criadas</p>
              </div>
            </div>
            <div className="bg-elevated border border-border-subtle rounded-xl p-4 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-ink-muted shrink-0" />
              <div>
                <p className="text-2xl font-bold text-ink-primary">{result.devedores_criados}</p>
                <p className="text-xs text-ink-muted">devedores novos</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-elevated border border-border-subtle rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-ink-primary">{result.ignorados}</p>
              <p className="text-xs text-ink-muted">ignorados (chave duplicada)</p>
            </div>
            <div className="bg-elevated border border-border-subtle rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-ink-primary">{result.devedores_existentes}</p>
              <p className="text-xs text-ink-muted">devedores já existentes</p>
            </div>
          </div>

          {result.devedores_incompletos > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  {result.devedores_incompletos} devedor{result.devedores_incompletos > 1 ? 'es' : ''} com cadastro incompleto
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  Devedores criados via planilha possuem apenas os dados mínimos. Complete o cadastro na Carteira filtrando por &quot;Incompletos&quot;.
                </p>
              </div>
            </div>
          )}

          {result.erros.length > 0 && (
            <div className="bg-danger-dim border border-danger/20 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-danger uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {result.erros.length} linha(s) com erro
                </p>
                <button
                  onClick={downloadErrorLog}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Baixar log
                </button>
              </div>
              {result.erros.map((e, i) => (
                <p key={i} className="text-xs text-danger/80 font-mono">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
