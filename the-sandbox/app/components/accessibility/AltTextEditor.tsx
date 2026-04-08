'use client'

import { useState } from 'react'
import { Sparkles, Check, Pencil, ImageOff, Loader2 } from 'lucide-react'
import type { AltTextResult, AltTextTargetType } from '../../lib/accessibility/types'

interface AltTextEditorProps {
  imageUrl: string
  targetType: AltTextTargetType
  targetId: string
  /** Existing alt text if already set */
  currentAltText?: string | null
  /** Context hint for better AI generation (e.g. "Tool thumbnail for Debate Simulator") */
  context?: string
  /** Called after alt text is saved */
  onSaved?: (altText: string) => void
}

export default function AltTextEditor({
  imageUrl,
  targetType,
  targetId,
  currentAltText,
  context,
  onSaved,
}: AltTextEditorProps) {
  const [altText, setAltText] = useState(currentAltText ?? '')
  const [isDecorative, setIsDecorative] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [result, setResult] = useState<AltTextResult | null>(null)
  const [saved, setSaved] = useState(!!currentAltText)

  const hasAltText = altText.length > 0 || isDecorative

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/accessibility/alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, targetType, targetId, context }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data: AltTextResult = await res.json()
      setResult(data)
      setAltText(data.isDecorative ? '' : data.altText)
      setIsDecorative(data.isDecorative)
      setEditing(true)
      setSaved(false)
    } catch {
      // Silently handle — user can retry
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/accessibility/alt-text', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          altText: isDecorative ? '' : altText,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setEditing(false)
      onSaved?.(isDecorative ? '' : altText)
    } catch {
      // Silently handle — user can retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm">
        {saved ? (
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <Check className="size-4" /> Alt text set
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <ImageOff className="size-4" /> Missing alt text
          </span>
        )}
      </div>

      {/* Generate button — shown when no alt text and not editing */}
      {!hasAltText && !editing && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#0033A0] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#002878] disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {loading ? 'Analyzing image…' : 'Generate alt text'}
        </button>
      )}

      {/* Editor — shown when editing or has alt text */}
      {(editing || hasAltText) && (
        <div className="space-y-2">
          {/* Decorative toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isDecorative}
              onChange={(e) => {
                setIsDecorative(e.target.checked)
                setSaved(false)
              }}
              className="rounded border-gray-300"
            />
            This image is decorative
          </label>

          {/* Alt text input */}
          {!isDecorative && (
            <div className="relative">
              <textarea
                value={altText}
                onChange={(e) => {
                  setAltText(e.target.value)
                  setSaved(false)
                }}
                placeholder="Describe what this image shows…"
                maxLength={150}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none resize-none"
              />
              <span className="absolute bottom-2 right-2 text-xs text-gray-400">
                {altText.length}/150
              </span>
            </div>
          )}

          {/* Confidence & category badge from AI */}
          {result && !isDecorative && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2 py-0.5">{result.category}</span>
              <span>
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!saved && (
              <button
                onClick={handleSave}
                disabled={saving || (!isDecorative && !altText.trim())}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Save
              </button>
            )}
            {saved && (
              <button
                onClick={() => { setEditing(true); setSaved(false) }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="size-3.5" /> Edit
              </button>
            )}
            {!loading && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="size-3.5" /> Regenerate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
