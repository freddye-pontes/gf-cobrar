import { AppLayout } from '@/components/layout/AppLayout'
import { dividasApi, credoresApi } from '@/lib/api'
import { CarteiraClient } from './CarteiraClient'

export default async function CarteiraPage() {
  const [dividas, credores] = await Promise.all([
    dividasApi.list().catch(() => []),
    credoresApi.list().catch(() => []),
  ])

  return (
    <AppLayout>
      <CarteiraClient dividas={dividas} credores={credores} />
    </AppLayout>
  )
}
