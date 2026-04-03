import { negociacoesApi } from '@/lib/api'
import { NegociacaoClient } from './NegociacaoClient'

export default async function NegociacaoPage() {
  const negociacoes = await negociacoesApi.list().catch(() => [])

  return <NegociacaoClient negociacoes={negociacoes} />
}
