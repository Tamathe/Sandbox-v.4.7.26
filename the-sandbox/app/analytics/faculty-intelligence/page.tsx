'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  TrendingDown,
  ArrowUpDown,
  ChevronDown,
  Sparkles,
  Eye,
  UserX,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import AnalyticsSubNav from '../../components/AnalyticsSubNav'
import { useFacultyIntelligence } from '../../hooks/useFacultyIntelligence'

// ─── Types ───────────────────────────────────────────────────────────────────

import type { Course } from '../../components/courses/course-types'

type SortDir = 'asc' | 'desc'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function compositeColor(v: number | null): string {
  if (v === null) return 'text-gray-400'
  if (v >= 0.7) return 'text-green-600'
  if (v >= 0.5) return 'text-amber-600'
  return 'text-red-600'
}

function compositeBg(v: number | null): string {
  if (v === null) return 'bg-gray-100'
  if (v >= 0.7) return 'bg-green-50 border-green-200'
  if (v >= 0.5) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function pct(v: number | null): string {
  if (v === null) return '--'
  return `${Math.round(v * 100)}%`
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
}

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-red-400',
  medium: 'border-l-amber-400',
  low: 'border-l-gray-300',
}

const TYPE_ICONS: Record<string, typeof Eye> = {
  review: Eye,
  'low-score': TrendingDown,
  'at-risk': UserX,
  'stale-briefing': Clock,
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

function BriefingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
    </div>
  )
}

function ScorecardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function ActionsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

// ─── Empty States ────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: {
  icon: typeof Clock
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="size-8 text-gray-300 mb-3" />
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>
    </div>
  )
}

// ─── Morning Briefing Card ───────────────────────────────────────────────────

