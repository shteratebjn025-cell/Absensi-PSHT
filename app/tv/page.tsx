'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTanggalHariIni, formatWaktu } from '@/lib/utils'
import type { AbsensiLog } from '@/types'
import { UserCheck, Clock, Users, UserX } from 'lucide-react'

export default function TVPage() {
  const supabase = createClient()
  const today = getTanggalHariIni()
  const [logs, setLogs] = useState<AbsensiLog[]>([])
  const [totalAnggota, setTotalAnggota] = useState(0)
  const [jam, setJam] = useState('')
  const [lastScan, setLastScan] = useState<AbsensiLog | null>(null)
  const [showFlash, setShowFlash] = useState(false)

  const fetchData = async () => {
    const [{ data: logData }, { count }] = await Promise.all([
      supabase
        .from('attendance_logs')
        .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, cabang, photo_url)')
        .eq('tanggal', today)
        .order('waktu_scan', { ascending: false })
        .limit(50),
      supabase.from('anggota').select('*', { count: 'exact', head: true }),
    ])
    setLogs((logData as AbsensiLog[]) ?? [])
    setTotalAnggota(count ?? 0)
  }

  useEffect(() => {
    fetchData()

    // Jam realtime
    const clockInterval = setInterval(() => {
      setJam(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }, 1000)

    // Subscribe realtime
    const channel = supabase
      .channel('tv-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
        },
        async (payload) => {
          // Ambil data anggota untuk log baru
          const { data } = await supabase
            .from('attendance_logs')
            .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, cabang, photo_url)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setLastScan(data as AbsensiLog)
            setShowFlash(true)
            setTimeout(() => setShowFlash(false), 5000)
          }

          fetchData()
        }
      )
      .subscribe()

    return () => {
      clearInterval(clockInterval)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hadir = logs.filter((l) => l.status === 'Hadir').length
  const terlambat = logs.filter((l) => l.status === 'Terlambat').length
  const belumAbsen = totalAnggota - hadir - terlambat

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-red-900/80 border-b border-red-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
            <span className="text-red-700 font-black text-lg">PS</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">PSHT Bojonegoro</h1>
            <p className="text-red-200 text-sm">Sistem Absensi Scan Wajah</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold tracking-wider">{jam}</p>
          <p className="text-red-200 text-sm">
            {new Date(today).toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </header>

      <div className="flex-1 flex gap-0">
        {/* Panel kiri: Stats */}
        <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col gap-4 p-6">
          {/* Counter cards */}
          {[
            {
              label: 'Total Anggota',
              value: totalAnggota,
              icon: Users,
              color: 'text-blue-400',
              bg: 'bg-blue-900/30',
            },
            {
              label: 'Hadir',
              value: hadir,
              icon: UserCheck,
              color: 'text-green-400',
              bg: 'bg-green-900/30',
            },
            {
              label: 'Terlambat',
              value: terlambat,
              icon: Clock,
              color: 'text-yellow-400',
              bg: 'bg-yellow-900/30',
            },
            {
              label: 'Belum Absen',
              value: belumAbsen > 0 ? belumAbsen : 0,
              icon: UserX,
              color: 'text-red-400',
              bg: 'bg-red-900/30',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`flex items-center gap-4 p-4 rounded-xl ${bg}`}>
              <Icon className={`h-8 w-8 ${color} shrink-0`} />
              <div>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-400 text-sm">{label}</p>
              </div>
            </div>
          ))}

          {/* Progress bar */}
          <div className="mt-auto">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tingkat Kehadiran</span>
              <span>
                {totalAnggota > 0
                  ? Math.round(((hadir + terlambat) / totalAnggota) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-1000"
                style={{
                  width:
                    totalAnggota > 0
                      ? `${((hadir + terlambat) / totalAnggota) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Panel kanan: Feed scan */}
        <div className="flex-1 flex flex-col">
          {/* Flash notif scan terbaru */}
          {showFlash && lastScan && (
            <div className="mx-6 mt-6 p-4 bg-green-900/50 border border-green-600 rounded-xl flex items-center gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center text-2xl font-bold shrink-0">
                {(lastScan as any).anggota?.nama?.[0] ?? '?'}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold">{(lastScan as any).anggota?.nama}</p>
                <p className="text-green-300 text-sm">
                  No. {(lastScan as any).anggota?.nomor_anggota} ·{' '}
                  {(lastScan as any).anggota?.tingkatan}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-2xl font-bold ${
                    lastScan.status === 'Hadir' ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {lastScan.status}
                </span>
                <p className="text-gray-400 text-sm mt-1">
                  {formatWaktu(lastScan.waktu_scan)}
                </p>
              </div>
            </div>
          )}

          {/* Scrolling ticker */}
          <div className="flex-1 overflow-hidden px-6 py-4">
            <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-3">
              Riwayat Absensi Hari Ini
            </h2>
            <div className="space-y-2 overflow-y-auto max-h-full">
              {logs.map((log: any, i) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 rounded-xl border border-gray-800"
                >
                  <span className="text-gray-600 text-sm w-6 shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-red-300 text-xs font-bold shrink-0">
                    {log.anggota?.nama?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{log.anggota?.nama}</p>
                    <p className="text-gray-500 text-xs">
                      {log.anggota?.nomor_anggota} · {log.anggota?.tingkatan}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold ${
                        log.status === 'Hadir' ? 'text-green-400' : 'text-yellow-400'
                      }`}
                    >
                      {log.status}
                    </span>
                    <p className="text-gray-600 text-xs">
                      {new Date(log.waktu_scan).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
