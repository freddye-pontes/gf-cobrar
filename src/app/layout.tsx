import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GF Cobrar — Sistema de Gestão de Cobrança',
  description: 'Plataforma B2B de gestão de cobrança multi-credor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="font-body bg-void text-ink-primary antialiased">
        {children}
      </body>
    </html>
  )
}
