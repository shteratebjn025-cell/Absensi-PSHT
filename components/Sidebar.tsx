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
  UserCheck,
  ChevronRight,
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
]

const extraItems = [
  { href: '/tv', label: 'Mode TV', icon: Monitor, external: true },
  { href: '/enroll', label: 'Enroll Wajah', icon: UserCheck, external: true },
]

// Bottom nav hanya menampilkan item utama (max 5 untuk mobile)
const bottomNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/anggota', label: 'Anggota', icon: Users },
  { href: '/absensi', label: 'Absensi', icon: ScanFace },
  { href: '/laporan', label: 'Laporan', icon: FileSpreadsheet },
  { href: '/pengaturan', label: 'Setelan', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  // pinned: sidebar selalu expanded; kalau false = collapsed kecuali di-hover
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const supabase = createClient()

  const expanded = pinned || hovered

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ===================== DESKTOP SIDEBAR ===================== */}
      <aside
        className={cn(
          'hidden md:flex fixed top-0 left-0 h-full flex-col bg-red-800 z-40',
          'transition-all duration-200 ease-in-out',
          expanded ? 'w-56' : 'w-14'
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center border-b border-red-900 shrink-0 overflow-hidden',
            expanded ? 'px-4 py-4 gap-3' : 'px-0 py-4 justify-center'
          )}
        >
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center shrink-0">
            <span className="text-red-700 font-black text-xs">PS</span>
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">
                PSHT Bojonegoro
              </p>
              <p className="text-red-300 text-xs whitespace-nowrap">Sistem Absensi</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={cn(
                  'flex items-center rounded-md text-sm font-medium transition-colors group relative',
                  'h-9',
                  expanded ? 'gap-3 px-3' : 'justify-center px-0',
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-red-200 hover:bg-white/10 hover:text-white'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {expanded && (
                  <span className="truncate whitespace-nowrap">{label}</span>
                )}
                {/* Tooltip saat collapsed */}
                {!expanded && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {label}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Divider */}
          <div className="my-1 border-t border-red-900" />

          {extraItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={!expanded ? label : undefined}
              className={cn(
                'flex items-center rounded-md text-sm font-medium transition-colors group relative',
                'h-9 text-red-200 hover:bg-white/10 hover:text-white',
                expanded ? 'gap-3 px-3' : 'justify-center px-0'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {expanded && (
                <span className="truncate whitespace-nowrap">{label}</span>
              )}
              {!expanded && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {label}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom: pin toggle + logout */}
        <div className="px-2 pb-3 pt-2 border-t border-red-900 flex flex-col gap-0.5">
          {/* Logout */}
          <button
            onClick={handleLogout}
            title={!expanded ? 'Keluar' : undefined}
            className={cn(
              'flex items-center rounded-md text-sm font-medium transition-colors group relative',
              'h-9 text-red-200 hover:bg-white/10 hover:text-white w-full',
              expanded ? 'gap-3 px-3' : 'justify-center px-0'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {expanded && <span className="truncate whitespace-nowrap">Keluar</span>}
            {!expanded && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Keluar
              </span>
            )}
          </button>

          {/* Pin toggle */}
          <button
            onClick={() => setPinned((v) => !v)}
            title={pinned ? 'Collapse sidebar' : 'Pin sidebar'}
            className={cn(
              'flex items-center rounded-md text-sm font-medium transition-colors group relative',
              'h-9 text-red-300 hover:bg-white/10 hover:text-white w-full',
              expanded ? 'gap-3 px-3' : 'justify-center px-0'
            )}
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                pinned ? 'rotate-180' : 'rotate-0'
              )}
            />
            {expanded && (
              <span className="truncate whitespace-nowrap text-xs">
                {pinned ? 'Collapsed' : 'Expanded'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ===================== MOBILE BOTTOM NAVBAR ===================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-red-800 border-t border-red-900 flex items-center justify-around safe-area-pb">
        {bottomNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors',
                active ? 'text-white' : 'text-red-300 hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  active ? 'text-white' : 'text-red-300'
                )}
              />
              <span className="leading-none">{label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-white rounded-t-full" />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
