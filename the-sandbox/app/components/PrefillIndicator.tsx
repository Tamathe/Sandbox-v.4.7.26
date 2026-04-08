'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface PrefillIndicatorProps {
  isPrefilled: boolean
  onClear: () => void
  children: React.ReactNode
}

/**
 * Wraps a pre-filled form field with a light blue background that fades on first edit.
 * Shows a clear button to reset to blank state.
 */
export default function PrefillIndicator({ isPrefilled, onClear, children }: PrefillIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(isPrefilled)

  useEffect(() => {
    setShowIndicator(isPrefilled)
  }, [isPrefilled])

  if (!showIndicator) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="rounded-xl bg-blue-50/60 ring-1 ring-blue-200/50 transition-all duration-500">
        {children}
      </div>
      <button
        type="button"
        onClick={() => {
          setShowIndicator(false)
          onClear()
        }}
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200"
        title="Clear pre-filled content"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
