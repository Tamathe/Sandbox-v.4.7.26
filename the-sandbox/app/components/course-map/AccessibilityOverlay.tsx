'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Eye, Keyboard, SkipForward } from 'lucide-react'
import { getGraphTraversalKeymap } from '../../lib/course-map/accessibility-manager'

interface AccessibilityOverlayProps {
  highContrast: boolean
  onToggleHighContrast: () => void
  announce: (message: string) => void
}

export default function AccessibilityOverlay({
  highContrast,
  onToggleHighContrast,
  announce,
}: AccessibilityOverlayProps) {
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Listen for ? key to toggle shortcuts dialog
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcutHelp((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Focus trap for shortcuts dialog
  useEffect(() => {
    if (showShortcutHelp) {
      previousFocusRef.current = document.activeElement as HTMLElement
      dialogRef.current?.focus()
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [showShortcutHelp])

  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setShowShortcutHelp(false)
    }
  }, [])

  const keymap = getGraphTraversalKeymap()

  const formatKey = (binding: { key: string; modifiers?: string[] }): string => {
    const parts: string[] = []
    if (binding.modifiers?.includes('shift')) parts.push('Shift')
    if (binding.modifiers?.includes('ctrl')) parts.push('Ctrl')
    if (binding.modifiers?.includes('alt')) parts.push('Alt')
    if (binding.modifiers?.includes('meta')) parts.push('Cmd')
    parts.push(binding.key === ' ' ? 'Space' : binding.key)
    return parts.join(' + ')
  }

  return (
    <>
      {/* Screen reader live region */}
      <div
        id="course-map-live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Skip-to-content links */}
      <a
        href="#course-map-graph"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[#0033A0] focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        <SkipForward className="size-4 inline mr-1" aria-hidden="true" />
        Skip to graph
      </a>
      <a
        href="#course-map-toolbar"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-36 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[#0033A0] focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        <SkipForward className="size-4 inline mr-1" aria-hidden="true" />
        Skip to toolbar
      </a>

      {/* High-contrast toggle (fixed bottom-left) */}
      <button
        onClick={() => {
          onToggleHighContrast()
          announce(highContrast ? 'High contrast mode disabled' : 'High contrast mode enabled')
        }}
        className={`fixed bottom-6 left-6 z-50 p-2.5 rounded-full shadow-lg border-2 transition-colors print:hidden ${
          highContrast
            ? 'bg-yellow-400 border-black text-black'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
        aria-pressed={highContrast}
        aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
        title="Toggle high contrast (accessibility)"
      >
        <Eye className="size-5" aria-hidden="true" />
      </button>

      {/* Keyboard shortcut help button (fixed bottom-left, above contrast) */}
      <button
        onClick={() => setShowShortcutHelp(true)}
        className="fixed bottom-20 left-6 z-50 p-2.5 rounded-full shadow-lg border-2 border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors print:hidden"
        aria-label="Open keyboard shortcuts help (press ? key)"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="size-5" aria-hidden="true" />
      </button>

      {/* Keyboard shortcuts dialog */}
      {showShortcutHelp && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
          onClick={() => setShowShortcutHelp(false)}
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 w-full max-w-md mx-4 outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Keyboard className="size-5 text-[#0033A0]" aria-hidden="true" />
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcutHelp(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close keyboard shortcuts"
              >
                <X className="size-5 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-gray-700 pb-2">Key</th>
                    <th className="text-left font-semibold text-gray-700 pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keymap.map((binding) => (
                    <tr key={binding.action}>
                      <td className="py-2 pr-4">
                        <kbd className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-mono font-semibold text-gray-700">
                          {formatKey(binding)}
                        </kbd>
                      </td>
                      <td className="py-2 text-gray-600">{binding.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono text-gray-600">?</kbd> to toggle this dialog
            </div>
          </div>
        </div>
      )}

      {/* Focus indicator styles — applied via high-contrast class */}
      {highContrast && (
        <style>{`
          .high-contrast .course-map-node {
            outline: 3px solid #000 !important;
            outline-offset: 2px;
          }
          .high-contrast .course-map-node[aria-selected="true"] {
            outline-color: #0033A0 !important;
            outline-width: 4px !important;
          }
          .high-contrast button:focus-visible,
          .high-contrast a:focus-visible,
          .high-contrast [tabindex]:focus-visible {
            outline: 3px solid #0033A0 !important;
            outline-offset: 2px;
          }
          .high-contrast svg path[stroke] {
            stroke-width: 3 !important;
          }
          .high-contrast .border-gray-200 {
            border-color: #000 !important;
          }
        `}</style>
      )}
    </>
  )
}
