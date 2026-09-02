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
import { useSidebarMode, type SidebarMode } from './SidebarContext'

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
  const { mode, setMode } = useSidebarMode()
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Sidebar tampil lebar?
  const isExpanded =
    mode === 'expanded' || (mode === 'expand-on-hover' && hovered)

  const NavLink = ({
    href,
    label,
    icon: Icon,
    external = false,
  }: {
    href: string
    label: string
    icon: React.ElementType
    external?: boolean
  }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cn(
          'flex items-center rounded-md text-sm font-medium transition-colors group relative h-9',
          isExpanded ? 'gap-3 px-3' : 'justify-center px-0',
          active
            ? 'bg-white/20 text-white'
            : 'text-red-200 hover:bg-white/10 hover:text-white'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {isExpanded ? (
          <span className="truncate whitespace-nowrap">{label}</span>
        ) : (
          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60]">
            {label}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* ===================== DESKTOP SIDEBAR ===================== */}
      <aside
        className={cn(
          'hidden md:flex fixed top-0 left-0 h-full flex-col bg-red-800 z-40',
          'transition-all duration-200 ease-in-out',
          isExpanded ? 'w-56' : 'w-14'
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          setMenuOpen(false)
        }}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center border-b border-red-900 shrink-0 overflow-hidden h-14',
            isExpanded ? 'px-4 gap-3' : 'justify-center'
          )}
        >
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center shrink-0">
            <span className="text-red-700 font-black text-xs">PS</span>
          </div>
          {isExpanded && (
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
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          <div className="my-1 border-t border-red-900" />

          {extraItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Bottom: logout + sidebar control */}
        <div className="px-2 pb-3 pt-2 border-t border-red-900 flex flex-col gap-0.5">
          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center rounded-md text-sm font-medium transition-colors group relative h-9 text-red-200 hover:bg-white/10 hover:text-white w-full',
              isExpanded ? 'gap-3 px-3' : 'justify-center px-0'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isExpanded ? (
              <span className="truncate whitespace-nowrap">Keluar</span>
            ) : (
              <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60]">
                Keluar
              </span>
            )}
          </button>

          {/* Sidebar control */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                'flex items-center rounded-md text-sm font-medium transition-colors group relative h-9 text-red-300 hover:bg-white/10 hover:text-white w-full',
                isExpanded ? 'gap-3 px-3' : 'justify-center px-0'
              )}
            >
              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-200',
                  mode === 'expanded' ? 'rotate-180' : 'rotate-0'
                )}
              />
              {isExpanded ? (
                <span className="text-xs whitespace-nowrap truncate">
                  Sidebar control
                </span>
              ) : (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60]">
                  Sidebar control
                </span>
              )}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-[70]">
                <p className="px-3 py-1 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                  Sidebar control
                </p>
                {(
                  [
                    { value: 'expanded', label: 'Expanded' },
                    { value: 'expand-on-hover', label: 'Expand on hover' },
                    { value: 'collapsed', label: 'Collapsed' },
                  ] as { value: SidebarMode; label: string }[]
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full border-2',
                        mode === value
                          ? 'bg-red-600 border-red-600'
                          : 'border-gray-300'
                      )}
                    />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors relative',
                active ? 'text-white' : 'text-red-300 hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-white' : 'text-red-300')} />
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
