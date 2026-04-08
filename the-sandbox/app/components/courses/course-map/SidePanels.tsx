'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { addDays } from 'date-fns'
import dynamic from 'next/dynamic'

const ShareAnalyticsChart = dynamic(
  () => import('./SidePanelChart').then(m => m.ShareAnalyticsChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded-xl bg-gray-100" /> }
)
import {
  Activity, Calendar, Check, Clock, Columns2, Copy, Eye, GitBranch, GitCompare,
  Link, Loader2, RotateCcw, Search, Sparkles, Target, Users, X,
} from 'lucide-react'
import type {
  CourseMapWeek, SnapshotSummary, RebalanceSuggestion, ShareAnalytics,
  CourseMapEditEntry, CourseMapComparison, PrerequisiteGraph,
  GapAnalysisResult, AlignmentIssue, WorkloadMetrics,
} from './types'

// ── Gap Analysis Panel ──────────────────────────────────────────────────────

export function GapAnalysisPanel({
  showGapAnalysis, loadingGapAnalysis, gapAnalysis, onClose,
}: {
  showGapAnalysis: boolean
  loadingGapAnalysis: boolean
  gapAnalysis: GapAnalysisResult | null
  onClose: () => void
}) {
  if (!showGapAnalysis) return null
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">Gap Analysis</span>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
          <X className="size-4 text-gray-400" />
        </button>
      </div>
      {loadingGapAnalysis ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Analyzing course map alignment...</span>
        </div>
      ) : gapAnalysis ? (
        <div className="space-y-4">
          {gapAnalysis.gaps.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Program Outcomes</h4>
              <div className="space-y-2">
                {gapAnalysis.gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      gap.status === 'covered' ? 'bg-emerald-100 text-emerald-700'
                        : gap.status === 'partial' ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {gap.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{gap.outcome}</p>
                      {gap.coveringWeeks.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Covered in: {gap.coveringWeeks.map((w) => `Week ${w}`).join(', ')}
                        </p>
                      )}
                      {gap.notes && <p className="mt-0.5 text-xs text-gray-500">{gap.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {gapAnalysis.redundancies.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Redundancies</h4>
              <div className="space-y-2">
                {gapAnalysis.redundancies.map((r, i) => (
                  <div key={i} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">{r.objectiveTitle}</p>
                    <p className="text-xs text-gray-500">
                      Appears in: {r.weekNumbers.map((w) => `Week ${w}`).join(', ')}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700">{r.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {gapAnalysis.gaps.length === 0 && gapAnalysis.redundancies.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">No gaps or redundancies found.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ── History Panel ────────────────────────────────────────────────────────────

export function HistoryPanel({
  showHistory, loadingSnapshots, snapshots, restoringSnapshotId,
  onClose, onRestore,
}: {
  showHistory: boolean
  loadingSnapshots: boolean
  snapshots: SnapshotSummary[]
  restoringSnapshotId: string | null
  onClose: () => void
  onRestore: (id: string) => void
}) {
  if (!showHistory) return null
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">Version History</span>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
          <X className="size-4 text-gray-400" />
        </button>
      </div>
      {loadingSnapshots && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      )}
      {!loadingSnapshots && snapshots.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">No previous versions yet</p>
      )}
      {!loadingSnapshots && snapshots.length > 0 && (
        <ul className="space-y-2">
          {snapshots.map((snap) => (
            <li key={snap.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <Clock className="size-4 shrink-0 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {snap.label ?? new Date(snap.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-gray-400">{snap.weekCount} weeks</p>
              </div>
              <button
                type="button"
                onClick={() => onRestore(snap.id)}
                disabled={restoringSnapshotId !== null}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                {restoringSnapshotId === snap.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RotateCcw className="size-3" />
                )}
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Alignment Check Panel ───────────────────────────────────────────────────

export function AlignmentPanel({
  showAlignmentPanel, loadingAlignment, alignmentIssues,
  onClose, onScrollToWeek,
}: {
  showAlignmentPanel: boolean
  loadingAlignment: boolean
  alignmentIssues: AlignmentIssue[] | null
  onClose: () => void
  onScrollToWeek: (weekNumber: number) => void
}) {
  if (!showAlignmentPanel) return null
  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-[#0033A0]" />
          <span className="text-sm font-bold text-blue-900">Alignment Check</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-blue-100">
          <X className="size-4 text-blue-400" />
        </button>
      </div>
      {loadingAlignment && (
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Loader2 className="size-4 animate-spin" />
          Analyzing objective-assignment alignment…
        </div>
      )}
      {!loadingAlignment && alignmentIssues !== null && alignmentIssues.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Check className="size-4" />
          All objectives and assignments are well-aligned
        </div>
      )}
      {!loadingAlignment && alignmentIssues !== null && alignmentIssues.length > 0 && (
        <ul className="space-y-2">
          {alignmentIssues.map((issue, idx) => {
            const dotColor = issue.issueType === 'overloaded'
              ? 'bg-red-500'
              : issue.issueType === 'underloaded'
                ? 'bg-blue-500'
                : 'bg-amber-500'
            return (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dotColor}`} />
                <div>
                  <button
                    type="button"
                    onClick={() => onScrollToWeek(issue.weekNumber)}
                    className="font-semibold text-[#0033A0] hover:underline"
                  >
                    Week {issue.weekNumber}
                  </button>
                  {' — '}
                  <span className="font-medium text-gray-800">{issue.title}</span>
                  <p className="text-gray-600">{issue.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Date Auto-fill Panel ────────────────────────────────────────────────────

export function DateFillPanel({
  showDateFill, editing, viewState, weeks,
  onClose, onApply,
}: {
  showDateFill: boolean
  editing: boolean
  viewState: string
  weeks: CourseMapWeek[]
  onClose: () => void
  onApply: (updatedWeeks: CourseMapWeek[]) => void
}) {
  const [dateFillStart, setDateFillStart] = useState('')
  const [dateFillCadence, setDateFillCadence] = useState<'weekly-full' | 'weekly-weekday' | 'biweekly'>('weekly-full')
  const [dateFillSkipWeeks, setDateFillSkipWeeks] = useState<Set<number>>(new Set())

  if (!showDateFill || !(editing || viewState === 'preview')) return null

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-gray-700" />
          <span className="text-sm font-bold text-gray-900">Auto-fill Dates</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
          <X className="size-4 text-gray-400" />
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Semester start date</span>
          <input
            type="date"
            value={dateFillStart}
            onChange={(e) => setDateFillStart(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Cadence</span>
          <select
            value={dateFillCadence}
            onChange={(e) => setDateFillCadence(e.target.value as 'weekly-full' | 'weekly-weekday' | 'biweekly')}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="weekly-full">Weekly (Mon–Sun)</option>
            <option value="weekly-weekday">Weekly (Mon–Fri)</option>
            <option value="biweekly">Bi-weekly</option>
          </select>
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Skip weeks</span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Spring Break (wk 9)', week: 9 },
              { label: 'Thanksgiving (wk 12)', week: 12 },
            ].map((b) => (
              <label key={b.week} className="inline-flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={dateFillSkipWeeks.has(b.week)}
                  onChange={(e) => {
                    setDateFillSkipWeeks((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(b.week)
                      else next.delete(b.week)
                      return next
                    })
                  }}
                />
                {b.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={!dateFillStart}
          onClick={() => {
            const start = new Date(dateFillStart + 'T00:00:00')
            if (isNaN(start.getTime())) return
            const dayOfWeek = start.getDay()
            const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
            const firstMonday = addDays(start, daysToMonday)

            const cadenceDays = dateFillCadence === 'biweekly' ? 14 : 7
            const endOffset = dateFillCadence === 'weekly-weekday' ? 4 : cadenceDays - 1

            let pointer = firstMonday
            const updated = weeks.map((w) => {
              if (dateFillSkipWeeks.has(w.weekNumber)) {
                pointer = addDays(pointer, cadenceDays)
                return { ...w, startDate: null, endDate: null }
              }
              const weekStart = pointer
              const weekEnd = addDays(pointer, endOffset)
              pointer = addDays(pointer, cadenceDays)
              const fmt = (d: Date) => d.toISOString().slice(0, 10)
              return { ...w, startDate: fmt(weekStart), endDate: fmt(weekEnd) }
            })
            onApply(updated)
            onClose()
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(weeks.map((w) => ({ ...w, startDate: null, endDate: null })))
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
        >
          Clear All Dates
        </button>
      </div>
    </div>
  )
}

// ── AI Suggestions Panel ────────────────────────────────────────────────────

export function SuggestionsPanel({
  showSuggestions, suggestions, onClose,
}: {
  showSuggestions: boolean
  suggestions: RebalanceSuggestion[]
  onClose: () => void
}) {
  if (!showSuggestions || suggestions.length === 0) return null
  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-purple-600" />
          <span className="text-sm font-bold text-purple-900">AI Suggestions</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-purple-100">
          <X className="size-4 text-purple-400" />
        </button>
      </div>
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i} className="rounded-xl border border-purple-100 bg-white px-3 py-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-[#0033A0] px-2 py-0.5 text-xs font-bold text-white shrink-0">
                Week {s.weekNumber}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{s.issue}</p>
                <p className="mt-1 text-sm text-gray-600">{s.recommendation}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Share Panel ─────────────────────────────────────────────────────────────

export function SharePanel({
  showSharePanel, generatingShare, shareUrl, copiedShare,
  loadingShareAnalytics, shareAnalytics,
  onClose, onCopyUrl, onRevokeShare,
}: {
  showSharePanel: boolean
  generatingShare: boolean
  shareUrl: string | null
  copiedShare: boolean
  loadingShareAnalytics: boolean
  shareAnalytics: ShareAnalytics | null
  onClose: () => void
  onCopyUrl: () => void
  onRevokeShare: () => void
}) {
  if (!showSharePanel) return null
  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link className="size-4 text-[#0033A0]" />
          <span className="text-sm font-bold text-[#0033A0]">Shareable Link</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-blue-100">
          <X className="size-4 text-blue-400" />
        </button>
      </div>
      {generatingShare ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      ) : shareUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-700"
            />
            <button
              type="button"
              onClick={onCopyUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white hover:bg-[#002580]"
            >
              {copiedShare ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedShare ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Anyone with this link can view the course map. No login required.
          </p>
          <button
            type="button"
            onClick={onRevokeShare}
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Revoke link
          </button>
          {/* Share analytics */}
          {loadingShareAnalytics && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-gray-400" />
            </div>
          )}
          {!loadingShareAnalytics && shareAnalytics && (
            <div className="mt-3 space-y-2 border-t border-blue-100 pt-3">
              {shareAnalytics.totalViews === 0 ? (
                <p className="text-xs text-gray-400">No views yet</p>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" />
                      <span className="font-semibold">{shareAnalytics.totalViews}</span> total views
                    </span>
                    {shareAnalytics.lastViewedAt && (
                      <span>
                        Last viewed: {formatDistanceToNow(new Date(shareAnalytics.lastViewedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="h-[200px]">
                    <ShareAnalyticsChart data={shareAnalytics.viewsByDay} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="py-2 text-sm text-gray-500">Failed to generate link. Try again.</p>
      )}
    </div>
  )
}

// ── Recent Changes Panel ────────────────────────────────────────────────────

export function RecentChangesPanel({
  showRecentChanges, loadingEdits, recentEdits, courseMapVersion, onClose,
}: {
  showRecentChanges: boolean
  loadingEdits: boolean
  recentEdits: CourseMapEditEntry[]
  courseMapVersion: number
  onClose: () => void
}) {
  if (!showRecentChanges) return null
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-gray-600" />
          <span className="text-sm font-bold text-gray-900">Recent Changes</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">v{courseMapVersion}</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
          <X className="size-4 text-gray-400" />
        </button>
      </div>
      {loadingEdits && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      )}
      {!loadingEdits && recentEdits.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">No edit history yet</p>
      )}
      {!loadingEdits && recentEdits.length > 0 && (
        <ul className="space-y-2">
          {recentEdits.map((edit) => (
            <li key={edit.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {edit.userName}
                  <span className="ml-1 text-xs text-gray-400">({edit.editType.replace(/_/g, ' ').toLowerCase()})</span>
                </p>
                <p className="text-xs text-gray-400">
                  {edit.weekNumber > 0 && `Week ${edit.weekNumber} · `}
                  {new Date(edit.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Compare Picker Panel ────────────────────────────────────────────────────

export function ComparePickerPanel({
  showComparePicker, loadingCompare, loadingCloneable, loadingSnapshots,
  cloneableCourses, snapshots,
  onClose, onCompareWithCourse, onCompareWithSnapshot,
}: {
  showComparePicker: boolean
  loadingCompare: boolean
  loadingCloneable: boolean
  loadingSnapshots: boolean
  cloneableCourses: { id: string; courseCode: string; title: string }[]
  snapshots: SnapshotSummary[]
  onClose: () => void
  onCompareWithCourse: (courseId: string) => void
  onCompareWithSnapshot: (snapshotId: string) => void
}) {
  const [compareType, setCompareType] = useState<'course' | 'snapshot'>('course')

  if (!showComparePicker) return null
  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="size-4 text-indigo-600" />
          <span className="text-sm font-bold text-indigo-900">Compare Course Map</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-indigo-100">
          <X className="size-4 text-indigo-400" />
        </button>
      </div>

      {/* Tab strip */}
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setCompareType('course')}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
            compareType === 'course' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          Another Course
        </button>
        <button
          type="button"
          onClick={() => setCompareType('snapshot')}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
            compareType === 'snapshot' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          Version History
        </button>
      </div>

      {loadingCompare && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      )}

      {!loadingCompare && compareType === 'course' && (
        <>
          {loadingCloneable && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </div>
          )}
          {!loadingCloneable && cloneableCourses.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">No other courses with course maps found</p>
          )}
          {!loadingCloneable && cloneableCourses.length > 0 && (
            <ul className="space-y-2">
              {cloneableCourses.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-white px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{c.courseCode}</p>
                    <p className="text-xs text-gray-400">{c.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCompareWithCourse(c.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                  >
                    <Columns2 className="size-3" />
                    Compare
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!loadingCompare && compareType === 'snapshot' && (
        <>
          {loadingSnapshots && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </div>
          )}
          {!loadingSnapshots && snapshots.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">No previous versions to compare against</p>
          )}
          {!loadingSnapshots && snapshots.length > 0 && (
            <ul className="space-y-2">
              {snapshots.map((snap) => (
                <li key={snap.id} className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-white px-3 py-2">
                  <Clock className="size-4 shrink-0 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {snap.label ?? new Date(snap.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400">{snap.weekCount} weeks</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCompareWithSnapshot(snap.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                  >
                    <Columns2 className="size-3" />
                    Compare
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// ── Prerequisites Panel ─────────────────────────────────────────────────────

export function PrerequisitesPanel({
  showPrerequisites, loadingPrereqs, prerequisiteGraph, weeks, onClose,
}: {
  showPrerequisites: boolean
  loadingPrereqs: boolean
  prerequisiteGraph: PrerequisiteGraph
  weeks: CourseMapWeek[]
  onClose: () => void
}) {
  if (!showPrerequisites) return null
  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-[#0033A0]" />
          <span className="text-sm font-bold text-gray-900">Week Dependencies</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-blue-100">
          <X className="size-4 text-gray-500" />
        </button>
      </div>

      {loadingPrereqs ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* SVG dependency graph */}
          {weeks.length > 0 && (() => {
            const nodeW = 48, nodeH = 32, gapX = 16, padY = 40, padX = 24
            const totalW = weeks.length * (nodeW + gapX) - gapX + padX * 2
            const svgH = padY * 2 + nodeH + 40

            const edges: { from: number; to: number }[] = []
            for (const entry of prerequisiteGraph) {
              for (const prereq of entry.prerequisites) {
                edges.push({ from: prereq, to: entry.weekNumber })
              }
            }

            return (
              <div className="mb-4 overflow-x-auto">
                <svg width={totalW} height={svgH} className="mx-auto">
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#0033A0" />
                    </marker>
                  </defs>
                  {edges.map((edge, ei) => {
                    const fromIdx = weeks.findIndex((w) => w.weekNumber === edge.from)
                    const toIdx = weeks.findIndex((w) => w.weekNumber === edge.to)
                    if (fromIdx === -1 || toIdx === -1) return null
                    const x1 = padX + fromIdx * (nodeW + gapX) + nodeW / 2
                    const x2 = padX + toIdx * (nodeW + gapX) + nodeW / 2
                    const y = padY + nodeH / 2
                    const midX = (x1 + x2) / 2
                    const arcH = Math.min(30, Math.abs(toIdx - fromIdx) * 8 + 10)
                    return (
                      <path
                        key={ei}
                        d={`M ${x1} ${y - nodeH / 2} Q ${midX} ${y - nodeH / 2 - arcH} ${x2} ${y - nodeH / 2}`}
                        fill="none"
                        stroke="#0033A0"
                        strokeWidth="1.5"
                        markerEnd="url(#arrowhead)"
                        opacity="0.6"
                      />
                    )
                  })}
                  {weeks.map((w, i) => {
                    const x = padX + i * (nodeW + gapX)
                    const y = padY
                    return (
                      <g key={w.weekNumber}>
                        <rect x={x} y={y} width={nodeW} height={nodeH} rx={8} fill="#0033A0" />
                        <text x={x + nodeW / 2} y={y + nodeH / 2 + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                          W{w.weekNumber}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )
          })()}

          {/* List view */}
          <div className="space-y-2">
            {weeks.map((w) => {
              const entry = prerequisiteGraph.find((e) => e.weekNumber === w.weekNumber)
              return (
                <div key={w.weekNumber} className="flex items-center gap-2 text-sm">
                  <span className="rounded-full bg-[#0033A0] px-2 py-0.5 text-xs font-bold text-white">W{w.weekNumber}</span>
                  <span className="font-medium text-gray-800">{w.title}</span>
                  {entry && entry.prerequisites.length > 0 && (
                    <span className="ml-1 flex items-center gap-1 text-xs text-gray-500">
                      Requires:
                      {entry.prerequisites.map((pn) => (
                        <span key={pn} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#0033A0] border border-blue-200">
                          W{pn}
                        </span>
                      ))}
                    </span>
                  )}
                  {(!entry || entry.prerequisites.length === 0) && (
                    <span className="text-xs text-gray-400 italic">No prerequisites</span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Pacing Heatmap Panel ────────────────────────────────────────────────────

export function PacingPanel({
  showPacing, workloadMetrics, onClose, onScrollToWeek,
}: {
  showPacing: boolean
  workloadMetrics: WorkloadMetrics | null
  onClose: () => void
  onScrollToWeek: (weekNumber: number) => void
}) {
  if (!showPacing || !workloadMetrics) return null
  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[#0033A0]" />
          <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Workload Heatmap</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-blue-100">
          <X className="size-4 text-gray-400" />
        </button>
      </div>
      <div className="flex items-end gap-1">
        {workloadMetrics.weeks.map((w) => {
          const pct = workloadMetrics.maxScore > 0 ? w.workloadScore / workloadMetrics.maxScore : 0
          const color = pct < 0.33 ? 'bg-emerald-400' : pct < 0.66 ? 'bg-amber-400' : 'bg-red-400'
          return (
            <button
              key={w.weekNumber}
              type="button"
              onClick={() => onScrollToWeek(w.weekNumber)}
              className="group relative flex-1 cursor-pointer"
              title={`Week ${w.weekNumber}: ${w.objectivesCount} objectives, ${w.materialsCount} materials, ${w.assignmentsCount} assignments`}
            >
              <div className={`h-8 rounded-sm ${color} transition-opacity hover:opacity-80`} />
              <p className="mt-1 text-center text-[10px] text-gray-400">W{w.weekNumber}</p>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg group-hover:block">
                <p className="font-semibold text-gray-800">Week {w.weekNumber}: {w.title}</p>
                <p className="text-gray-500">{w.objectivesCount} objectives, {w.materialsCount} materials, {w.assignmentsCount} assignments</p>
                <p className="font-medium text-gray-700">Score: {w.workloadScore}</p>
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-400" /> Light</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-400" /> Moderate</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-red-400" /> Heavy</span>
      </div>
    </div>
  )
}
