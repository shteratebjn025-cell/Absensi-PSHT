'use client'

import { FaceScanner } from '@/components/scanner/FaceScanner'
import { Monitor } from 'lucide-react'

export default function ScannerPublikPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header mini */}
      <header className="flex items-center justify-between px-4 py-3 bg-red-900">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
            <span className="text-red-700 font-black text-xs">PS</span>
          </div>
          <span className="text-white font-semibold text-sm">PSHT Bojonegoro — Scanner Absensi</span>
        </div>
        <a
          href="/tv"
          target="_blank"
          className="flex items-center gap-1 text-red-200 hover:text-white text-xs transition-colors"
        >
          <Monitor className="h-4 w-4" />
          Mode TV
        </a>
      </header>

      {/* Scanner utama */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <FaceScanner
            lokasiKiosk="Kiosk Publik"
            adminId="kiosk-publik"
          />
        </div>
      </main>

      <footer className="text-center py-3 text-gray-600 text-xs">
        Arahkan wajah ke kamera. Sistem akan mendeteksi secara otomatis.
      </footer>
    </div>
  )
}
