'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FaceScanner } from '@/components/scanner/FaceScanner'
import { createClient } from '@/lib/supabase/client'
import { Monitor, MapPin, RotateCcw } from 'lucide-react'

const STORAGE_KEY = 'psht_scanner_ranting'

function ScannerContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  // URL param sebagai override (prioritas lebih tinggi dari localStorage)
  const rantingParam = decodeURIComponent(searchParams.get('ranting') ?? '')

  const [ranting, setRanting] = useState<string | null>(null)  // null = belum tahu (loading)
  const [daftarRanting, setDaftarRanting] = useState<string[]>([])
  const [loadingRanting, setLoadingRanting] = useState(true)
  const [pilihan, setPilihan] = useState('')

  // Load daftar ranting dari DB + baca localStorage
  useEffect(() => {
    supabase
      .from('anggota')
      .select('ranting')
      .not('ranting', 'is', null)
      .neq('ranting', '')
      .then(({ data }) => {
        const unik = [...new Set((data ?? []).map((a: any) => a.ranting as string))]
          .filter(Boolean).sort()
        setDaftarRanting(unik)
        setLoadingRanting(false)
      })

    // Jika ada URL param → pakai itu (skip pilih layar)
    if (rantingParam) {
      setRanting(rantingParam)
      return
    }

    // Baca dari localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setRanting(saved)
    } else {
      setRanting('')  // '' = belum pilih, tampilkan layar pilih
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMulai = () => {
    if (!pilihan) return
    localStorage.setItem(STORAGE_KEY, pilihan)
    setRanting(pilihan)
  }

  const handleGantiRanting = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRanting('')
    setPilihan('')
  }

  // Masih loading localStorage
  if (ranting === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Memuat...</div>
      </div>
    )
  }

  // Belum pilih ranting → tampilkan layar pilih
  if (ranting === '') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-5">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
              <span className="text-red-700 font-black text-sm">PS</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">PSHT Bojonegoro</p>
              <p className="text-gray-400 text-xs">Scanner Absensi</p>
            </div>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg">Pilih Ranting</h2>
            <p className="text-gray-400 text-sm mt-1">
              Scanner ini akan mendeteksi wajah anggota dari ranting yang dipilih saja.
              Pilihan disimpan di device ini.
            </p>
          </div>

          {loadingRanting ? (
            <div className="text-gray-500 text-sm text-center py-4">Memuat daftar ranting...</div>
          ) : daftarRanting.length === 0 ? (
            <div className="text-yellow-400 text-sm text-center py-4">
              Belum ada data ranting. Isi ranting pada data anggota terlebih dahulu.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {/* Opsi semua ranting */}
                <button
                  onClick={() => setPilihan('__semua__')}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    pilihan === '__semua__'
                      ? 'border-red-500 bg-red-900/30 text-white'
                      : 'border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Semua Ranting</p>
                    <p className="text-xs text-gray-500">Tidak difilter</p>
                  </div>
                </button>

                {/* Daftar ranting */}
                {daftarRanting.map((r) => (
                  <button
                    key={r}
                    onClick={() => setPilihan(r)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      pilihan === r
                        ? 'border-red-500 bg-red-900/30 text-white'
                        : 'border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm font-medium">{r}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleMulai}
                disabled={!pilihan}
                className="w-full py-3 bg-red-700 hover:bg-red-800 active:bg-red-900 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors touch-manipulation"
              >
                Mulai Scanner
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Sudah pilih ranting → tampilkan scanner
  const rantingAktif = ranting === '__semua__' ? '' : ranting

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-red-900">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0">
            <span className="text-red-700 font-black text-xs">PS</span>
          </div>
          <div>
            <span className="text-white font-semibold text-sm">PSHT Bojonegoro — Absensi</span>
            {rantingAktif && (
              <span className="ml-2 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                {rantingAktif}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tombol ganti ranting — hanya tampil jika bukan dari URL param */}
          {!rantingParam && (
            <button
              onClick={handleGantiRanting}
              className="flex items-center gap-1 text-red-200 hover:text-white text-xs transition-colors"
              title="Ganti ranting"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ganti</span>
            </button>
          )}
          <a
            href="/tv"
            target="_blank"
            className="flex items-center gap-1 text-red-200 hover:text-white text-xs transition-colors"
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Mode TV</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <FaceScanner
            lokasiKiosk={rantingAktif ? `Kiosk ${rantingAktif}` : 'Kiosk Publik'}
            adminId="kiosk-publik"
            rantingFilter={rantingAktif}
          />
        </div>
      </main>

      <footer className="text-center py-3 text-gray-600 text-xs">
        {rantingAktif
          ? `Kiosk Ranting ${rantingAktif} — hanya mendeteksi anggota ranting ini`
          : 'Scanner aktif — mendeteksi semua ranting'}
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
