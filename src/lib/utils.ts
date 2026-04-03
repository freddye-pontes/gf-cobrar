import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { StatusDivida, TipoDivida, TipoNegociacao, UrgenciaItem } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR')
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.**${digits.slice(8, 9)}-${digits.slice(9)}`
  }
  return `${digits.slice(0, 2)}.***.***/0001-${digits.slice(-2)}`
}

export function getStatusLabel(status: StatusDivida): string {
  const labels: Record<StatusDivida, string> = {
    em_aberto: 'Em Aberto',
    em_negociacao: 'Negociando',
    ptp_ativa: 'PTP Ativa',
    pago: 'Pago',
    judicial: 'Judicial',
    encerrado: 'Encerrado',
  }
  return labels[status]
}

export function getStatusColors(status: StatusDivida): { bg: string; text: string; border: string } {
  const map: Record<StatusDivida, { bg: string; text: string; border: string }> = {
    em_aberto: { bg: 'rgba(37,99,235,0.12)', text: '#3b82f6', border: 'rgba(37,99,235,0.3)' },
    em_negociacao: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
    ptp_ativa: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
    pago: { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
    judicial: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
    encerrado: { bg: 'rgba(61,85,128,0.2)', text: '#7a9bc8', border: 'rgba(61,85,128,0.4)' },
  }
  return map[status]
}

export function getTipoLabel(tipo: TipoDivida): string {
  const labels: Record<TipoDivida, string> = {
    boleto: 'Boleto',
    contrato: 'Contrato',
    cartao: 'Cartão',
    servico: 'Serviço',
  }
  return labels[tipo]
}

export function getTipoNegociacaoLabel(tipo: TipoNegociacao): string {
  const labels: Record<TipoNegociacao, string> = {
    desconto: 'Desconto',
    parcelamento: 'Parcelamento',
    ptp: 'Promessa (PTP)',
  }
  return labels[tipo]
}

export function getUrgenciaColors(urgencia: UrgenciaItem): string {
  const map: Record<UrgenciaItem, string> = {
    alta: '#ef4444',
    media: '#f59e0b',
    baixa: '#3b82f6',
  }
  return map[urgencia]
}

export function getUrgenciaBg(urgencia: UrgenciaItem): string {
  const map: Record<UrgenciaItem, string> = {
    alta: 'priority-alta',
    media: 'priority-media',
    baixa: 'priority-baixa',
  }
  return map[urgencia]
}
