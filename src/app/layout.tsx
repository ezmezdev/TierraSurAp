import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'BarrioAnuncios — Publicaciones del Barrio',
    template: '%s | BarrioAnuncios',
  },
  description:
    'Plataforma de anuncios para vecinos del barrio. Publicá tu lote, ofrecé servicios y conectá con tus vecinos.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'BarrioAnuncios',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
