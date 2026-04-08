'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { enUS } from './strings/en-US'
import { es } from './strings/es'

// ── Types ──────────────────────────────────────────────────────────────────

type StringCatalog = Record<string, string>

interface LocaleContextValue {
  locale: string
  setLocale: (locale: string) => void
  dir: 'ltr' | 'rtl'
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en-US',
  setLocale: () => {},
  dir: 'ltr',
})

// ── String catalogs registry ───────────────────────────────────────────────

const catalogs: Record<string, StringCatalog> = {
  'en-US': enUS,
  'es': es,
}

// ── RTL detection ──────────────────────────────────────────────────────────

const RTL_PREFIXES = ['ar', 'he', 'fa', 'ur']

function getDir(locale: string): 'ltr' | 'rtl' {
  const lang = locale.split('-')[0].toLowerCase()
  return RTL_PREFIXES.includes(lang) ? 'rtl' : 'ltr'
}

// ── Provider ───────────────────────────────────────────────────────────────

const LOCALE_STORAGE_KEY = 'uky-locale'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState('en-US')

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && catalogs[stored]) {
      setLocaleState(() => stored)
    } else {
      // Detect from browser
      const browserLocale = navigator.language || 'en-US'
      // Try exact match, then prefix match, fallback to en-US
      if (catalogs[browserLocale]) {
        setLocaleState(() => browserLocale)
      } else {
        const prefix = browserLocale.split('-')[0]
        const match = Object.keys(catalogs).find((k) => k.startsWith(prefix))
        if (match) setLocaleState(() => match)
      }
    }
  }, [])

  const setLocale = useCallback((newLocale: string) => {
    if (catalogs[newLocale]) {
      setLocaleState(newLocale)
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    }
  }, [])

  const dir = getDir(locale)

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir }}>
      {children}
    </LocaleContext.Provider>
  )
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useLocale() {
  return useContext(LocaleContext)
}

/**
 * Translation hook. Returns a function that looks up a key in the current
 * locale's string catalog and interpolates params.
 *
 * Simple interpolation: {name} → params.name
 * ICU-style plurals: {count, plural, one {# item} other {# items}}
 */
export function useT() {
  const { locale } = useContext(LocaleContext)

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const catalog = catalogs[locale] || catalogs['en-US']
      let str = catalog[key]
      if (!str) {
        // Fallback to en-US, then raw key
        str = catalogs['en-US'][key] || key
      }
      if (!params) return str

      // Simple interpolation: {varName}
      str = str.replace(/\{(\w+)\}/g, (_, varName) => {
        if (varName in params) return String(params[varName])
        return `{${varName}}`
      })

      // ICU plural: {count, plural, one {# item} other {# items}}
      str = str.replace(
        /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
        (_, varName, oneFmt, otherFmt) => {
          const val = Number(params[varName] ?? 0)
          const chosen = val === 1 ? oneFmt : otherFmt
          return chosen.replace(/#/g, String(val))
        },
      )

      return str
    },
    [locale],
  )

  return t
}
