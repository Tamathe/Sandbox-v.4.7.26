'use client'

import { useState, useRef, useCallback } from 'react'
import { Clipboard, StickyNote, Pin, PinOff, Loader2 } from 'lucide-react'
import { showToast } from './Toast'

export interface MessageActionsContext {
  courseId?: string
  toolSlug?: string
  userEmail?: string
}

interface MessageActionsProps {
  content: string
  messageId: string
  context?: MessageActionsContext
  onPin?: (content: string, messageId: string) => void
  isPinned?: boolean
}

export default function MessageActions({ content, messageId, context, onPin, isPinned }: MessageActionsProps) {
  const [saving, setSaving] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showSheet, setShowSheet] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      showToast('Copied to clipboard')
    } catch {
      showToast('Failed to copy')
    }
  }, [content])

  const handleSaveNote = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const title = content.slice(0, 100).replace(/[#*_\n`\->/[\]]/g, '').trim() || 'Sandy note'
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(context?.userEmail ? { 'x-demo-user-email': context.userEmail } : {}),
        },
        body: JSON.stringify({
          title,
          content,
          source: 'sandy',
          courseId: context?.courseId || null,
        }),
      })
      if (res.ok) {
        showToast('Saved to Notes')
      } else {
        showToast('Failed to save')
      }
    } catch {
      showToast('Failed to save')
    } finally {
      setSaving(false)
    }
  }, [content, context, saving])

  const handlePin = useCallback(() => {
    if (!onPin) return
    onPin(content, messageId)
    showToast(isPinned ? 'Unpinned' : 'Pinned')
  }, [content, messageId, onPin, isPinned])

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowSheet(true), 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  // Desktop action buttons
  const actionButtons = (
    <>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-[#0033A0] hover:bg-slate-100 rounded-lg transition-colors"
        title="Copy"
      >
        <Clipboard className="size-3.5" />
        Copy
      </button>
      <button
        onClick={handleSaveNote}
        disabled={saving}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-[#0033A0] hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        title="Save to Notes"
      >
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <StickyNote className="size-3.5" />}
        {saving ? 'Saving...' : 'Save to Notes'}
      </button>
      {onPin && (
        <button
          onClick={handlePin}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-[#0033A0] hover:bg-slate-100 rounded-lg transition-colors"
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          {isPinned ? 'Unpin' : 'Pin'}
        </button>
      )}
    </>
  )

  return (
    <>
      {/* Desktop: hover-reveal action bar */}
      <div className="hidden sm:flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {actionButtons}
      </div>

      {/* Mobile: tap to show actions (replaces broken long-press-on-phantom-div) */}
      <button
        className="sm:hidden mt-1 text-[10px] text-slate-400 active:text-slate-600 transition-colors"
        onClick={() => setShowSheet(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        Actions...
      </button>

      {/* Mobile: bottom sheet */}
      {showSheet && (
        <div className="sm:hidden fixed inset-0 z-[9998]" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 space-y-1"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <button
              onClick={() => { handleCopy(); setShowSheet(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <Clipboard className="size-4" />
              Copy
            </button>
            <button
              onClick={() => { handleSaveNote(); setShowSheet(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <StickyNote className="size-4" />}
              {saving ? 'Saving...' : 'Save to Notes'}
            </button>
            {onPin && (
              <button
                onClick={() => { handlePin(); setShowSheet(false) }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
              >
                {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                {isPinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
