'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3,
  BookOpen,
  Bot,
  Compass,
  FileText,
  GraduationCap,
  Loader2,
  Map as MapIcon,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { CourseMagicButton } from '../components/CourseMagicButton'
import CourseMaterialViewer from '../components/courses/CourseMaterialViewer'
import CourseStudyPanel from '../components/courses/CourseStudyPanel'
import StudyGuideCard from '../components/StudyGuideCard'
import CourseSidebar from '../components/courses/CourseSidebar'
import LinkToolModal from '../components/courses/LinkToolModal'
import MaterialsTab from '../components/courses/MaterialsTab'
import ToolsTab from '../components/courses/ToolsTab'
import DiscussionTab, { getDiscussionUnreadKey } from '../components/courses/DiscussionTab'
import SubmissionsTab from '../components/courses/SubmissionsTab'
import PulseTab from '../components/courses/PulseTab'
import LearningMapTab from '../components/courses/LearningMapTab'
import CourseSettingsTab from '../components/courses/CourseSettingsTab'
import CourseSetupWizard from '../components/courses/CourseSetupWizard'
import type { Course, CourseMaterial, LinkedTool, CatalogTool, ToolSuggestion, TabId } from '../components/courses/course-types'
import { courseHeaders, readJson } from '../components/courses/course-utils'
import { SEEDED_COURSE_CODES } from '../components/courses/course-data'

type CourseContextPayload = {
  courseId: string
  courseCode: string
  title: string
  description: string | null
  materialsCount: number
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: typeof BookOpen
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <div className="py-12 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-gray-200" />
      <h3 className="mb-1 text-sm font-semibold text-gray-600">{title}</h3>
      <p className="mb-4 text-xs text-gray-400">{description}</p>
      {actions}
    </div>
  )
}

