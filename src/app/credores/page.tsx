import { credoresApi, repassesApi } from '@/lib/api'
import { CreditoresClient } from './CreditoresClient'

export default async function CreditoresPage() {
  const [credores, repasses] = await Promise.all([
    credoresApi.list().catch(() => []),
    repassesApi.list().catch(() => []),
  ])

  return <CreditoresClient credores={credores} repasses={repasses} />
}
