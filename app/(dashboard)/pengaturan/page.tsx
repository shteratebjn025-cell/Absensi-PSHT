'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Key, Clock, Loader2 } from 'lucide-react'

export default function PengaturanPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState('')

  // Jam batas terlambat — disimpan di Supabase agar konsisten di semua device/kiosk
  const [batasJam, setBatasJam] = useState('07:30')
  const [jamLoading, setJamLoading] = useState(true)
  const [jamMsg, setJamMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })

    // Ambil dari Supabase
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'batas_terlambat')
      .single()
      .then(({ data, error }) => {
        if (!error && data?.value) {
          setBatasJam(data.value)
        } else {
          // Fallback: cek localStorage lama lalu migrate
          const local = localStorage.getItem('batas_terlambat')
          if (local) setBatasJam(local)
        }
        setJamLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveJam = async () => {
    setJamLoading(true)
    setJamMsg('')

    // Simpan ke localStorage sebagai fallback
    localStorage.setItem('batas_terlambat', batasJam)

    // Simpan ke Supabase (upsert agar tidak error jika sudah ada)
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'batas_terlambat', value: batasJam }, { onConflict: 'key' })

    if (error) {
      // Jika tabel belum ada, setidaknya localStorage sudah tersimpan
      console.warn('app_settings upsert error:', error.message)
      setJamMsg('Tersimpan di perangkat ini. Jalankan SQL migrasi untuk sinkronisasi semua device.')
    } else {
      setJamMsg('Tersimpan! Semua device scanner akan pakai jam ini.')
    }

    setJamLoading(false)
    setTimeout(() => setJamMsg(''), 4000)
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
