'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useLocale } from '../../lib/i18n/locale-context'
import { getAvailableLocales } from '../../lib/i18n/course-map-strings'

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const locales = getAvailableLocales()
  const current = locales.find((l) => l.code === locale) || locales[0]

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={dropdownRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${current.label}`}
      >
        <Globe className="size-4 text-gray-500" aria-hidden="true" />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{locale.split('-')[0].toUpperCase()}</span>
        <ChevronDown className={`size-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full mt-1 z-50 w-40 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {locales.map((loc) => (
            <button
              key={loc.code}
              role="option"
              aria-selected={loc.code === locale}
              onClick={() => {
                setLocale(loc.code)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                loc.code === locale
                  ? 'bg-[#0033A0]/5 text-[#0033A0] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
