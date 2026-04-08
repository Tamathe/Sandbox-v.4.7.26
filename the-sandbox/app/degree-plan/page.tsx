'use client'

import { useAuth } from '../lib/auth-context'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  GraduationCap,
  Plus,
  X,
  Search,
  Loader2,
  Trash2,
  Pencil,
  ChevronDown,
  BookOpen,
  Sparkles,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogCourse {
  coid: string
  courseCode: string
  prefix: string
  number: string
  title: string
  description: string | null
  creditHoursMin: number
  creditHoursMax: number
  prerequisitesRaw: string | null
}

interface PlannedCourse {
  id: string
  planId: string
  courseCode: string
  intendedSemester: string | null
  semesterIndex: number | null
  status: 'PLANNED' | 'REGISTERED' | 'COMPLETED' | 'WAIVED'
  catalog: CatalogCourse
}

interface DegreeProgram {
  id: string
  code: string
  name: string
  college: string
  department: string
  totalCredits: number
}

interface DegreePlan {
  id: string
  name: string
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'ARCHIVED'
  programId: string
  program?: DegreeProgram
  courses: PlannedCourse[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEMESTERS = ['Fall', 'Spring', 'Summer'] as const
const YEARS = [1, 2, 3, 4] as const
const COURSE_STATUSES: PlannedCourse['status'][] = ['PLANNED', 'REGISTERED', 'COMPLETED', 'WAIVED']

const STATUS_COLORS: Record<PlannedCourse['status'], string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  REGISTERED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  WAIVED: 'bg-gray-100 text-gray-600',
}

const PLAN_STATUS_COLORS: Record<DegreePlan['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DegreePlannerPage() {
  const { currentUser } = useAuth()

  const [plans, setPlans] = useState<DegreePlan[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [programs, setPrograms] = useState<DegreeProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI suggestions banner
  const [suggestBannerDismissed, setSuggestBannerDismissed] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ code: string; title: string; reason: string }>>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddCourseModal, setShowAddCourseModal] = useState(false)
  const [addCourseSemester, setAddCourseSemester] = useState<string>('Fall')
  const [addCourseYear, setAddCourseYear] = useState<number>(1)

