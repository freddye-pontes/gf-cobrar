import { devedoresApi } from '@/lib/api'
import { DevedoresClient } from './DevedoresClient'

export default async function DevedoresPage() {
  const devedores = await devedoresApi.list().catch(() => [])
  return <DevedoresClient devedores={devedores} />
}
