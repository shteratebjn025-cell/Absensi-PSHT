import { createClient } from '@/lib/supabase/server'
import { getTanggalHariIni, formatTanggal } from '@/lib/utils'
import { Users, UserCheck, Clock, UserX, ScanFace } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

// Skeleton untuk stats cards agar halaman langsung tampil
function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div className="flex flex-col gap-2">
                <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b last:border-0">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="w-16 h-6 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

async function DashboardData() {
  const supabase = await createClient()
  const today = getTanggalHariIni()

  // Ambil stats paralel
  const [
    { count: totalAnggota },
    { count: hadirHariIni },
    { count: terlambatHariIni },
    { data: anggotaList },
    { data: absensiHariIni },
    { data: recentScans },
  ] = await Promise.all([
    supabase.from('anggota').select('*', { count: 'exact', head: true }),
    supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tanggal', today)
      .eq('status', 'Hadir'),
    supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tanggal', today)
      .eq('status', 'Terlambat'),
    supabase
      .from('anggota')
      .select('id, tingkatan, cabang, ranting'),
    supabase
      .from('attendance_logs')
      .select('anggota_id')
      .eq('tanggal', today),
    supabase
      .from('attendance_logs')
      .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, ranting)')
      .eq('tanggal', today)
      .order('waktu_scan', { ascending: false })
      .limit(10),
  ])

  const totalHadir = (hadirHariIni ?? 0) + (terlambatHariIni ?? 0)
  const belumAbsen = (totalAnggota ?? 0) - totalHadir

  const sudahAbsenIds = new Set((absensiHariIni ?? []).map((a: any) => a.anggota_id))
  const semuaAnggota = anggotaList ?? []

  const rantingMap = new Map<string, { total: number; hadir: number }>()
  for (const a of semuaAnggota as any[]) {
    const key = a.ranting || '(Belum diisi)'
    if (!rantingMap.has(key)) rantingMap.set(key, { total: 0, hadir: 0 })
    const cur = rantingMap.get(key)!
    cur.total++
    if (sudahAbsenIds.has(a.id)) cur.hadir++
  }

  const tingkatanMap = new Map<string, { total: number; hadir: number }>()
  for (const a of semuaAnggota as any[]) {
    const key = a.tingkatan || '(Belum diisi)'
    if (!tingkatanMap.has(key)) tingkatanMap.set(key, { total: 0, hadir: 0 })
    const cur = tingkatanMap.get(key)!
    cur.total++
    if (sudahAbsenIds.has(a.id)) cur.hadir++
  }

  const rantingList = [...rantingMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const tingkatanList = [...tingkatanMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  const stats = [
    { label: 'Total Anggota', value: totalAnggota ?? 0, icon: Users, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Hadir Hari Ini', value: totalHadir, icon: UserCheck, color: 'bg-green-500', bg: 'bg-green-50' },
    { label: 'Terlambat', value: terlambatHariIni ?? 0, icon: Clock, color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Belum Absen', value: belumAbsen > 0 ? belumAbsen : 0, icon: UserX, color: 'bg-red-500', bg: 'bg-red-50' },
  ]

  return (
    <>
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className={`flex items-center gap-4 ${bg} rounded-xl`}>
              <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('id-ID')}</p>
                <p className="text-sm text-gray-600">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/scanner"
          className="flex items-center gap-3 p-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded-xl transition-colors touch-manipulation"
        >
          <ScanFace className="h-6 w-6" />
          <div>
            <p className="font-semibold">Buka Scanner</p>
            <p className="text-xs text-red-200">Mode kiosk fullscreen</p>
          </div>
        </Link>
        <Link
          href="/anggota"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <Users className="h-6 w-6 text-gray-600" />
          <div>
            <p className="font-semibold text-gray-900">Kelola Anggota</p>
            <p className="text-xs text-gray-500">Tambah & daftarkan wajah</p>
          </div>
        </Link>
        <Link
          href="/laporan"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <Users className="h-6 w-6 text-gray-600" />
          <div>
            <p className="font-semibold text-gray-900">Laporan Absensi</p>
            <p className="text-xs text-gray-500">Riwayat & export Excel</p>
          </div>
        </Link>
      </div>

      {/* Breakdown per Ranting & Tingkatan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rantingList.length > 0 && (
          <Card>
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Kehadiran per Ranting</h2>
              <p className="text-xs text-gray-500 mt-0.5">Data hari ini</p>
            </div>
            <div className="divide-y">
              {rantingList.map(([ranting, data]) => {
                const pct = data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0
                return (
                  <div key={ranting} className="px-6 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-800">{ranting}</span>
                      <span className="text-xs text-gray-500">{data.hadir}/{data.total} hadir</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}% hadir</p>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {tingkatanList.length > 0 && (
          <Card>
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Kehadiran per Tingkatan</h2>
              <p className="text-xs text-gray-500 mt-0.5">Data hari ini</p>
            </div>
            <div className="divide-y">
              {tingkatanList.map(([tingkatan, data]) => {
                const pct = data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0
                return (
                  <div key={tingkatan} className="px-6 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-800">{tingkatan}</span>
                      <span className="text-xs text-gray-500">{data.hadir}/{data.total} hadir</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}% hadir</p>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Scan terakhir */}
      <Card>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Scan Terakhir Hari Ini</h2>
          <Link href="/absensi" className="text-sm text-red-700 hover:underline">
            Lihat semua
          </Link>
        </div>
        {recentScans && recentScans.length > 0 ? (
          <div className="divide-y">
            {recentScans.map((scan: any) => (
              <div key={scan.id} className="px-6 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xs font-bold shrink-0">
                  {scan.anggota?.nama?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{scan.anggota?.nama ?? '-'}</p>
                  <p className="text-xs text-gray-500">
                    No. {scan.anggota?.nomor_anggota} · {scan.anggota?.tingkatan}
                    {scan.anggota?.ranting ? ` · ${scan.anggota.ranting}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    scan.status === 'Hadir' ? 'bg-green-100 text-green-700'
                    : scan.status === 'Terlambat' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                  }`}>
                    {scan.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(scan.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-gray-500 text-sm">
            Belum ada absensi hari ini
          </div>
        )}
      </Card>
    </>
  )
}

export default async function DashboardPage() {
  const today = getTanggalHariIni()

  return (
    <div className="flex flex-col gap-6">
      {/* Header — tampil langsung tanpa menunggu data */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{formatTanggal(today)}</p>
      </div>

      {/* Data di-stream — skeleton tampil dulu, data menyusul */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  )
}
