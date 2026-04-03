import { credoresApi } from '@/lib/api'
import { ReguaClient } from './ReguaClient'

export default async function ReguaPage() {
  const credores = await credoresApi.list().catch(() => [])
  return <ReguaClient credores={credores} />
}
