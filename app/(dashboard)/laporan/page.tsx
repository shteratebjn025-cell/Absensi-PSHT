'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { exportAbsensiToXLSX } from '@/lib/xlsx-export'
import { getTanggalHariIni, formatWaktu } from '@/lib/utils'
import type { AbsensiLog } from '@/types'
import { Download, Search, Filter } from 'lucide-react'

export default function LaporanPage() {
  const supabase = createClient()
  const [tanggal, setTanggal] = useState(getTanggalHariIni())
  const [filterStatus, setFilterStatus] = useState<string>('semua')
  const [logs, setLogs] = useState<AbsensiLog[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleCari = async () => {
    setLoading(true)
    setSearched(true)

    let query = supabase
      .from('attendance_logs')
      .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, cabang)')
      .eq('tanggal', tanggal)
      .order('waktu_scan', { ascending: true })

    if (filterStatus !== 'semua') {
      query = query.eq('status', filterStatus)
    }

    const { data } = await query
    setLogs((data as AbsensiLog[]) ?? [])
    setLoading(false)
  }

  const handleExport = () => {
    if (logs.length === 0) return
    exportAbsensiToXLSX(logs, tanggal)
  }

  const hadir = logs.filter((l) => l.status === 'Hadir').length
  const terlambat = logs.filter((l) => l.status === 'Terlambat').length
  const izin = logs.filter((l) => l.status === 'Izin').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Absensi</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cari dan export data absensi ke format Excel
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              max={getTanggalHariIni()}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-36">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Filter status kehadiran"
            >
              <option value="semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
            </select>
          </div>
          <Button onClick={handleCari} loading={loading}>
            <Search className="h-4 w-4" />
            Cari
          </Button>
          {logs.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export XLSX
            </Button>
          )}
        </div>
      </div>

      {/* Ringkasan */}
      {searched && !loading && (
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
      {searched && (
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
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">No. Anggota</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Tingkatan</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Waktu</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log: any, i) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {log.anggota?.nama ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                        {log.anggota?.nomor_anggota ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {log.anggota?.tingkatan ?? '-'}
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatWaktu(log.waktu_scan)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {log.lokasi_kiosk ?? '-'}
                      </td>
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
