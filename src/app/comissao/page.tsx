import { AppLayout } from '@/components/layout/AppLayout'
import { ComissaoClient } from './ComissaoClient'
import { credoresApi, type APICredorOut } from '@/lib/api'

export default async function ComissaoPage() {
  const credores = await credoresApi.list().catch(() => [] as APICredorOut[])
  return (
    <AppLayout>
      <ComissaoClient credores={credores} />
    </AppLayout>
  )
}
