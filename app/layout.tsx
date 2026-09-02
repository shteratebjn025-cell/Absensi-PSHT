import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MediaPipeSuppressor } from '@/components/MediaPipeSuppressor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Absensi PSHT Bojonegoro',
  description: 'Sistem Absensi Scan Wajah - PSHT Bojonegoro',
}

// Viewport terpisah dari metadata agar Next.js 14+ tidak warning
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Tidak pakai maximumScale=1 agar aksesibilitas tetap terjaga (user bisa zoom)
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <MediaPipeSuppressor />
        {children}
      </body>
    </html>
  )
}
