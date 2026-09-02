import { createClient } from '@/lib/supabase/server'
import { getTanggalHariIni, formatTanggal } from '@/lib/utils'
import { Users, UserCheck, Clock, UserX, ScanFace } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = getTanggalHariIni()

  // Ambil stats paralel
  const [
    { count: totalAnggota },
    { count: hadirHariIni },
    { count: terlambatHariIni },
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
  ])

  const totalHadir = (hadirHariIni ?? 0) + (terlambatHariIni ?? 0)
  const belumAbsen = (totalAnggota ?? 0) - totalHadir

  // Ambil 10 scan terakhir hari ini
  const { data: recentScans } = await supabase
    .from('attendance_logs')
    .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan)')
    .eq('tanggal', today)
    .order('waktu_scan', { ascending: false })
    .limit(10)

  const stats = [
    {
      label: 'Total Anggota',
      value: totalAnggota ?? 0,
      icon: Users,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Hadir Hari Ini',
      value: totalHadir,
      icon: UserCheck,
      color: 'bg-green-500',
      bg: 'bg-green-50',
    },
    {
      label: 'Terlambat',
      value: terlambatHariIni ?? 0,
      icon: Clock,
      color: 'bg-yellow-500',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Belum Absen',
      value: belumAbsen > 0 ? belumAbsen : 0,
      icon: UserX,
      color: 'bg-red-500',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{formatTanggal(today)}</p>
      </div>

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
          target="_blank"
          className="flex items-center gap-3 p-4 bg-red-700 hover:bg-red-800 text-white rounded-xl transition-colors"
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
            <p className="text-xs text-gray-500">Export Excel</p>
          </div>
        </Link>
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
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {scan.anggota?.nama ?? '-'}
                  </p>
                  <p className="text-xs text-gray-500">
                    No. {scan.anggota?.nomor_anggota} · {scan.anggota?.tingkatan}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      scan.status === 'Hadir'
                        ? 'bg-green-100 text-green-700'
                        : scan.status === 'Terlambat'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {scan.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(scan.waktu_scan).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
    </div>
  )
}
