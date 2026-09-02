'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { exportAbsensiToXLSX } from '@/lib/xlsx-export'
import { getTanggalHariIni, formatWaktu } from '@/lib/utils'
import type { AbsensiLog } from '@/types'
import { Download, Search, Filter, Calendar } from 'lucide-react'

type ModeFilter = 'tanggal' | 'rentang'

export default function LaporanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat...</div>}>
      <LaporanContent />
    </Suspense>
  )
}

function LaporanContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = getTanggalHariIni()

  // Baca semua state dari URL
  const mode = (searchParams.get('mode') as ModeFilter) ?? 'tanggal'
  const tanggal = searchParams.get('tgl') ?? today
  const tanggalDari = searchParams.get('dari') ?? today
  const tanggalSampai = searchParams.get('sampai') ?? today
  const filterStatus = searchParams.get('status') ?? 'semua'
  const filterTingkatan = searchParams.get('tingkatan') ?? ''
  const filterCabang = searchParams.get('cabang') ?? ''
  const filterRanting = searchParams.get('ranting') ?? ''
  const sudahCari = searchParams.get('cari') === '1'

  const [logs, setLogs] = useState<AbsensiLog[]>([])
  const [loading, setLoading] = useState(false)

  // Helper: update satu atau lebih URL params tanpa reload
  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const fetchLogs = useCallback(async () => {
    if (!sudahCari) return
    setLoading(true)

    let query = supabase
      .from('attendance_logs')
      .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, cabang, ranting)')
      .order('waktu_scan', { ascending: true })

    if (mode === 'tanggal') {
      query = query.eq('tanggal', tanggal)
    } else {
      query = query.gte('tanggal', tanggalDari).lte('tanggal', tanggalSampai)
    }

    if (filterStatus !== 'semua') {
      query = query.eq('status', filterStatus)
    }

    const { data } = await query
    let hasil = (data as AbsensiLog[]) ?? []

    if (filterTingkatan) hasil = hasil.filter((l) => l.anggota?.tingkatan === filterTingkatan)
    if (filterCabang) hasil = hasil.filter((l) => (l.anggota as any)?.cabang === filterCabang)
    if (filterRanting) hasil = hasil.filter((l) => (l.anggota as any)?.ranting === filterRanting)

    setLogs(hasil)
    setLoading(false)
  }, [sudahCari, mode, tanggal, tanggalDari, tanggalSampai, filterStatus, filterTingkatan, filterCabang, filterRanting, supabase])

  // Jalankan fetch otomatis saat URL params berubah (termasuk saat refresh)
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleCari = () => {
    setParams({ cari: '1' })
    // Jika sudahCari sudah '1', params tidak berubah → panggil manual
    if (sudahCari) fetchLogs()
  }

  const handleExport = () => {
    if (logs.length === 0) return
    const label = mode === 'tanggal' ? tanggal : `${tanggalDari}_sd_${tanggalSampai}`
    exportAbsensiToXLSX(logs, label)
  }

  const hadir = logs.filter((l) => l.status === 'Hadir').length
  const terlambat = logs.filter((l) => l.status === 'Terlambat').length
  const izin = logs.filter((l) => l.status === 'Izin').length

  // Opsi filter lanjutan dari hasil yang ada
  const opsiTingkatan = [...new Set(logs.map((l) => l.anggota?.tingkatan).filter(Boolean))].sort()
  const opsiCabang = [...new Set(logs.map((l) => (l.anggota as any)?.cabang).filter(Boolean))].sort()
  const opsiRanting = [...new Set(logs.map((l) => (l.anggota as any)?.ranting).filter(Boolean))].sort()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Absensi</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cari riwayat absensi per hari atau rentang tanggal, lalu export ke Excel
        </p>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4">

        {/* Toggle mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setParams({ mode: 'tanggal' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'tanggal' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Per Tanggal
          </button>
          <button
            onClick={() => setParams({ mode: 'rentang' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'rentang' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Rentang Tanggal
          </button>
        </div>

        {/* Input tanggal */}
        <div className="flex flex-wrap gap-3 items-end">
          {mode === 'tanggal' ? (
            <div className="flex-1 min-w-40 max-w-xs">
              <Input
                label="Tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setParams({ tgl: e.target.value })}
                max={today}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-40 max-w-xs">
                <Input
                  label="Dari Tanggal"
                  type="date"
                  value={tanggalDari}
                  onChange={(e) => setParams({ dari: e.target.value })}
                  max={today}
                />
              </div>
              <div className="flex-1 min-w-40 max-w-xs">
                <Input
                  label="Sampai Tanggal"
                  type="date"
                  value={tanggalSampai}
                  onChange={(e) => setParams({ sampai: e.target.value })}
                  max={today}
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1 min-w-36">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setParams({ status: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Filter status"
            >
              <option value="semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
            </select>
          </div>

          <Button onClick={handleCari} loading={loading} className="self-end">
            <Search className="h-4 w-4" />
            Cari
          </Button>
          {logs.length > 0 && (
            <Button variant="outline" onClick={handleExport} className="self-end">
              <Download className="h-4 w-4" />
              Export XLSX
            </Button>
          )}
        </div>

        {/* Filter lanjutan — muncul setelah ada hasil */}
        {sudahCari && logs.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">Filter hasil:</span>
            {opsiTingkatan.length > 0 && (
              <select
                value={filterTingkatan}
                onChange={(e) => setParams({ tingkatan: e.target.value })}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Filter tingkatan"
              >
                <option value="">Semua Tingkatan</option>
                {opsiTingkatan.map((t) => <option key={t} value={t!}>{t}</option>)}
              </select>
            )}
            {opsiCabang.length > 0 && (
              <select
                value={filterCabang}
                onChange={(e) => setParams({ cabang: e.target.value })}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Filter cabang"
              >
                <option value="">Semua Cabang</option>
                {opsiCabang.map((c) => <option key={c} value={c!}>{c}</option>)}
              </select>
            )}
            {opsiRanting.length > 0 && (
              <select
                value={filterRanting}
                onChange={(e) => setParams({ ranting: e.target.value })}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Filter ranting"
              >
                <option value="">Semua Ranting</option>
                {opsiRanting.map((r) => <option key={r} value={r!}>{r}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Ringkasan */}
      {sudahCari && !loading && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="font-bold text-gray-900">{logs.length}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
            <span className="text-sm text-green-700">Hadir:</span>
            <span className="font-bold text-green-900">{hadir}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="text-sm text-yellow-700">Terlambat:</span>
            <span className="font-bold text-yellow-900">{terlambat}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm text-blue-700">Izin:</span>
            <span className="font-bold text-blue-900">{izin}</span>
          </div>
        </div>
      )}

      {/* Tabel hasil */}
      {sudahCari && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Memuat data...</div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Tidak ada data absensi untuk filter ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">No</th>
                    {mode === 'rentang' && <th className="px-4 py-3 text-left">Tanggal</th>}
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">No. Anggota</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Tingkatan</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Cabang</th>
                    <th className="px-4 py-3 text-left hidden xl:table-cell">Ranting</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log: any, i) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      {mode === 'rentang' && (
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                          {new Date(log.tanggal).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium text-gray-900">{log.anggota?.nama ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                        {log.anggota?.nomor_anggota ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {log.anggota?.tingkatan ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {log.anggota?.cabang ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden xl:table-cell">
                        {log.anggota?.ranting ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            log.status === 'Hadir' ? 'green'
                              : log.status === 'Terlambat' ? 'yellow'
                              : 'blue'
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatWaktu(log.waktu_scan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
