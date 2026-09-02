'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type SidebarMode = 'collapsed' | 'expand-on-hover' | 'expanded'

const STORAGE_KEY = 'sidebar-mode'

interface SidebarContextValue {
  mode: SidebarMode
  setMode: (m: SidebarMode) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  mode: 'expand-on-hover',
  setMode: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<SidebarMode>('expand-on-hover')

  // Baca dari localStorage setelah mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as SidebarMode | null
    if (saved) setModeState(saved)
  }, [])

  const setMode = (m: SidebarMode) => {
    setModeState(m)
    localStorage.setItem(STORAGE_KEY, m)
  }

  return (
    <SidebarContext.Provider value={{ mode, setMode }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebarMode = () => useContext(SidebarContext)
