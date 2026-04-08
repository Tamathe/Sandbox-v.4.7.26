'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookOpen,
  ChartLine,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { shouldShowColdStart } from '../../lib/cold-start'
import AttentionBar from './AttentionBar'
import CourseToolRecommendations from './CourseToolRecommendations'
import GradingQueue from './GradingQueue'
import MyStudentsZone from './MyStudentsZone'
import QuickActionsStrip from './QuickActionsStrip'
import ServiceZone from './ServiceZone'
import CoursePostComposer from './CoursePostComposer'
import InlineAnalyticsPanel from './InlineAnalyticsPanel'
import { useFacultyHomeBundle } from '../../hooks/useFacultyHomeBundle'
import CalendarBrief from '../briefing/CalendarBrief'
import TaskBrief from '../briefing/TaskBrief'
import EmailBrief from '../briefing/EmailBrief'
import DaySummary from './DaySummary'
import TomorrowPreview from './TomorrowPreview'
import CoursePrep from './CoursePrep'
import OvernightSandyCard from './OvernightSandyCard'
import TeachingReflectionForm from './TeachingReflectionForm'
import TeachingToday from './TeachingToday'
// Charts moved to /analytics/faculty — replaced by inline insight on homepage

type EducatorProfile = {
  title: string
  toolsPublished: number
  activeStudents: number
  recentActivity: { student: string; tool: string; date: string; score: number }[]
  courseHealth: {
    code: string
    title: string
    enrolled: number
    engagementPct: number
    avgScore: number | null
    atRiskCount: number
  }[]
}

const EDUCATOR_PROFILES_FALLBACK: Record<string, EducatorProfile> = {
  'katie.thompson@uky.edu': {
    title: 'Associate Professor of Engineering',
    toolsPublished: 3,
    activeStudents: 47,
    recentActivity: [],
    courseHealth: [
      { code: 'TEK-100', title: 'Technology & Society', enrolled: 47, engagementPct: 72, avgScore: 83, atRiskCount: 3 },
    ],
  },
  'hubie.ballard@uky.edu': {
    title: 'Associate Professor of Information Systems',
    toolsPublished: 4,
    activeStudents: 89,
    recentActivity: [],
    courseHealth: [
      { code: 'ISC-365', title: 'Database Design & Management', enrolled: 42, engagementPct: 78, avgScore: 81, atRiskCount: 4 },
      { code: 'ISC-460', title: 'Systems Analysis & Project Management', enrolled: 28, engagementPct: 64, avgScore: 76, atRiskCount: 3 },
      { code: 'ISC-201', title: 'Intro to Information Systems', enrolled: 19, engagementPct: 89, avgScore: 87, atRiskCount: 0 },
    ],
  },
  'heath.price@uky.edu': {
    title: 'Platform Administrator, CATS-AI',
    toolsPublished: 5,
    activeStudents: 312,
    recentActivity: [],
    courseHealth: [
      { code: 'Platform-wide', title: 'All Active Courses', enrolled: 312, engagementPct: 75, avgScore: 85, atRiskCount: 12 },
    ],
  },
}

const GENERIC_EDUCATOR: EducatorProfile = {
  title: 'Educator',
  toolsPublished: 2,
  activeStudents: 24,
  recentActivity: [],
  courseHealth: [],
}

type BottomTab = 'courses' | 'students' | 'service'

