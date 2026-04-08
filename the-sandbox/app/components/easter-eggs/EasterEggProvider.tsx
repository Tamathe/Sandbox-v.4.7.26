'use client'

import { createContext, useContext, useCallback, useState } from 'react'
import LogoVideoOverlay from './LogoVideoOverlay'

type ActiveEffect = 'logo-video' | null

interface EasterEggContextValue {
  triggerEffect: (effect: ActiveEffect) => void
}

const EasterEggContext = createContext<EasterEggContextValue>({
  triggerEffect: () => {},
})

export const useEasterEggs = () => useContext(EasterEggContext)

export default function EasterEggProvider({ children }: { children: React.ReactNode }) {
  const [activeEffect, setActiveEffect] = useState<ActiveEffect>(null)

  const triggerEffect = useCallback((effect: ActiveEffect) => {
    setActiveEffect(effect)
  }, [])

  const clearEffect = useCallback(() => setActiveEffect(null), [])

  return (
    <EasterEggContext.Provider value={{ triggerEffect }}>
      {children}
      {activeEffect === 'logo-video' && <LogoVideoOverlay onDone={clearEffect} />}
    </EasterEggContext.Provider>
  )
}
