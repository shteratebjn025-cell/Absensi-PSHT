'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Key, Clock, Loader2, MapPin, Copy, Check } from 'lucide-react'

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

  // URL kiosk per ranting
  const [daftarRanting, setDaftarRanting] = useState<string[]>([])
  const [copiedRanting, setCopiedRanting] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    // Ambil base URL dari window (agar benar di semua environment)
    setBaseUrl(window.location.origin)

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

    // Ambil daftar ranting dari database anggota
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

  const getScannerUrl = (ranting: string) =>
    `${baseUrl}/scanner?ranting=${encodeURIComponent(ranting)}`

  const handleCopyUrl = async (ranting: string) => {
    await navigator.clipboard.writeText(getScannerUrl(ranting))
    setCopiedRanting(ranting)
    setTimeout(() => setCopiedRanting(null), 2000)
  }

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

      {/* URL Kiosk Per Ranting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-700" />
            URL Scanner Per Ranting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-1">
            Setiap kiosk cukup bookmark URL yang berbeda — tidak perlu setting ulang di database.
            Masing-masing device bisa punya ranting yang berbeda secara mandiri.
          </p>
          <p className="text-xs text-blue-600 mb-4">
            ✦ Salin URL di bawah lalu buka/bookmark di device/HP kiosk yang sesuai.
          </p>

          {/* URL untuk semua ranting */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border text-sm">
              <span className="flex-1 font-mono text-gray-500 truncate text-xs">
                {baseUrl}/scanner
              </span>
              <span className="text-xs text-gray-400 shrink-0">Semua ranting</span>
              <button
                onClick={() => navigator.clipboard.writeText(`${baseUrl}/scanner`)}
                className="p-1 hover:bg-gray-200 rounded shrink-0"
                title="Salin URL"
              >
                <Copy className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* URL per ranting */}
          {daftarRanting.length > 0 ? (
            <div className="flex flex-col gap-2">
              {daftarRanting.map((ranting) => (
                <div
                  key={ranting}
                  className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs">{ranting}</p>
                    <p className="font-mono text-gray-400 text-xs truncate">
                      {getScannerUrl(ranting)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyUrl(ranting)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs shrink-0 transition-colors"
                  >
                    {copiedRanting === ranting
                      ? <><Check className="h-3 w-3" /> Disalin</>
                      : <><Copy className="h-3 w-3" /> Salin</>
                    }
                  </button>
                </div>
              ))}
            </div>
          ) : (
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
