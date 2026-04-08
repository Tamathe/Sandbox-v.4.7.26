'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Eye, Palette, X } from 'lucide-react'
import type { ContrastResult, ContrastViolation } from '../../lib/accessibility/types'

// ── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="size-4 rounded border border-gray-300"
        style={{ backgroundColor: color }}
        title={color}
      />
      <span className="font-mono text-[10px] text-gray-600">{color}</span>
      <span className="text-[10px] text-gray-400">({label})</span>
    </div>
  )
}

// ── Violation row ────────────────────────────────────────────────────────────

function ViolationRow({
  violation,
  onApplyFix,
}: {
  violation: ContrastViolation
  onApplyFix?: (fg: string, bg: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
      >
        <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-orange-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-orange-800">{violation.element}</span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
              {violation.ratio}:1 (needs {violation.requiredRatio}:1)
            </span>
            {violation.isLargeText && (
              <span className="text-[10px] text-gray-500">large text</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronDown className="size-3.5 text-gray-400" /> : <ChevronRight className="size-3.5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-orange-200/50 px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Current</div>
              <ColorSwatch color={violation.foreground} label="text" />
              <ColorSwatch color={violation.background} label="bg" />
              <div
                className="mt-1.5 rounded-lg px-3 py-2 text-sm font-medium"
                style={{ color: violation.foreground, backgroundColor: violation.background }}
              >
                Sample text
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Suggested fix</div>
              <ColorSwatch color={violation.suggestion.adjustedForeground} label="text" />
              <ColorSwatch color={violation.suggestion.adjustedBackground} label="bg" />
              <div
                className="mt-1.5 rounded-lg px-3 py-2 text-sm font-medium"
                style={{
                  color: violation.suggestion.adjustedForeground,
                  backgroundColor: violation.suggestion.adjustedBackground,
                }}
              >
                Sample text
              </div>
            </div>
          </div>

          {onApplyFix && (
            <button
              type="button"
              onClick={() => onApplyFix(
                violation.suggestion.adjustedForeground,
                violation.suggestion.adjustedBackground,
              )}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              <Palette className="size-3.5" />
              Apply fix
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface ContrastWarningProps {
  result: ContrastResult
  onDismiss?: () => void
  onApplyFix?: (fg: string, bg: string) => void
}

/**
 * Inline contrast warning shown in the Playground editor after save.
 * Non-blocking — save proceeds, but the warning persists until issues are fixed.
 */
export default function ContrastWarning({ result, onDismiss, onApplyFix }: ContrastWarningProps) {
  const [expanded, setExpanded] = useState(false)

  if (result.passes) return null

  const count = result.violations.length

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <Eye className="size-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            {count} contrast violation{count !== 1 ? 's' : ''} detected
          </span>
          <span className="text-xs text-amber-600">
            (WCAG AA)
          </span>
          {expanded ? <ChevronDown className="size-4 text-amber-400" /> : <ChevronRight className="size-4 text-amber-400" />}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-600">
            {result.checkedPairs} pairs checked
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg p-1 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Violations list */}
      {expanded && (
        <div className="border-t border-amber-200 px-4 py-3 space-y-2">
          {result.violations.map((v, i) => (
            <ViolationRow
              key={`${v.foreground}-${v.background}-${i}`}
              violation={v}
              onApplyFix={onApplyFix}
            />
          ))}
          <p className="pt-1 text-xs text-amber-600">
            Save is not blocked — fix these at any time for better accessibility.
          </p>
        </div>
      )}
    </div>
  )
}
