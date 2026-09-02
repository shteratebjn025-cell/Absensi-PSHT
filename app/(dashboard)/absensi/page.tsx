'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaceScanner } from '@/components/scanner/FaceScanner'
import { Badge } from '@/components/ui/badge'
import { getTanggalHariIni, formatWaktu } from '@/lib/utils'
import type { AbsensiLog } from '@/types'

export default function AbsensiPage() {
  const supabase = createClient()
  const today = getTanggalHariIni()
  const [logs, setLogs] = useState<AbsensiLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('attendance_logs')
      .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, cabang, ranting)')
      .eq('tanggal', today)
      .order('waktu_scan', { ascending: false })
    setLogs((data as AbsensiLog[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()

    // Realtime subscription
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

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hadir = logs.filter((l) => l.status === 'Hadir').length
  const terlambat = logs.filter((l) => l.status === 'Terlambat').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Absensi Hari Ini</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date(today).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <FaceScanner
            lokasiKiosk="Dashboard Admin"
            adminId="admin-dashboard"
            onScanSuccess={() => fetchLogs()}
          />
        </div>

        {/* Daftar scan hari ini */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Log Absensi ({logs.length})
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
                Belum ada absensi hari ini.
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
                        {(log.anggota as any)?.ranting ? ` · ${(log.anggota as any).ranting}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant={
                          log.status === 'Hadir'
                            ? 'green'
                            : log.status === 'Terlambat'
                            ? 'yellow'
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
