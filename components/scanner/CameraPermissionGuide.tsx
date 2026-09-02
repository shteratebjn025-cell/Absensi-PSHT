'use client'

import { Camera, RefreshCw, Shield } from 'lucide-react'

interface CameraPermissionGuideProps {
  /** 'denied' = sudah ditolak, 'insecure' = bukan HTTPS, 'error' = error lain */
  reason?: 'denied' | 'insecure' | 'error'
  errorMessage?: string
  onRetry?: () => void
}

export function CameraPermissionGuide({
  reason = 'denied',
  errorMessage,
  onRetry,
}: CameraPermissionGuideProps) {
  // Deteksi OS untuk panduan yang tepat
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)

  if (reason === 'insecure') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-900/30 flex items-center justify-center">
          <Shield className="h-8 w-8 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg mb-1">Koneksi Tidak Aman</h3>
          <p className="text-gray-400 text-sm">
            Kamera hanya bisa diakses melalui HTTPS. Buka aplikasi via{' '}
            <span className="text-yellow-400 font-mono">https://</span> bukan{' '}
            <span className="text-red-400 font-mono">http://</span>
          </p>
        </div>
        <div className="w-full bg-gray-800 rounded-xl p-4 text-left">
          <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Cara akses yang benar:</p>
          <code className="text-green-400 text-sm">https://[IP]:3443</code>
          <p className="text-gray-500 text-xs mt-2">
            Minta admin untuk menjalankan{' '}
            <code className="text-gray-300">npm run ca-server</code> dan install sertifikat ke HP ini.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
        )}
      </div>
    )
  }

  if (reason === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
          <Camera className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg mb-1">Izin Kamera Ditolak</h3>
          <p className="text-gray-400 text-sm">
            Aktifkan izin kamera untuk browser ini, lalu muat ulang halaman.
          </p>
        </div>

        {isAndroid && (
          <div className="w-full bg-gray-800 rounded-xl p-4 text-left">
            <p className="text-green-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              📱 Android — Chrome
            </p>
            <ol className="text-gray-300 text-sm space-y-1.5 list-decimal list-inside">
              <li>Tap ikon kunci 🔒 di address bar</li>
              <li>Tap <strong>Permissions</strong></li>
              <li>Ubah <strong>Camera</strong> → <strong>Allow</strong></li>
              <li>Muat ulang halaman</li>
            </ol>
          </div>
        )}

        {isIOS && (
          <div className="w-full bg-gray-800 rounded-xl p-4 text-left">
            <p className="text-blue-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              🍎 iPhone / iPad — Safari
            </p>
            <ol className="text-gray-300 text-sm space-y-1.5 list-decimal list-inside">
              <li>Buka <strong>Settings → Safari</strong></li>
              <li>Tap <strong>Camera</strong></li>
              <li>Pilih <strong>Allow</strong></li>
              <li>Kembali ke browser dan muat ulang</li>
            </ol>
          </div>
        )}

        {!isAndroid && !isIOS && (
          <div className="w-full bg-gray-800 rounded-xl p-4 text-left">
            <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              💻 Desktop Browser
            </p>
            <ol className="text-gray-300 text-sm space-y-1.5 list-decimal list-inside">
              <li>Klik ikon kamera / kunci di address bar</li>
              <li>Ubah izin kamera ke <strong>Izinkan</strong></li>
              <li>Muat ulang halaman</li>
            </ol>
          </div>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi Setelah Mengizinkan
          </button>
        )}
      </div>
    )
  }

  // reason === 'error'
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
        <Camera className="h-8 w-8 text-red-400" />
      </div>
      <div>
        <h3 className="text-white font-semibold text-lg mb-1">Kamera Tidak Tersedia</h3>
        <p className="text-gray-400 text-sm">
          {errorMessage || 'Tidak dapat mengakses kamera. Pastikan kamera tidak dipakai aplikasi lain.'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      )}
    </div>
  )
}
