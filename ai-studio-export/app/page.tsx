'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Compass,
  Gamepad2, BarChart3, BookOpen,
  Trophy, Target, Calendar, AlertCircle,
  Brain, TrendingUp, Users,
} from 'lucide-react'
import { useAuth } from './lib/auth-context'
import { LibraryEntryWithTool, ToolWithDetails } from './lib/types'
import ActionItems from './components/ActionItems'
import NotebookWidget from './components/NotebookWidget'
import { getUIMode, IS_PROFESSIONAL } from './lib/ui-mode'
import { addDays, differenceInDays, format } from 'date-fns'

// â"€â"€â"€ Synthetic student profiles keyed by email â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

type StudentProfile = {
  year: string
  major: string
  streak: number
  totalSessions: number
  totalMinutes: number
  avgScore: number
  recentSessions: { tool: string; date: string; score: number; topic: string }[]
  upcomingDue: { title: string; course: string; date: string; type: string; urgent: boolean }[]
}

const TODAY = new Date()

function buildUpcomingDue(title: string, course: string, daysFromNow: number, type: string) {
  const dueDate = addDays(TODAY, daysFromNow)

  return {
    title,
    course,
    date: format(dueDate, 'MMM d'),
    type,
    urgent: differenceInDays(dueDate, TODAY) <= 3,
  }
}

const STUDENT_PROFILES: Record<string, StudentProfile> = {
  'ian.mcclure.student@uky.edu': {
    year: '1L', major: 'Juris Doctor', streak: 12,
    totalSessions: 41, totalMinutes: 738, avgScore: 85,
    recentSessions: [
      { tool: 'LAW 756: Evidence Rules Simulator',  date: '2 hours ago',  score: 87, topic: 'Hearsay Exceptions — FRE 803 & 804' },
      { tool: 'Cross-Examination Simulator',        date: 'Yesterday',    score: 83, topic: 'Impeaching Expert Witnesses on Methodology' },
      { tool: 'Socratic Philosophy Debate Partner', date: '2 days ago',   score: 91, topic: 'Epistemic Standards in Legal Proof' },
      { tool: 'LAW 756: Evidence Rules Simulator',  date: '4 days ago',   score: 79, topic: 'Character Evidence & FRE 404(b) Exceptions' },
      { tool: 'Cross-Examination Simulator',        date: '5 days ago',   score: 88, topic: 'Controlling a Hostile Witness on Redirect' },
      { tool: 'IP Licensing Negotiator',            date: '1 week ago',   score: 84, topic: 'Drafting Limitation-of-Liability Clauses' },
      { tool: 'LAW 756: Evidence Rules Simulator',  date: '10 days ago',  score: 90, topic: 'Authentication & the Best Evidence Rule' },
      { tool: 'Socratic Philosophy Debate Partner', date: '2 weeks ago',  score: 86, topic: 'Rawlsian Justice vs. Utilitarian Sentencing' },
    ],
    upcomingDue: [
      buildUpcomingDue('Evidence Rules Exam',         'LAW 756', 3,  'Exam'),
      buildUpcomingDue('Trial Advocacy Brief',        'LAW 820', 10, 'Brief'),
      buildUpcomingDue('Constitutional Law Memo',     'LAW 601', 14, 'Memo'),
      buildUpcomingDue('Torts Final Exam',            'LAW 502', 21, 'Exam'),
    ],
  },
  'tiana.the@uky.edu': {
    year: 'Junior', major: 'English Literature', streak: 5,
    totalSessions: 19, totalMinutes: 314, avgScore: 88,
    recentSessions: [
      { tool: 'Socratic Philosophy Debate Partner', date: '1 day ago',   score: 92, topic: 'Derrida vs. Foucault on Power & Language' },
      { tool: 'HIST 300: Primary Source Analyzer',  date: '3 days ago',  score: 89, topic: 'Modernist Poetry & the Great War' },
      { tool: 'PHI 110: Argument Coach',            date: '4 days ago',  score: 85, topic: 'Deconstructing Advertising Claims' },
      { tool: 'Socratic Philosophy Debate Partner', date: '6 days ago',  score: 90, topic: 'Feminist Theory & the Male Gaze' },
      { tool: 'HIST 300: Primary Source Analyzer',  date: '1 week ago',  score: 87, topic: 'Victorian Literary Context & the Novel' },
      { tool: 'Business Case Analyzer',             date: '10 days ago', score: 83, topic: 'Narrative Framing in Persuasive Writing' },
      { tool: 'Socratic Philosophy Debate Partner', date: '2 weeks ago', score: 88, topic: 'Poststructuralism & the Death of the Author' },
    ],
    upcomingDue: [
      buildUpcomingDue('Romanticism Essay',          'ENG 201', 3,  'Essay'),
      buildUpcomingDue('Short Story Draft',          'ENG 315', 5,  'Assignment'),
      buildUpcomingDue('Post-Colonial Theory Paper', 'ENG 420', 9,  'Paper'),
      buildUpcomingDue('Modernism Seminar Response', 'ENG 440', 16, 'Essay'),
    ],
  },
}

