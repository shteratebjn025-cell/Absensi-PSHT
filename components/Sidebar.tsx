'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ScanFace,
  FileSpreadsheet,
  Settings,
  Monitor,
  LogOut,
  Menu,
  X,
  UserCheck,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/anggota', label: 'Data Anggota', icon: Users },
  { href: '/absensi', label: 'Absensi', icon: ScanFace },
  { href: '/laporan', label: 'Laporan', icon: FileSpreadsheet },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
]export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-red-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
            <span className="text-red-700 font-black text-sm">PS</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">PSHT Bojonegoro</p>
            <p className="text-red-300 text-xs">Sistem Absensi</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/20 text-white'
                  : 'text-red-200 hover:bg-white/10 hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Link TV Mode */}
        <Link
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Monitor className="h-5 w-5 shrink-0" />
          Mode TV
        </Link>

        {/* Link Enroll Wajah — buka di tab baru agar tidak ganggu dashboard */}
        <Link
          href="/enroll"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <UserCheck className="h-5 w-5 shrink-0" />
          Enroll Wajah
        </Link>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-red-900 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Keluar
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 bg-red-700 text-white rounded-lg shadow-lg md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-red-800 flex flex-col z-40 transition-transform duration-300',
          'md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-red-800 flex-col z-40">
        <NavContent />
      </aside>
    </>
  )
}
