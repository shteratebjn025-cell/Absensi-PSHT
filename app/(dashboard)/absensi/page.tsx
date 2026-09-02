'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaceScanner } from '@/components/scanner/FaceScanner'
import { AbsenManual } from '@/components/absensi/AbsenManual'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { getTanggalHariIni, formatWaktu } from '@/lib/utils'
import { MapPin, Trash2, PenLine, ClipboardList } from 'lucide-react'
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

  // Modal absen manual
  const [modalManual, setModalManual] = useState(false)

  // Konfirmasi hapus
  const [logToDelete, setLogToDelete] = useState<AbsensiLog | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Koreksi status
  const [logToEdit, setLogToEdit] = useState<AbsensiLog | null>(null)
  const [editingStatus, setEditingStatus] = useState(false)

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
    const { data } = await supabase
      .from('attendance_logs')
      .select('*, anggota:anggota_id(nama, nomor_anggota, tingkatan, cabang, ranting)')
      .eq('tanggal', today)
      .order('waktu_scan', { ascending: false })

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

  // ── Hapus log ──────────────────────────────────────────────────────────────
  const handleHapusLog = async () => {
    if (!logToDelete) return
    setDeleting(true)
    await supabase.from('attendance_logs').delete().eq('id', logToDelete.id)
    setDeleting(false)
    setLogToDelete(null)
    fetchLogs()
  }

  // ── Koreksi status ─────────────────────────────────────────────────────────
  const handleKoreksiStatus = async (statusBaru: 'Hadir' | 'Terlambat') => {
    if (!logToEdit) return
    setEditingStatus(true)
    await supabase
      .from('attendance_logs')
      .update({ status: statusBaru })
      .eq('id', logToEdit.id)
    setEditingStatus(false)
    setLogToEdit(null)
    fetchLogs()
  }

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
              className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
          <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900 shrink-0">
              Log Absensi ({logs.length})
              {rantingFilter && (
                <span className="ml-2 text-xs font-normal text-gray-400">— {rantingFilter}</span>
              )}
            </h2>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                Hadir: {hadir}
              </span>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                Terlambat: {terlambat}
              </span>
              {/* Tombol absen manual */}
              <button
                onClick={() => setModalManual(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-medium transition-colors"
                title="Absen Manual"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Absen Manual</span>
                <span className="sm:hidden">Manual</span>
              </button>
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        {/* Badge status — klik untuk koreksi */}
                        <button
                          onClick={() => setLogToEdit(log)}
                          title="Klik untuk koreksi status"
                          className="hover:opacity-80 transition-opacity"
                        >
                          <Badge
                            variant={
                              log.status === 'Hadir' ? 'green'
                              : log.status === 'Terlambat' ? 'yellow'
                              : 'blue'
                            }
                          >
                            {log.status}
                          </Badge>
                        </button>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatWaktu(log.waktu_scan)}
                        </p>
                      </div>
                      {/* Tombol hapus */}
                      <button
                        onClick={() => setLogToDelete(log)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        title="Hapus absensi ini"
                        aria-label={`Hapus absensi ${log.anggota?.nama}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Absen Manual ─────────────────────────────────────────────── */}
      <Modal
        open={modalManual}
        onClose={() => setModalManual(false)}
        title="Absen Manual"
        size="sm"
      >
        <AbsenManual
          rantingFilter={rantingFilter}
          onSuccess={() => {
            fetchLogs()
            // Biarkan modal tetap buka supaya bisa absen beberapa orang sekaligus
          }}
        />
      </Modal>

      {/* ── Modal Konfirmasi Hapus ─────────────────────────────────────────── */}
      <Modal
        open={!!logToDelete}
        onClose={() => setLogToDelete(null)}
        title="Hapus Absensi"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-700 text-sm">
            Yakin ingin menghapus absensi{' '}
            <span className="font-semibold text-gray-900">
              {(logToDelete?.anggota as any)?.nama ?? '-'}
            </span>{' '}
            hari ini?
          </p>
          <p className="text-xs text-gray-400">
            Status: {logToDelete?.status} · Pukul {logToDelete ? formatWaktu(logToDelete.waktu_scan) : ''}
          </p>
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            Tindakan ini tidak dapat dibatalkan. Anggota bisa absen ulang setelahnya.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setLogToDelete(null)}
              className="flex-1 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleHapusLog}
              disabled={deleting}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Koreksi Status ───────────────────────────────────────────── */}
      <Modal
        open={!!logToEdit}
        onClose={() => setLogToEdit(null)}
        title="Koreksi Status Absensi"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm shrink-0">
              {(logToEdit?.anggota as any)?.nama?.[0] ?? '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {(logToEdit?.anggota as any)?.nama ?? '-'}
              </p>
              <p className="text-xs text-gray-500">
                Status saat ini:{' '}
                <span className="font-semibold">{logToEdit?.status}</span>
                {' '}· Pukul {logToEdit ? formatWaktu(logToEdit.waktu_scan) : ''}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600">Ubah status menjadi:</p>

          <div className="flex gap-2">
            <button
              onClick={() => handleKoreksiStatus('Hadir')}
              disabled={editingStatus || logToEdit?.status === 'Hadir'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              <PenLine className="h-4 w-4" />
              Hadir
            </button>
            <button
              onClick={() => handleKoreksiStatus('Terlambat')}
              disabled={editingStatus || logToEdit?.status === 'Terlambat'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              <PenLine className="h-4 w-4" />
              Terlambat
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Tombol status yang sudah aktif dinonaktifkan otomatis.
          </p>
        </div>
      </Modal>
    </div>
  )
}