const GENERIC_STUDENT: StudentProfile = {
  year: 'Sophomore', major: 'Undeclared', streak: 2,
  totalSessions: 5, totalMinutes: 72, avgScore: 80,
  recentSessions: [],
  upcomingDue: [
    buildUpcomingDue('Ethics in AI Discussion', 'GEN 101', 5, 'Assignment'),
  ],
}

// ─── Educator synthetic data ──────────────────────────────────────────────────

type EducatorProfile = {
  title: string
  toolsPublished: number
  activeStudents: number
  totalSessions: number
  avgScore: number
  recentActivity: { student: string; tool: string; date: string; score: number }[]
}

const EDUCATOR_PROFILES: Record<string, EducatorProfile> = {
  'bob.dipaola@uky.edu': {
    title: 'President, University of Kentucky',
    toolsPublished: 0, activeStudents: 1240, totalSessions: 4872, avgScore: 84,
    recentActivity: [
      { student: 'I. McClure',  tool: 'Cross-Examination Simulator',        date: '1 hour ago',  score: 83 },
      { student: 'T. The',      tool: 'Socratic Philosophy Debate Partner',  date: '2 hours ago', score: 92 },
      { student: 'I. McClure',  tool: 'LAW 756: Evidence Rules Simulator',   date: '3 hours ago', score: 87 },
      { student: 'A. Patel',    tool: 'CS 215: Python Tutor',               date: 'Yesterday',   score: 91 },
      { student: 'T. The',      tool: 'HIST 300: Primary Source Analyzer',   date: 'Yesterday',   score: 89 },
      { student: 'M. Johnson',  tool: 'MBA 640: Strategy Coach',             date: '2 days ago',  score: 85 },
      { student: 'J. Williams', tool: 'Organic Chemistry Predictor',         date: '2 days ago',  score: 78 },
      { student: 'R. Santos',   tool: 'Patient Interview Practice',          date: '3 days ago',  score: 88 },
    ],
  },
  'eric.monday@uky.edu': {
    title: 'Executive Vice President for Finance & Administration',
    toolsPublished: 0, activeStudents: 847, totalSessions: 3214, avgScore: 83,
    recentActivity: [
      { student: 'M. Chen',     tool: 'MBA 640: Strategy Coach',             date: '1 hour ago',  score: 85 },
      { student: 'J. Williams', tool: 'Business Case Analyzer',              date: '3 hours ago', score: 82 },
      { student: 'T. The',      tool: 'Socratic Philosophy Debate Partner',  date: '5 hours ago', score: 92 },
      { student: 'S. Park',     tool: 'HIST 300: Primary Source Analyzer',   date: 'Yesterday',   score: 88 },
      { student: 'I. McClure',  tool: 'Cross-Examination Simulator',         date: 'Yesterday',   score: 83 },
      { student: 'D. Brooks',   tool: 'Nonprofit Donor Prospector',          date: '2 days ago',  score: 86 },
      { student: 'A. Patel',    tool: 'CS 215: Python Tutor',               date: '2 days ago',  score: 91 },
      { student: 'K. Foster',   tool: 'Patient Interview Practice',          date: '3 days ago',  score: 79 },
    ],
  },
  'heath.price@uky.edu': {
    title: 'Associate Professor of Engineering',
    toolsPublished: 3, activeStudents: 47, totalSessions: 312, avgScore: 83,
    recentActivity: [
      { student: 'I. McClure',  tool: 'LAW 756: Evidence Rules Simulator',   date: '2 hours ago', score: 87 },
      { student: 'T. The',      tool: 'Socratic Philosophy Debate Partner',  date: '4 hours ago', score: 92 },
      { student: 'I. McClure',  tool: 'Cross-Examination Simulator',         date: 'Yesterday',   score: 83 },
      { student: 'A. Nguyen',   tool: 'CS 215: Python Tutor',               date: 'Yesterday',   score: 88 },
      { student: 'T. The',      tool: 'PHI 110: Argument Coach',            date: '2 days ago',  score: 85 },
      { student: 'R. Santos',   tool: 'Patient Interview Practice',          date: '3 days ago',  score: 90 },
      { student: 'I. McClure',  tool: 'IP Licensing Negotiator',             date: '4 days ago',  score: 84 },
      { student: 'M. Johnson',  tool: 'MBA 640: Strategy Coach',             date: '5 days ago',  score: 82 },
    ],
  },
  'admin@uky.edu': {
    title: 'Platform Administrator, CATS-AI',
    toolsPublished: 5, activeStudents: 312, totalSessions: 1847, avgScore: 85,
    recentActivity: [
      { student: 'I. McClure',  tool: 'Cross-Examination Simulator',        date: '1 hour ago',  score: 83 },
      { student: 'T. The',      tool: 'Socratic Philosophy Debate Partner', date: '2 hours ago', score: 92 },
      { student: 'A. Patel',    tool: 'CS 215: Python Tutor',              date: 'Yesterday',   score: 91 },
      { student: 'R. Santos',   tool: 'Patient Interview Practice',         date: 'Yesterday',   score: 90 },
      { student: 'M. Chen',     tool: 'MBA 640: Strategy Coach',            date: '2 days ago',  score: 85 },
      { student: 'T. The',      tool: 'HIST 300: Primary Source Analyzer',  date: '3 days ago',  score: 89 },
    ],
  },
}

