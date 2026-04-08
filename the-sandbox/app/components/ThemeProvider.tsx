'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

const STORAGE_KEY = 'uky-theme'

function resolveSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyClass(resolved: ResolvedTheme) {
  const el = document.documentElement
  if (resolved === 'dark') {
    el.classList.add('dark')
  } else {
    el.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const t = stored ?? 'system'
    return t === 'system' ? resolveSystem() : t
  })

  const emailRef = useRef(currentUser.email)
  emailRef.current = currentUser.email

  // Block transitions on initial paint to prevent FOUC
  useLayoutEffect(() => {
    document.documentElement.classList.add('no-transitions')
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('no-transitions')
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Apply class + listen for OS changes when theme is "system"
  useEffect(() => {
    const resolved = theme === 'system' ? resolveSystem() : theme
    setResolvedTheme(resolved)
    applyClass(resolved)

    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const r: ResolvedTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(r)
      applyClass(r)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)

    // Fire-and-forget persist to server
    const email = emailRef.current
    if (email) {
      apiFetch(email, '/api/sandy/preferences', {
        method: 'PUT',
        body: JSON.stringify({ theme: t }),
      }).catch(() => {})
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
