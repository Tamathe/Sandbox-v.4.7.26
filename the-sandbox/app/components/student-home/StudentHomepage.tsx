'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, Play } from 'lucide-react'
import { apiFetch } from '../../lib/api-client'
import MetricExplainer from '../shared/MetricExplainer'
import { useAuth } from '../../lib/auth-context'
import { getStudentHomeData, getTimePhase, getPhaseQuickActions, computeWindDownData } from '../../lib/student-home-data'
import BeaconCard from './BeaconCard'
import RightNowCard from './RightNowCard'
import SandyBriefing from './SandyBriefing'
import CampusLife from './CampusLife'
import EmailBrief from '../briefing/EmailBrief'
import CalendarBrief from '../briefing/CalendarBrief'
import TaskBrief from '../briefing/TaskBrief'
import { useBriefing } from '../../hooks/useBriefing'
import { useStudentHomeBundle } from '../../hooks/useStudentHomeBundle'
import QuickActionChips from './QuickActionChips'
import UKNowFeed from './UKNowFeed'
import AnnouncementsBanner from './AnnouncementsBanner'
import CoursePostsFeed from './CoursePostsFeed'
import LearningRecapCard from '../LearningRecapCard'
import ToolCard from '../ToolCard'
import FlashcardQuickReview from './FlashcardQuickReview'
import TomorrowPreview from './TomorrowPreview'
import WindDownCard from './WindDownCard'
import DiningWidget from './DiningWidget'
import StudySpotWidget from './StudySpotWidget'
import CampusSummaryRow from './CampusSummaryRow'
import LearningProfileCard from './LearningProfileCard'
import type { LibraryEntryWithTool } from '../../lib/types'
import type { CampusLifeItem, SandyInsight, SmartStudyTarget, TimePhase } from '../../lib/student-home-data'
import { computeSmartStudyTarget } from '../../lib/student-home-data'
import type { WeakConcept } from '../../lib/student-home/gap-planner'

interface EnrollmentCourse {
  courseId: string
  courseCode: string
  title: string
  instructorName: string
  mastered: number
  struggling: number
  total: number
  nextObjective?: { title: string }
}

// Section ordering per phase
const SECTION_ORDER: Record<TimePhase, string[]> = {
  morning: [
    'greeting', 'beacon', 'right-now-card', 'quick-actions', 'learning-profile',
    'top-strip', 'sandy-briefing', 'course-posts', 'courses',
    'announcements', 'campus-news', 'continue-tools', 'learning-recap',
  ],
  afternoon: [
    'greeting', 'beacon', 'quick-actions', 'learning-profile',
    'sandy-briefing', 'course-posts', 'courses', 'top-strip',
    'campus-news', 'continue-tools', 'announcements', 'learning-recap',
  ],
  evening: [
    'greeting', 'beacon', 'tomorrow-preview', 'quick-actions', 'learning-profile',
    'sandy-briefing', 'course-posts', 'courses', 'learning-recap',
    'top-strip', 'campus-news', 'announcements', 'continue-tools',
  ],
  night: [
    'greeting', 'beacon', 'tomorrow-preview', 'wind-down', 'learning-recap',
  ],
}

// Subtle background tint per phase
const PHASE_BG: Record<TimePhase, string> = {
  morning: 'bg-gradient-to-b from-amber-50/30 to-transparent',
  afternoon: '',
  evening: 'bg-gradient-to-b from-slate-50/40 to-transparent',
  night: 'bg-gradient-to-b from-indigo-50/30 to-transparent',
}

// Focus View: per-phase section order
const FOCUS_ORDER_BY_PHASE: Record<TimePhase, readonly string[]> = {
  morning:   ['greeting', 'beacon', 'top-strip', 'courses'],
  afternoon: ['greeting', 'beacon', 'courses', 'quick-actions'],
  evening:   ['greeting', 'beacon', 'courses', 'tomorrow-preview'],
  night:     ['greeting', 'beacon'],
}

