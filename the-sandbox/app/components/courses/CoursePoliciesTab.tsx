'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  GraduationCap,
  History,
  LayoutTemplate,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Scale,
  Shield,
  Users,
  X,
  FileQuestion,
  BookOpen,
} from 'lucide-react'
import { formatDistanceToNow, differenceInMonths } from 'date-fns'
import { courseHeaders, readJson } from './course-utils'
import GradingCalculator from './GradingCalculator'
import { POLICY_TEMPLATES } from '../../lib/policy-templates'

// ── Types ────────────────────────────────────────────────────────────────────

interface StoredPolicy {
  id: string
  courseId: string
  policyType: string
  title: string
  content: string
  source: string
  createdAt: string
}

interface StoredGradingWeight {
  id: string
  courseId: string
  category: string
  weight: number
  description: string | null
  source: string
  createdAt: string
}

interface CoursePoliciesTabProps {
  courseId: string
  courseCode?: string
  userEmail: string
  canManage: boolean
}

interface PolicyAnalytics {
  totalEnrolled: number
  acknowledgedCount: number
  ackRate: number
  avgDaysToAck: number | null
  latestAck: { name: string; date: string } | null
}

interface PolicyChange {
  id: string
  summary: string
  createdAt: string
}

interface PolicySnapshotEntry {
  category: string
  title: string
  content: string
}

interface PolicyChangeDetail extends PolicyChange {
  beforeSnapshot: PolicySnapshotEntry[] | null
  afterSnapshot: PolicySnapshotEntry[] | null
}

// ── Category config ──────────────────────────────────────────────────────────

type PolicyCategory = 'late' | 'attendance' | 'grading' | 'academic_integrity' | 'communication' | 'other'