export default function CoursesPage() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const courseParam = searchParams.get('course')
  const isStudent = currentUser.role === 'STUDENT'
  const isAdmin = currentUser.role === 'ADMIN'
  const isEducator = currentUser.role !== 'STUDENT'

  // ── Course list ───────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)

  // ── New course form ───────────────────────────────────────────────────────
  const [showNewCourseForm, setShowNewCourseForm] = useState(false)
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [newCourseForm, setNewCourseForm] = useState({
    courseCode: '',
    title: '',
    description: '',
    isPublic: true,
  })
  const [showSetupWizard, setShowSetupWizard] = useState(false)

  // ── Course detail ─────────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [linkedTools, setLinkedTools] = useState<LinkedTool[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('materials')
  const [discussionHasUnread, setDiscussionHasUnread] = useState(false)

  // ── Suggestions (passed to MaterialsTab) ─────────────────────────────────
  const [suggestionsByModule, setSuggestionsByModule] = useState<Record<string, ToolSuggestion[] | null | undefined>>({})

  // ── Material viewer ───────────────────────────────────────────────────────
  const [viewerMaterialId, setViewerMaterialId] = useState<string | null>(null)

  // ── Tool link modal ───────────────────────────────────────────────────────
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [catalogTools, setCatalogTools] = useState<CatalogTool[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  const [linkingToolId, setLinkingToolId] = useState<string | null>(null)

  // ── Enrollment (students) ─────────────────────────────────────────────────
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())
  const [enrolling, setEnrolling] = useState(false)

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  )

  const canManageSelectedCourse = !!selectedCourse && (isAdmin || selectedCourse.instructor.email === currentUser.email)

  const linkedToolIds = useMemo(() => new Set(linkedTools.map((t) => t.id)), [linkedTools])

  const materialsById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  )
  const viewerMaterial = viewerMaterialId ? materialsById.get(viewerMaterialId) ?? null : null

  // Check if course already has a chatbot tool linked
  const existingBotToolId = useMemo(
    () => linkedTools.find((t) => t.toolType === 'CHATBOT')?.id ?? null,
    [linkedTools]
  )

  const visibleTabs = useMemo(
    () =>
      [
        { id: 'materials' as const, label: 'Materials', icon: BookOpen, visible: true },
        { id: 'study' as const, label: 'Study', icon: Bot, visible: isStudent },
        { id: 'tools' as const, label: 'Tools', icon: Compass, visible: true },
        {
          id: 'discussion' as const,
          label: 'Discussion',
          icon: MessageSquare,
          visible: true,
          unread: discussionHasUnread,
        },
        {
          id: 'submissions' as const,
          label: 'Submissions',
          icon: FileText,
          visible: !isStudent && !!selectedCourse && SEEDED_COURSE_CODES.has(selectedCourse.courseCode),
        },
        { id: 'pulse' as const, label: 'Analytics', icon: BarChart3, visible: !isStudent },
        { id: 'map' as const, label: 'Progress', icon: MapIcon, visible: true },
        { id: 'settings' as const, label: 'Settings', icon: Settings, visible: canManageSelectedCourse },
      ].filter((tab) => tab.visible),
    [canManageSelectedCourse, isStudent, discussionHasUnread, selectedCourse]
  )

  // ── Load courses ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadCourses() {
      setLoading(true)
      setCoursesError(null)
      try {
        const data = await readJson<Course[]>('/api/courses', {
          headers: courseHeaders(currentUser.email),
        })
        if (cancelled) return
        setCourses(data)
        setSelectedCourseId((prev) => {
          if (prev && data.some((c) => c.id === prev)) return prev
          if (courseParam) {
            const matched = data.find((c) => c.courseCode.toLowerCase() === courseParam.toLowerCase())
            if (matched) return matched.id
          }
          return data[0]?.id ?? null
        })
      } catch (err) {
        if (cancelled) return
        setCourses([])
        setSelectedCourseId(null)
        setCoursesError(err instanceof Error ? err.message : 'Failed to load courses')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCourses()
    return () => { cancelled = true }
  }, [courseParam, currentUser.email])

  // ── Load course detail ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCourseId) {
      setMaterials([])
      setLinkedTools([])
      setViewerMaterialId(null)
      return
    }

    let cancelled = false

    async function loadDetails() {
      setDetailLoading(true)
      setDetailsError(null)
      try {
        const [materialsData, toolsData] = await Promise.all([
          readJson<CourseMaterial[]>(`/api/courses/${selectedCourseId}/materials`, {
            headers: courseHeaders(currentUser.email),
          }),
          readJson<LinkedTool[]>(`/api/courses/${selectedCourseId}/tools`, {
            headers: courseHeaders(currentUser.email),
          }),
        ])
        if (cancelled) return
        setMaterials(materialsData)
        setLinkedTools(toolsData)
      } catch (err) {
        if (cancelled) return
        setMaterials([])
        setLinkedTools([])
        setDetailsError(err instanceof Error ? err.message : 'Failed to load course data')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void loadDetails()
    return () => { cancelled = true }
  }, [currentUser.email, selectedCourseId])

  // ── Reset state on course switch ──────────────────────────────────────────
  useEffect(() => {
    setSuggestionsByModule({})
    setViewerMaterialId(null)
    setToolSearch('')
    setActiveTab('materials')
  }, [selectedCourseId])

  // ── Update active tab guard ───────────────────────────────────────────────
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab('materials')
    }
  }, [activeTab, visibleTabs])

  // ── Sandy course context ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (!selectedCourse) {
        localStorage.removeItem('sandbox-course-context')
        window.dispatchEvent(new CustomEvent('sandbox-course-context-changed', { detail: null }))
        return
      }
      const payload: CourseContextPayload = {
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        title: selectedCourse.title,
        description: selectedCourse.description,
        materialsCount: materials.length,
      }
      localStorage.setItem('sandbox-course-context', JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('sandbox-course-context-changed', { detail: payload }))
    } catch { /* ignore */ }
  }, [materials.length, selectedCourse])

  // ── Discussion unread badge ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCourseId) { setDiscussionHasUnread(false); return }
    try {
      const key = getDiscussionUnreadKey(selectedCourseId)
      const lastRead = Number(localStorage.getItem(key) ?? 0)
      setDiscussionHasUnread(lastRead === 0)
    } catch { setDiscussionHasUnread(false) }
  }, [selectedCourseId])

  useEffect(() => {
    if (activeTab === 'discussion') setDiscussionHasUnread(false)
  }, [activeTab])

  // ── open-material event (from study panel) ────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const materialId = (e as CustomEvent<{ materialId: string }>).detail?.materialId
      if (materialId) setViewerMaterialId(materialId)
    }
    window.addEventListener('open-material', handler)
    return () => window.removeEventListener('open-material', handler)
  }, [])

  // ── Student enrollment ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isStudent) return
    fetch('/api/enrollment', { headers: { 'x-demo-user-email': currentUser.email } })
      .then((r) => r.json())
      .then((data: { courses?: { courseId: string }[] }) => {
        if (data.courses) setEnrolledCourseIds(new Set(data.courses.map((c) => c.courseId)))
      })
      .catch(() => {})
  }, [isStudent, currentUser.email])

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function refreshSelectedCourse() {
    if (!selectedCourseId) return
    const [materialsData, toolsData] = await Promise.all([
      readJson<CourseMaterial[]>(`/api/courses/${selectedCourseId}/materials`, {
        headers: courseHeaders(currentUser.email),
      }),
      readJson<LinkedTool[]>(`/api/courses/${selectedCourseId}/tools`, {
        headers: courseHeaders(currentUser.email),
      }),
    ])
    setMaterials(materialsData)
    setLinkedTools(toolsData)
  }

  async function handleCreateCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newCourseForm.courseCode.trim() || !newCourseForm.title.trim()) return

    setCreatingCourse(true)
    try {
      const course = await readJson<Course>('/api/courses', {
        method: 'POST',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({
          courseCode: newCourseForm.courseCode.trim(),
          title: newCourseForm.title.trim(),
          description: newCourseForm.description.trim() || null,
          isPublic: newCourseForm.isPublic,
        }),
      })
      setCourses((prev) => [course, ...prev])
      setSelectedCourseId(course.id)
      setShowNewCourseForm(false)
      setNewCourseForm({ courseCode: '', title: '', description: '', isPublic: true })
      if (isEducator) setShowSetupWizard(true)
    } catch (err) {
      // Surface inline; error is rare
      setCoursesError(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setCreatingCourse(false)
    }
  }

  async function handleToggleEnrollment() {
    if (!selectedCourseId || !isStudent) return
    setEnrolling(true)
    const isEnrolled = enrolledCourseIds.has(selectedCourseId)
    try {
      await fetch(`/api/courses/${selectedCourseId}/enroll`, {
        method: isEnrolled ? 'DELETE' : 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      setEnrolledCourseIds((prev) => {
        const next = new Set(prev)
        if (isEnrolled) next.delete(selectedCourseId)
        else next.add(selectedCourseId)
        return next
      })
    } catch { /* ignore */ }
    finally { setEnrolling(false) }
  }

  async function fetchCatalogTools() {
    setCatalogLoading(true)
    try {
      const payload = await readJson<{ tools: CatalogTool[] }>('/api/tools?limit=100', {
        headers: courseHeaders(currentUser.email),
      })
      setCatalogTools(payload.tools)
    } catch { /* ignore */ }
    finally { setCatalogLoading(false) }
  }

  async function handleLinkTool(toolId: string) {
    if (!selectedCourseId) return
    setLinkingToolId(toolId)
    try {
      await readJson<{ ok: boolean }>(`/api/courses/${selectedCourseId}/tools`, {
        method: 'POST',
        headers: courseHeaders(currentUser.email, true),
        body: JSON.stringify({ toolId }),
      })
      await refreshSelectedCourse()
    } catch { /* ignore */ }
    finally { setLinkingToolId(null) }
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#0033A0]" />
          Loading course command center...
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

          {/* Hero banner */}
          <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#0033A0] via-[#1141ad] to-[#2c66cf] p-6 text-white shadow-lg">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                  {isStudent ? 'Course Workspace' : 'Faculty Course Command Center'}
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {selectedCourse ? `${selectedCourse.courseCode}: ${selectedCourse.title}` : 'Course workspace'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
                  {isStudent
                    ? 'Browse materials, launch AI tools, and track your learning progress.'
                    : 'Upload materials, connect AI tools, monitor module engagement, and keep Sandy grounded in the course context.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100">Courses</div>
                  <div className="mt-1 text-2xl font-semibold">{courses.length}</div>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100">Linked tools</div>
                  <div className="mt-1 text-2xl font-semibold">{linkedTools.length}</div>
                </div>
              </div>
            </div>
          </div>

          {coursesError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {coursesError}
            </div>
          )}

          {/* Empty state (no courses at all) */}
          {courses.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <EmptyState
                icon={GraduationCap}
                title={isEducator ? 'No courses yet' : 'No public courses available'}
                description={
                  isEducator
                    ? 'Create a course to start organizing materials, linking tools, and tracking engagement.'
                    : 'Check back soon for published course spaces from your instructors.'
                }
                actions={
                  isEducator ? (
                    <button
                      type="button"
                      onClick={() => setShowNewCourseForm(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                    >
                      <Plus className="h-4 w-4" />
                      Create your first course
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">

              {/* Sidebar */}
              <CourseSidebar
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelect={setSelectedCourseId}
                isEducator={isEducator}
                showNewCourseForm={showNewCourseForm}
                onOpenNewCourse={() => setShowNewCourseForm((p) => !p)}
                onCancelNewCourse={() => setShowNewCourseForm(false)}
                onCreateCourse={handleCreateCourse}
                newCourseForm={newCourseForm}
                onCourseFieldChange={(field, value) =>
                  setNewCourseForm((p) => ({ ...p, [field]: value }))
                }
                creatingCourse={creatingCourse}
              />

              {/* Main content */}
              <section className="min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">

                {/* Mobile course selector */}
                {selectedCourse && (
                  <div className="lg:hidden mb-4 px-6 pt-6">
                    <select
                      value={selectedCourse.id}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedCourse ? (
                  <>
                    {/* Course header */}
                    <div className="border-b border-gray-200 px-6 py-6">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-semibold text-[#0033A0]">
                              {selectedCourse.courseCode}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedCourse.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {selectedCourse.isPublic ? 'Public' : 'Private'}
                            </span>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              Instructor: {selectedCourse.instructor.name}
                            </span>
                          </div>
                          <h2 className="text-2xl font-semibold text-gray-900">{selectedCourse.title}</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
                            {selectedCourse.description || 'No course description yet. Add one in Settings to help students orient quickly.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isEducator && (
                            <>
                              {existingBotToolId ? (
                                <Link
                                  href={`/tools/${existingBotToolId}?courseId=${encodeURIComponent(selectedCourse.id)}&launch=true`}
                                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                                >
                                  <Sparkles className="h-4 w-4" />
                                  Open Teaching Assistant
                                </Link>
                              ) : (
                                <CourseMagicButton
                                  courseId={selectedCourse.id}
                                  disabled={materials.length === 0}
                                  disabledReason="Upload course materials first"
                                />
                              )}
                              <Link
                                href={`/builder?course=${encodeURIComponent(selectedCourse.courseCode)}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                              >
                                <Sparkles className="h-4 w-4" />
                                Build with AI
                              </Link>
                              <Link
                                href={`/publish?course=${encodeURIComponent(selectedCourse.courseCode)}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                              >
                                Create manually
                              </Link>
                            </>
                          )}
                          {isStudent && (
                            <button
                              type="button"
                              onClick={() => void handleToggleEnrollment()}
                              disabled={enrolling}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                                enrolledCourseIds.has(selectedCourse.id)
                                  ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                                  : 'border-[#0033A0]/30 text-[#0033A0] bg-blue-50 hover:bg-blue-100'
                              }`}
                            >
                              {enrolling ? '…' : enrolledCourseIds.has(selectedCourse.id) ? 'Leave course' : '+ Join course'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tab bar */}
                      <div className="mt-6 flex items-center gap-6 overflow-x-auto">
                        {visibleTabs.map((tab) => {
                          const Icon = tab.icon
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveTab(tab.id)}
                              className={`relative inline-flex items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
                                activeTab === tab.id
                                  ? 'border-[#0033A0] font-semibold text-[#0033A0]'
                                  : 'border-transparent text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {tab.label}
                              {'unread' in tab && tab.unread && (
                                <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-red-500" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {detailsError && (
                      <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                        {detailsError}
                      </div>
                    )}

                    {/* Study tab — always mounted, show/hide via CSS to preserve chat session */}
                    <div className={activeTab === 'study' ? 'block px-6 py-6' : 'hidden'}>
                      <CourseStudyPanel
                        courseId={selectedCourse.id}
                        courseName={selectedCourse.title}
                        courseCode={selectedCourse.courseCode}
                        userEmail={currentUser.email}
                        linkedTools={linkedTools}
                        canManage={canManageSelectedCourse}
                        materials={materials.slice(0, 6).map((m) => ({ title: m.title }))}
                        onLinkTool={() => {
                          setLinkModalOpen(true)
                          void fetchCatalogTools()
                        }}
                      />
                    </div>

                    {/* All other tabs */}
                    <div className={activeTab === 'study' ? 'hidden' : 'block'}>
                      <div className="px-6 py-6">

                        {/* Student study guide (shown on non-study tabs) */}
                        {isStudent && (
                          <div className="mb-6">
                            <StudyGuideCard
                              courseId={selectedCourse.id}
                              title={`${selectedCourse.courseCode} Study Guide`}
                              materials={materials}
                              onOpenMaterial={(id) => setViewerMaterialId(id)}
                            />
                          </div>
                        )}

                        {detailLoading ? (
                          <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Refreshing course data...
                          </div>
                        ) : activeTab === 'materials' ? (
                          <MaterialsTab
                            courseId={selectedCourse.id}
                            courseCode={selectedCourse.courseCode}
                            selectedCourse={selectedCourse}
                            canManage={canManageSelectedCourse}
                            isEducator={isEducator}
                            userEmail={currentUser.email}
                            materials={materials}
                            onRefresh={refreshSelectedCourse}
                            onOpenViewer={(id) => setViewerMaterialId(id)}
                            suggestionsByModule={suggestionsByModule}
                            onSuggestionsFetched={(key, suggestions) =>
                              setSuggestionsByModule((p) => ({ ...p, [key]: suggestions }))
                            }
                          />
                        ) : activeTab === 'tools' ? (
                          <ToolsTab
                            courseId={selectedCourse.id}
                            courseCode={selectedCourse.courseCode}
                            canManage={canManageSelectedCourse}
                            userEmail={currentUser.email}
                            linkedTools={linkedTools}
                            onRefresh={refreshSelectedCourse}
                            onOpenLinkModal={() => {
                              setLinkModalOpen(true)
                              void fetchCatalogTools()
                            }}
                          />
                        ) : activeTab === 'discussion' ? (
                          <DiscussionTab
                            courseId={selectedCourse.id}
                            courseCode={selectedCourse.courseCode}
                            canManage={canManageSelectedCourse}
                            userEmail={currentUser.email}
                            userId={currentUser.id}
                          />
                        ) : activeTab === 'submissions' ? (
                          <SubmissionsTab courseCode={selectedCourse.courseCode} />
                        ) : activeTab === 'pulse' ? (
                          <PulseTab
                            courseCode={selectedCourse.courseCode}
                            courseCodeForBuilder={selectedCourse.courseCode}
                            materials={materials}
                          />
                        ) : activeTab === 'map' ? (
                          <LearningMapTab
                            courseId={selectedCourse.id}
                            canManage={canManageSelectedCourse}
                            userEmail={currentUser.email}
                            isStudent={isStudent}
                            onOpenViewer={(id) => setViewerMaterialId(id)}
                          />
                        ) : activeTab === 'settings' ? (
                          <CourseSettingsTab
                            courseId={selectedCourse.id}
                            course={selectedCourse}
                            canManage={canManageSelectedCourse}
                            userEmail={currentUser.email}
                            onCourseUpdate={(updated) =>
                              setCourses((prev) =>
                                prev.map((c) => (c.id === updated.id ? updated : c))
                              )
                            }
                            onCourseDeleted={() => {
                              setCourses((prev) => prev.filter((c) => c.id !== selectedCourse.id))
                              setSelectedCourseId(null)
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-6 py-12 text-center text-sm text-gray-400">
                    Select a course from the sidebar to get started.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Material viewer overlay */}
      {viewerMaterial && (
        <CourseMaterialViewer
          material={viewerMaterial}
          onClose={() => setViewerMaterialId(null)}
        />
      )}

      {/* Tool link modal */}
      <LinkToolModal
        open={linkModalOpen}
        tools={catalogTools}
        linkedToolIds={linkedToolIds}
        search={toolSearch}
        onSearchChange={setToolSearch}
        onClose={() => { setLinkModalOpen(false); setToolSearch('') }}
        onLink={handleLinkTool}
        loading={catalogLoading}
        linkingToolId={linkingToolId}
        courseCode={selectedCourse?.courseCode}
      />

      {/* Course setup wizard (shown after new course creation for educators) */}
      {showSetupWizard && selectedCourse && (
        <CourseSetupWizard
          course={selectedCourse}
          userEmail={currentUser.email}
          onDone={(updatedMaterials) => {
            if (updatedMaterials) setMaterials(updatedMaterials)
            setShowSetupWizard(false)
          }}
          onSkip={() => setShowSetupWizard(false)}
        />
      )}
    </>
  )
}