const GENERIC_EDUCATOR: EducatorProfile = {
  title: 'Educator',
  toolsPublished: 2, activeStudents: 24, totalSessions: 148, avgScore: 82,
  recentActivity: [],
}
const categoryThumbnailBg: Record<string, string> = {
  Law: 'bg-indigo-600',
  History: 'bg-amber-600',
  STEM: 'bg-emerald-600',
  Medicine: 'bg-red-600',
  Business: 'bg-blue-600',
  Arts: 'bg-purple-600',
  University: 'bg-sky-600',
  'Registrar Tools': 'bg-[#0033A0]',
  General: 'bg-gray-500',
}

// â"€â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function scoreColor(score: number) {
  if (score >= 88) return 'text-green-700 bg-green-50'
  if (score >= 80) return 'text-blue-700 bg-blue-50'
  if (score >= 70) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function typeBadgeStyle(type: string) {
  const map: Record<string, string> = {
    Exam: 'bg-red-100 text-red-700',
    Quiz: 'bg-purple-100 text-purple-700',
    Brief: 'bg-blue-100 text-blue-700',
    Memo: 'bg-amber-100 text-amber-700',
    Essay: 'bg-indigo-100 text-indigo-700',
    Paper: 'bg-indigo-100 text-indigo-700',
    Assignment: 'bg-gray-100 text-gray-600',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600'
}

function DiscoveryToolCard({ tool }: { tool: ToolWithDetails }) {
  const bgClass = categoryThumbnailBg[tool.category] || 'bg-gray-500'
  const isStudentMade = tool.creator.role === 'STUDENT'

  return (
    <Link
      href={`/tools/${tool.id}`}
      className="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#0033A0]/30 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`h-10 w-10 flex-shrink-0 rounded-xl ${bgClass}`} />
        {isStudentMade ? (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-green-700">
            Student-made
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0033A0]">
          {tool.category}
        </p>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold text-gray-900 transition-colors group-hover:text-[#0033A0]">
          {tool.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
          {tool.shortDescription}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-700">{tool.creator.name}</p>
          <p className="truncate text-[11px] text-gray-400">
            {tool.creator.college ?? tool.creator.department ?? 'University of Kentucky'}
          </p>
        </div>
        <div className="text-xs font-bold text-[#0033A0]">
          {tool._count.upvotes} upvotes
        </div>
      </div>
    </Link>
  )
}

// â"€â"€â"€ Page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export default function HomePage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [enrollmentCourses, setEnrollmentCourses] = useState<{
    courseId: string; courseCode: string; title: string; instructorName: string;
    total: number; mastered: number; struggling: number; notStarted: number;
    completionPct: number;
    nextObjective: { id: string; title: string; moduleNumber: number } | null;
  }[]>([])
  const [enrollmentLoading, setEnrollmentLoading] = useState(true)
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntryWithTool[]>([])
  const [discoveryTools, setDiscoveryTools] = useState<ToolWithDetails[]>([])
  const [discoveryLoading, setDiscoveryLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (currentUser.role !== 'STUDENT') {
      setEnrollmentLoading(false)
      return
    }
    setEnrollmentLoading(true)
    fetch('/api/enrollment', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.courses)) setEnrollmentCourses(d.courses)
      })
      .catch(() => {})
      .finally(() => setEnrollmentLoading(false))
  }, [currentUser.email, currentUser.role])

  useEffect(() => {
    if (currentUser.role !== 'STUDENT') return

    fetch('/api/library', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((response) => response.json())
      .then((data) => setLibraryEntries(data.library ?? []))
      .catch(() => {})
  }, [currentUser.email, currentUser.role])

  useEffect(() => {
    let cancelled = false
    const since = addDays(new Date(), -14).toISOString()

    const loadDiscovery = async () => {
      try {
        const response = await fetch(
          `/api/tools?sort=upvotes&since=${encodeURIComponent(since)}&limit=18`,
          {
            headers: {
              'x-demo-user-email': currentUser.email,
            },
          }
        )

        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setDiscoveryTools((data.tools ?? []) as ToolWithDetails[])
        }
      } catch {
      } finally {
        if (!cancelled) {
          setDiscoveryLoading(false)
        }
      }
    }

    void loadDiscovery()

    return () => {
      cancelled = true
    }
  }, [currentUser.email])

  useEffect(() => {
    try {
      if (!localStorage.getItem('core-demo-welcomed')) {
        setShowWelcome(true)
      }
    } catch {}
  }, [])

  const isStudent = currentUser.role === 'STUDENT'
  const isEducator = currentUser.role === 'EDUCATOR'
  const isAdmin = currentUser.role === 'ADMIN'
  const uiMode = getUIMode(currentUser.role)
  const isProfessionalUI = IS_PROFESSIONAL(uiMode)

  const studentProfile = isStudent
    ? (STUDENT_PROFILES[currentUser.email] ?? GENERIC_STUDENT)
    : null
  const educatorProfile = (isEducator || isAdmin)
    ? (EDUCATOR_PROFILES[currentUser.email] ?? GENERIC_EDUCATOR)
    : null
  const studentFocus = studentProfile
    ? studentProfile.recentSessions[0]?.topic ??
      studentProfile.upcomingDue[0]?.title ??
      'Exploring new tools'
    : null
  const collegeDiscoveryTools = discoveryTools.filter(
    (tool) =>
      tool.creatorId !== currentUser.id &&
      Boolean(currentUser.college) &&
      tool.creator.college === currentUser.college
  )
  const campusDiscoveryTools = discoveryTools.filter((tool) => tool.creatorId !== currentUser.id)
  const highlightedDiscoveryTools =
    collegeDiscoveryTools.length > 0 ? collegeDiscoveryTools.slice(0, 3) : campusDiscoveryTools.slice(0, 3)
  const discoveryTitle =
    collegeDiscoveryTools.length > 0 && currentUser.college
      ? `Trending in ${currentUser.college}`
      : 'Trending across UK'
  const discoverySubtitle =
    collegeDiscoveryTools.length > 0
      ? 'Fresh tools from people in your orbit, so the platform feels alive without needing Canvas to send you back.'
      : 'Fresh momentum across the university marketplace, pulled from recent activity and peer interest.'

  const dismissWelcome = () => {
    try {
      localStorage.setItem('core-demo-welcomed', '1')
    } catch {}
    setShowWelcome(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const pageGreeting = `${greeting}, ${currentUser.name.split(' ')[0]}.`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0033A0]">
              Interactive Demo
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-gray-900">Welcome to The Core</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              This is a live MVP demo of The Core — an AI-powered learning operating system built for the University of Kentucky by CATS-AI.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              You&apos;re currently viewing as <span className="font-semibold text-gray-900">{currentUser.name}</span>. Use the avatar menu in the top-right corner to switch between:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
                <span><span className="font-semibold">Ian McClure</span> - Student view: learning tools, action items, library</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                <span><span className="font-semibold">Heath Price</span> - Educator view: analytics, publish tools, courses</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#0033A0]" />
                <span><span className="font-semibold">Dr. Robert DiPaola</span> - Admin view: approval queue, platform stats, service bots</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={dismissWelcome}
              className="mt-6 w-full rounded-xl bg-[#0033A0] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              Enter The Core
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* â"€â"€ LEFT COLUMN â"€â"€ */}
        <div className="space-y-6">

          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{pageGreeting}</h1>
          </div>

          {isStudent && (
            libraryEntries.length > 0 ? (
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-gray-900">Jump Back In</h2>
                  <Link
                    href="/library"
                    className="text-xs font-semibold text-[#0033A0] hover:underline"
                  >
                    My Library
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {libraryEntries.slice(0, 4).map((entry) => {
                    const bgClass = categoryThumbnailBg[entry.tool.category] || 'bg-gray-500'
                    return (
                      <button
                        key={entry.toolId}
                        type="button"
                        onClick={() => {
                          if (entry.tool.toolType === 'EXTERNAL' && entry.tool.externalUrl) {
                            window.open(entry.tool.externalUrl, '_blank', 'noopener,noreferrer')
                          } else {
                            router.push(`/tools/${entry.tool.id}?launch=true`)
                          }
                        }}
                        className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-[#0033A0]/30 hover:shadow-sm"
                      >
                        <div className={`h-9 w-9 flex-shrink-0 rounded-lg ${bgClass}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-900 transition-colors group-hover:text-[#0033A0]">
                            {entry.tool.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {entry.sessionCount > 0 ? `${entry.sessionCount} sessions` : 'Not yet launched'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Jump Back In</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Save tools from the marketplace to launch them here.
                  </p>
                </div>
                <Link href="/tools" className="text-sm font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
                  Browse Tools <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )
          )}

          {(discoveryLoading || highlightedDiscoveryTools.length > 0) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0033A0]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Discovery Feed
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold text-gray-900">{discoveryTitle}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{discoverySubtitle}</p>
                </div>
                <Link href="/tools" className="text-sm font-semibold text-[#0033A0] hover:underline">
                  Browse all
                </Link>
              </div>

              {discoveryLoading ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {highlightedDiscoveryTools.map((tool) => (
                    <DiscoveryToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0033A0] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {currentUser.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold text-gray-900">{currentUser.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isStudent ? 'bg-green-100 text-green-700' :
                    isEducator ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>{currentUser.role}</span>
                  {studentProfile && (
                    <span className="text-xs text-gray-500 font-medium">{studentProfile.year} · {studentProfile.major}</span>
                  )}
                  {educatorProfile && (
                    <span className="text-xs text-gray-500 font-medium">{educatorProfile.title}</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">{currentUser.department} · {currentUser.college}</div>
                {studentFocus && (
                  <div className="text-sm font-semibold text-gray-700 mt-1 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#0033A0]" />
                    Latest focus: {studentFocus}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isStudent && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">My Courses</h2>
                <Link href="/courses" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
                  All courses <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {enrollmentLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1].map(i => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />
                  ))}
                </div>
              ) : enrollmentCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enrollmentCourses.map((course) => {
                    const masteredPct = course.total > 0 ? Math.round((course.mastered / course.total) * 100) : 0
                    const strugglingPct = course.total > 0 ? Math.round((course.struggling / course.total) * 100) : 0
                    const notStartedPct = course.total > 0 ? Math.round((course.notStarted / course.total) * 100) : 100
                    return (
                      <div key={course.courseId} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-2.5 hover:border-[#0033A0]/30 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">{course.courseCode}</span>
                            <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5 line-clamp-1">{course.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{course.instructorName}</p>
                          </div>
                          <span className="text-lg font-extrabold text-[#0033A0] flex-shrink-0">{course.completionPct}%</span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden flex">
                          <div className="h-full bg-green-500 transition-all" style={{ width: `${masteredPct}%` }} title={`${course.mastered} mastered`} />
                          <div className="h-full bg-yellow-400 transition-all" style={{ width: `${strugglingPct}%` }} title={`${course.struggling} struggling`} />
                          <div className="h-full bg-gray-200 transition-all" style={{ width: `${notStartedPct}%` }} title={`${course.notStarted} not started`} />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {course.nextObjective ? (
                              <p className="text-xs text-gray-500 truncate">
                                Next up: <span className="font-medium text-gray-700">{course.nextObjective.title}</span>
                              </p>
                            ) : (
                              <p className="text-xs text-green-600 font-medium">All objectives complete</p>
                            )}
                          </div>
                          <Link
                            href="/courses"
                            className="flex-shrink-0 text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
                          >
                            Continue <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">No courses yet</p>
                    <p className="text-xs text-gray-500 mt-0.5">Browse courses and join one to track your progress.</p>
                  </div>
                  <Link href="/courses" className="text-sm font-semibold text-[#0033A0] hover:underline flex items-center gap-1 flex-shrink-0">
                    Browse courses <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {educatorProfile && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Platform Activity</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Compass className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-500 font-medium">Tools Published</span>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{educatorProfile.toolsPublished}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-500 font-medium">Active Students</span>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{educatorProfile.activeStudents}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs text-gray-500 font-medium">Total Sessions</span>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{educatorProfile.totalSessions}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-500 font-medium">Avg Score</span>
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900">{educatorProfile.avgScore}%</div>
                </div>
              </div>
            </div>
          )}

          {studentProfile && studentProfile.recentSessions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Sessions</h2>
                <Link href="/analytics/student" className="text-xs text-[#0033A0] font-semibold hover:underline flex items-center gap-1">
                  Full history <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {studentProfile.recentSessions.map((s, i) => (
                  <Link
                    key={i}
                    href={`/tools?q=${encodeURIComponent(s.tool)}`}
                    className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 hover:border-[#0033A0]/40 hover:shadow-sm transition-all group"
                  >
                    <Brain className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-[#0033A0]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#0033A0]">{s.tool}</div>
                      <div className="text-xs text-gray-500 truncate">{s.topic} · {s.date}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${scoreColor(s.score)}`}>{s.score}%</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {isStudent && (
            <NotebookWidget userEmail={currentUser.email} />
          )}

          {educatorProfile && educatorProfile.recentActivity.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Student Activity</h2>
                <Link href="/analytics/faculty" className="text-xs text-[#0033A0] font-semibold hover:underline flex items-center gap-1">
                  Full analytics <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {educatorProfile.recentActivity.map((a, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {a.student.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{a.student}</div>
                      <div className="text-xs text-gray-500 truncate">{a.tool} · {a.date}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${scoreColor(a.score)}`}>{a.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* â"€â"€ RIGHT COLUMN â"€â"€ */}
        <div className="space-y-5">

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Access</div>
            <div className="space-y-1">
              {[
                { href: '/academy', icon: BookOpen, label: 'Academy' },
                { href: '/hub', icon: Compass, label: 'Hub' },
                { href: '/campus', icon: Gamepad2, label: 'Campus' },
                { href: '/studio', icon: Brain, label: 'Studio' },
                ...(isStudent ? [{ href: '/analytics/student', icon: BarChart3, label: 'My Progress' }] : []),
                ...(isEducator || isAdmin ? [{ href: '/analytics/faculty', icon: BarChart3, label: 'Analytics' }] : []),
              ].map(link => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0033A0] transition-colors group"
                  >
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#0033A0]" />
                    {link.label}
                    <ArrowRight className="w-3 h-3 ml-auto text-gray-300 group-hover:text-[#0033A0]" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Upcoming due dates */}
          {studentProfile && studentProfile.upcomingDue.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0033A0]" />
                <span className="font-bold text-gray-900 text-sm">Coming Up</span>
                {studentProfile.upcomingDue.some(i => i.urgent) && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {studentProfile.upcomingDue.filter(i => i.urgent).length} urgent
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {studentProfile.upcomingDue.map((item, i) => (
                  <Link
                    key={i}
                    href={`/courses?course=${encodeURIComponent(item.course)}`}
                    className={`px-4 py-2.5 flex items-start gap-3 hover:bg-blue-50/50 transition-colors group ${item.urgent ? 'bg-red-50/40 hover:bg-red-50/60' : ''}`}
                  >
                    <div className={`text-xs font-extrabold mt-0.5 flex-shrink-0 w-10 text-center ${item.urgent ? 'text-red-600' : 'text-[#0033A0]'}`}>
                      {item.date}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 leading-tight group-hover:text-[#0033A0]">{item.title}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-gray-400">{item.course}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeBadgeStyle(item.type)}`}>{item.type}</span>
                      </div>
                    </div>
                    {item.urgent && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <Link href="/courses" className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:underline">
                  <BookOpen className="w-3.5 h-3.5" /> Course materials <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {isStudent && isProfessionalUI && <ActionItems />}

        </div>
      </div>
    </div>
  )
}



