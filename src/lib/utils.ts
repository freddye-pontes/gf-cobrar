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
    em_aberto: { bg: 'rgba(255,102,0,0.10)', text: '#E65C00', border: 'rgba(255,102,0,0.25)' },
    em_negociacao: { bg: 'rgba(217,119,6,0.10)', text: '#D97706', border: 'rgba(217,119,6,0.25)' },
    ptp_ativa: { bg: 'rgba(124,58,237,0.10)', text: '#7C3AED', border: 'rgba(124,58,237,0.25)' },
    pago: { bg: 'rgba(16,185,129,0.10)', text: '#059669', border: 'rgba(16,185,129,0.25)' },
    judicial: { bg: 'rgba(230,57,70,0.10)', text: '#E63946', border: 'rgba(230,57,70,0.25)' },
    encerrado: { bg: 'rgba(100,116,139,0.10)', text: '#64748B', border: 'rgba(100,116,139,0.25)' },
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
    alta: '#E63946',
    media: '#D97706',
    baixa: '#FF6600',
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
