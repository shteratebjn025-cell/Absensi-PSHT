'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, CheckCircle, Clock, Loader2, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getTanggalHariIni } from '@/lib/utils'
import type { Anggota } from '@/types'

interface AbsenManualProps {
  /** Filter ranting aktif di device ini */
  rantingFilter?: string
  /** Dipanggil setelah absen berhasil disimpan */
  onSuccess?: () => void
}

export function AbsenManual({ rantingFilter = '', onSuccess }: AbsenManualProps) {
  const supabase = createClient()
  const today = getTanggalHariIni()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Anggota[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Anggota | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [alreadyAbsen, setAlreadyAbsen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback(
    (val: string) => {
      setQuery(val)
      setSelected(null)
      setSavedMsg('')
      setAlreadyAbsen(false)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (val.trim().length < 2) {
        setResults([])
        return
      }

      debounceRef.current = setTimeout(async () => {
        setSearching(true)
        let q = supabase
          .from('anggota')
          .select('id, nama, nomor_anggota, tingkatan, cabang, ranting, face_embedding, photo_url, created_at')
          .or(`nama.ilike.%${val.trim()}%,nomor_anggota.ilike.%${val.trim()}%`)
          .order('nama')
          .limit(8)

        // filter ranting jika aktif
        if (rantingFilter) {
          q = q.eq('ranting', rantingFilter)
        }

        const { data } = await q
        setResults((data as Anggota[]) ?? [])
        setSearching(false)
      }, 350)
    },
    [supabase, rantingFilter]
  )

  const handlePilih = async (anggota: Anggota) => {
    setSelected(anggota)
    setResults([])
    setQuery(anggota.nama)
    setSavedMsg('')

    // Cek apakah sudah absen hari ini
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id, status, waktu_scan')
      .eq('anggota_id', anggota.id)
      .eq('tanggal', today)
      .maybeSingle()

    setAlreadyAbsen(!!existing)
  }

  const handleAbsen = async (status: 'Hadir' | 'Terlambat') => {
    if (!selected) return
    setSaving(true)
    setSavedMsg('')

    try {
      const { error } = await supabase.from('attendance_logs').insert({
        anggota_id: selected.id,
        scanned_by: 'admin-manual',
        lokasi_kiosk: rantingFilter ? `Manual — ${rantingFilter}` : 'Manual Admin',
        status,
        tanggal: today,
      })

      if (error) throw error

      setSavedMsg(`✅ ${selected.nama} berhasil diabsen sebagai ${status}`)
      setSelected(null)
      setQuery('')
      setAlreadyAbsen(false)
      onSuccess?.()
    } catch (err: any) {
      setSavedMsg(`❌ Gagal menyimpan: ${err?.message ?? 'Coba lagi'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setQuery('')
    setResults([])
    setSelected(null)
    setSavedMsg('')
    setAlreadyAbsen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        Cari nama atau nomor anggota
        {rantingFilter ? ` di Ranting ${rantingFilter}` : ''}.
      </p>

      {/* Input pencarian */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Ketik nama atau nomor anggota..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Hasil pencarian */}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {results.map((a) => (
            <button
              key={a.id}
              onClick={() => handlePilih(a)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left border-b last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xs font-bold shrink-0">
                {a.nama[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{a.nama}</p>
                <p className="text-xs text-gray-500">
                  {a.nomor_anggota} · {a.tingkatan}
                  {a.ranting ? ` · ${a.ranting}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Anggota dipilih */}
      {selected && (
        <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold shrink-0">
              {selected.nama[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{selected.nama}</p>
              <p className="text-xs text-gray-500">
                {selected.nomor_anggota} · {selected.tingkatan}
                {selected.ranting ? ` · ${selected.ranting}` : ''}
              </p>
            </div>
          </div>

          {alreadyAbsen ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <UserCheck className="h-4 w-4 shrink-0" />
              <span>{selected.nama} sudah absen hari ini.</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleAbsen('Hadir')}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Hadir
              </button>
              <button
                onClick={() => handleAbsen('Terlambat')}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Clock className="h-4 w-4" />
                Terlambat
              </button>
            </div>
          )}

          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-gray-600 text-center transition-colors"
          >
            Ganti anggota
          </button>
        </div>
      )}

      {/* Pesan hasil */}
      {savedMsg && (
        <div
          className={`px-3 py-2 rounded-xl text-sm text-center font-medium ${
            savedMsg.startsWith('✅')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {savedMsg}
        </div>
      )}
    </div>
  )
}
