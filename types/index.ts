export type Anggota = {
  id: string
  nomor_anggota: string
  nama: string
  tingkatan: string
  cabang: string
  face_embedding: number[] | null
  photo_url: string | null
  created_at: string
}

export type AbsensiLog = {
  id: string
  anggota_id: string
  scanned_by: string
  lokasi_kiosk: string | null
  waktu_scan: string
  status: 'Hadir' | 'Terlambat' | 'Izin'
  tanggal: string
  anggota?: Anggota
}

export type ScanResult = {
  anggota: Anggota
  similarity: number
  already_attended: boolean
}

export type AdminProfile = {
  id: string
  email: string
  nama: string
  role: 'superadmin' | 'admin'
}

export type DashboardStats = {
  total_anggota: number
  hadir_hari_ini: number
  terlambat_hari_ini: number
  belum_absen: number
}
