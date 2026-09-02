import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTanggal(dateStr: string): string {
  // Tambahkan waktu tengah hari agar tidak kena masalah UTC offset
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

export function formatWaktu(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function getTanggalHariIni(): string {
  // Gunakan timezone WIB (Asia/Jakarta) agar tanggal tidak meleset saat UTC berganti hari
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Hadir':
      return 'bg-green-100 text-green-800'
    case 'Terlambat':
      return 'bg-yellow-100 text-yellow-800'
    case 'Izin':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
