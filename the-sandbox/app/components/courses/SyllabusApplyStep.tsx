'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  Shield,
  GitMerge,
  Layers,
  ClipboardList,
  Target,
  Info,
} from 'lucide-react'
import type { ParseResult } from './SyllabusReviewStep'

// ── Types (mirror validator.ts) ──────────────────────────────────────────────

interface ValidationError {
  rule: string
  message: string
  severity: 'error' | 'warning'
  nodeLabel?: string
}

interface ValidationReport {
  status: 'PASS' | 'WARN' | 'BLOCK'
  errors: ValidationError[]
  warnings: ValidationError[]
  canAutoPublish: boolean
}

interface NodeDiff {
  status: 'MATCHED' | 'MODIFIED' | 'ADDED' | 'REMOVED'
  existingNodeId: string | null
  newLabel: string
  oldLabel: string | null
  fieldsChanged: string[]
}

interface SyncReport {
  matched: number
  modified: NodeDiff[]
  added: NodeDiff[]
  removed: NodeDiff[]
  preservedProgressCount: number
  diffs: NodeDiff[]
}

interface PolicyDiff {
  hasChanges: boolean
  extracted: { policies: { category: string; title: string; content: string }[]; gradingWeights: { category: string; weight: number; description: string | null }[] }
  existing: { count: number; categories: string[] }
}

interface ApplyResponse {
  courseMapId: string
  isNewMap: boolean
  validation: ValidationReport
  sync?: SyncReport
  created?: { units: number; edges: number; modules: number }
  assignmentsCreated?: number
  objectivesCreated?: number
  policyDiff?: PolicyDiff
}

