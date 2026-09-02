'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { FaceScanner } from '@/components/scanner/FaceScanner'
import { Monitor } from 'lucide-react'

/**
 * Ranting dibaca dari URL query param: /scanner?ranting=NamaRanting
 *
 * Setiap device/kiosk bisa punya ranting berbeda cukup dengan URL yang berbeda.
 * Tidak perlu setting di database — bookmark URL yang sesuai di masing-masing device.
 *
 * Contoh:
 *   /scanner                   → semua ranting (tidak difilter)
 *   /scanner?ranting=Kendal    → hanya anggota Ranting Kendal
 *   /scanner?ranting=Bojonegoro → hanya anggota Ranting Bojonegoro
 */
function ScannerContent() {
  const searchParams = useSearchParams()
  // Decode untuk handle nama ranting yang mengandung spasi/karakter khusus
  const rantingKiosk = decodeURIComponent(searchParams.get('ranting') ?? '')

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header mini */}
      <header className="flex items-center justify-between px-4 py-3 bg-red-900">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
            <span className="text-red-700 font-black text-xs">PS</span>
          </div>
          <div>
            <span className="text-white font-semibold text-sm">PSHT Bojonegoro — Scanner Absensi</span>
            {rantingKiosk && (
              <span className="ml-2 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                {rantingKiosk}
              </span>
            )}
          </div>
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
            lokasiKiosk={rantingKiosk ? `Kiosk ${rantingKiosk}` : 'Kiosk Publik'}
            adminId="kiosk-publik"
            rantingFilter={rantingKiosk}
          />
        </div>
      </main>

      <footer className="text-center py-3 text-gray-600 text-xs">
        {rantingKiosk
          ? `Kiosk khusus Ranting ${rantingKiosk} — hanya mendeteksi anggota ranting ini`
          : 'Arahkan wajah ke kamera. Sistem akan mendeteksi secara otomatis.'}
      </footer>
    </div>
  )
}

export default function ScannerPublikPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Memuat scanner...</div>
      </div>
    }>
      <ScannerContent />
    </Suspense>
  )
}
