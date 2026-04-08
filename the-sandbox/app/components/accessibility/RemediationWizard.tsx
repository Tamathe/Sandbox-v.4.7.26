'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import type { RemediationResult, RemediationChange } from '../../lib/accessibility/remediation-service'

// ── Change row ───────────────────────────────────────────────────────────────

const FIX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  headings: { label: 'Headings', color: 'bg-blue-100 text-blue-700' },
  readability: { label: 'Readability', color: 'bg-amber-100 text-amber-700' },
  structure: { label: 'Structure', color: 'bg-purple-100 text-purple-700' },
  'alt-text': { label: 'Alt Text', color: 'bg-green-100 text-green-700' },
}

function ChangeRow({
  change,
  onToggle,
}: {
  change: RemediationChange & { approved: boolean }
  onToggle: () => void
}) {
  const style = FIX_TYPE_LABELS[change.fixType] ?? { label: change.fixType, color: 'bg-gray-100 text-gray-700' }

  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${change.approved ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
      <input
        type="checkbox"
        checked={change.approved}
        onChange={onToggle}
        className="mt-1 size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.color}`}>
            {style.label}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(change.confidence * 100)}% confidence
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-700">{change.description}</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="rounded bg-red-50 px-2 py-1 font-mono text-red-600 line-through">
            {change.before.slice(0, 80)}
          </span>
          <ArrowRight className="size-3 flex-shrink-0 text-gray-400" />
          <span className="rounded bg-green-50 px-2 py-1 font-mono text-green-700">
            {change.after.slice(0, 80)}
          </span>
        </div>
      </div>
    </label>
  )
}

// ── Main wizard ──────────────────────────────────────────────────────────────

interface RemediationWizardProps {
  result: RemediationResult
  onApply: (approvedIds: string[], remediatedContent: string) => Promise<void>
  onCancel: () => void
  applying?: boolean
}

/**
 * Before/after review wizard for accessibility remediation.
 * Educator selects which changes to approve, then applies them.
 */
export default function RemediationWizard({
  result,
  onApply,
  onCancel,
  applying,
}: RemediationWizardProps) {
  const [changes, setChanges] = useState<Array<RemediationChange & { approved: boolean }>>(
    result.changes.map((c) => ({ ...c, approved: c.confidence >= 0.7 })),
  )
  const [applied, setApplied] = useState(false)

  const approvedCount = changes.filter((c) => c.approved).length
  const totalCount = changes.length

  function toggleChange(id: string) {
    setChanges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, approved: !c.approved } : c)),
    )
  }

  function selectAll() {
    setChanges((prev) => prev.map((c) => ({ ...c, approved: true })))
  }

  function deselectAll() {
    setChanges((prev) => prev.map((c) => ({ ...c, approved: false })))
  }

  async function handleApply() {
    const approvedIds = changes.filter((c) => c.approved).map((c) => c.id)
    await onApply(approvedIds, result.remediatedContent)
    setApplied(true)
  }

  if (applied) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-12 text-green-500" />
        <h3 className="text-lg font-extrabold text-green-800">Changes Applied</h3>
        <p className="mt-1 text-sm text-green-600">
          {approvedCount} fix{approvedCount !== 1 ? 'es' : ''} applied to &ldquo;{result.title}&rdquo;.
          New grade: {result.afterGrade}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with grade comparison */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <Sparkles className="size-5 text-[#0033A0]" />
            Remediation Preview
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">{result.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-red-600">{result.beforeGrade}</div>
            <div className="text-[10px] text-gray-500">Current</div>
          </div>
          <ArrowRight className="size-5 text-gray-300" />
          <div className="text-center">
            <div className="text-2xl font-extrabold text-green-600">{result.afterGrade}</div>
            <div className="text-[10px] text-gray-500">Projected</div>
          </div>
          <div className="ml-3 text-center">
            <div className="text-sm font-bold text-gray-700">
              {Math.round(result.beforeScore * 100)}% → {Math.round(result.afterScore * 100)}%
            </div>
            <div className="text-[10px] text-gray-500">Score change</div>
          </div>
        </div>
      </div>

      {/* Selection controls */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {approvedCount} of {totalCount} changes selected
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-semibold text-[#0033A0] hover:underline"
          >
            Select all
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={deselectAll}
            className="text-xs font-semibold text-gray-500 hover:underline"
          >
            Deselect all
          </button>
        </div>
      </div>

      {/* Changes list */}
      <div className="space-y-2">
        {changes.map((change) => (
          <ChangeRow
            key={change.id}
            change={change}
            onToggle={() => toggleChange(change.id)}
          />
        ))}
      </div>

      {/* Low confidence warning */}
      {changes.some((c) => c.approved && c.confidence < 0.7) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0" />
          Some selected changes have low confidence. Review them carefully before applying.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <X className="mr-1.5 inline size-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={approvedCount === 0 || applying}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
        >
          {applying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Apply {approvedCount} change{approvedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}
