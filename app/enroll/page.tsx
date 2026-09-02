'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EnrollFace } from '@/components/scanner/EnrollFace'
import { Modal } from '@/components/ui/modal'
import { MapPin, RotateCcw, UserCheck, ScanFace, Loader2, ChevronRight } from 'lucide-react'
import type { Anggota } from '@/types'

const STORAGE_KEY = 'psht_enroll_ranting'

function EnrollContent() {
  const supabase = createClient()

  const [ranting, setRanting] = useState<string | null>(null)
  const [daftarRanting, setDaftarRanting] = useState<string[]>([])
  const [loadingRanting, setLoadingRanting] = useState(true)
  const [pilihan, setPilihan] = useState('')

  // Daftar anggota sesuai ranting
  const [anggota, setAnggota] = useState<Anggota[]>([])
  const [loadingAnggota, setLoadingAnggota] = useState(false)

  // Modal enroll
  const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null)
  const [showEnroll, setShowEnroll] = useState(false)

  // Load daftar ranting
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

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setRanting(saved)
    } else {
      setRanting('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch anggota berdasarkan ranting yang dipilih, urutkan: belum enroll dulu
  const fetchAnggota = useCallback(async (rantingDipilih: string) => {
    setLoadingAnggota(true)
    let query = supabase
      .from('anggota')
      .select('*')
      .order('nama', { ascending: true })

    if (rantingDipilih !== '__semua__') {
      query = query.eq('ranting', rantingDipilih)
    }

    const { data } = await query
    const list = (data ?? []) as Anggota[]

    // Urutkan: belum enroll di atas, sudah enroll di bawah
    list.sort((a, b) => {
      const aEnroll = a.face_embedding ? 1 : 0
      const bEnroll = b.face_embedding ? 1 : 0
      if (aEnroll !== bEnroll) return aEnroll - bEnroll
      return a.nama.localeCompare(b.nama)
    })

    setAnggota(list)
    setLoadingAnggota(false)
  }, [supabase])

  // Load anggota saat ranting berubah
  useEffect(() => {
    if (ranting && ranting !== '') {
      fetchAnggota(ranting)
    }
  }, [ranting, fetchAnggota])

  // Realtime: update list saat ada perubahan face_embedding
  useEffect(() => {
    if (!ranting || ranting === '') return

    const channel = supabase
      .channel('enroll-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'anggota' },
        (payload) => {
          // Update anggota yang berubah di list secara lokal tanpa full refresh
          const updated = payload.new as Anggota
          setAnggota((prev) => {
            const newList = prev.map((a) => a.id === updated.id ? updated : a)
            // Re-sort: yang baru selesai enroll pindah ke bawah
            newList.sort((a, b) => {
              const aEnroll = a.face_embedding ? 1 : 0
              const bEnroll = b.face_embedding ? 1 : 0
              if (aEnroll !== bEnroll) return aEnroll - bEnroll
              return a.nama.localeCompare(b.nama)
            })
            return newList
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ranting, supabase])

  const handleMulai = () => {
    if (!pilihan) return
    localStorage.setItem(STORAGE_KEY, pilihan)
    setRanting(pilihan)
  }

  const handleGantiRanting = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRanting('')
    setPilihan('')
    setAnggota([])
  }

  const handleEnrollSuccess = (updated: Anggota) => {
    setShowEnroll(false)
    setSelectedAnggota(null)
    // Update list lokal
    setAnggota((prev) => {
      const newList = prev.map((a) => a.id === updated.id ? updated : a)
      newList.sort((a, b) => {
        const aEnroll = a.face_embedding ? 1 : 0
        const bEnroll = b.face_embedding ? 1 : 0
        if (aEnroll !== bEnroll) return aEnroll - bEnroll
        return a.nama.localeCompare(b.nama)
      })
      return newList
    })
  }

  // Loading state awal
  if (ranting === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Memuat...</div>
      </div>
    )
  }

  // Layar pilih ranting
  if (ranting === '') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
              <span className="text-red-700 font-black text-sm">PS</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">PSHT Bojonegoro</p>
              <p className="text-gray-400 text-xs">Enroll Wajah Massal</p>
            </div>
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg">Pilih Ranting</h2>
            <p className="text-gray-400 text-sm mt-1">
              Device ini akan menampilkan antrian anggota dari ranting yang dipilih.
              Beberapa device bisa jalan bersamaan dengan ranting berbeda.
            </p>
          </div>

          {loadingRanting ? (
            <div className="flex items-center justify-center gap-2 py-4 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat daftar ranting...
            </div>
          ) : daftarRanting.length === 0 ? (
            <div className="text-yellow-400 text-sm text-center py-4">
              Belum ada data ranting. Isi ranting pada data anggota terlebih dahulu.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
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
                    <p className="text-xs text-gray-500">Tampilkan semua anggota</p>
                  </div>
                </button>

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
                Mulai Enroll
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Halaman antrian enroll
  const rantingAktif = ranting === '__semua__' ? '' : ranting
  const belumEnroll = anggota.filter((a) => !a.face_embedding)
  const sudahEnroll = anggota.filter((a) => a.face_embedding)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-red-800 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0">
            <span className="text-red-700 font-black text-xs">PS</span>
          </div>
          <div>
            <span className="text-white font-semibold text-sm">Enroll Wajah</span>
            {rantingAktif && (
              <span className="ml-2 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                {rantingAktif}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleGantiRanting}
          className="flex items-center gap-1 text-red-200 hover:text-white text-xs transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Ganti
        </button>
      </header>

      {/* Statistik */}
      <div className="px-4 py-3 bg-white border-b flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600">
            Belum enroll: <strong className="text-gray-900">{belumEnroll.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">
            Sudah enroll: <strong className="text-gray-900">{sudahEnroll.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-400">
            {anggota.length > 0
              ? `${Math.round((sudahEnroll.length / anggota.length) * 100)}% selesai`
              : ''}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {anggota.length > 0 && (
        <div className="h-1 bg-gray-200">
          <div
            className="h-1 bg-green-500 transition-all duration-500"
            style={{ width: `${(sudahEnroll.length / anggota.length) * 100}%` }}
          />
        </div>
      )}

      {/* List anggota */}
      <main className="flex-1 overflow-y-auto">
        {loadingAnggota ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat daftar anggota...
          </div>
        ) : anggota.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Tidak ada anggota untuk ranting ini.
          </div>
        ) : (
          <div className="divide-y bg-white">
            {/* Anggota belum enroll */}
            {belumEnroll.length > 0 && (
              <>
                <div className="px-4 py-2 bg-red-50 sticky top-0">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    Belum Enroll ({belumEnroll.length})
                  </p>
                </div>
                {belumEnroll.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAnggota(a); setShowEnroll(true) }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold shrink-0">
                      {a.nama[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{a.nama}</p>
                      <p className="text-xs text-gray-500">
                        {a.nomor_anggota}
                        {a.tingkatan ? ` · ${a.tingkatan}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                        <ScanFace className="h-3 w-3" />
                        Enroll
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Anggota sudah enroll */}
            {sudahEnroll.length > 0 && (
              <>
                <div className="px-4 py-2 bg-green-50 sticky top-0">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Sudah Enroll ({sudahEnroll.length})
                  </p>
                </div>
                {sudahEnroll.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAnggota(a); setShowEnroll(true) }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors touch-manipulation text-left opacity-60"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                      {a.nama[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 truncate">{a.nama}</p>
                      <p className="text-xs text-gray-500">
                        {a.nomor_anggota}
                        {a.tingkatan ? ` · ${a.tingkatan}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                        <UserCheck className="h-3 w-3" />
                        Terdaftar
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* Modal Enroll */}
      <Modal
        open={showEnroll}
        onClose={() => { setShowEnroll(false); setSelectedAnggota(null) }}
        title="Daftarkan Wajah"
        size="lg"
      >
        {selectedAnggota && (
          <EnrollFace
            anggota={selectedAnggota}
            onSuccess={handleEnrollSuccess}
            onCancel={() => { setShowEnroll(false); setSelectedAnggota(null) }}
          />
        )}
      </Modal>
    </div>
  )
}

export default function EnrollPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Memuat...</div>
      </div>
    }>
      <EnrollContent />
    </Suspense>
  )
}
