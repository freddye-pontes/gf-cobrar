import { credoresApi } from '@/lib/api'
import { RelatoriosClient } from './RelatoriosClient'

export default async function RelatoriosPage() {
  const credores = await credoresApi.list().catch(() => [])
  return <RelatoriosClient credores={credores} />
}
