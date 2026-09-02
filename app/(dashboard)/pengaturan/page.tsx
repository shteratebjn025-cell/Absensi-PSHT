'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Key, Clock } from 'lucide-react'

export default function PengaturanPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState('')

  // Jam batas terlambat (disimpan di localStorage untuk simplisitas)
  const [batasJam, setBatasJam] = useState('07:30')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
    const saved = localStorage.getItem('batas_terlambat')
    if (saved) setBatasJam(saved)
  }, [supabase])

  const handleSaveJam = () => {
    localStorage.setItem('batas_terlambat', batasJam)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
          <p className="text-sm text-gray-600 mb-4">
            Anggota yang absen setelah jam ini akan ditandai sebagai &quot;Terlambat&quot;.
          </p>
          <div className="flex gap-3 items-end">
            <Input
              label="Batas Jam"
              type="time"
              value={batasJam}
              onChange={(e) => setBatasJam(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleSaveJam} variant={saved ? 'secondary' : 'default'}>
              <Save className="h-4 w-4" />
              {saved ? 'Tersimpan!' : 'Simpan'}
            </Button>
          </div>
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
              <p
                className={`text-sm ${
                  passMsg.includes('berhasil') ? 'text-green-600' : 'text-red-600'
                }`}
              >
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