function MorningBriefingCard({
  briefing,
  needsGeneration,
  loading,
  onRefresh,
}: {
  briefing: ReturnType<typeof useFacultyIntelligence>['briefing']
  needsGeneration: boolean
  loading: boolean
  onRefresh: () => Promise<void>
}) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <Sparkles className="size-5 text-[#0033A0]" />
          Morning Briefing
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0033A0] text-white hover:bg-[#002880] disabled:opacity-50 transition-colors"
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {refreshing ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <BriefingSkeleton />
      ) : !briefing && needsGeneration ? (
        <EmptyState
          icon={Sparkles}
          title="No briefing yet"
          description="Click Refresh to generate your morning briefing for this course."
        />
      ) : briefing ? (
        <div className="space-y-4">
          {/* HTML content */}
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: briefing.briefingHtml }}
          />

          {/* Stats strip */}
          {briefing.statsSnapshot && Object.keys(briefing.statsSnapshot).length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
              {Object.entries(briefing.statsSnapshot).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{val}</span>
                  <span>{key.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Highlights + Concerns chips */}
          <div className="flex flex-wrap gap-2">
            {briefing.highlights?.map((h, i) => (
              <span
                key={`h-${i}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
              >
                <CheckCircle2 className="size-3" />
                {h}
              </span>
            ))}
            {briefing.concerns?.map((c, i) => (
              <span
                key={`c-${i}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
              >
                <AlertTriangle className="size-3" />
                {c}
              </span>
            ))}
          </div>

          {/* Stale indicator */}
          {briefing.stale && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Clock className="size-3" />
              This briefing may be outdated. Click Refresh to regenerate.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ─── Assignment Scorecard Grid ───────────────────────────────────────────────

function AssignmentScorecardGrid({
  scorecard,
  loading,
  courseId,
}: {
  scorecard: ReturnType<typeof useFacultyIntelligence>['scorecard']
  loading: boolean
  courseId?: string
}) {
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    if (!scorecard.length) return []
    return [...scorecard].sort((a, b) => {
      const aVal = a.avgComposite ?? -1
      const bVal = b.avgComposite ?? -1
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [scorecard, sortDir])

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <FileText className="size-5 text-[#0033A0]" />
          Assignment Scorecard
        </h2>
        {scorecard.length > 1 && (
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ArrowUpDown className="size-3.5" />
            {sortDir === 'asc' ? 'Lowest first' : 'Highest first'}
          </button>
        )}
      </div>

      {loading ? (
        <ScorecardSkeleton />
      ) : !courseId ? (
        <EmptyState
          icon={FileText}
          title="Select a course"
          description="Choose a course above to view assignment scorecard data."
        />
      ) : !sorted.length ? (
        <EmptyState
          icon={FileText}
          title="No scorecard data"
          description="No rubric breakdown data is available yet for this course."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => (
            <div
              key={a.assignmentId}
              className={`rounded-xl border p-4 ${compositeBg(a.avgComposite)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{a.submissionCount} submissions</span>
                    <span>{a.gradedCount} graded</span>
                    {a.dueAt && (
                      <span>Due {new Date(a.dueAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-extrabold ${compositeColor(a.avgComposite)}`}>
                    {pct(a.avgComposite)}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg Composite</p>
                </div>
              </div>

              {/* Dimension bars */}
              {a.dimensions.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {a.dimensions.map((dim) => {
                    const ratio = dim.maxScore > 0 ? dim.avgScore / dim.maxScore : 0
                    return (
                      <div key={dim.name} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-gray-600 truncate">{dim.name}</span>
                          <span className="text-gray-500 ml-1">
                            {dim.avgScore.toFixed(1)}/{dim.maxScore}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              ratio >= 0.7
                                ? 'bg-green-500'
                                : ratio >= 0.5
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.round(ratio * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Action Panel ────────────────────────────────────────────────────────────

function ActionPanel({
  actions,
  loading,
}: {
  actions: ReturnType<typeof useFacultyIntelligence>['actions']
  loading: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
      <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2 mb-4">
        <AlertTriangle className="size-5 text-[#0033A0]" />
        Action Items
        {!loading && actions.length > 0 && (
          <span className="ml-auto text-xs font-medium text-gray-400">
            {actions.length} item{actions.length !== 1 ? 's' : ''}
          </span>
        )}
      </h2>

      {loading ? (
        <ActionsSkeleton />
      ) : !actions.length ? (
        <EmptyState
          icon={CheckCircle2}
          title="All clear"
          description="No action items right now. Check back after new submissions come in."
        />
      ) : (
        <div className="space-y-2">
          {actions.map((item) => {
            const Icon = TYPE_ICONS[item.type] || BookOpen
            return (
              <div
                key={item.id}
                className={`rounded-xl border border-l-4 ${PRIORITY_BORDER[item.priority]} bg-white p-3 ${
                  item.priority === 'high' ? 'ring-1 ring-red-100' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className="size-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${PRIORITY_STYLES[item.priority]}`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Course Selector ─────────────────────────────────────────────────────────

function CourseSelector({
  courses,
  selectedId,
  onChange,
  loading,
}: {
  courses: Course[]
  selectedId: string | undefined
  onChange: (id: string | undefined) => void
  loading: boolean
}) {
  if (loading) {
    return <Skeleton className="h-9 w-48" />
  }
  if (courses.length === 0) return null

  return (
    <div className="relative inline-block">
      <select
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="appearance-none pl-3 pr-8 py-2 text-sm font-medium rounded-lg border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:border-[#0033A0] transition-colors"
      >
        <option value="">All courses</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.courseCode} — {c.title}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FacultyIntelligencePage() {
  const { currentUser } = useAuth()
  const userEmail = currentUser?.email ?? ''
  const role = currentUser?.role ?? 'STUDENT'

  // Course list
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>()

  useEffect(() => {
    if (!userEmail) return
    setCoursesLoading(true)
    fetch('/api/courses', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Course[] | { courses: Course[] }) => {
        const list = Array.isArray(data) ? data : data.courses ?? []
        setCourses(list)
        // Auto-select first course if only one
        if (list.length === 1) setSelectedCourseId(list[0].id)
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false))
  }, [userEmail])

  const { briefing, needsGeneration, scorecard, actions, loading, error, refreshBriefing } =
    useFacultyIntelligence(userEmail, selectedCourseId)

  return (
    <>
      <PageHeader
        title="Course Intelligence"
        subtitle="Morning briefing, assignment scorecard, and action priorities"
      />
      <AnalyticsSubNav role={role} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course selector */}
        <div className="mb-6">
          <CourseSelector
            courses={courses}
            selectedId={selectedCourseId}
            onChange={setSelectedCourseId}
            loading={coursesLoading}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Three-panel layout: main (briefing + scorecard) + sidebar (actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            <MorningBriefingCard
              briefing={briefing}
              needsGeneration={needsGeneration}
              loading={loading}
              onRefresh={refreshBriefing}
            />
            <AssignmentScorecardGrid
              scorecard={scorecard}
              loading={loading}
              courseId={selectedCourseId}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ActionPanel actions={actions} loading={loading} />
          </div>
        </div>
      </div>
    </>
  )
}
