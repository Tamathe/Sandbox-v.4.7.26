'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  Loader2,
  MessageSquare,
  RotateCcw,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeEntry {
  id: string
  status: string
  aiScore: number | null
  facultyScore: number | null
  facultyFeedback: string | null
  aiRawFeedback: string | null
  canvasPushedAt: string | null
  canvasPushStatus: string | null
  submission: {
    id: string
    type: string
    submittedAt: string
    assignment: {
      id: string
      title: string
      description: string | null
      pointsPossible: number
      dueAt: string | null
    }
  }
}

interface StudentGradesTabProps {
  courseId: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  AI_DRAFT: { label: 'Scoring…', color: 'text-yellow-600 bg-yellow-50', icon: <Bot className="size-3" /> },
  PENDING_REVIEW: { label: 'Under review', color: 'text-orange-600 bg-orange-50', icon: <Clock className="size-3" /> },
  FACULTY_REVIEWING: { label: 'Being reviewed', color: 'text-blue-600 bg-blue-50', icon: <Clock className="size-3" /> },
  APPROVED: { label: 'Approved', color: 'text-green-600 bg-green-50', icon: <CheckCircle2 className="size-3" /> },
  RELEASED: { label: 'Graded', color: 'text-green-700 bg-green-100', icon: <CheckCircle2 className="size-3" /> },
  NEEDS_REVISION: { label: 'Needs revision', color: 'text-red-600 bg-red-50', icon: <RotateCcw className="size-3" /> },
}

// ─── Grade card ───────────────────────────────────────────────────────────────

