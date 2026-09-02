'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { loginAction } from './actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Pakai Server Action — lebih reliable di iOS Safari karena cookie di-set
      // langsung di server tanpa masalah cross-origin cookie dari fetch()
      const result = await loginAction(email, password)

      // loginAction hanya return jika ada error (kalau sukses langsung redirect)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (err: unknown) {
      // Server Action redirect() melempar error NEXT_REDIRECT — itu normal
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('NEXT_REDIRECT') || message.includes('redirect')) {
        // Redirect berhasil, biarkan Next.js yang handle navigasi
        return
      }
      setError('Koneksi gagal. Periksa jaringan Anda.')
      setLoading(false)
    }
  }

  // Toggle password — handler terpisah agar iOS Safari tidak konflik dengan form
  const togglePassword = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowPass((v) => !v)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-red-700 font-black text-3xl">PS</span>
          </div>
          <h1 className="text-white text-2xl font-bold">PSHT Bojonegoro</h1>
          <p className="text-red-200 text-sm mt-1">Sistem Absensi Scan Wajah</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Masuk Admin</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@psht-bjn.org"
              autoComplete="email"
              required
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pr-14 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                {/*
                  Gunakan onMouseDown (desktop) + onTouchEnd (iOS Safari).
                  iOS Safari kadang tidak fire onClick saat ada scroll gesture di sekitarnya.
                  e.preventDefault() di onMouseDown mencegah field kehilangan fokus.
                */}
                <button
                  type="button"
                  onMouseDown={togglePassword}
                  onTouchEnd={togglePassword}
                  aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-gray-400 active:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <LogIn className="h-4 w-4" />
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
        </div>

        {/* Scanner link */}
        <p className="text-center mt-4">
          <a
            href="/scanner"
            className="text-red-200 text-sm hover:text-white underline"
          >
            Buka Scanner Publik
          </a>
        </p>
      </div>
    </div>
  )
}
