import * as XLSX from 'xlsx'
import type { AbsensiLog } from '@/types'
import { formatWaktu } from './utils'

export function exportAbsensiToXLSX(
  data: AbsensiLog[],
  tanggal: string,
  filename?: string
) {
  const rows = data.map((log, index) => ({
    No: index + 1,
    'Tanggal': new Date(log.tanggal).toLocaleDateString('id-ID'),
    'Nomor Anggota': log.anggota?.nomor_anggota ?? '-',
    'Nama Anggota': log.anggota?.nama ?? '-',
    Tingkatan: log.anggota?.tingkatan ?? '-',
    Cabang: (log.anggota as any)?.cabang ?? '-',
    Ranting: (log.anggota as any)?.ranting ?? '-',
    Status: log.status,
    'Waktu Scan': formatWaktu(log.waktu_scan),
    'Lokasi Kiosk': log.lokasi_kiosk ?? '-',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Atur lebar kolom
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 18 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, `Absensi ${tanggal}`)

  const outFilename = filename ?? `Absensi_PSHT_${tanggal}.xlsx`
  XLSX.writeFile(workbook, outFilename)
}

export function exportAnggotaToXLSX(data: any[], filename?: string) {
  const rows = data.map((a, index) => ({
    No: index + 1,
    'Nomor Anggota': a.nomor_anggota,
    'Nama Lengkap': a.nama,
    Tingkatan: a.tingkatan,
    Cabang: a.cabang,
    Ranting: a.ranting,
    'Ada Wajah': a.face_embedding ? 'Ya' : 'Belum',
    'Tanggal Daftar': new Date(a.created_at).toLocaleDateString('id-ID'),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Anggota')

  XLSX.writeFile(workbook, filename ?? 'Data_Anggota_PSHT.xlsx')
}