function GradeCard({ entry }: { entry: GradeEntry }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[entry.status] ?? { label: entry.status, color: 'text-gray-600 bg-gray-50', icon: null }
  const isReleased = entry.status === 'RELEASED'
  const score = entry.facultyScore ?? entry.aiScore
  const pct = score != null ? Math.round((score / entry.submission.assignment.pointsPossible) * 100) : null

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4">
        {/* Score circle */}
        <div className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-xl ${
          isReleased && pct != null
            ? pct >= 90 ? 'bg-green-100' : pct >= 70 ? 'bg-blue-100' : pct >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            : 'bg-gray-100'
        }`}>
          {isReleased && score != null ? (
            <>
              <span className={`text-lg font-bold leading-none ${
                pct! >= 90 ? 'text-green-700' : pct! >= 70 ? 'text-blue-700' : pct! >= 60 ? 'text-yellow-700' : 'text-red-700'
              }`}>{score}</span>
              <span className="text-[10px] text-gray-500">/ {entry.submission.assignment.pointsPossible}</span>
            </>
          ) : (
            <GraduationCap className="size-6 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {entry.submission.assignment.title}
            </h3>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
              {cfg.icon}
              {cfg.label}
            </span>
            {entry.submission.type === 'AI_EXPERIENCE' && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                <MessageSquare className="size-3" />
                Practice Session
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
            <span>Submitted {format(new Date(entry.submission.submittedAt), 'MMM d, yyyy')}</span>
            {entry.submission.assignment.dueAt && (
              <span>Due {format(new Date(entry.submission.assignment.dueAt), 'MMM d, yyyy')}</span>
            )}
            {isReleased && pct != null && (
              <span className={`font-medium ${
                pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-blue-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>{pct}%</span>
            )}
          </div>
        </div>

        {isReleased && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {expanded ? 'Hide' : 'View feedback'}
          </button>
        )}
      </div>

      {/* Released feedback panel */}
      {isReleased && expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-3">
          {/* Score summary */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">Final Score</span>
            <div className="text-right">
              <span className="text-xl font-bold text-[#0033A0]">{entry.facultyScore ?? entry.aiScore}</span>
              <span className="text-sm text-gray-400"> / {entry.submission.assignment.pointsPossible}</span>
              {pct != null && (
                <p className="text-xs text-gray-500">{pct}%</p>
              )}
            </div>
          </div>

          {/* Instructor feedback */}
          {(entry.facultyFeedback || entry.aiRawFeedback) && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="mb-2 text-xs font-semibold text-[#0033A0]">Instructor Feedback</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {entry.facultyFeedback ?? entry.aiRawFeedback}
              </p>
            </div>
          )}

          {/* Canvas push status */}
          {entry.canvasPushedAt && (
            <p className="text-xs text-gray-400">
              {entry.canvasPushStatus === 'success'
                ? `✓ Grade synced to Canvas on ${format(new Date(entry.canvasPushedAt), 'MMM d, h:mm a')}`
                : `Canvas sync: ${entry.canvasPushStatus}`}
            </p>
          )}
        </div>
      )}

      {/* Pending state messaging */}
      {!isReleased && entry.status !== 'NEEDS_REVISION' && (
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-400">
            {entry.status === 'AI_DRAFT'
              ? 'AI is scoring your submission. Your instructor will review before releasing the grade.'
              : 'Your instructor is reviewing your submission. You\'ll see your grade and feedback once it\'s released.'}
          </p>
        </div>
      )}

      {entry.status === 'NEEDS_REVISION' && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-3">
          <p className="text-xs font-medium text-red-700">
            Your instructor has requested revisions. Check the assignment for details or contact your instructor.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudentGradesTab({ courseId }: StudentGradesTabProps) {
  const { currentUser } = useAuth()
  const [entries, setEntries] = useState<GradeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllPending, setShowAllPending] = useState(false)
  const [showAllReleased, setShowAllReleased] = useState(false)

  const headers: Record<string, string> = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/my-grades`, { headers })
      if (res.ok) setEntries(await res.json())
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser?.email])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  const released = entries.filter((e) => e.status === 'RELEASED')
  const pending = entries.filter((e) => e.status !== 'RELEASED')

  if (entries.length === 0) {
    return (
      <div className="py-14 text-center">
        <ClipboardList className="mx-auto mb-3 size-10 text-gray-200" />
        <h3 className="text-sm font-semibold text-gray-600">No submissions yet</h3>
        <p className="mt-1 text-xs text-gray-400">Submit assignments from the Assignments tab to see your grades here.</p>
      </div>
    )
  }

  // Summary bar for released grades
  const totalEarned = released.reduce((sum, e) => sum + (e.facultyScore ?? e.aiScore ?? 0), 0)
  const totalPossible = released.reduce((sum, e) => sum + e.submission.assignment.pointsPossible, 0)
  const overallPct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null

  return (
    <div className="space-y-5">
      {/* Header + summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">My Grades</h2>
          <p className="text-xs text-gray-500 mt-0.5">{entries.length} submission{entries.length !== 1 ? 's' : ''}</p>
        </div>
        {overallPct != null && (
          <div className={`rounded-xl px-4 py-2 text-center ${
            overallPct >= 90 ? 'bg-green-100' : overallPct >= 70 ? 'bg-blue-100' : 'bg-yellow-100'
          }`}>
            <p className={`text-2xl font-bold ${
              overallPct >= 90 ? 'text-green-700' : overallPct >= 70 ? 'text-blue-700' : 'text-yellow-700'
            }`}>{overallPct}%</p>
            <p className="text-[11px] text-gray-500">
              {totalEarned} / {totalPossible} pts
            </p>
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Awaiting Grades</p>
          <div className="space-y-3">
            {(showAllPending ? pending : pending.slice(0, 4)).map((e) => <GradeCard key={e.id} entry={e} />)}
            {pending.length > 4 && (
              <button
                onClick={() => setShowAllPending(v => !v)}
                className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showAllPending ? 'Show less' : `Show all ${pending.length} pending grades`}
              </button>
            )}
          </div>
        </div>
      )}

      {released.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Graded</p>
          <div className="space-y-3">
            {(showAllReleased ? released : released.slice(0, 4)).map((e) => <GradeCard key={e.id} entry={e} />)}
            {released.length > 4 && (
              <button
                onClick={() => setShowAllReleased(v => !v)}
                className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showAllReleased ? 'Show less' : `Show all ${released.length} graded submissions`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
