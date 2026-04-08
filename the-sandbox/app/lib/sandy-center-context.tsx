'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface SandyCenterContextValue {
  active: boolean
  setActive: (v: boolean) => void
}

const SandyCenterContext = createContext<SandyCenterContextValue>({ active: false, setActive: () => {} })

export function SandyCenterProvider({ children }: { children: ReactNode }) {
  const [active, setActiveRaw] = useState(false)
  const setActive = useCallback((v: boolean) => setActiveRaw(v), [])
  return (
    <SandyCenterContext.Provider value={{ active, setActive }}>
      {children}
    </SandyCenterContext.Provider>
  )
}

export function useSandyCenterMode() {
  return useContext(SandyCenterContext)
}
