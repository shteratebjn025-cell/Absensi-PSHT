'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaceScanner } from '@/components/scanner/FaceScanner'
import { Badge } from '@/components/ui/badge'
import { getTanggalHariIni, formatWaktu } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import type { AbsensiLog } from '@/types'

const STORAGE_KEY = 'psht_absensi_ranting'

export default function AbsensiPage() {
  const supabase = createClient()
  const today = getTanggalHariIni()
  const [logs, setLogs] = useState<AbsensiLog[]>([])
  const [loading, setLoading] = useState(true)

  // Filter ranting — disimpan di localStorage per device
  const [rantingFilter, setRantingFilter] = useState('')
  const [daftarRanting, setDaftarRanting] = useState<string[]>([])

  // Load daftar ranting + baca pilihan tersimpan
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? ''
    setRantingFilter(saved)

    supabase
      .from('anggota')
      .select('ranting')
      .not('ranting', 'is', null)
      .neq('ranting', '')
      .then(({ data }) => {
        const unik = [...new Set((data ?? []).map((a: any) => a.ranting as string))]
          .filter(Boolean).sort()
        setDaftarRanting(unik)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGantiRanting = (nilai: string) => {
    setRantingFilter(nilai)
    localStorage.setItem(STORAGE_KEY, nilai)
  }

  // Fetch log absensi — filter per ranting jika dipilih
  const fetchLogs = useCallback(async () => {
    let query = supabase
      .from('attendance_logs')
      .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, cabang, ranting)')
      .eq('tanggal', today)
      .order('waktu_scan', { ascending: false })

    const { data } = await query
    let hasil = (data as AbsensiLog[]) ?? []

    // Filter di client jika ranting dipilih
    if (rantingFilter) {
      hasil = hasil.filter((l) => (l.anggota as any)?.ranting === rantingFilter)
    }

    setLogs(hasil)
    setLoading(false)
  }, [supabase, today, rantingFilter])

  useEffect(() => {
    fetchLogs()

    const channel = supabase
      .channel('absensi-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
          filter: `tanggal=eq.${today}`,
        },
        () => fetchLogs()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLogs, supabase, today])

  const hadir = logs.filter((l) => l.status === 'Hadir').length
  const terlambat = logs.filter((l) => l.status === 'Terlambat').length

  return (
    <div className="flex flex-col gap-6">
      {/* Header + pilih ranting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absensi Hari Ini</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(today).toLocaleDateString('id-ID', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        {/* Dropdown filter ranting */}
        {daftarRanting.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={rantingFilter}
              onChange={(e) => handleGantiRanting(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              aria-label="Filter ranting scanner"
            >
              <option value="">Semua Ranting</option>
              {daftarRanting.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {rantingFilter && (
              <span className="text-xs text-red-700 font-medium bg-red-50 border border-red-200 px-2 py-1 rounded-full whitespace-nowrap">
                Filter aktif
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner dengan filter ranting */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <FaceScanner
            lokasiKiosk={rantingFilter ? `Dashboard — ${rantingFilter}` : 'Dashboard Admin'}
            adminId="admin-dashboard"
            rantingFilter={rantingFilter}
            onScanSuccess={() => fetchLogs()}
          />
        </div>

        {/* Log absensi */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Log Absensi ({logs.length})
              {rantingFilter && (
                <span className="ml-2 text-xs font-normal text-gray-400">— {rantingFilter}</span>
              )}
            </h2>
            <div className="flex gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Hadir: {hadir}
              </span>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                Terlambat: {terlambat}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-96">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                {rantingFilter
                  ? `Belum ada absensi Ranting ${rantingFilter} hari ini.`
                  : 'Belum ada absensi hari ini.'}
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log: any) => (
                  <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xs font-bold shrink-0">
                      {log.anggota?.nama?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {log.anggota?.nama ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.anggota?.nomor_anggota} · {log.anggota?.tingkatan}
                        {log.anggota?.ranting ? ` · ${log.anggota.ranting}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant={
                          log.status === 'Hadir' ? 'green'
                          : log.status === 'Terlambat' ? 'yellow'
                          : 'blue'
                        }
                      >
                        {log.status}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatWaktu(log.waktu_scan)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
