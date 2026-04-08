'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface MetricExplainerProps {
  text: string
}

export default function MetricExplainer({ text }: MetricExplainerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center group">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
        aria-label="More info"
      >
        <Info className="size-3.5" />
      </button>

      {/* Desktop: group-hover. Mobile: tap toggle via `open` state */}
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-white rounded-lg shadow-md border border-gray-200 p-2 text-xs text-gray-600 max-w-[240px] z-50 pointer-events-none transition-opacity ${
          open
            ? 'opacity-100 visible'
            : 'opacity-0 invisible group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
        }`}
      >
        {text}
      </div>
    </div>
  )
}
