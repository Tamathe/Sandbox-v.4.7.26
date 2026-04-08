'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bot, CheckCircle2, ClipboardList, Download, Info, Loader2, Eye, X, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../../lib/auth-context'
import GradingPanel from './GradingPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueEntry {
  id: string
  status: string
  aiScore: number | null
  facultyScore: number | null
  createdAt: string
  submission: {
    id: string
    type: string
    submittedAt: string
    student: { id: string; name: string; email: string }
    assignment: {
      id: string
      title: string
      pointsPossible: number
    }
  }
}

interface GradebookTabProps {
  courseId: string
}

const STATUS_STYLES: Record<string, string> = {
  AI_DRAFT: 'bg-yellow-100 text-yellow-800',
  PENDING_REVIEW: 'bg-orange-100 text-orange-800',
  FACULTY_REVIEWING: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  RELEASED: 'bg-gray-100 text-gray-600',
  NEEDS_REVISION: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  AI_DRAFT: 'AI Scoring…',
  PENDING_REVIEW: 'Needs Review',
  FACULTY_REVIEWING: 'In Review',
  APPROVED: 'Approved',
  RELEASED: 'Released',
  NEEDS_REVISION: 'Needs Revision',
}

// ─── Component ────────────────────────────────────────────────────────────────

const AI_BANNER_KEY = 'uky-gradebook-ai-banner-dismissed'

export default function GradebookTab({ courseId }: GradebookTabProps) {
  const { currentUser } = useAuth()
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('pending')
  const [showAiBanner, setShowAiBanner] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkReleasing, setBulkReleasing] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  // Show AI banner once per user until dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(`${AI_BANNER_KEY}-${currentUser?.email}`)
    if (!dismissed) setShowAiBanner(true)
  }, [currentUser?.email])

  function dismissAiBanner() {
    localStorage.setItem(`${AI_BANNER_KEY}-${currentUser?.email}`, '1')
    setShowAiBanner(false)
  }

  const headers: Record<string, string> = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}

  async function handleExportCsv() {
    setExportingCsv(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/export`, { headers })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gradebook-${courseId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingCsv(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook`, { headers })
      if (res.ok) setEntries(await res.json())
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser?.email])

  useEffect(() => { load() }, [load])

  async function handleBulkRelease() {
    setBulkReleasing(true)
    try {
      await fetch(`/api/courses/${courseId}/gradebook/bulk-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({}),
      })
      setShowBulkConfirm(false)
      await load()
    } finally {
      setBulkReleasing(false)
    }
  }

  const filtered = entries.filter((e) => {
    if (filter === 'pending') return ['PENDING_REVIEW', 'FACULTY_REVIEWING', 'AI_DRAFT'].includes(e.status)
    if (filter === 'released') return e.status === 'RELEASED'
    return true
  })

  // Ordered list of pending IDs for queue navigation inside GradingPanel
  const pendingQueueIds = entries
    .filter((e) => ['PENDING_REVIEW', 'FACULTY_REVIEWING', 'AI_DRAFT'].includes(e.status))
    .map((e) => e.id)

  const pendingCount = entries.filter((e) =>
    ['PENDING_REVIEW', 'FACULTY_REVIEWING'].includes(e.status)
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (selectedEntryId) {
    return (
      <GradingPanel
        entryId={selectedEntryId}
        courseHeaders={headers}
        queueIds={pendingQueueIds}
        onNavigate={(id) => setSelectedEntryId(id)}
        onClose={() => { setSelectedEntryId(null); load() }}
        onReleased={() => { setSelectedEntryId(null); load() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Gradebook</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} submission${pendingCount !== 1 ? 's' : ''} need review` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv || entries.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {exportingCsv ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export CSV
          </button>

          {/* Bulk release — only shown on "To Grade" tab when there are pending entries */}
          {filter === 'pending' && pendingCount > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#0033A0]/30 bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#0033A0] hover:bg-blue-100 transition-colors"
            >
              <Zap className="size-3.5" />
              Release All AI Scores
            </button>
          )}
          {/* Filter tabs */}
          <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
          {[['pending', 'To Grade'], ['all', 'All Submissions'], ['released', 'Returned to Students']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                filter === val ? 'bg-[#0033A0] text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
              {val === 'pending' && pendingCount > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${filter === 'pending' ? 'bg-white/30' : 'bg-orange-100 text-orange-700'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Bulk release confirmation modal */}
      {showBulkConfirm && (
        <div className="rounded-xl border border-[#0033A0]/20 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#0033A0] flex items-center gap-2">
            <Zap className="size-4" />
            Release AI scores for all {pendingCount} pending submission{pendingCount !== 1 ? 's' : ''}?
          </p>
          <p className="text-xs text-blue-700">
            Sandy&apos;s AI scores will be copied directly to each student&apos;s grade. You can undo individual grades afterward using the &ldquo;Undo Release&rdquo; button in each entry.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowBulkConfirm(false)}
              disabled={bulkReleasing}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-blue-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkRelease}
              disabled={bulkReleasing}
              className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#002680] disabled:opacity-50"
            >
              {bulkReleasing ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
              Release All Grades
            </button>
          </div>
        </div>
      )}

      {/* AI scoring onboarding banner — shown once until dismissed */}
      {showAiBanner && (
        <div className="flex items-center gap-2.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2">
          <Bot className="size-4 shrink-0 text-purple-500" />
          <p className="flex-1 text-xs text-purple-700">
            <strong className="text-purple-800">Sandy drafted scores</strong> — review and adjust before releasing. You are the final authority.
          </p>
          <button
            onClick={dismissAiBanner}
            className="shrink-0 rounded p-0.5 text-purple-400 hover:bg-purple-100 hover:text-purple-600 transition-colors"
            title="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-14 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-gray-200" />
          <h3 className="text-sm font-semibold text-gray-600">
            {filter === 'pending' ? "You're all caught up" : filter === 'released' ? 'No grades returned yet' : 'No submissions yet'}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {filter === 'pending'
              ? 'All submissions have been graded and returned to students.'
              : filter === 'released'
              ? 'Grades you return will appear here.'
              : 'Submissions will appear here once students submit their work.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border-2 border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-left">Student</th>
                <th className="px-3 py-2.5 text-left">Assignment</th>
                <th className="px-3 py-2.5 text-left">AI Score</th>
                <th className="px-3 py-2.5 text-left">Final Score</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-left">Submitted</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-900">{entry.submission.student.name}</p>
                    <p className="text-xs text-gray-400">{entry.submission.student.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{entry.submission.assignment.title}</td>
                  <td className="px-3 py-2.5">
                    {entry.aiScore != null ? (
                      <span className="font-medium text-gray-900">
                        {entry.aiScore} <span className="text-gray-400">/ {entry.submission.assignment.pointsPossible}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {entry.facultyScore != null ? (
                      <span className="font-semibold text-[#0033A0]">
                        {entry.facultyScore} <span className="font-normal text-gray-400">/ {entry.submission.assignment.pointsPossible}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(entry.submission.submittedAt), { addSuffix: true })}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => setSelectedEntryId(entry.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors"
                    >
                      <Eye className="size-3" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
