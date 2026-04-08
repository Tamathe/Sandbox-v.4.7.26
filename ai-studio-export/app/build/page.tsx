'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ArrowRight,
  Clock3,
  FileText,
  Trophy,
  BookOpen,
  Code2,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { ToolWithDetails } from '../lib/types'
import { EXPERIENCE_CATEGORIES } from '../lib/experience-types'

type BountySummary = {
  id: string
  title: string
  category: string
  status: 'OPEN' | 'CLAIMED' | 'FULFILLED' | 'CLOSED'
  estimatedHours: number | null
  rewardSand: number
}

type CourseOption = {
  id: string
  courseCode: string
  title: string
  isPublic: boolean
  instructor?: { email?: string | null } | null
}

type GapSuggestion = {
  title: string
  description: string
  toolType: string
  recommendation: string
  rationale?: string
}

export default function BuildHubPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [buildPrompt, setBuildPrompt] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>('practice')
  const [drafts, setDrafts] = useState<ToolWithDetails[]>([])
  const [bounties, setBounties] = useState<BountySummary[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [gapSuggestions, setGapSuggestions] = useState<GapSuggestion[]>([])
  const [gapLoading, setGapLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [draftRes, bountyRes, courseRes] = await Promise.all([
          fetch('/api/tools?published=draft&creator=me&limit=6', {
            headers: { 'x-demo-user-email': currentUser.email },
          }),
          fetch('/api/bounties?status=OPEN', {
            headers: { 'x-demo-user-email': currentUser.email },
          }),
          fetch('/api/courses', {
            headers: { 'x-demo-user-email': currentUser.email },
          }),
        ])

        if (draftRes.ok) {
          const draftData = await draftRes.json()
          setDrafts(draftData.tools ?? [])
        }

        if (bountyRes.ok) {
          const bountyData = await bountyRes.json()
          setBounties((bountyData.bounties ?? []).slice(0, 4))
        }

        if (courseRes.ok) {
          const courseData = await courseRes.json()
          const rawCourses = Array.isArray(courseData) ? courseData : (courseData.courses ?? [])
          const filteredCourses = rawCourses
            .filter((course: CourseOption) => {
              if (currentUser.role === 'ADMIN') return true
              if (currentUser.role === 'STUDENT') return course.isPublic
              return course.instructor?.email === currentUser.email
            })
            .slice(0, 10)
          setCourses(filteredCourses)
          setSelectedCourseId((previous) => previous || filteredCourses[0]?.id || '')
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [currentUser.email, currentUser.role])
  const activeCat = EXPERIENCE_CATEGORIES.find((c) => c.id === activeCategory)

  async function analyzeGaps() {
    if (!selectedCourseId) return

    setGapLoading(true)
    setGapSuggestions([])

    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/suggest-tools`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setGapSuggestions(data.suggestions ?? [])
      }
    } finally {
      setGapLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Experience type gallery ───────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-r from-[#0033A0] via-blue-700 to-sky-600 text-white">
          <div className="px-6 py-8 sm:px-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200 mb-3">
              Build
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-2">
              {currentUser.role === 'STUDENT'
                ? 'Build something for your education'
                : 'What experience do you want to create for your students?'}
            </h1>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed mb-6 max-w-2xl">
              {currentUser.role === 'STUDENT'
                ? 'Build AI tools for your courses, publish to the community, or create experiences for the Sandcastle.'
                : 'Describe the activity, tutor, or simulation you want, and The Sandbox will help you turn it into a live learning experience.'}
            </p>

            <div className="relative max-w-2xl">
              <div className="absolute top-3 left-4 z-10">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <textarea
                value={buildPrompt}
                onChange={(e) => setBuildPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (buildPrompt.trim()) {
                      router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
                    }
                  }
                }}
                placeholder={'e.g. "A Socratic tutor for 1L Contracts students to practice offer and acceptance"'}
                rows={3}
                className="w-full rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder-blue-300 px-5 py-4 pl-14 pb-14 text-base focus:outline-none focus:border-white/50 backdrop-blur-sm resize-none"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                <span className="text-blue-200 text-xs hidden sm:inline">
                  Shift+Enter for new line
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (buildPrompt.trim()) {
                      router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
                    }
                  }}
                  disabled={!buildPrompt.trim()}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0033A0] disabled:opacity-40 hover:bg-blue-50 transition-colors flex-shrink-0"
                >
                  Start Building -&gt;
                </button>
              </div>
            </div>
            <p className="text-blue-200 text-xs mt-2">
              Most experiences take less than 5 minutes to set up. Or{' '}
              <button
                type="button"
                onClick={() => {
                  document.getElementById('experience-gallery')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                browse templates ↓
              </button>
              {' '}·{' '}
              <Link href="/publish" className="underline underline-offset-2 hover:text-white transition-colors">
                fill out a form →
              </Link>
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#0033A0]">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0033A0]">
                  New
                </div>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">Want to build a live app?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                  Open Playground to describe a tool, generate a working browser app, edit the
                  code, and run it instantly without leaving the Sandbox.
                </p>
              </div>
            </div>

            <Link
              href="/playground"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0033A0] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              Open Playground
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section id="experience-gallery">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">Not sure where to start? Pick a type.</h2>
            <p className="text-sm text-gray-500">
              Browse example formats for inspiration, then open one and adapt it to your course.
            </p>
          </div>

          {/* Category pill tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {EXPERIENCE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#0033A0] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Experience type cards */}
          {activeCat && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeCat.types.map((exp) => (
                <button
                  key={exp.name}
                  onClick={() =>
                    router.push(`/builder?prompt=${encodeURIComponent(exp.promptTemplate)}`)
                  }
                  className="text-left rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#0033A0]/40 hover:shadow-md transition-all group"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#0033A0] bg-blue-50 px-2 py-1 rounded-full w-fit mb-3">
                    {exp.toolType.replace(/_/g, ' ')}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#0033A0] transition-colors">
                    {exp.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{exp.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
                    Build this <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section id="course-workspace" className="bg-gradient-to-br from-blue-50 to-white rounded-3xl border border-blue-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0033A0] mb-1">AI-Powered</div>
              <h2 className="text-xl font-bold text-gray-900">Course Build Workspace</h2>
              <p className="text-sm text-gray-500">
                Select a course and let AI identify what experiences are missing for your students.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row mb-6">
            <select
              value={selectedCourseId}
              onChange={(event) => {
                setSelectedCourseId(event.target.value)
                setGapSuggestions([])
              }}
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
            >
              <option value="">Select a course...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseCode} - {course.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={analyzeGaps}
              disabled={!selectedCourseId || gapLoading}
              className="px-6 py-3 rounded-2xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {gapLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Find what&apos;s missing
                </>
              )}
            </button>
          </div>

          {courses.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">No courses available yet</p>
              <p className="text-xs text-gray-500 mt-1">
                {currentUser.role === 'STUDENT'
                  ? 'As courses become public, they will appear here for student builders.'
                  : 'Create or publish a course first to unlock AI gap analysis.'}
              </p>
            </div>
          ) : gapLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : gapSuggestions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {gapSuggestions.map((suggestion, index) => (
                <div key={`${suggestion.title}-${index}`} className="rounded-2xl border border-[#0033A0]/20 bg-blue-50/40 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#0033A0] text-white px-2 py-1 rounded-full">
                      {suggestion.toolType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{suggestion.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                  <p className="text-xs text-[#0033A0] font-medium italic">
                    &quot;{suggestion.recommendation || suggestion.rationale}&quot;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href={`/builder?prompt=${encodeURIComponent(`Build a ${suggestion.toolType.replace(/_/g, ' ').toLowerCase()} called "${suggestion.title}" for ${courses.find((c) => c.id === selectedCourseId)?.courseCode ?? 'this course'}. ${suggestion.description}`)}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                    >
                      Build with AI
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      href={`/publish?course=${encodeURIComponent(courses.find((course) => course.id === selectedCourseId)?.courseCode ?? '')}&prefill=${encodeURIComponent(suggestion.title)}&type=${encodeURIComponent(suggestion.toolType)}`}
                      className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                    >
                      or use form
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedCourseId ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Click &quot;Find what&apos;s missing&quot; to get AI suggestions</p>
              <p className="text-xs text-gray-500 mt-1">
                Claude will review your course materials and currently linked experiences.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Choose a course to start</p>
              <p className="text-xs text-gray-500 mt-1">
                The workspace will suggest high-impact experiences once a course is selected.
              </p>
            </div>
          )}
        </section>

        {/* ── Collaborator + Refiner entry points ──────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/build/collaborator"
            className="group flex items-start gap-4 bg-white rounded-3xl border border-gray-200 p-5 hover:border-[#0033A0]/40 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors">Collaborator</h3>
              <p className="text-sm text-gray-500 mt-0.5">Ask a peer to demo your draft. Sandy guides them through a structured review and sends you the feedback.</p>
            </div>
          </Link>
          <Link
            href="/build/refiner"
            className="group flex items-start gap-4 bg-white rounded-3xl border border-gray-200 p-5 hover:border-[#0033A0]/40 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors">Refiner</h3>
              <p className="text-sm text-gray-500 mt-0.5">All your unpublished drafts in one place. Pick one up, refine it with AI, and publish.</p>
            </div>
          </Link>
        </section>

        {/* ── Drafts + Bounties ─────────────────────────────────────────────── */}
        <section id="refiner" className="grid grid-cols-1 xl:grid-cols-[1.5fr,1fr] gap-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your drafts</h2>
                <p className="text-sm text-gray-500">Your latest unpublished experiences, organized for quick iteration.</p>
              </div>
              <Link href="/publish" className="text-sm font-semibold text-[#0033A0] hover:underline">
                Fill in manually
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No draft experiences yet</p>
                <p className="text-xs text-gray-500 mt-1">Start in Builder to generate a prototype, then come back here to keep refining.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div key={draft.id} className="rounded-2xl border border-gray-200 px-5 py-4 hover:border-[#0033A0]/30 hover:bg-blue-50/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Draft
                          </span>
                          <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {draft.category}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 truncate">{draft.name}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{draft.shortDescription}</p>
                      </div>
                      <Link href={`/publish?edit=${draft.id}`} className="flex-shrink-0 text-sm font-semibold text-[#0033A0] hover:underline">
                        Resume
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Open requests</h2>
                <p className="text-sm text-gray-500">Open opportunities where you can help shape or build.</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : bounties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
                <p className="text-sm font-medium text-gray-700">No open collaboration requests right now</p>
                <p className="text-xs text-gray-500 mt-1">Check back later or post a new bounty from the board.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bounties.map((bounty) => (
                  <Link
                    key={bounty.id}
                    href={`/bounties/${bounty.id}`}
                    className="block rounded-2xl border border-gray-200 px-4 py-4 hover:border-[#0033A0]/30 hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {bounty.status}
                      </span>
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {bounty.category}
                      </span>
                      {bounty.estimatedHours && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock3 className="w-3 h-3" />
                          ~{bounty.estimatedHours}h
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{bounty.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