interface Props {
  courseId: string
  userEmail: string
  jobId: string
  fileHash: string
  result: ParseResult
  hasExistingMap: boolean
  onBack: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SyllabusApplyStep({
  courseId,
  userEmail,
  jobId,
  fileHash,
  result,
  hasExistingMap,
  onBack,
}: Props) {
  const router = useRouter()
  const { evaluatorMode } = useAuth()
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<ApplyResponse | null>(null)

  // Evaluator mode: auto-navigate to Course Map after successful apply (skip extra click)
  useEffect(() => {
    if (evaluatorMode && response && response.validation.status !== 'BLOCK') {
      const timer = setTimeout(() => {
        router.push(`/courses/${courseId}/course-map`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [evaluatorMode, response, courseId, router])

  const totalModules = result.units.reduce((s, u) => s + u.modules.length, 0)

  const handleApply = async () => {
    setApplying(true)
    setError(null)

    try {
      const res = await fetch(`/api/courses/${courseId}/apply-syllabus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ jobId, fileHash, result }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Apply failed (${res.status})`)
      }

      setResponse(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply syllabus')
    } finally {
      setApplying(false)
    }
  }

  // ── Post-apply: show validation + sync results ─────────────────────────
  if (response) {
    const { validation, sync, isNewMap, created } = response
    const statusConfig = {
      PASS:  { icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'All checks passed' },
      WARN:  { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Warnings detected' },
      BLOCK: { icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-50 border-red-200',     label: 'Blocking issues found' },
    }
    const cfg = statusConfig[validation.status]
    const StatusIcon = cfg.icon

    return (
      <div className="space-y-6">
        {/* Re-import changelog summary banner */}
        {sync && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 px-5 py-4">
            <Info className="size-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Re-import complete: {sync.added.length} unit{sync.added.length !== 1 ? 's' : ''} added,{' '}
                {sync.modified.length} modified, {sync.removed.length} archived.
              </p>
              {sync.preservedProgressCount > 0 && (
                <p className="text-sm text-blue-700 mt-0.5">
                  {sync.preservedProgressCount} student progress record{sync.preservedProgressCount !== 1 ? 's' : ''} preserved.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Validation status */}
        <div className={`rounded-2xl border-2 p-5 ${cfg.bg}`}>
          <div className="flex items-center gap-3 mb-3">
            <StatusIcon className={`size-6 ${cfg.color}`} />
            <h3 className="text-base font-extrabold text-gray-900">{cfg.label}</h3>
            {validation.canAutoPublish && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                <Shield className="size-3" /> Auto-publish eligible
              </span>
            )}
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <ul className="space-y-1 mb-2">
              {validation.errors.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                  <XCircle className="size-3.5 mt-0.5 shrink-0" />
                  <span>{e.message}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <ul className="space-y-1">
              {validation.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Assignment & Objective counts */}
        {(response.assignmentsCreated != null || response.objectivesCreated != null) && (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="size-5 text-green-600" />
              <h3 className="text-base font-extrabold text-gray-900">Syllabus Applied Successfully</h3>
            </div>
            <div className="flex items-center gap-6">
              {response.assignmentsCreated != null && (
                <div className="flex items-center gap-2">
                  <ClipboardList className="size-4 text-green-600" />
                  <span className="text-sm text-gray-700">
                    <strong className="text-[#0033A0]">{response.assignmentsCreated}</strong>{' '}
                    assignment{response.assignmentsCreated !== 1 ? 's' : ''} created
                  </span>
                </div>
              )}
              {response.objectivesCreated != null && (
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-green-600" />
                  <span className="text-sm text-gray-700">
                    <strong className="text-[#0033A0]">{response.objectivesCreated}</strong>{' '}
                    objective{response.objectivesCreated !== 1 ? 's' : ''} detected
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Creation summary (first-time) */}
        {isNewMap && created && (
          <div className="rounded-2xl border-2 border-gray-200 p-5">
            <h3 className="text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              <Layers className="size-4" /> Course Map Created
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-extrabold text-[#0033A0]">{created.units}</p>
                <p className="text-xs text-gray-500">Units</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#0033A0]">{created.modules}</p>
                <p className="text-xs text-gray-500">Modules</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#0033A0]">{created.edges}</p>
                <p className="text-xs text-gray-500">Edges</p>
              </div>
            </div>
          </div>
        )}

        {/* Sync report (re-upload) */}
        {sync && (
          <div className="rounded-2xl border-2 border-gray-200 p-5">
            <h3 className="text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              <GitMerge className="size-4" /> Sync Report
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
              <div>
                <p className="text-lg font-extrabold text-green-600">{sync.matched}</p>
                <p className="text-xs text-gray-500">Matched</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-amber-600">{sync.modified.length}</p>
                <p className="text-xs text-gray-500">Modified</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-blue-600">{sync.added.length}</p>
                <p className="text-xs text-gray-500">Added</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-gray-500">{sync.removed.length}</p>
                <p className="text-xs text-gray-500">Archived</p>
              </div>
            </div>
            {sync.preservedProgressCount > 0 && (
              <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                {sync.preservedProgressCount} student progress record{sync.preservedProgressCount !== 1 ? 's' : ''} safely preserved.
              </p>
            )}

            {/* Diff details */}
            {(sync.modified.length > 0 || sync.added.length > 0 || sync.removed.length > 0) && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-semibold">
                  View diff details
                </summary>
                <ul className="mt-2 space-y-1">
                  {sync.diffs.filter(d => d.status !== 'MATCHED').map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        d.status === 'MODIFIED' ? 'bg-amber-100 text-amber-700' :
                        d.status === 'ADDED' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{d.status}</span>
                      <span className="text-gray-700">{d.newLabel}</span>
                      {d.fieldsChanged.length > 0 && (
                        <span className="text-gray-400">({d.fieldsChanged.join(', ')})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Policy diff banner (Task 29) */}
        {response.policyDiff?.hasChanges && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
            <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Updated syllabus contains policy changes
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                {response.policyDiff.extracted.policies.length} policies extracted from the new syllabus
                {response.policyDiff.existing.count > 0
                  ? ` (${response.policyDiff.existing.count} currently stored).`
                  : '.'}
                {' '}Review them in the Policies tab.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/courses?course=${courseId}&tab=policies`)}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] hover:text-[#0033A0]/80 transition-colors"
              >
                Review Policies <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/courses/${courseId}/course-map`)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
          >
            View Course Map <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/courses?course=${courseId}`)}
            className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Pre-apply: confirmation screen ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl border-2 border-gray-200 p-5">
        <h3 className="text-base font-extrabold text-gray-900 mb-3">Apply Syllabus to Course</h3>
        <p className="text-sm text-gray-600">
          This will create <strong>{result.units.length} units</strong>,{' '}
          <strong>{totalModules} modules</strong>, and{' '}
          <strong>{result.edges.length} prerequisite edge{result.edges.length !== 1 ? 's' : ''}</strong>{' '}
          for your course.
        </p>

        {hasExistingMap && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              This course already has a syllabus map. Uploading will merge changes:
              matching units are preserved, new units added, and removed units archived
              (student progress is never deleted).
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          disabled={applying}
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applying ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Applying...
            </>
          ) : (
            'Confirm & Apply'
          )}
        </button>
        <button
          type="button"
          disabled={applying}
          onClick={onBack}
          className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back
        </button>
      </div>
    </div>
  )
}