export default function StudentHomepage() {
  const { currentUser } = useAuth()
  const email = currentUser?.email || ''
  const userName = currentUser?.name || 'Student'

  // Phase state with visibility-change refresh
  const [phase, setPhase] = useState<TimePhase>(() => getTimePhase())

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        setPhase(getTimePhase())
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  const simData = useMemo(() => getStudentHomeData(userName), [userName])
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6

  // Phase-specific quick actions
  const phaseQuickActions = useMemo(
    () => getPhaseQuickActions(phase, simData.stakes),
    [phase, simData.stakes]
  )

  // Wind-down data (night phase)
  const windDownData = useMemo(() => {
    if (phase !== 'night') return null
    const classCount = simData.timeline.filter(e => e.type === 'class').length
    return computeWindDownData(new Date().getDay(), classCount)
  }, [phase, simData.timeline])

  // Briefing data (email, calendar, tasks)
  const { briefing, loading: briefingLoading } = useBriefing()

  // Flashcard Quick Review modal
  const [showQuickReview, setShowQuickReview] = useState(false)

  // Single bundle request replaces 6 individual API calls
  const bundle = useStudentHomeBundle(email)

  // ─── Focus View (grandfathering handled server-side in home-bundle) ─────
  const [homepageView, setHomepageView] = useState<'focus' | 'full'>('focus')
  const viewInitialized = useRef(false)

  useEffect(() => {
    if (bundle.loading || viewInitialized.current) return
    viewInitialized.current = true
    setHomepageView(bundle.homepageView as 'focus' | 'full')
  }, [bundle.loading, bundle.homepageView])

  const toggleView = useCallback(() => {
    const prev = homepageView
    const next = prev === 'focus' ? 'full' : 'focus'
    setHomepageView(next)
    apiFetch(email, '/api/sandy/preferences', {
      method: 'PUT',
      body: JSON.stringify({ homepageView: next }),
    }).catch(() => setHomepageView(prev))
  }, [homepageView, email])

  // ─── Sandy First-Run Intro ────────────────────────────────────────────────
  const sandyIntroSent = useRef(false)
  const [sandyIntroSeen, setSandyIntroSeen] = useState(false)

  // Sync from bundle on first load
  useEffect(() => {
    if (!bundle.loading) setSandyIntroSeen(bundle.sandyIntroSeen)
  }, [bundle.loading, bundle.sandyIntroSeen])
  const enrollmentCourses = bundle.enrollments
  const enrollmentLoading = bundle.enrollmentLoading
  const libraryEntries = bundle.draftTools as unknown as LibraryEntryWithTool[]
  const extraCampusItems = useMemo<CampusLifeItem[]>(() =>
    bundle.uknowEvents.map(a => ({
      id: `uknow-${a.id}`,
      type: 'event' as const,
      title: a.title,
      subtitle: a.sectionLabel || 'Campus Event',
      badge: 'UKNow',
      badgeColor: 'bg-blue-100 text-blue-700',
    })),
    [bundle.uknowEvents],
  )

  // ─── Smart Study Launcher ─────────────────────────────────────────────────
  const srDueCount = bundle.srNudge.dueCount

  // Weak concepts derived from enrollment data (shared by smart study + gap planner)
  const weakConcepts = useMemo<WeakConcept[]>(() =>
    enrollmentCourses
      .filter(c => c.struggling > 0)
      .map(c => ({ courseCode: c.courseCode, concept: (c as EnrollmentCourse & { nextObjective?: { title: string } }).nextObjective?.title || 'Key concepts', mastery: c.total > 0 ? Math.round((c.mastered / c.total) * 100) : 50 })),
    [enrollmentCourses]
  )

  const smartStudyTarget = useMemo<SmartStudyTarget | null>(() => {
    const enrollments = enrollmentCourses.map(c => ({ id: c.courseId, courseCode: c.courseCode }))
    return computeSmartStudyTarget(simData.stakes, srDueCount, enrollments, weakConcepts)
  }, [simData.stakes, srDueCount, enrollmentCourses, weakConcepts])

  // ─── Study-action nudges (SR flashcards, active rooms, exam prep) ────────
  // Derived from bundle data instead of 3 separate API calls

  const studyActionInsights = useMemo<SandyInsight[]>(() => {
    if (bundle.loading) return []
    const insights: SandyInsight[] = []

    // Email insights (render first — UK Blue, not orange)
    const emailInsights = bundle.emailInsights as { title: string; detail: string; actionLabel: string; sandyMessage: string; urgency: string }[]
    for (const ei of (emailInsights ?? [])) {
      insights.push({
        id: `email-action-${ei.urgency}`,
        category: 'email-action',
        title: ei.title,
        body: ei.detail,
        action: { label: ei.actionLabel, href: ei.sandyMessage },
        actionType: 'sandy-message',
      })
    }

    // SR flashcard nudge
    const dueCount = bundle.srNudge.dueCount
    if (dueCount > 0) {
      const overdueCount = bundle.srNudge.overdueCount
      insights.push({
        id: 'study-action-sr',
        category: 'study-action',
        title: `${dueCount} flashcard${dueCount !== 1 ? 's' : ''} due for review`,
        body: overdueCount > 0
          ? `${overdueCount} are overdue. A 5-minute review session keeps concepts fresh and prevents forgetting.`
          : 'A quick review session now will strengthen your long-term retention.',
        action: { label: 'Review Now', href: '#flashcard-review' },
        actionType: 'flashcard-review',
      })
    }

    // Active study room nudge
    const studyRooms = bundle.communityPulse.activeRooms.filter(r => r.type === 'STUDY')
    if (studyRooms.length > 0) {
      const room = studyRooms[0]
      const count = room.participantCount ?? 1
      insights.push({
        id: 'study-action-live-room',
        category: 'study-action',
        title: `${count} classmate${count !== 1 ? 's' : ''} studying ${room.title ?? 'now'}`,
        body: `Join the study session in "${room.groupName ?? 'a study room'}". Study rooms keep everyone focused with shared Pomodoro timers.`,
        action: { label: 'Join Room', href: '/messages' },
        actionType: 'link',
      })
    }

    // Exam prep quiz nudge (from stakes — no API needed)
    const examStake = simData.stakes.find(s =>
      (s.type === 'Exam' || s.type === 'Essay') && s.daysLeft <= 7 && s.daysLeft > 0
    )
    if (examStake) {
      insights.push({
        id: 'study-action-quiz',
        category: 'study-action',
        title: `Try a diagnostic quiz on ${examStake.courseCode} before ${examStake.dueLabel}`,
        body: `Your ${examStake.title} is in ${examStake.daysLeft} days and worth ${examStake.gradeWeight}% of your grade. A diagnostic quiz will reveal what you know and what needs work.`,
        action: {
          label: 'Start Quiz',
          href: `Help me prepare for my ${examStake.title} in ${examStake.courseCode}. Start with a diagnostic quiz to find my weak spots.`,
        },
        actionType: 'sandy-message',
      })
    }

    return insights
  }, [bundle.loading, bundle.emailInsights, bundle.srNudge, bundle.communityPulse, simData.stakes])

  const campusLifeItems = useMemo(
    () => [...extraCampusItems, ...simData.campusLife],
    [extraCampusItems, simData.campusLife]
  )

  // ─── Build first-run intro starter chips ────────────────────────────────
  const firstRunChips = useMemo(() => {
    if (sandyIntroSeen || bundle.loading) return []

    const courses = [...enrollmentCourses]
      .sort((a, b) => {
        const aStake = simData.stakes.find(s => s.courseCode === a.courseCode)
        const bStake = simData.stakes.find(s => s.courseCode === b.courseCode)
        const aUrgent = aStake && (aStake.urgency === 'overdue' || aStake.urgency === 'today') ? 1 : 0
        const bUrgent = bStake && (bStake.urgency === 'overdue' || bStake.urgency === 'today') ? 1 : 0
        if (bUrgent !== aUrgent) return bUrgent - aUrgent
        const aPct = a.total > 0 ? (a.mastered + a.struggling) / a.total : 1
        const bPct = b.total > 0 ? (b.mastered + b.struggling) / b.total : 1
        if (aPct !== bPct) return aPct - bPct
        return a.courseCode.localeCompare(b.courseCode)
      })
      .slice(0, 3)

    if (courses.length === 0) {
      return ['What can you help me with?', 'Show me my schedule', 'What tools are available?']
    }

    return courses.map(c => {
      const stake = simData.stakes.find(s => s.courseCode === c.courseCode)
      if (stake && (stake.urgency === 'overdue' || stake.urgency === 'today')) {
        return `What's due in ${c.courseCode} this week?`
      }
      const studiedPct = c.total > 0 ? Math.round(((c.mastered + c.struggling) / c.total) * 100) : 100
      if (studiedPct < 40 && (c as EnrollmentCourse).nextObjective) {
        return `Quiz me on ${c.courseCode} ${(c as EnrollmentCourse).nextObjective!.title}`
      }
      return `Help me study for ${c.courseCode}`
    })
  }, [sandyIntroSeen, bundle.loading, enrollmentCourses, simData.stakes])

  // ─── Emit student context to Sandy sidebar ────────────
  useEffect(() => {
    if (!simData) return
    const overdue = simData.stakes.filter(s => s.urgency === 'overdue')
    const dueToday = simData.stakes.filter(s => s.urgency === 'today')
    const thisWeek = simData.stakes.filter(s => s.urgency === 'this-week')
    const nextClass = simData.timeline[0]

    // First-run intro overrides the briefing greeting
    if (!sandyIntroSeen && !sandyIntroSent.current && !bundle.loading) {
      sandyIntroSent.current = true
      const firstName = userName.split(' ')[0]
      const introText = `Hi ${firstName}! I'm Sandy — your AI study assistant.\n\nI already know your courses and schedule, so just ask me anything. Here are some things I can help with right now:`

      window.dispatchEvent(new CustomEvent('uky-briefing-ready', {
        detail: {
          greeting: simData.greeting,
          date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
          stats: { unreadEmails: 0, todayEvents: simData.timeline.length, pendingTasks: thisWeek.length + dueToday.length, overdueTasks: overdue.length },
          emails: [],
          calendar: [],
          tasks: [],
          _studentGreetingOverride: introText,
          _briefingChips: firstRunChips,
        },
      }))
      return
    }

    const lines: string[] = [simData.greeting]

    if (overdue.length > 0) {
      lines.push(`"${overdue[0].title}" is overdue — it's worth ${overdue[0].gradeWeight}% of your grade. Want help getting it done?`)
    } else if (dueToday.length > 0) {
      lines.push(`"${dueToday[0].title}" is due today (${dueToday[0].gradeWeight}% of your grade). Need a hand?`)
    } else if (nextClass && !isWeekend) {
      lines.push(`${nextClass.title} is coming up${nextClass.location ? ` at ${nextClass.location}` : ''}. You're all set.`)
    } else if (thisWeek.length > 0) {
      lines.push(`Nothing urgent right now. "${thisWeek[0].title}" is the next big thing — due later this week.`)
    } else {
      lines.push('Nothing urgent today — good time to get ahead or explore something new.')
    }

    window.dispatchEvent(new CustomEvent('uky-briefing-ready', {
      detail: {
        greeting: simData.greeting,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        stats: { unreadEmails: 0, todayEvents: simData.timeline.length, pendingTasks: thisWeek.length + dueToday.length, overdueTasks: overdue.length },
        emails: [],
        calendar: simData.timeline.map((e, i) => ({
          id: `tl-${i}`, title: e.title, description: null,
          startTime: new Date().toISOString(), endTime: new Date().toISOString(),
          location: e.location || null, attendees: [], category: 'lecture',
        })),
        tasks: simData.stakes.map(s => ({
          id: s.id, title: `${s.title} (${s.courseCode})`,
          dueAt: null, status: 'pending', isOverdue: s.urgency === 'overdue',
        })),
        _studentGreetingOverride: lines.join('\n\n'),
      },
    }))
  }, [simData, isWeekend, sandyIntroSeen, bundle.loading, userName, firstRunChips])

  // ─── Flip sandyIntroSeen on first Sandy interaction ────────────────────
  useEffect(() => {
    if (sandyIntroSeen) return
    if (bundle.loading) return

    const handler = () => {
      setSandyIntroSeen(true)
      apiFetch(email, '/api/sandy/preferences', {
        method: 'PUT',
        body: JSON.stringify({ sandyIntroSeen: true }),
      }).catch(() => {})
    }

    // The sandy-prefill event fires when a user clicks a chip or sends a message
    // that originated from the homepage (smart study, starter chips, etc.)
    // We also listen for any regular submit via a custom event
    window.addEventListener('uky-sandy-first-interaction', handler, { once: true })
    return () => window.removeEventListener('uky-sandy-first-interaction', handler)
  }, [sandyIntroSeen, bundle.loading, email])

  // ─── Section renderers ────────────────────────────────────────────────────

  const allInsights = useMemo(
    () => [...studyActionInsights, ...simData.sandyInsights],
    [studyActionInsights, simData.sandyInsights]
  )

  function renderSection(section: string) {
    switch (section) {
      case 'greeting':
        return (
          <div key={section}>
            <h1 className="text-2xl font-extrabold text-gray-900">{simData.greeting}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{simData.studentInfo.year} · {simData.studentInfo.major}</p>
            {/* View toggle */}
            <p className="text-xs text-gray-400 mt-2">
              {homepageView === 'focus' ? (
                <>Focus View · <button onClick={toggleView} className="text-[#0033A0] hover:underline">Show full dashboard &rarr;</button></>
              ) : (
                <>Full Dashboard · <button onClick={toggleView} className="text-[#0033A0] hover:underline">Switch to Focus View &rarr;</button></>
              )}
            </p>
          </div>
        )

      case 'beacon': {
        // Due-this-week at-a-glance strip
        const urgentStakes = simData.stakes.filter(s => s.urgency === 'overdue' || s.urgency === 'today' || s.urgency === 'this-week')
        return (
          <div key={section} className="space-y-2">
            <BeaconCard beacon={simData.beacon} />
            {bundle.vcEncounterCount === 0 && !bundle.loading && (
              <BeaconCard beacon={{
                id: 'vc-first-visit',
                type: 'virtual-clinic-first-visit',
                title: 'Try your first clinical case',
                subtitle: 'Practice patient encounters with AI-powered feedback',
                urgency: 'info',
                sandyAction: { label: 'Get Started', message: 'Help me start my first clinical case' },
              }} />
            )}
            {urgentStakes.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100 text-xs text-gray-600">
                <CalendarDays className="size-3.5 text-[#0033A0] flex-shrink-0" />
                <span className="font-semibold text-gray-700 flex-shrink-0">Due soon:</span>
                <span className="truncate">
                  {urgentStakes.slice(0, 3).map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ' · '}
                      <span className="font-medium text-gray-900">{s.title}</span>
                      {' '}
                      <span className="text-gray-400">({s.courseCode}, {s.dueLabel})</span>
                    </span>
                  ))}
                  {urgentStakes.length > 3 && <span className="text-gray-400"> +{urgentStakes.length - 3} more</span>}
                </span>
              </div>
            )}
          </div>
        )
      }

      case 'right-now-card':
        return <RightNowCard key={section} rightNow={simData.rightNow} />

      case 'quick-actions':
        return (
          <QuickActionChips
            key={section}
            actions={phaseQuickActions}
            smartStudyTarget={smartStudyTarget}
            onFlashcardReview={() => setShowQuickReview(true)}
          />
        )

      case 'top-strip':
        if (briefingLoading) {
          return (
            <div key={section} data-section="top-strip" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2"><div className="h-48 animate-pulse rounded-2xl bg-gray-100" /></div>
              <div className="space-y-4">
                <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
                <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
              </div>
            </div>
          )
        }
        if (!briefing) return null
        return (
          <div key={section} data-section="top-strip" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EmailBrief emails={briefing.emails} />
            </div>
            <div className="space-y-4">
              <CalendarBrief events={briefing.calendar} />
              <TaskBrief tasks={briefing.tasks} />
            </div>
          </div>
        )

      case 'sandy-briefing':
        return (
          <SandyBriefing
            key={section}
            insights={allInsights}
            stakes={simData.stakes}
            onFlashcardReview={() => setShowQuickReview(true)}
            phase={phase}
          />
        )

      case 'course-posts':
        return <CoursePostsFeed key={section} />

      case 'courses':
        return (
          <div key={section} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-[#0033A0]" />
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Courses</h3>
                </div>
                <Link href="/courses" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
                  All courses <ArrowRight className="size-3" />
                </Link>
              </div>

              {enrollmentLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[0, 1].map(i => (
                    <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
                  ))}
                </div>
              ) : enrollmentCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enrollmentCourses.map((course) => {
                    const studiedCount = course.mastered + course.struggling
                    const studiedPct = course.total > 0 ? Math.round((studiedCount / course.total) * 100) : 0
                    return (
                      <div key={course.courseId} className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4 flex flex-col gap-2.5 hover:border-[#0033A0]/30 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/courses/${course.courseId}`} className="text-xs font-bold uppercase tracking-wider text-[#0033A0] hover:underline">
                              {course.courseCode}
                            </Link>
                            <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5 line-clamp-1">{course.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{course.instructorName}</p>
                          </div>
                          <span className="text-lg font-bold text-[#0033A0] flex-shrink-0 inline-flex items-center gap-1">
                            {studiedPct}%
                            <MetricExplainer text="Percentage of course topics you've engaged with through quizzes, flashcards, or study sessions with Sandy." />
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all rounded-full" style={{ width: `${studiedPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {(() => {
                              const courseStake = simData.stakes.find(s => s.courseCode === course.courseCode)
                              if (courseStake) {
                                const urgencyStyles: Record<string, string> = {
                                  overdue: 'bg-red-100 text-red-700',
                                  today: 'bg-red-100 text-red-700',
                                  'this-week': 'bg-amber-100 text-amber-700',
                                  'next-week': 'bg-blue-100 text-blue-700',
                                  later: 'bg-green-100 text-green-700',
                                }
                                const urgencyLabels: Record<string, string> = {
                                  overdue: 'Overdue',
                                  today: 'Due today',
                                  'this-week': 'This week',
                                  'next-week': 'Next week',
                                  later: 'Later',
                                }
                                return (
                                  <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                                    <span>Due: <span className="font-medium text-gray-700">{courseStake.title}</span> — {courseStake.dueLabel}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${urgencyStyles[courseStake.urgency] || 'bg-gray-100 text-gray-600'}`}>
                                      {urgencyLabels[courseStake.urgency] || courseStake.urgency}
                                    </span>
                                    <MetricExplainer text="Based on assignment due dates from your course schedule." />
                                  </p>
                                )
                              }
                              return (course as EnrollmentCourse).nextObjective ? (
                                <p className="text-xs text-gray-500 truncate">
                                  Next: <span className="font-medium text-gray-700">{(course as EnrollmentCourse).nextObjective!.title}</span>
                                </p>
                              ) : (
                                <p className="text-xs text-green-600 font-medium">All topics studied</p>
                              )
                            })()}
                          </div>
                          <Link href={`/courses/${course.courseId}`} className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1 flex-shrink-0">
                            Continue <ArrowRight className="size-3" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Your courses will appear here</p>
                    <p className="text-xs text-gray-500 mt-0.5">Join a course to see your objectives, progress, and AI tools.</p>
                  </div>
                  <Link href="/courses" className="text-sm font-semibold text-[#0033A0] hover:underline flex items-center gap-1 flex-shrink-0">
                    Browse courses <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )

      case 'learning-profile':
        return <LearningProfileCard key={section} />

      case 'tomorrow-preview':
        return simData.tomorrowPreview
          ? <TomorrowPreview key={section} data={simData.tomorrowPreview} />
          : null

      case 'wind-down':
        return windDownData
          ? <WindDownCard key={section} data={windDownData} />
          : null

      case 'announcements':
        return <AnnouncementsBanner key={section} userEmail={email} />

      case 'campus-news': {
        const h = new Date().getHours()
        const isMealTime = (h >= 7 && h < 10) || (h >= 11 && h < 14) || (h >= 17 && h < 20)
        const showDining = isMealTime && phase !== 'night'
        const diningCount = showDining ? campusLifeItems.filter(i => i.type === 'dining').length : 0
        return (
          <CampusSummaryRow
            key={section}
            campusLifeItems={campusLifeItems}
            diningOpen={diningCount}
            uknowCount={bundle.uknowEvents.length}
          >
            {showDining && <DiningWidget />}
            <StudySpotWidget />
            <CampusLife items={campusLifeItems} />
            <UKNowFeed userEmail={email} />
          </CampusSummaryRow>
        )
      }

      case 'continue-tools':
        return libraryEntries.length > 0 ? (
          <div key={section}>
            <div className="mb-3 flex items-center gap-2">
              <Play className="size-4 text-[#0033A0]" />
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Continue Where You Left Off</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {libraryEntries.slice(0, 4).map((entry) => (
                <ToolCard key={entry.toolId} tool={entry.tool} />
              ))}
            </div>
          </div>
        ) : null

      case 'learning-recap':
        return email ? <LearningRecapCard key={section} userEmail={email} /> : null

      default:
        return null
    }
  }

  // Focus View: per-phase section order (morning=email, afternoon=actions, evening=tomorrow).
  // Full View: original phase-based section order.
  const sectionOrder = useMemo(() => {
    if (homepageView === 'focus') {
      return [...FOCUS_ORDER_BY_PHASE[phase]]
    }
    return SECTION_ORDER[phase]
  }, [homepageView, phase])

  return (
    <div className={`max-w-5xl pb-8 ${PHASE_BG[phase]}`}>
      <div className="space-y-6">
        {sectionOrder.map(section => renderSection(section))}
      </div>

      {showQuickReview && (
        <FlashcardQuickReview
          onClose={() => setShowQuickReview(false)}
          onComplete={() => setShowQuickReview(false)}
        />
      )}
    </div>
  )
}