export default function FacultyHomepage({ evaluatorMode }: { evaluatorMode: boolean }) {
  const { currentUser, setCurrentUser, allUsers } = useAuth()
  const isEducator = currentUser.role === 'EDUCATOR'
  const isAdmin = currentUser.role === 'ADMIN'

  const {
    briefing,
    dashboard,
    engagementCourses,
    conceptGaps,
    v2Data,
    dayLifecycle,
    overnightTasks,
    loading,
    briefingLoading,
    v2Loading,
  } = useFacultyHomeBundle(currentUser.email)

  const [recentDraft, setRecentDraft] = useState<{ id: string; name: string } | null>(null)
  const [pendingGradeCount, setPendingGradeCount] = useState<{ courseId: string; courseCode: string; count: number }[]>([])
  const [focusedEmailId, setFocusedEmailId] = useState<string | null>(null)
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set())
  const [bottomTab, setBottomTab] = useState<BottomTab>('courses')
  const [tabAutoSelected, setTabAutoSelected] = useState(false)
  const [nudgeSuggestions, setNudgeSuggestions] = useState<Array<{
    courseId: string; courseCode: string; type: string; audience: string
    suggestedTitle: string; suggestedBody: string; reason: string; targetStudentIds?: string[]
  }>>([])

  // Grading queue modal
  const [gradingQueueOpen, setGradingQueueOpen] = useState(false)

  // Day lifecycle
  const [showReflection, setShowReflection] = useState(false)
  const currentHour = new Date().getHours()
  const showDaySummary = currentHour >= 16 // 4 PM onwards
  const showTomorrowPreview = currentHour >= 16
  const showCoursePrep = currentHour >= 15 // 3 PM onwards

  // Course Post Composer state
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerPrefill, setComposerPrefill] = useState<{
    courseId?: string
    type?: 'ANNOUNCEMENT' | 'NUDGE' | 'REMINDER' | 'RESOURCE'
    audience?: 'ALL' | 'AT_RISK' | 'SPECIFIC'
    targetStudentIds?: string[]
    body?: string
    title?: string
    lockCourse?: boolean
  }>({})
  const [composerCourses, setComposerCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])

  useEffect(() => {
    let cancelled = false

    fetch('/api/tools?published=draft&creator=me&limit=1', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled) return
        const tools = data?.tools ?? []
        const draft = tools.find((tool: { id: string; name: string; published?: boolean; deployment?: { state?: string } }) =>
          tool?.deployment?.state
            ? tool.deployment.state === 'draft'
            : tool?.published === false,
        )
        if (draft) {
          setRecentDraft({ id: draft.id, name: draft.name })
        } else {
          setRecentDraft(null)
        }
      })
      .catch(() => {
        if (!cancelled) setRecentDraft(null)
      })

    return () => {
      cancelled = true
    }
  }, [currentUser.email])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    fetch('/api/courses', { headers: { 'x-demo-user-email': currentUser.email }, signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(async (data) => {
        if (cancelled) return
        const courses: { id: string; courseCode: string; title: string }[] = Array.isArray(data) ? data : (data?.courses ?? [])

        // Reuse courses for composer dropdown (eliminates duplicate fetch)
        setComposerCourses(courses)

        const results = await Promise.all(
          courses.map(async (course) => {
            const response = await fetch(`/api/courses/${course.id}/gradebook`, {
              headers: { 'x-demo-user-email': currentUser.email },
              signal: controller.signal,
            })
            if (!response.ok) return null
            const entries: { status: string }[] = await response.json()
            const count = entries.filter(entry => ['PENDING_REVIEW', 'AI_DRAFT'].includes(entry.status)).length
            return count > 0 ? { courseId: course.id, courseCode: course.courseCode, count } : null
          }),
        )

        if (!cancelled) {
          setPendingGradeCount(results.filter(Boolean) as { courseId: string; courseCode: string; count: number }[])
        }
      })
      .catch((err) => {
        if (!cancelled && err?.name !== 'AbortError') setPendingGradeCount([])
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [currentUser.email])

  // Listen for "Post announcement" from QuickActionsStrip → open composer instead of Sandy
  useEffect(() => {
    function handleSandyTool(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.tool === 'post_announcement') {
        setComposerPrefill({})
        setComposerOpen(true)
      }
    }
    window.addEventListener('uky-sandy-tool', handleSandyTool)
    return () => window.removeEventListener('uky-sandy-tool', handleSandyTool)
  }, [])

  // Fetch Sandy nudge suggestions (previously inside NudgeSuggestionsCard)
  useEffect(() => {
    if (!currentUser?.email) return
    const controller = new AbortController()
    fetch('/api/course-posts/suggestions', {
      headers: { 'x-demo-user-email': currentUser.email },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : { suggestions: [] })
      .then(data => setNudgeSuggestions(data.suggestions || []))
      .catch((err) => { if (err?.name !== 'AbortError') setNudgeSuggestions([]) })
    return () => controller.abort()
  }, [currentUser?.email])

  const handleSendNudge = useCallback((student: { name: string; flag: string; course: string; detail: string }) => {
    // Find course ID by code
    const matchedCourse = composerCourses.find(c => c.courseCode === student.course)
    const flagLabel = student.flag === 'grade_drop' ? 'recent scores have dipped'
      : student.flag === 'inactive' ? `hasn't been active recently`
      : student.flag === 'attendance' ? 'attendance has been low'
      : 'may need some extra support'

    setComposerPrefill({
      courseId: matchedCourse?.id,
      type: 'NUDGE',
      audience: 'SPECIFIC',
      body: `Hi ${student.name.split(' ')[0]}, I noticed your ${flagLabel} in ${student.course}. I'd love to help — can you come by office hours today? We can work through things together.`,
      lockCourse: !!matchedCourse,
    })
    setComposerOpen(true)
  }, [composerCourses])

  const handleComposerFromSuggestion = useCallback((prefill: {
    courseId: string
    type: string
    audience: string
    body: string
    title?: string
    targetStudentIds?: string[]
    lockCourse: boolean
  }) => {
    setComposerPrefill({
      courseId: prefill.courseId,
      type: prefill.type as 'ANNOUNCEMENT' | 'NUDGE' | 'REMINDER' | 'RESOURCE',
      audience: prefill.audience as 'ALL' | 'AT_RISK' | 'SPECIFIC',
      body: prefill.body,
      title: prefill.title,
      targetStudentIds: prefill.targetStudentIds,
      lockCourse: prefill.lockCourse,
    })
    setComposerOpen(true)
  }, [])

  const syntheticEducator = EDUCATOR_PROFILES_FALLBACK[currentUser.email] ?? GENERIC_EDUCATOR
  const educatorProfile = {
    ...syntheticEducator,
    toolsPublished: dashboard?.toolsPublished ?? (loading ? 0 : syntheticEducator.toolsPublished),
    activeStudents: dashboard?.activeStudents ?? (loading ? 0 : syntheticEducator.activeStudents),
    courseHealth: dashboard?.courseHealth ?? (loading ? [] : syntheticEducator.courseHealth),
  }

  const showExecutiveBriefing = isAdmin && (educatorProfile.toolsPublished === 0 || educatorProfile.toolsPublished === undefined)
  const educatorCourseCount = educatorProfile.courseHealth.length
  const showColdStartHero =
    isEducator &&
    !loading &&
    shouldShowColdStart(currentUser.email, educatorCourseCount) &&
    !evaluatorMode

  const urgentEmails = (briefing?.emails ?? [])
    .filter(email => !email.isRead && (email.triage?.bucket === 'decision' || email.category === 'urgent'))
    .map(email => ({
      id: email.id,
      fromName: email.fromName || email.fromAddress.split('@')[0],
      subject: email.subject,
      summary: email.triage?.summary,
    }))

  const overdueTasks = (briefing?.tasks ?? [])
    .filter(task => task.isOverdue)
    .map(task => ({ id: task.id, title: task.title }))

  const handleTaskComplete = useCallback((taskId: string) => {
    setCompletedTaskIds(previous => new Set(previous).add(taskId))
    fetch(`/api/assistant/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(() => {})
  }, [currentUser.email])

  const activeOverdueTasks = overdueTasks.filter(task => !completedTaskIds.has(task.id))
  const courseHealthPreview = educatorProfile.courseHealth.slice(0, 3)
  const showAllCoursesLink = educatorProfile.courseHealth.length > 3

  useEffect(() => {
    if (!briefing || v2Loading) return

    window.dispatchEvent(
      new CustomEvent('uky-briefing-ready', {
        detail: {
          ...briefing,
          facultyHomepageV2: v2Data,
        },
      }),
    )
  }, [briefing, v2Data, v2Loading])

  if (showExecutiveBriefing) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#0033A0] to-blue-700 p-6 text-white shadow-md">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <GraduationCap className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">University of Kentucky</h2>
              <p className="mt-1 text-sm text-blue-200">
                AI-native teaching platform - faculty build tools, students use them to learn. Every interaction is measured.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              { label: 'Students', value: (dashboard?.activeStudents ?? educatorProfile.activeStudents).toLocaleString(), icon: Users },
              { label: 'AI Sessions', value: '0', icon: Activity },
              { label: 'Published Tools', value: (dashboard?.toolsPublished ?? 0).toLocaleString(), icon: Layers },
              { label: 'Avg Score', value: educatorProfile.courseHealth[0]?.avgScore ? `${educatorProfile.courseHealth[0].avgScore}%` : '-', icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl bg-white/20 p-3 text-center">
                <Icon className="mx-auto mb-1 size-4 text-white/70" />
                <div className="text-2xl font-extrabold leading-tight">{value}</div>
                <div className="mt-0.5 text-xs text-blue-200">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#0033A0]/20 bg-gradient-to-br from-[#0033A0]/5 to-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <GraduationCap className="size-4 text-[#0033A0]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#0033A0]">Institutional Overview</span>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-gray-600">
              UK&apos;s AI-native teaching platform - faculty build tools, students learn with them.
            </p>
            <div className="space-y-1.5">
              <Link href="/analytics/faculty" className="flex items-center justify-between rounded-lg bg-[#0033A0] px-3 py-2 text-sm text-white transition-colors hover:bg-[#002280]">
                <div className="flex items-center gap-2"><BarChart2 className="size-4" /><span className="font-semibold">Platform Analytics</span></div>
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/admin?tab=economics" className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                <div className="flex items-center gap-2"><DollarSign className="size-4 text-gray-500" /><span className="font-semibold">Cost &amp; Economics</span></div>
                <ArrowRight className="size-4 text-gray-400" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <Eye className="size-4 text-gray-400" />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Evaluate the Platform</span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-500">
              Switch perspectives to see how each role experiences the platform.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const student = allUsers.find(user => user.role === 'STUDENT')
                  if (student) setCurrentUser(student)
                }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors hover:border-[#0033A0]/30 hover:bg-blue-50"
              >
                <span className="flex items-center gap-2 font-medium text-gray-700"><span className="size-2 rounded-full bg-purple-500" />Student view - Tiana The</span>
                <ArrowRight className="size-3 text-gray-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const educator = allUsers.find(user => user.role === 'EDUCATOR')
                  if (educator) setCurrentUser(educator)
                }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors hover:border-[#0033A0]/30 hover:bg-blue-50"
              >
                <span className="flex items-center gap-2 font-medium text-gray-700"><span className="size-2 rounded-full bg-emerald-500" />Faculty view - Katie Thompson</span>
                <ArrowRight className="size-3 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showColdStartHero) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-12">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome, {currentUser.name.split(' ')[0]}.
          </h1>
          <p className="mt-3 max-w-xl text-lg text-gray-600">
            Start by creating your first course - just give it a name, and we&apos;ll handle the rest.
          </p>
          <Link
            href="/courses"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-[#002480]"
          >
            Create a Course
            <ArrowRight className="size-5" />
          </Link>
          <p className="mt-2 text-sm text-gray-400">Takes about 30 seconds</p>
        </div>
        <div className="flex gap-4">
          {[
            { icon: FileText, title: 'Upload your syllabus', desc: "We'll auto-generate your course objectives" },
            { icon: Wrench, title: 'Build interactive tools', desc: 'AI creates quizzes, simulations, and study aids' },
            { icon: ChartLine, title: 'Track student engagement', desc: 'Real-time analytics from day one' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex-1 rounded-xl bg-gray-50 p-6">
              <div className="mb-1.5 flex items-center gap-2">
                <Icon className="size-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-500">{title}</p>
              </div>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- Compute badge counts for bottom tabs ---
  const studentsBadge =
    (v2Data?.advisees.withHolds ?? 0) +
    (v2Data?.recommendations ?? []).filter(r => r.daysUntilDue >= 0 && r.daysUntilDue <= 7).length
  const serviceBadge =
    (v2Data?.committees.reduce((s, c) => s + c.actionItemsDue, 0) ?? 0) +
    (v2Data?.assessmentDeadlines ?? []).filter(d => {
      const ms = new Date(d.dueDate).getTime() - Date.now()
      return ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000
    }).length

  // Auto-select the tab with the most urgent badge on first data load
  useEffect(() => {
    if (tabAutoSelected || !v2Data) return
    const coursesBadge = educatorProfile.courseHealth.filter(c => c.atRiskCount > 0).length
    const maxBadge = Math.max(coursesBadge, studentsBadge, serviceBadge)
    if (maxBadge > 0) {
      if (studentsBadge === maxBadge) setBottomTab('students')
      else if (serviceBadge === maxBadge) setBottomTab('service')
      // else stays on courses (default)
    }
    setTabAutoSelected(true)
  }, [v2Data, tabAutoSelected, studentsBadge, serviceBadge, educatorProfile.courseHealth])

  // Compute a text insight to replace the full charts
  const engagementInsight = (() => {
    if (engagementCourses.length === 0) return null
    const worst = engagementCourses.reduce((a, b) =>
      (a.weeks?.[a.weeks.length - 1]?.engagement ?? 100) < (b.weeks?.[b.weeks.length - 1]?.engagement ?? 100) ? a : b
    )
    const latestPct = worst.weeks?.[worst.weeks.length - 1]?.engagement
    const prevPct = worst.weeks?.[worst.weeks.length - 2]?.engagement
    if (latestPct == null || prevPct == null) return null
    const delta = latestPct - prevPct
    if (Math.abs(delta) < 3) return null
    return {
      courseId: worst.id,
      course: worst.name,
      direction: delta < 0 ? 'dropped' as const : 'increased' as const,
      amount: Math.abs(Math.round(delta)),
      pct: Math.round(latestPct),
    }
  })()

  const pageReady = !briefingLoading && !v2Loading && !loading

  return (
    <div className="space-y-6">
      {/* --- Greeting + First-Up --- */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">
          {showDaySummary
            ? `Wrapping up, ${currentUser.name.split(' ')[0]}`
            : `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${currentUser.name.split(' ')[0]}`}
        </h1>
        {briefing?.calendar && briefing.calendar.length > 0 && (() => {
          const now = Date.now()
          const next = briefing.calendar
            .map(e => ({ ...e, _start: new Date(e.startTime).getTime() }))
            .filter(e => e._start > now)
            .sort((a, b) => a._start - b._start)[0]
          if (!next) return null
          const mins = Math.round((next._start - now) / 60_000)
          const timeLabel = mins < 60
            ? `${mins} min`
            : mins < 120
              ? `1 hr ${mins - 60} min`
              : `${Math.floor(mins / 60)} hrs`
          return (
            <p className="mt-1 text-sm text-gray-500">
              First up: <span className="font-medium text-gray-700">{next.title}</span> in {timeLabel}
              {next.location ? <span className="text-gray-400"> — {next.location}</span> : null}
            </p>
          )
        })()}
      </div>

      {/* Attention Bar hidden for demo */}

      {/* --- Quick Actions --- */}
      {!pageReady ? (
        <QuickActionsSkeleton />
      ) : v2Data ? (
        <QuickActionsStrip quickActions={v2Data.quickActions} onOpenGradingQueue={() => setGradingQueueOpen(true)} recentDraft={recentDraft && !evaluatorMode ? recentDraft : undefined} />
      ) : null}

      {/* --- Teaching Today (morning section, 6 AM – 2 PM) --- */}
      {pageReady && currentHour >= 6 && currentHour < 14 && briefing?.calendar && (() => {
        const todayClasses = briefing.calendar
          .filter(e => e.category === 'lecture' || e.category === 'office-hours')
          .map(e => {
            const courseCode = e.title.match(/\b[A-Z]{2,5}-?\d{3,4}\b/)?.[0] ?? ''
            const health = educatorProfile.courseHealth.find(c => c.code === courseCode)
            const gradeInfo = pendingGradeCount.find(g => g.courseCode === courseCode)
            return {
              courseId: health ? '' : '',
              courseCode,
              courseTitle: health?.title ?? e.title,
              startTime: typeof e.startTime === 'string' ? e.startTime : new Date(e.startTime).toISOString(),
              endTime: typeof e.endTime === 'string' ? e.endTime : new Date(e.endTime).toISOString(),
              location: e.location ?? null,
              atRiskCount: health?.atRiskCount ?? 0,
              pendingSubmissions: gradeInfo?.count ?? 0,
              enrolled: health?.enrolled ?? 0,
            }
          })
        return todayClasses.length > 0 ? <TeachingToday classes={todayClasses} /> : null
      })()}

      {/* --- Cross-Course Grading Queue Modal --- */}
      <GradingQueue open={gradingQueueOpen} onClose={() => setGradingQueueOpen(false)} userEmail={currentUser.email} />

      {/* --- Course Post Composer Modal --- */}
      <CoursePostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        courses={composerCourses}
        prefill={composerPrefill}
      />

      {/* --- Email / Calendar / Tasks (always visible) --- */}
      {!pageReady ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><LoadingSkeleton label="Email" /></div>
          <div className="space-y-4">
            <LoadingSkeleton label="Calendar" />
            <LoadingSkeleton label="Tasks" />
          </div>
        </div>
      ) : briefing ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EmailBrief emails={briefing.emails} focusedEmailId={focusedEmailId} />
          </div>
          <div className="space-y-4">
            <CalendarBrief events={briefing.calendar} />
            <TaskBrief tasks={briefing.tasks} />
          </div>
        </div>
      ) : null}

      {/* --- Overnight Sandy Results (morning) --- */}
      {pageReady && overnightTasks.length > 0 && (
        <OvernightSandyCard tasks={overnightTasks} />
      )}

      {/* --- Day Lifecycle: Summary, Tomorrow, Prep (time-gated) --- */}
      {pageReady && dayLifecycle && showDaySummary && (
        <DaySummary
          data={dayLifecycle.daySummary}
          onPrepWithSandy={() => {
            window.dispatchEvent(new CustomEvent('uky-sandy-prefill', {
              detail: { message: 'Help me prepare for tomorrow. What should I focus on?', autoSend: true },
            }))
          }}
        />
      )}

      {pageReady && dayLifecycle && showTomorrowPreview && (
        <TomorrowPreview data={dayLifecycle.tomorrowPreview} />
      )}

      {pageReady && dayLifecycle && showCoursePrep && dayLifecycle.coursePrep.length > 0 && (
        <CoursePrep
          courses={dayLifecycle.coursePrep}
          onAskSandyToPrep={(courseCode, checks) => {
            const incomplete = checks.filter(c => !c.done).map(c => c.label).join(', ')
            window.dispatchEvent(new CustomEvent('uky-sandy-prefill', {
              detail: {
                message: `Help me prepare for tomorrow's ${courseCode} class. Outstanding items: ${incomplete || 'none'}. Suggest what I should cover and any adjustments.`,
                autoSend: true,
              },
            }))
          }}
        />
      )}

      {/* --- Teaching Reflection (after class time or end of day) --- */}
      {pageReady && showReflection && (
        <TeachingReflectionForm
          courses={composerCourses}
          onClose={() => setShowReflection(false)}
        />
      )}

      {/* --- Tabbed Bottom Section --- */}
      {pageReady && (
        <div className="space-y-3">
          <div className="flex items-center gap-1 border-b border-gray-200">
            {([
              { key: 'courses' as BottomTab, label: 'Your Courses', icon: BookOpen, badge: educatorProfile.courseHealth.filter(c => c.atRiskCount > 0).length },
              { key: 'students' as BottomTab, label: 'Students', icon: Users, badge: studentsBadge },
              { key: 'service' as BottomTab, label: 'Service', icon: Activity, badge: serviceBadge },
            ]).map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                type="button"
                onClick={() => setBottomTab(key)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                  bottomTab === key
                    ? 'border-b-2 border-[#0033A0] text-[#0033A0]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* --- Tab: Your Courses --- */}
          {bottomTab === 'courses' && (
            <div className="space-y-3">
              {courseHealthPreview.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {courseHealthPreview.map((course, index) => {
                    const intel = v2Data?.courseIntelligence?.find((ci) => ci.code === course.code)
                    return (
                      <CourseCard
                        key={`${course.code}-${index}`}
                        course={course}
                        intelligence={intel ?? null}
                      />
                    )
                  })}
                </div>
              ) : null}

              {/* Suggested tools for courses */}
              <CourseToolRecommendations />

              {/* Inline analytics panel — replaces static insight line with expandable diagnostic */}
              {engagementInsight ? (
                <InlineAnalyticsPanel
                  courseCode={engagementInsight.course}
                  courseId={engagementInsight.courseId}
                  direction={engagementInsight.direction}
                  amount={engagementInsight.amount}
                  pct={engagementInsight.pct}
                  onPostAction={(payload) => {
                    setComposerPrefill({
                      courseId: String(payload.courseId ?? ''),
                      type: (payload.type as 'ANNOUNCEMENT' | 'NUDGE' | 'REMINDER' | 'RESOURCE') ?? 'REMINDER',
                      body: String(payload.body ?? ''),
                    })
                    setComposerOpen(true)
                  }}
                  onNudgeAction={(payload) => {
                    setComposerPrefill({
                      courseId: String(payload.courseId ?? ''),
                      type: 'NUDGE',
                      audience: (payload.audience as 'ALL' | 'AT_RISK' | 'SPECIFIC') ?? 'AT_RISK',
                    })
                    setComposerOpen(true)
                  }}
                />
              ) : courseHealthPreview.length > 0 ? (
                <div className="flex items-center justify-end">
                  <Link href="/analytics/faculty" className="flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline">
                    Full analytics <ArrowRight className="size-3" />
                  </Link>
                </div>
              ) : null}
            </div>
          )}

          {/* --- Tab: Students --- */}
          {bottomTab === 'students' && v2Data && (
            <MyStudentsZone
              data={{
                advisees: v2Data.advisees,
                officeHours: v2Data.officeHours,
                flaggedStudents: v2Data.flaggedStudents,
                recommendations: v2Data.recommendations,
              }}
              onSendNudge={handleSendNudge}
            />
          )}

          {/* --- Tab: Committees & Deadlines --- */}
          {bottomTab === 'service' && v2Data && (
            <ServiceZone
              data={{
                committees: v2Data.committees,
                departmentFeed: v2Data.departmentFeed,
                assessmentDeadlines: v2Data.assessmentDeadlines,
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Enhanced Course Card (Features 4, 5, 6) ─── */

function CourseCard({ course, intelligence }: {
  course: { code: string; title: string; enrolled: number; engagementPct: number; avgScore: number | null; atRiskCount: number }
  intelligence: {
    code: string
    engagementBreakdown: { assignmentCompletion: number; toolActivity: number; loginFrequency: number } | null
    atRiskStudents: { name: string; flag: string; detail: string }[]
    lastTermEngagement: number | null
  } | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const isHealthy = course.atRiskCount === 0 && course.engagementPct >= 80
  const atRiskStudents = intelligence?.atRiskStudents ?? []
  const breakdown = intelligence?.engagementBreakdown ?? null
  const lastTerm = intelligence?.lastTermEngagement ?? null

  // Feature 6: vs. last term delta
  const delta = lastTerm != null ? course.engagementPct - lastTerm : null
  const deltaAbs = delta != null ? Math.abs(delta) : 0

  return (
    <div className={`rounded-2xl border bg-white p-3 ${course.atRiskCount > 0 ? 'border-l-4 border-l-red-400 border-t-gray-200 border-r-gray-200 border-b-gray-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link href="/courses" className="text-sm font-bold text-[#0033A0] hover:underline">{course.code}</Link>
          <p className="mt-0.5 text-xs text-gray-500">{course.title}</p>
        </div>
        {isHealthy ? (
          <span className="text-xs font-medium text-green-600">On track</span>
        ) : course.atRiskCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
          >
            {course.atRiskCount} at risk
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span><span className="font-semibold text-gray-700">{course.enrolled}</span> enrolled</span>
        <span className="text-gray-300">·</span>
        {/* Feature 4: Clickable engagement % with tooltip */}
        <span className="relative">
          <button
            type="button"
            onClick={() => setShowTooltip(!showTooltip)}
            onBlur={() => setTimeout(() => setShowTooltip(false), 150)}
            className="cursor-pointer hover:underline"
          >
            <span className={`font-semibold ${course.engagementPct >= 80 ? 'text-green-700' : course.engagementPct >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
              {course.engagementPct}%
            </span> engaged
          </button>
          {/* Feature 6: vs. last term inline */}
          {delta != null && deltaAbs > 2 && (
            <span className={`ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta > 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {delta > 0 ? '+' : ''}{delta}% vs last term
            </span>
          )}
          {/* Stable engagement — no label needed, silence is the signal */}
          {/* Engagement breakdown tooltip */}
          {showTooltip && breakdown && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
              <p className="text-xs font-bold text-gray-900 mb-2">Engagement: {course.engagementPct}%</p>
              <div className="h-px bg-gray-200 mb-2" />
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assignment completion</span>
                  <span className="font-semibold text-gray-900">{breakdown.assignmentCompletion}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tool session activity</span>
                  <span className="font-semibold text-gray-900">{breakdown.toolActivity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Login frequency</span>
                  <span className="font-semibold text-gray-900">{breakdown.loginFrequency}%</span>
                </div>
              </div>
              <div className="h-px bg-gray-200 mt-2 mb-1.5" />
              <p className="text-[10px] text-gray-400">Weighted average (40/30/30)</p>
            </div>
          )}
        </span>
      </div>

      {/* Feature 5: At-risk student names (expandable) */}
      {expanded && atRiskStudents.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5">
          {atRiskStudents.map((student) => (
            <div key={student.name} className="flex items-center gap-2 text-xs">
              <span className="size-1.5 shrink-0 rounded-full bg-red-400" />
              <span className="font-medium text-gray-900">{student.name}</span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-500">{student.flag} ({student.detail})</span>
            </div>
          ))}
          <Link
            href="/analytics/faculty"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0033A0] hover:underline"
          >
            View all in analytics <ArrowRight className="size-3" />
          </Link>
        </div>
      )}
    </div>
  )
}

function AttentionBarSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className="h-4 w-48 rounded bg-gray-200" />
      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 3, 4].map(number => (
          <div key={number} className="h-9 w-40 rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  )
}

function QuickActionsSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden py-3">
      {[1, 2, 3, 4, 5].map(number => (
        <div key={number} className="h-10 w-36 animate-pulse rounded-full bg-gray-100" />
      ))}
    </div>
  )
}


function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-3/4 rounded bg-gray-100" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
      </div>
      <span className="sr-only">Loading {label}...</span>
    </div>
  )
}
