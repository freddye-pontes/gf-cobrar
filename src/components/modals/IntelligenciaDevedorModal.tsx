'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField, inputCls, selectCls } from '@/components/ui/FormField'
import { devedoresApi, type APIDevedor } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  devedor: APIDevedor
}

export function IntelligenciaDevedorModal({ open, onClose, onSuccess, devedor }: Props) {
  const [score, setScore] = useState<string>('')
  const [chance, setChance] = useState<string>('')
  const [perfilFin, setPerfilFin] = useState<string>('')
  const [rendaMin, setRendaMin] = useState<string>('')
  const [rendaMax, setRendaMax] = useState<string>('')
  const [historico, setHistorico] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setScore(devedor.score_recuperabilidade != null ? String(devedor.score_recuperabilidade) : '')
      setChance(devedor.chance_recuperacao ?? '')
      setPerfilFin(devedor.perfil_financeiro ?? '')
      setRendaMin(devedor.renda_estimada_min != null ? String(devedor.renda_estimada_min) : '')
      setRendaMax(devedor.renda_estimada_max != null ? String(devedor.renda_estimada_max) : '')
      setHistorico(devedor.historico_pagamento ?? '')
      setError('')
    }
  }, [open, devedor])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await devedoresApi.updateInteligencia(devedor.id, {
        score_recuperabilidade: score ? parseInt(score) : null,
        chance_recuperacao: chance || null,
        perfil_financeiro: perfilFin || null,
        renda_estimada_min: rendaMin ? parseFloat(rendaMin) : null,
        renda_estimada_max: rendaMax ? parseFloat(rendaMax) : null,
        historico_pagamento: historico || null,
      })
      onSuccess()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  const scoreNum = parseInt(score) || 0

  return (
    <Modal
      title="Inteligência do Devedor"
      open={open}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-ink-secondary border border-border-default hover:bg-elevated transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            form="intel-form"
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="intel-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Score */}
        <FormField label="Score de Recuperação (0 – 100)" hint="Probabilidade estimada de recuperação">
          <input
            type="range"
            min="0"
            max="100"
            value={scoreNum}
            onChange={e => setScore(e.target.value)}
            className="w-full accent-[#FF6600] mb-1"
          />
          <div className="flex justify-between text-[10px] text-ink-muted font-mono">
            <span>0</span>
            <span className={`font-bold text-sm ${scoreNum >= 70 ? 'text-emerald' : scoreNum >= 40 ? 'text-amber' : 'text-danger'}`}>
              {scoreNum}
            </span>
            <span>100</span>
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Chance de Recuperação">
            <select value={chance} onChange={e => setChance(e.target.value)} className={selectCls}>
              <option value="">Não informado</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </FormField>

          <FormField label="Histórico de Pagamento">
            <select value={historico} onChange={e => setHistorico(e.target.value)} className={selectCls}>
              <option value="">Não informado</option>
              <option value="bom">Bom</option>
              <option value="regular">Regular</option>
              <option value="ruim">Ruim</option>
            </select>
          </FormField>
        </div>

        <FormField label="Perfil Financeiro">
          <select value={perfilFin} onChange={e => setPerfilFin(e.target.value)} className={selectCls}>
            <option value="">Não informado</option>
            <option value="assalariado_clt">Assalariado (CLT)</option>
            <option value="autonomo">Autônomo</option>
            <option value="empresario">Empresário</option>
            <option value="aposentado">Aposentado</option>
            <option value="desempregado">Desempregado</option>
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Renda Estimada Mín. (R$)">
            <input
              type="number"
              min="0"
              step="100"
              value={rendaMin}
              onChange={e => setRendaMin(e.target.value)}
              placeholder="Ex: 3500"
              className={inputCls}
            />
          </FormField>
          <FormField label="Renda Estimada Máx. (R$)">
            <input
              type="number"
              min="0"
              step="100"
              value={rendaMax}
              onChange={e => setRendaMax(e.target.value)}
              placeholder="Ex: 5000"
              className={inputCls}
            />
          </FormField>
        </div>

        {error && (
          <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