  const headers = { 'x-demo-user-email': currentUser?.email || '' }

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/degree-plan', { headers })
      if (!res.ok) throw new Error('Failed to load plans')
      const data: DegreePlan[] = await res.json()
      setPlans(data)
      if (data.length > 0 && !activePlanId) {
        setActivePlanId(data[0].id)
      }
    } catch {
      setError('Failed to load degree plans')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email])

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/degree-plan/programs', { headers })
      if (!res.ok) throw new Error('Failed to load programs')
      const data: DegreeProgram[] = await res.json()
      setPrograms(data)
    } catch {
      // Non-blocking — programs are only needed for create modal
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchPrograms()])
      setLoading(false)
    }
    if (currentUser?.email) init()
  }, [fetchPlans, fetchPrograms, currentUser?.email])

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true)
    try {
      const res = await fetch('/api/degree-plan/suggestions', { headers })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
    } catch {
      setError('Failed to load AI suggestions')
    } finally {
      setSuggestionsLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const handleCreatePlan = async (title: string, programId: string) => {
    try {
      const res = await fetch('/api/degree-plan', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, programId }),
      })
      if (!res.ok) throw new Error('Failed to create plan')
      const newPlan: DegreePlan = await res.json()
      setPlans((prev) => [newPlan, ...prev])
      setActivePlanId(newPlan.id)
      setShowCreateModal(false)
    } catch {
      setError('Failed to create plan')
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Delete this degree plan? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/degree-plan/${planId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Failed to delete')
      setPlans((prev) => prev.filter((p) => p.id !== planId))
      if (activePlanId === planId) {
        const remaining = plans.filter((p) => p.id !== planId)
        setActivePlanId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch {
      setError('Failed to delete plan')
    }
  }

  const handleRenamePlan = async (planId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/degree-plan/${planId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (!res.ok) throw new Error('Failed to rename')
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, name: newTitle } : p))
      )
    } catch {
      setError('Failed to rename plan')
    }
  }

  const handleAddCourse = async (
    courseCode: string,
    semester: string,
    year: number
  ) => {
    if (!activePlanId) return
    try {
      const res = await fetch(`/api/degree-plan/${activePlanId}/courses`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode, semester, year }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add course')
      }
      await fetchPlans()
      setShowAddCourseModal(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add course'
      setError(msg)
    }
  }

  const handleRemoveCourse = async (entryId: string) => {
    if (!activePlanId) return
    // Optimistic removal
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlanId
          ? { ...p, courses: p.courses.filter((c) => c.id !== entryId) }
          : p
      )
    )
    try {
      const res = await fetch(
        `/api/degree-plan/${activePlanId}/courses/${entryId}`,
        { method: 'DELETE', headers }
      )
      if (!res.ok) throw new Error('Failed to remove course')
    } catch {
      await fetchPlans() // Revert
    }
  }

  const handleStatusChange = async (
    entryId: string,
    newStatus: PlannedCourse['status']
  ) => {
    if (!activePlanId) return
    // Optimistic update
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlanId
          ? {
              ...p,
              courses: p.courses.map((c) =>
                c.id === entryId ? { ...c, status: newStatus } : c
              ),
            }
          : p
      )
    )
    try {
      const res = await fetch(
        `/api/degree-plan/${activePlanId}/courses/${entryId}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      )
      if (!res.ok) throw new Error('Failed to update status')
    } catch {
      await fetchPlans() // Revert
    }
  }

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null
  const programForPlan = activePlan
    ? programs.find((p) => p.id === activePlan.programId)
    : null

  const totalCredits = activePlan
    ? activePlan.courses.reduce((sum, c) => sum + (c.catalog?.creditHoursMin ?? 0), 0)
    : 0

  function getCoursesFor(year: number, semester: string) {
    if (!activePlan) return []
    return activePlan.courses.filter(
      (c) => c.semesterIndex === year && c.intendedSemester === semester
    )
  }

  function semesterCredits(year: number, semester: string) {
    return getCoursesFor(year, semester).reduce(
      (sum, c) => sum + (c.catalog?.creditHoursMin ?? 0),
      0
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-uk-blue" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Error toast */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <GraduationCap className="size-7 text-uk-blue" />
            Degree Planner
          </h1>
          <p className="text-gray-500 mt-1">Plan your path to graduation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-uk-blue hover:bg-[#002580] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="size-4" />
          New Plan
        </button>
      </div>

      {/* AI suggestion banner */}
      {!suggestBannerDismissed && (
        <div className="mb-6 border-2 border-blue-200 rounded-2xl bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="size-5 text-uk-blue mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">AI can suggest courses based on your current plan.</p>
                {suggestions.length === 0 ? (
                  <button
                    onClick={fetchSuggestions}
                    disabled={suggestionsLoading}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-uk-blue hover:bg-[#002580] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {suggestionsLoading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Thinking…
                      </>
                    ) : (
                      'Get Suggestions'
                    )}
                  </button>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {suggestions.map((s) => (
                      <li key={s.code} className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{s.code} — {s.title}</span>
                        <span className="text-gray-500 ml-1">· {s.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button
              onClick={() => setSuggestBannerDismissed(true)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* No plans empty state */}
      {plans.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 py-16 flex flex-col items-center justify-center text-center">
          <GraduationCap className="size-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-extrabold text-gray-800 mb-1">
            Start planning your degree
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Create a degree plan to map out your courses semester by semester
            and track your progress toward graduation.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-uk-blue hover:bg-[#002580] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="size-4" />
            Create Your First Plan
          </button>
        </div>
      )}

      {/* Plan selector tabs */}
      {plans.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlanId(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePlanId === p.id
                  ? 'bg-uk-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Active plan content */}
      {activePlan && (
        <>
          {/* Plan overview bar */}
          <PlanOverviewBar
            plan={activePlan}
            programName={programForPlan?.name ?? null}
            totalCredits={totalCredits}
            onRename={(t) => handleRenamePlan(activePlan.id, t)}
            onDelete={() => handleDeletePlan(activePlan.id)}
          />

          {/* Semester grid */}
          <div className="mt-6 space-y-6">
            {YEARS.map((year) => (
              <div key={year}>
                <h3 className="text-lg font-extrabold text-gray-800 mb-3">
                  Year {year}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SEMESTERS.map((sem) => {
                    const courses = getCoursesFor(year, sem)
                    const credits = semesterCredits(year, sem)
                    return (
                      <div
                        key={`${year}-${sem}`}
                        className={`bg-white rounded-2xl border-2 p-4 min-h-[140px] flex flex-col ${
                          courses.length === 0
                            ? 'border-dashed border-gray-300'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">
                            {sem}
                          </span>
                          {credits > 0 && (
                            <span className="text-xs text-gray-400">
                              {credits} cr
                            </span>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          {courses.map((c) => (
                            <CourseCard
                              key={c.id}
                              course={c}
                              onRemove={() => handleRemoveCourse(c.id)}
                              onStatusChange={(s) =>
                                handleStatusChange(c.id, s)
                              }
                            />
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setAddCourseSemester(sem)
                            setAddCourseYear(year)
                            setShowAddCourseModal(true)
                          }}
                          className="mt-3 w-full py-1.5 text-xs font-medium text-gray-400 hover:text-uk-blue hover:bg-blue-50 rounded-lg border border-dashed border-gray-300 hover:border-uk-blue transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus className="size-3" />
                          Add Course
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreatePlanModal
          programs={programs}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePlan}
        />
      )}
      {showAddCourseModal && (
        <AddCourseModal
          defaultSemester={addCourseSemester}
          defaultYear={addCourseYear}
          existingCodes={activePlan?.courses.map((c) => c.courseCode) ?? []}
          email={currentUser?.email || ''}
          onClose={() => setShowAddCourseModal(false)}
          onAdd={handleAddCourse}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PlanOverviewBar
// ---------------------------------------------------------------------------

function PlanOverviewBar({
  plan,
  programName,
  totalCredits,
  onRename,
  onDelete,
}: {
  plan: DegreePlan
  programName: string | null
  totalCredits: number
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(plan.name)

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 flex flex-wrap items-center gap-4">
      {/* Title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (editTitle.trim()) {
                onRename(editTitle.trim())
                setEditing(false)
              }
            }}
          >
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-lg font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditTitle(plan.name)
                  setEditing(false)
                }
              }}
            />
            <button
              type="submit"
              className="text-xs px-3 py-1 bg-uk-blue text-white rounded-lg"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTitle(plan.name)
                setEditing(false)
              }}
              className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-lg"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-gray-900 truncate">
              {plan.name}
            </h2>
            <button
              onClick={() => {
                setEditTitle(plan.name)
                setEditing(true)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
        {programName && (
          <p className="text-sm text-gray-500 mt-0.5">{programName}</p>
        )}
      </div>

      {/* Status badge */}
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full ${PLAN_STATUS_COLORS[plan.status]}`}
      >
        {plan.status}
      </span>

      {/* Credits */}
      <div className="text-sm text-gray-600">
        <span className="font-semibold text-gray-800">{totalCredits}</span>{' '}
        credits planned
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete plan"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CourseCard
// ---------------------------------------------------------------------------

function CourseCard({
  course,
  onRemove,
  onStatusChange,
}: {
  course: PlannedCourse
  onRemove: () => void
  onStatusChange: (status: PlannedCourse['status']) => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  const credits = course.catalog
    ? course.catalog.creditHoursMin === course.catalog.creditHoursMax
      ? `${course.catalog.creditHoursMin} cr`
      : `${course.catalog.creditHoursMin}–${course.catalog.creditHoursMax} cr`
    : ''

  return (
    <div className="group bg-gray-50 rounded-lg px-3 py-2 flex items-start gap-2 relative">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-tight">
          {course.courseCode}
        </p>
        <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
          {course.catalog?.title ?? 'Unknown course'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {credits && (
            <span className="text-[10px] text-gray-400">{credits}</span>
          )}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${STATUS_COLORS[course.status]}`}
            >
              {course.status}
              <ChevronDown className="size-2.5" />
            </button>
            {showDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[110px]">
                {COURSE_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusChange(s)
                      setShowDropdown(false)
                    }}
                    className={`block w-full text-left px-3 py-1 text-xs hover:bg-gray-50 ${
                      s === course.status ? 'font-semibold' : ''
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-0.5 mt-0.5"
        title="Remove course"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CreatePlanModal
// ---------------------------------------------------------------------------

function CreatePlanModal({
  programs,
  onClose,
  onCreate,
}: {
  programs: DegreeProgram[]
  onClose: () => void
  onCreate: (title: string, programId: string) => void
}) {
  const [title, setTitle] = useState('My Degree Plan')
  const [programId, setProgramId] = useState(programs[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !programId) return
    setSubmitting(true)
    await onCreate(title.trim(), programId)
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-gray-900">
            Create Degree Plan
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue focus:border-transparent"
              placeholder="My Degree Plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program
            </label>
            {programs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No programs available. Contact your registrar.
              </p>
            ) : (
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue focus:border-transparent bg-white"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={!title.trim() || !programId || submitting}
            className="w-full py-2.5 bg-uk-blue hover:bg-[#002580] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create Plan
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddCourseModal
// ---------------------------------------------------------------------------

function AddCourseModal({
  defaultSemester,
  defaultYear,
  existingCodes,
  email,
  onClose,
  onAdd,
}: {
  defaultSemester: string
  defaultYear: number
  existingCodes: string[]
  email: string
  onClose: () => void
  onAdd: (courseCode: string, semester: string, year: number) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogCourse[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<CatalogCourse | null>(null)
  const [semester, setSemester] = useState(defaultSemester)
  const [year, setYear] = useState(defaultYear)
  const [adding, setAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchCatalog = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        const res = await fetch(
          `/api/catalog/courses?q=${encodeURIComponent(q)}&pageSize=20`,
          { headers: { 'x-demo-user-email': email } }
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data.courses ?? [])
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    },
    [email]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCatalog(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchCatalog])

  const handleAdd = async () => {
    if (!selected) return
    setAdding(true)
    await onAdd(selected.courseCode, semester, year)
    setAdding(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-gray-900">Add Course</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
            }}
            placeholder="Search courses (e.g. CS 101, Psychology)"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue focus:border-transparent"
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Results list */}
        {!selected && (
          <div className="flex-1 overflow-y-auto min-h-0 mb-4 space-y-1 max-h-[300px]">
            {results.length === 0 && query.trim() && !searching && (
              <p className="text-sm text-gray-400 text-center py-6">
                No courses found
              </p>
            )}
            {results.map((c) => {
              const alreadyAdded = existingCodes.includes(c.courseCode)
              return (
                <button
                  key={c.coid}
                  onClick={() => !alreadyAdded && setSelected(c)}
                  disabled={alreadyAdded}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    alreadyAdded
                      ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-uk-blue hover:bg-blue-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">
                      {c.courseCode}
                    </span>
                    <span className="text-xs text-gray-400">
                      {c.creditHoursMin === c.creditHoursMax
                        ? `${c.creditHoursMin} cr`
                        : `${c.creditHoursMin}–${c.creditHoursMax} cr`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{c.title}</p>
                  {c.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  {alreadyAdded && (
                    <span className="text-[10px] text-amber-600 font-medium mt-1 inline-block">
                      Already in plan
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Selected course confirmation */}
        {selected && (
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  {selected.courseCode}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Change
                </button>
              </div>
              <p className="text-sm text-gray-600">{selected.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selected.creditHoursMin === selected.creditHoursMax
                  ? `${selected.creditHoursMin} credits`
                  : `${selected.creditHoursMin}–${selected.creditHoursMax} credits`}
                {selected.prerequisitesRaw &&
                  ` | Prereqs: ${selected.prerequisitesRaw}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uk-blue"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uk-blue"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full py-2.5 bg-uk-blue hover:bg-[#002580] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {adding && <Loader2 className="size-4 animate-spin" />}
              Add to Plan
            </button>
          </div>
        )}

        {/* Hint when no query */}
        {!selected && !query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="size-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              Search the course catalog to find courses to add
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
