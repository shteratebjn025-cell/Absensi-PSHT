'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Key, Clock, Loader2, MapPin } from 'lucide-react'

export default function PengaturanPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState('')

  // Jam batas terlambat
  const [batasJam, setBatasJam] = useState('07:30')
  const [jamLoading, setJamLoading] = useState(true)
  const [jamMsg, setJamMsg] = useState('')

  // Ranting kiosk — filter pencarian wajah per ranting
  const [rantingKiosk, setRantingKiosk] = useState('')
  const [daftarRanting, setDaftarRanting] = useState<string[]>([])
  const [rantingLoading, setRantingLoading] = useState(true)
  const [rantingMsg, setRantingMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })

    // Ambil batas jam dari Supabase
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'batas_terlambat')
      .single()
      .then(({ data, error }) => {
        if (!error && data?.value) {
          setBatasJam(data.value)
        } else {
          const local = localStorage.getItem('batas_terlambat')
          if (local) setBatasJam(local)
        }
        setJamLoading(false)
      })

    // Ambil ranting_kiosk dari Supabase
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ranting_kiosk')
      .maybeSingle()
      .then(({ data }) => {
        setRantingKiosk(data?.value ?? '')
        setRantingLoading(false)
      })

    // Ambil daftar ranting yang ada di database anggota
    supabase
      .from('anggota')
      .select('ranting')
      .not('ranting', 'is', null)
      .neq('ranting', '')
      .then(({ data }) => {
        const unik = [...new Set((data ?? []).map((a: any) => a.ranting as string))]
          .filter(Boolean)
          .sort()
        setDaftarRanting(unik)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveJam = async () => {
    setJamLoading(true)
    setJamMsg('')
    localStorage.setItem('batas_terlambat', batasJam)
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'batas_terlambat', value: batasJam }, { onConflict: 'key' })
    if (error) {
      setJamMsg('Tersimpan di perangkat ini. Jalankan SQL migrasi untuk sinkronisasi semua device.')
    } else {
      setJamMsg('Tersimpan! Semua device scanner akan pakai jam ini.')
    }
    setJamLoading(false)
    setTimeout(() => setJamMsg(''), 4000)
  }

  const handleSaveRanting = async () => {
    setRantingLoading(true)
    setRantingMsg('')
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'ranting_kiosk', value: rantingKiosk }, { onConflict: 'key' })
    if (error) {
      setRantingMsg('Gagal menyimpan: ' + error.message)
    } else {
      setRantingMsg(
        rantingKiosk
          ? `Tersimpan! Kiosk ini hanya akan mendeteksi anggota Ranting ${rantingKiosk}.`
          : 'Tersimpan! Kiosk ini akan mendeteksi semua ranting.'
      )
    }
    setRantingLoading(false)
    setTimeout(() => setRantingMsg(''), 5000)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPassMsg('Password tidak cocok.')
      return
    }
    if (newPassword.length < 6) {
      setPassMsg('Password minimal 6 karakter.')
      return
    }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPassMsg('Gagal: ' + error.message)
    } else {
      setPassMsg('Password berhasil diubah!')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPassLoading(false)
    setTimeout(() => setPassMsg(''), 4000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 text-sm mt-1">Konfigurasi sistem absensi</p>
      </div>

      {/* Pengaturan ranting kiosk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-700" />
            Filter Ranting Kiosk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-1">
            Jika diisi, kiosk scanner ini hanya akan mencocokkan wajah anggota dari ranting yang dipilih.
            Ini meningkatkan akurasi pengenalan wajah secara signifikan.
          </p>
          <p className="text-xs text-blue-600 mb-4">
            ✦ Biarkan kosong jika kiosk ini digunakan untuk semua ranting.
          </p>
          <div className="flex gap-3 items-end flex-wrap">
            {daftarRanting.length > 0 ? (
              <div className="flex flex-col gap-1 flex-1 min-w-48">
                <label className="text-sm font-medium text-gray-700">Ranting</label>
                <select
                  value={rantingKiosk}
                  onChange={(e) => setRantingKiosk(e.target.value)}
                  disabled={rantingLoading}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Pilih ranting kiosk"
                >
                  <option value="">— Semua Ranting (tidak difilter) —</option>
                  {daftarRanting.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            ) : (
              <Input
                label="Ranting"
                value={rantingKiosk}
                onChange={(e) => setRantingKiosk(e.target.value)}
                placeholder="Kosong = semua ranting"
                className="flex-1 min-w-48"
                disabled={rantingLoading}
              />
            )}
            <Button
              onClick={handleSaveRanting}
              loading={rantingLoading}
              disabled={rantingLoading}
            >
              {rantingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          </div>
          {rantingMsg && (
            <p className={`text-sm mt-2 ${rantingMsg.includes('Tersimpan') ? 'text-green-600' : 'text-red-600'}`}>
              {rantingMsg}
            </p>
          )}
          {daftarRanting.length === 0 && !rantingLoading && (
            <p className="text-xs text-gray-400 mt-2">
              Belum ada data ranting. Isi kolom ranting pada data anggota terlebih dahulu.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pengaturan jam */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-700" />
            Batas Jam Terlambat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-1">
            Anggota yang absen setelah jam ini akan ditandai sebagai &quot;Terlambat&quot;.
          </p>
          <p className="text-xs text-blue-600 mb-4">
            ✦ Pengaturan ini berlaku di semua kiosk dan device scanner secara otomatis.
          </p>
          <div className="flex gap-3 items-end">
            <Input
              label="Batas Jam"
              type="time"
              value={batasJam}
              onChange={(e) => setBatasJam(e.target.value)}
              className="max-w-xs"
              disabled={jamLoading}
            />
            <Button
              onClick={handleSaveJam}
              loading={jamLoading}
              disabled={jamLoading}
            >
              {jamLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          </div>
          {jamMsg && (
            <p className={`text-sm mt-2 ${jamMsg.includes('Tersimpan!') ? 'text-green-600' : 'text-yellow-600'}`}>
              {jamMsg}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ubah password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-red-700" />
            Ubah Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
              Login sebagai: <strong>{email}</strong>
            </div>
            <Input
              label="Password Baru"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
            />
            <Input
              label="Konfirmasi Password Baru"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
            />
            {passMsg && (
              <p className={`text-sm ${passMsg.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>
                {passMsg}
              </p>
            )}
            <Button
              onClick={handleChangePassword}
              loading={passLoading}
              className="self-start"
            >
              Ubah Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
