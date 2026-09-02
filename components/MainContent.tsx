'use client'

import { cn } from '@/lib/utils'
import { useSidebarMode } from './SidebarContext'

export function MainContent({ children }: { children: React.ReactNode }) {
  const { mode } = useSidebarMode()

  return (
    <main
      className={cn(
        'min-h-screen transition-all duration-200 ease-in-out',
        // Desktop: mode expanded → geser 224px (w-56), mode lainnya → geser 56px (w-14)
        mode === 'expanded' ? 'md:ml-56' : 'md:ml-14'
      )}
    >
      {/* Mobile: padding bawah untuk bottom navbar */}
      <div className="p-4 md:p-8 pb-24 md:pb-8">{children}</div>
    </main>
  )
}