const CATEGORY_CONFIG: Record<PolicyCategory, { label: string; color: string; icon: typeof Clock }> = {
  late:               { label: 'Late Policy',       color: 'bg-amber-100 text-amber-700',   icon: Clock },
  attendance:         { label: 'Attendance',         color: 'bg-blue-100 text-blue-700',     icon: Users },
  grading:            { label: 'Grading',            color: 'bg-green-100 text-green-700',   icon: GraduationCap },
  academic_integrity: { label: 'Academic Integrity', color: 'bg-red-100 text-red-700',       icon: Shield },
  communication:      { label: 'Communication',      color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  other:              { label: 'Other',              color: 'bg-gray-100 text-gray-700',     icon: MoreHorizontal },
}

const CATEGORY_ORDER: PolicyCategory[] = ['late', 'attendance', 'grading', 'academic_integrity', 'communication', 'other']

const VALID_CATEGORIES = new Set<string>(CATEGORY_ORDER)

const RECOMMENDED_CATEGORIES: PolicyCategory[] = ['late', 'attendance', 'grading', 'academic_integrity']

// ── Circular Progress Ring ──────────────────────────────────────────────────

function CircularProgress({ value, size = 48 }: { value: number; size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#0033A0"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-500"
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="text-xs font-bold fill-gray-900">
        {Math.round(value)}%
      </text>
    </svg>
  )
}

// ── Snapshot Diff Viewer (Task 27) ───────────────────────────────────────────

function SnapshotDiff({ before, after }: { before: PolicySnapshotEntry[]; after: PolicySnapshotEntry[] }) {
  const beforeMap = new Map(before.map(p => [p.title, p]))
  const afterMap = new Map(after.map(p => [p.title, p]))

  const allTitles = new Set([...before.map(p => p.title), ...after.map(p => p.title)])

  const rows: { title: string; status: 'added' | 'removed' | 'modified' | 'unchanged'; beforeEntry?: PolicySnapshotEntry; afterEntry?: PolicySnapshotEntry }[] = []

  for (const title of allTitles) {
    const b = beforeMap.get(title)
    const a = afterMap.get(title)
    if (!b && a) rows.push({ title, status: 'added', afterEntry: a })
    else if (b && !a) rows.push({ title, status: 'removed', beforeEntry: b })
    else if (b && a && (b.content !== a.content || b.category !== a.category)) rows.push({ title, status: 'modified', beforeEntry: b, afterEntry: a })
    else if (b && a) rows.push({ title, status: 'unchanged', beforeEntry: b, afterEntry: a })
  }

  const statusColors = {
    added: 'bg-green-50 border-green-200',
    removed: 'bg-red-50 border-red-200',
    modified: 'bg-amber-50 border-amber-200',
    unchanged: 'bg-white border-gray-100',
  }

  const statusLabels = { added: 'Added', removed: 'Removed', modified: 'Modified', unchanged: '' }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="font-semibold text-gray-500 px-2 py-1">Before</div>
      <div className="font-semibold text-gray-500 px-2 py-1">After</div>
      {rows.map(row => (
        <div key={row.title} className="contents">
          <div className={`rounded-lg border p-2 ${row.status === 'removed' ? statusColors.removed : row.status === 'modified' ? 'bg-gray-50 border-gray-200' : row.status === 'added' ? 'bg-gray-50 border-dashed border-gray-200' : statusColors.unchanged}`}>
            {row.beforeEntry ? (
              <>
                <span className="font-medium text-gray-700">{row.beforeEntry.title}</span>
                <p className="text-gray-500 mt-0.5 line-clamp-3">{row.beforeEntry.content}</p>
              </>
            ) : (
              <span className="text-gray-300 italic">—</span>
            )}
          </div>
          <div className={`rounded-lg border p-2 ${row.status === 'added' ? statusColors.added : row.status === 'modified' ? statusColors.modified : row.status === 'removed' ? 'bg-gray-50 border-dashed border-gray-200' : statusColors.unchanged}`}>
            {row.afterEntry ? (
              <>
                <span className="font-medium text-gray-700">{row.afterEntry.title}</span>
                {statusLabels[row.status] && (
                  <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    row.status === 'added' ? 'bg-green-100 text-green-700' :
                    row.status === 'removed' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{statusLabels[row.status]}</span>
                )}
                <p className="text-gray-500 mt-0.5 line-clamp-3">{row.afterEntry.content}</p>
              </>
            ) : (
              <>
                <span className="text-gray-300 italic">—</span>
                {row.status === 'removed' && (
                  <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Removed</span>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CoursePoliciesTab({ courseId, courseCode, userEmail, canManage }: CoursePoliciesTabProps) {
  const [policies, setPolicies] = useState<StoredPolicy[]>([])
  const [weights, setWeights] = useState<StoredGradingWeight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inline edit state
  const [editing, setEditing] = useState(false)
  const [editPolicies, setEditPolicies] = useState<{ category: PolicyCategory; title: string; content: string }[]>([])
  const [editWeights, setEditWeights] = useState<{ category: string; weight: number; description: string | null }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Acknowledgment tracking (Task 20)
  const [ackStatus, setAckStatus] = useState<{
    acknowledged: boolean
    ackedAt: string | null
    totalEnrolled?: number
    acknowledgedCount?: number
    pending?: number
  } | null>(null)
  const [ackLoading, setAckLoading] = useState(false)

  // Task 21: Analytics
  const [analytics, setAnalytics] = useState<PolicyAnalytics | null>(null)

  // Task 22: Template selector
  const [showTemplates, setShowTemplates] = useState(false)

  // Task 23: Change history
  const [changeHistory, setChangeHistory] = useState<PolicyChange[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  // Task 27: Snapshot viewer
  const [expandedChangeId, setExpandedChangeId] = useState<string | null>(null)
  const [changeDetail, setChangeDetail] = useState<PolicyChangeDetail | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)

  // Task 25: Export dropdown
  const [exportOpen, setExportOpen] = useState(false)

  // ── Load data ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await readJson<{ policies: StoredPolicy[]; gradingWeights: StoredGradingWeight[] }>(
          `/api/courses/${courseId}/apply-policies`,
          { headers: courseHeaders(userEmail) },
        )
        if (cancelled) return
        setPolicies(data.policies)
        setWeights(data.gradingWeights)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load policies')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [courseId, userEmail])

  // ── Load ack status ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/courses/${courseId}/policy-ack`, {
      headers: courseHeaders(userEmail),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAckStatus(d) })
      .catch(() => {})
  }, [courseId, userEmail])

  // ── Load analytics (Task 21) ───────────────────────────────────────────────

  useEffect(() => {
    if (!canManage) return
    fetch(`/api/courses/${courseId}/policy-analytics`, {
      headers: courseHeaders(userEmail),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAnalytics(d) })
      .catch(() => {})
  }, [courseId, userEmail, canManage])

  // ── Load change history (Task 23) ──────────────────────────────────────────

  const loadChangeHistory = useCallback(() => {
    fetch(`/api/courses/${courseId}/policy-changes`, {
      headers: courseHeaders(userEmail),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.changes) setChangeHistory(d.changes) })
      .catch(() => {})
  }, [courseId, userEmail])

  useEffect(() => {
    if (canManage) loadChangeHistory()
  }, [canManage, loadChangeHistory])

  // Task 27: Fetch snapshot detail for a specific change
  async function toggleSnapshot(changeId: string) {
    if (expandedChangeId === changeId) {
      setExpandedChangeId(null)
      setChangeDetail(null)
      return
    }
    setExpandedChangeId(changeId)
    setSnapshotLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/policy-changes/${changeId}`, {
        headers: courseHeaders(userEmail),
      })
      if (res.ok) {
        const data = await res.json()
        setChangeDetail(data.change)
      }
    } catch {
      // Non-fatal
    } finally {
      setSnapshotLoading(false)
    }
  }

  async function handleAck() {
    setAckLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/policy-ack`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
      })
      if (res.ok) {
        const data = await res.json()
        setAckStatus({ acknowledged: true, ackedAt: data.ackedAt })
      }
    } catch {
      // Non-fatal
    } finally {
      setAckLoading(false)
    }
  }

  // ── Enter edit mode ──────────────────────────────────────────────────────

  function startEditing() {
    setEditPolicies(
      policies.map((p) => ({
        category: (VALID_CATEGORIES.has(p.policyType) ? p.policyType : 'other') as PolicyCategory,
        title: p.title,
        content: p.content,
      })),
    )
    setEditWeights(
      weights.map((w) => ({ category: w.category, weight: w.weight, description: w.description })),
    )
    setEditing(true)
    setSaveSuccess(false)
    setShowTemplates(false)
  }

  function cancelEditing() {
    setEditing(false)
    setShowTemplates(false)
  }

  // ── Apply template (Task 22) ──────────────────────────────────────────────

  function applyTemplate(templateId: string) {
    const template = POLICY_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    setEditPolicies(template.policies.map((p) => ({ ...p })))
    setEditWeights(template.gradingWeights.map((w) => ({ ...w })))
    setShowTemplates(false)

    // If not already in edit mode, enter it
    if (!editing) {
      setEditing(true)
      setSaveSuccess(false)
    }
  }

  function handleUseTemplate() {
    if (editPolicies.length > 0 || editWeights.length > 0) {
      if (!window.confirm('This will replace your current edits with the template. Continue?')) return
    }
    setShowTemplates(true)
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)

    // Capture old policies before save for change tracking (Task 23)
    const oldPolicies = policies.map((p) => ({
      category: p.policyType,
      title: p.title,
      content: p.content,
    }))

    try {
      const res = await fetch(`/api/courses/${courseId}/apply-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ policies: editPolicies, gradingWeights: editWeights }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ? JSON.stringify(data.error) : `Save failed (${res.status})`)
      }
      // Reload from server
      const fresh = await readJson<{ policies: StoredPolicy[]; gradingWeights: StoredGradingWeight[] }>(
        `/api/courses/${courseId}/apply-policies`,
        { headers: courseHeaders(userEmail) },
      )
      setPolicies(fresh.policies)
      setWeights(fresh.gradingWeights)
      setEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      // Record policy change (Task 23) — fire-and-forget
      const newPolicies = fresh.policies.map((p) => ({
        category: p.policyType,
        title: p.title,
        content: p.content,
      }))
      fetch(`/api/courses/${courseId}/policy-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ oldPolicies, newPolicies, courseCode }),
      })
        .then(() => {
          loadChangeHistory()
          // Reload ack status since acks may have been invalidated
          fetch(`/api/courses/${courseId}/policy-ack`, { headers: courseHeaders(userEmail) })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setAckStatus(d) })
            .catch(() => {})
          // Reload analytics
          fetch(`/api/courses/${courseId}/policy-analytics`, { headers: courseHeaders(userEmail) })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setAnalytics(d) })
            .catch(() => {})
        })
        .catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── Export (Task 25) ──────────────────────────────────────────────────────

  function handleExport(format: 'json' | 'text') {
    setExportOpen(false)
    const url = `/api/courses/${courseId}/policy-export?format=${format}`
    fetch(url, { headers: courseHeaders(userEmail) })
      .then(async (res) => {
        if (!res.ok) throw new Error('Export failed')
        const blob = await res.blob()
        const ext = format === 'json' ? 'json' : 'txt'
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `policies.${ext}`
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch(() => {})
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const totalPct = Math.round((editing ? editWeights : weights).reduce((s, w) => s + w.weight, 0) * 100)
  const weightOk = totalPct >= 98 && totalPct <= 102
  const weightOver = totalPct > 102

  const isEmpty = policies.length === 0 && weights.length === 0

  // Group policies by category for display
  function groupPolicies(items: StoredPolicy[]) {
    return CATEGORY_ORDER.reduce<Record<PolicyCategory, StoredPolicy[]>>((acc, cat) => {
      acc[cat] = items.filter((p) => p.policyType === cat)
      return acc
    }, {} as Record<PolicyCategory, StoredPolicy[]>)
  }

  const grouped = groupPolicies(policies)

  // Completeness indicator (Task 17)
  const presentCategories = new Set(policies.map(p => p.policyType))
  const missingCategories = RECOMMENDED_CATEGORIES.filter(cat => !presentCategories.has(cat))

  // Freshness: most recent createdAt across both policies and weights
  const allDates = [...policies.map((p) => p.createdAt), ...weights.map((w) => w.createdAt)].filter(Boolean)
  const latestDate = allDates.length > 0
    ? new Date(allDates.reduce((a, b) => (a > b ? a : b)))
    : null
  const isOutdated = latestDate ? differenceInMonths(new Date(), latestDate) >= 6 : false

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error && isEmpty) {
    return (
      <div className="flex items-start gap-2 border-2 border-red-200 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (isEmpty && !editing) {
    return (
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-16 px-6 bg-gray-50/50">
        <FileQuestion className="size-12 text-gray-300 mb-4" />
        <p className="text-sm font-medium text-gray-600 mb-1">No policies or grading weights yet</p>
        <p className="text-xs text-gray-400 mb-4">
          Upload a syllabus via the Magic Course Builder to extract policies automatically,
          or add them manually.
        </p>
        {canManage && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1.5 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors"
            >
              <Plus className="size-4" />
              Add Policies Manually
            </button>
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LayoutTemplate className="size-4" />
              Start from Template
            </button>
          </div>
        )}

        {/* Template selector (Task 22) */}
        {showTemplates && (
          <div className="mt-6 w-full max-w-2xl">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Choose a template</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {POLICY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className="text-left border-2 rounded-2xl p-4 bg-white hover:border-[#0033A0] hover:bg-blue-50/30 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Edit mode ────────────────────────────────────────────────────────────

  if (editing) {
    return (
      <div className="space-y-6">
        {/* Template selector inline (Task 22) */}
        {showTemplates && (
          <div className="border-2 rounded-2xl p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Choose a template</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {POLICY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className="text-left border-2 rounded-2xl p-4 bg-white hover:border-[#0033A0] hover:bg-blue-50/30 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="mt-3 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Policies editor */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-gray-900">Course Policies</h3>
            <button
              type="button"
              onClick={handleUseTemplate}
              className="text-xs text-gray-500 hover:text-[#0033A0] transition-colors flex items-center gap-1"
            >
              <LayoutTemplate className="size-3.5" />
              Use Template
            </button>
          </div>
          <div className="space-y-3">
            {editPolicies.map((p, i) => {
              const cfg = CATEGORY_CONFIG[p.category]
              return (
                <div key={i} className="relative border-2 rounded-2xl p-4 bg-white">
                  <button
                    type="button"
                    onClick={() => setEditPolicies((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0]"
                    aria-label="Remove policy"
                  >
                    <X className="size-4" />
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <select
                      value={p.category}
                      onChange={(e) => {
                        const next = [...editPolicies]
                        next[i] = { ...next[i], category: e.target.value as PolicyCategory }
                        setEditPolicies(next)
                      }}
                      className="text-xs font-medium border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                    >
                      {CATEGORY_ORDER.map((cat) => (
                        <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                      ))}
                    </select>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={p.title}
                    onChange={(e) => {
                      const next = [...editPolicies]
                      next[i] = { ...next[i], title: e.target.value }
                      setEditPolicies(next)
                    }}
                    placeholder="Policy title"
                    className="w-full text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                  />
                  <textarea
                    value={p.content}
                    onChange={(e) => {
                      const next = [...editPolicies]
                      next[i] = { ...next[i], content: e.target.value.slice(0, 500) }
                      setEditPolicies(next)
                    }}
                    rows={2}
                    placeholder="Policy content"
                    className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                  />
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setEditPolicies((prev) => [...prev, { category: 'other', title: '', content: '' }])}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors"
          >
            <Plus className="size-4" /> Add Policy
          </button>
        </div>

        {/* Weights editor */}
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 mb-3">Grading Weights</h3>
          {editWeights.length > 0 && (
            <div className="border-2 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Category</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 w-24">Weight (%)</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {editWeights.map((w, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={w.category}
                          onChange={(e) => {
                            const next = [...editWeights]
                            next[i] = { ...next[i], category: e.target.value }
                            setEditWeights(next)
                          }}
                          placeholder="e.g. Exams"
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(w.weight * 100)}
                          onChange={(e) => {
                            const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                            const next = [...editWeights]
                            next[i] = { ...next[i], weight: pct / 100 }
                            setEditWeights(next)
                          }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={w.description ?? ''}
                          onChange={(e) => {
                            const next = [...editWeights]
                            next[i] = { ...next[i], description: e.target.value || null }
                            setEditWeights(next)
                          }}
                          placeholder="Optional"
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setEditWeights((prev) => prev.filter((_, idx) => idx !== i))}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0]"
                          aria-label="Remove weight"
                        >
                          <X className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Total row */}
              <div className={`flex items-center justify-between px-4 py-2 text-sm font-semibold border-t-2 ${
                weightOk ? 'bg-green-50 text-green-700 border-green-200'
                  : weightOver ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span>Total</span>
                <div className="flex items-center gap-1.5">
                  {weightOk ? <CheckCircle className="size-4" /> : <AlertTriangle className="size-4" />}
                  <span>{totalPct}%</span>
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setEditWeights((prev) => [...prev, { category: '', weight: 0, description: null }])}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors"
          >
            <Plus className="size-4" /> Add Weight
          </button>
        </div>

        {/* Action bar */}
        {error && (
          <div className="flex items-start gap-2 border-2 border-red-200 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0033A0] text-white font-semibold px-5 py-2 rounded-xl hover:bg-[#0033A0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Changes
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={saving}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Read-only view ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {saveSuccess && (
        <div className="flex items-center gap-2 border-2 border-green-200 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="size-4 shrink-0" />
          <span>Policies saved successfully!</span>
        </div>
      )}

      {/* Student ack banner (Task 20) */}
      {!canManage && ackStatus && !ackStatus.acknowledged && policies.length > 0 && (
        <div className="flex items-center justify-between border-2 border-amber-200 rounded-2xl bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <BookOpen className="size-4 shrink-0" />
            <span>You haven&apos;t confirmed you&apos;ve read these policies yet.</span>
          </div>
          <button
            type="button"
            onClick={handleAck}
            disabled={ackLoading}
            className="text-sm font-semibold text-[#0033A0] hover:text-[#0033A0]/80 transition-colors disabled:opacity-50 whitespace-nowrap ml-3"
          >
            {ackLoading ? 'Saving...' : "I've Read These Policies"}
          </button>
        </div>
      )}
      {!canManage && ackStatus?.acknowledged && (
        <div className="flex items-center gap-2 text-xs text-green-700">
          <CheckCircle className="size-3.5" />
          <span>Acknowledged {ackStatus.ackedAt ? formatDistanceToNow(new Date(ackStatus.ackedAt), { addSuffix: true }) : ''}</span>
        </div>
      )}

      {/* Edit + Export buttons (Task 25) */}
      {canManage && (
        <div className="flex justify-end gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Download className="size-4" />
              Export
              <ChevronDown className="size-3" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border-2 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('text')}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Export Text
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-1.5 text-sm font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors"
          >
            <Pencil className="size-4" />
            Edit Policies
          </button>
        </div>
      )}

      {/* Freshness indicator */}
      {latestDate && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Last updated {formatDistanceToNow(latestDate, { addSuffix: true })}</span>
          {isOutdated && canManage && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
              <AlertTriangle className="size-3" />
              Policies may be outdated
            </span>
          )}
        </div>
      )}

      {/* Change History (Task 23 + Task 27 snapshot viewer) — educator only */}
      {canManage && changeHistory.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <History className="size-3.5" />
            <span>Change History ({changeHistory.length})</span>
            {historyOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-1.5 pl-5">
              {changeHistory.map((ch) => (
                <div key={ch.id}>
                  <button
                    type="button"
                    onClick={() => void toggleSnapshot(ch.id)}
                    className="text-xs text-gray-500 hover:text-[#0033A0] transition-colors text-left"
                  >
                    <span className="text-gray-400">{formatDistanceToNow(new Date(ch.createdAt), { addSuffix: true })}</span>
                    {' — '}
                    <span className="underline decoration-dotted">{ch.summary}</span>
                    {expandedChangeId === ch.id
                      ? <ChevronDown className="inline size-3 ml-1" />
                      : <ChevronRight className="inline size-3 ml-1" />}
                  </button>

                  {/* Snapshot comparison (Task 27) */}
                  {expandedChangeId === ch.id && (
                    <div className="mt-2 mb-3">
                      {snapshotLoading ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                          <Loader2 className="size-3 animate-spin" /> Loading snapshot...
                        </div>
                      ) : changeDetail?.beforeSnapshot && changeDetail?.afterSnapshot ? (
                        <SnapshotDiff
                          before={changeDetail.beforeSnapshot}
                          after={changeDetail.afterSnapshot}
                        />
                      ) : (
                        <p className="text-xs text-gray-400 italic">No snapshot data available for this change.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Educator ack summary (Task 20) */}
      {canManage && ackStatus && ackStatus.totalEnrolled != null && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{ackStatus.acknowledgedCount ?? 0} of {ackStatus.totalEnrolled} enrolled students have acknowledged</span>
          {ackStatus.totalEnrolled > 0 && (
            <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0033A0] rounded-full transition-all"
                style={{ width: `${Math.round(((ackStatus.acknowledgedCount ?? 0) / ackStatus.totalEnrolled) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Policy Engagement Analytics Card (Task 21) — educator only */}
      {canManage && analytics && policies.length > 0 && (
        <div className="border-2 rounded-2xl bg-white p-4">
          {analytics.totalEnrolled === 0 ? (
            <p className="text-sm text-gray-500">No enrolled students yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <CircularProgress value={analytics.ackRate} />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  {analytics.acknowledgedCount} of {analytics.totalEnrolled} students
                </p>
                {analytics.avgDaysToAck != null && (
                  <p className="text-xs text-gray-500">Avg. {analytics.avgDaysToAck} days to acknowledge</p>
                )}
                {analytics.latestAck && (
                  <p className="text-xs text-gray-400">
                    Latest: {analytics.latestAck.name}, {formatDistanceToNow(new Date(analytics.latestAck.date), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Policy Completeness Indicator (Task 17) — educator/admin only */}
      {canManage && policies.length > 0 && (
        missingCategories.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-green-700">
            <CheckCircle className="size-3.5" />
            <span>All recommended policies covered</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-700 flex-wrap">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>Missing:</span>
            {missingCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setEditPolicies(
                    policies.map((p) => ({
                      category: (VALID_CATEGORIES.has(p.policyType) ? p.policyType : 'other') as PolicyCategory,
                      title: p.title,
                      content: p.content,
                    })).concat([{ category: cat, title: '', content: '' }]),
                  )
                  setEditWeights(
                    weights.map((w) => ({ category: w.category, weight: w.weight, description: w.description })),
                  )
                  setEditing(true)
                  setSaveSuccess(false)
                }}
                className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium px-2 py-0.5 rounded-full transition-colors cursor-pointer"
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        )
      )}

      {/* Policies */}
      <div>
        <h3 className="text-sm font-extrabold text-gray-900 mb-3">Course Policies</h3>
        {policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-8 px-6 bg-gray-50/50">
            <FileQuestion className="size-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No policies on file</p>
          </div>
        ) : (
          <div className="space-y-4">
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped[cat]
              if (items.length === 0) return null
              const cfg = CATEGORY_CONFIG[cat]
              const CatIcon = cfg.icon
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <CatIcon className="size-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <div key={p.id} className="border-2 rounded-2xl p-4 bg-white">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <p className="text-sm font-semibold text-gray-900 mb-1">{p.title}</p>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{p.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Grading Weights */}
      <div>
        <h3 className="text-sm font-extrabold text-gray-900 mb-3">Grading Weights</h3>
        {weights.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-8 px-6 bg-gray-50/50">
            <Scale className="size-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No grading breakdown on file</p>
          </div>
        ) : (
          <div className="border-2 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Category</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-700 w-24">Weight</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody>
                {weights.map((w) => (
                  <tr key={w.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2 font-medium text-gray-800">{w.category}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{Math.round(w.weight * 100)}%</td>
                    <td className="px-4 py-2 text-gray-600">{w.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={`flex items-center justify-between px-4 py-2 text-sm font-semibold border-t-2 ${
              weightOk ? 'bg-green-50 text-green-700 border-green-200'
                : weightOver ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span>Total</span>
              <div className="flex items-center gap-1.5">
                {weightOk ? <CheckCircle className="size-4" /> : <AlertTriangle className="size-4" />}
                <span>{totalPct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Grade Calculator (Task 16 + Task 24) — below weights, read-only only */}
        {weights.length > 0 && (
          <div className="mt-4">
            <GradingCalculator gradingWeights={weights} courseId={courseId} userEmail={!canManage ? userEmail : undefined} />
          </div>
        )}
      </div>
    </div>
  )
}
