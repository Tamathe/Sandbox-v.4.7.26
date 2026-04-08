'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, ClipboardPaste } from 'lucide-react'

interface PasteZoneProps {
  value: string
  onChange: (text: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export default function PasteZone({ value, onChange, onSubmit, disabled }: PasteZoneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-expand textarea
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 400) + 'px'
    },
    [onChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (value.trim()) onSubmit()
      }
    },
    [value, onSubmit],
  )

  const hasContent = value.trim().length > 0

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-6">
      {/* Icon + title */}
      {!hasContent && !isFocused && (
        <div className="text-center mb-6">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-[#0033A0]/10 mx-auto mb-3">
            <ClipboardPaste className="size-7 text-[#0033A0]" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 mb-1">Paste your email draft</h2>
          <p className="text-sm text-gray-500">Drop it in and Sandy will handle the rest.</p>
        </div>
      )}

      {/* Textarea */}
      <div className="w-full max-w-xl">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder="Paste your email here — any length, any mess..."
          rows={hasContent ? 8 : 4}
          className="w-full rounded-2xl border-2 border-gray-200 px-5 py-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 disabled:bg-gray-50 resize-none transition-all"
        />

        {/* Submit button */}
        {hasContent && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled}
            className="mt-3 w-full py-3 rounded-xl bg-[#0033A0] hover:bg-[#002580] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="size-4" />
            Rewrite It
            <span className="text-xs text-white/60 ml-1">⌘↵</span>
          </button>
        )}
      </div>
    </div>
  )
}
