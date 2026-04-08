'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import {
  Bot, Brain, HelpCircle, Layers, Swords, PenLine, GraduationCap,
  BookOpen, Loader2, ChevronRight, Sparkles, Timer, Target,
  TrendingUp, Calendar,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import PageHeader from '../components/PageHeader'

const StudyBuddyInterface = dynamic(
  () => import('../components/StudyBuddyInterface'),
  { ssr: false, loading: () => <div className="h-[600px] animate-pulse rounded-2xl bg-gray-100" /> }
)

interface EnrolledCourse {
  id: string
  courseCode: string
  title: string
  instructor?: { name: string }
}

const MODES = [
  { id: 'tutor', label: 'Tutor', icon: Bot, description: 'Explain concepts at your level', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Test yourself with adaptive questions', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, description: 'Spaced repetition for long-term memory', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'socratic', label: 'Socratic', icon: Brain, description: 'Learn through guided questioning', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'teach-back', label: 'Teach Back', icon: GraduationCap, description: 'Explain it to prove you know it', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'debate', label: 'Debate', icon: Swords, description: 'Argue a position and defend it', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'essay', label: 'Essay Coach', icon: PenLine, description: 'Get feedback on your writing', color: 'bg-teal-50 text-teal-700 border-teal-200' },
] as const

export default function StudyPage() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const email = currentUser.email
  const [studyBuddyToolId, setStudyBuddyToolId] = useState<string | null>(null)
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null)
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [deepLinkHandled, setDeepLinkHandled] = useState(false)

  useEffect(() => {
    if (!email) return
    const controller = new AbortController()

    Promise.allSettled([
      apiFetch<{ tools?: { id: string }[] }>(email, '/api/tools?toolType=STUDY_BUDDY&limit=1', { signal: controller.signal }),
      apiFetch<{ courses?: EnrolledCourse[] }>(email, '/api/enrollment', { signal: controller.signal }),
    ]).then(([toolResult, enrollResult]) => {
      if (toolResult.status === 'fulfilled') {
        const tools = Array.isArray(toolResult.value)
          ? toolResult.value
          : toolResult.value?.tools ?? []
        if (tools.length > 0) setStudyBuddyToolId(tools[0].id)
      }
      if (enrollResult.status === 'fulfilled') {
        const data = Array.isArray(enrollResult.value)
          ? enrollResult.value
          : enrollResult.value?.courses ?? []
        setCourses(data)
      }
    }).finally(() => setLoading(false))

    return () => controller.abort()
  }, [email])

  function startSession(mode?: string, course?: EnrolledCourse, concept?: string | null) {
    if (mode) setSelectedMode(mode)
    else setSelectedMode(null)
    if (course) setSelectedCourse(course)
    else setSelectedCourse(null)
    setSelectedConcept(concept ?? null)
    setSessionActive(true)
  }

  function exitSession() {
    setSessionActive(false)
    setSelectedMode(null)
    setSelectedCourse(null)
    setSelectedConcept(null)
  }

  useEffect(() => {
    if (deepLinkHandled || loading || !studyBuddyToolId) return

    const modeParam = searchParams.get('mode')
    const courseIdParam = searchParams.get('courseId')
    const conceptParam = searchParams.get('concept')

    if (!modeParam && !courseIdParam && !conceptParam) return

    const matchedCourse = courseIdParam
      ? courses.find((course) => course.id === courseIdParam) ?? null
      : null

    const timeoutId = window.setTimeout(() => {
      setSelectedMode(modeParam ?? (conceptParam ? 'tutor' : null))
      setSelectedCourse(matchedCourse)
      setSelectedConcept(conceptParam)
      setSessionActive(true)
      setDeepLinkHandled(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [courses, deepLinkHandled, loading, searchParams, studyBuddyToolId])

  if (!email) return null

  // Active study session — full-screen Study Buddy
  if (sessionActive && studyBuddyToolId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={exitSession}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronRight className="size-4 rotate-180" />
            Back to Study Hub
          </button>
          <div style={{ minHeight: '600px' }}>
            <StudyBuddyInterface
              toolId={studyBuddyToolId}
              toolName="Study Buddy"
              userEmail={email}
              courseId={selectedCourse?.id}
              courseName={selectedCourse ? `${selectedCourse.courseCode} · ${selectedCourse.title}` : undefined}
              initialMode={selectedMode ?? undefined}
              initialConcept={selectedConcept ?? undefined}
              onDone={exitSession}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Study Buddy"
        subtitle="Your AI-powered study partner — 7 modes, persistent memory, adapts to how you learn"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Quick Start — pick a mode */}
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Pick a Study Mode</h2>
              <p className="text-sm text-gray-500 mb-4">Choose how you want to study. Sandy adapts to each mode.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {MODES.map((m) => {
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      onClick={() => startSession(m.id)}
                      disabled={!studyBuddyToolId}
                      className={`group relative border rounded-2xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed ${m.color}`}
                    >
                      <Icon className="size-6 mb-2" />
                      <p className="font-semibold text-sm">{m.label}</p>
                      <p className="text-xs mt-0.5 opacity-70">{m.description}</p>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* My Courses — quick launch per course */}
            {courses.length > 0 && (
              <section>
                <h2 className="text-lg font-extrabold text-gray-900 mb-1">Study by Course</h2>
                <p className="text-sm text-gray-500 mb-4">Jump into a study session powered by your course materials.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => startSession(undefined, c)}
                      disabled={!studyBuddyToolId}
                      className="flex items-center gap-4 border border-gray-200 bg-white rounded-2xl p-4 text-left hover:shadow-md hover:border-[#0033A0]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="size-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="size-5 text-[#0033A0]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{c.courseCode}</p>
                        <p className="text-xs text-gray-500 truncate">{c.title}</p>
                      </div>
                      <ChevronRight className="size-4 text-gray-300 ml-auto flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Feature Highlights */}
            <section>
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">What Makes Study Buddy Different</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Brain, title: 'Learns You', desc: 'Persistent learner model tracks your strengths and weaknesses across sessions' },
                  { icon: Timer, title: 'Spaced Repetition', desc: 'SM-2 algorithm schedules flashcard reviews at the optimal time for retention' },
                  { icon: Target, title: 'Adaptive Difficulty', desc: 'Questions get harder or easier based on real-time mastery signals' },
                  { icon: TrendingUp, title: 'Insights Dashboard', desc: 'Mastery trends, concept maps, study habits, and session history' },
                ].map((f) => {
                  const Icon = f.icon
                  return (
                    <div key={f.title} className="border border-gray-200 bg-white rounded-2xl p-5">
                      <Icon className="size-5 text-[#0033A0] mb-2" />
                      <p className="font-semibold text-sm text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Quick links */}
            <section className="flex flex-wrap gap-3">
              <Link
                href="/assessment/mastery"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0033A0] transition-colors"
              >
                <GraduationCap className="size-4" />
                Mastery Gates
              </Link>
              <Link
                href="/analytics/student"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0033A0] transition-colors"
              >
                <TrendingUp className="size-4" />
                My Analytics
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0033A0] transition-colors"
              >
                <Calendar className="size-4" />
                Active Study Rooms
              </Link>
              <Link
                href="/hub/browse"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0033A0] transition-colors"
              >
                <Sparkles className="size-4" />
                Browse All Tools
              </Link>
            </section>

            {/* No Study Buddy tool found */}
            {!studyBuddyToolId && !loading && (
              <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 text-center">
                <Sparkles className="size-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-800">No Study Buddy tool found</p>
                <p className="text-xs text-amber-600 mt-1">Ask your instructor to create a Study Buddy tool, or browse existing tools.</p>
                <Link
                  href="/hub/browse"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:underline"
                >
                  Browse tools <ChevronRight className="size-3" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
