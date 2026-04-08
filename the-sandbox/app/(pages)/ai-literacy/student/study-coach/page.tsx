'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronRight, GraduationCap, Loader2,
  MessageCircle, Clock, Star,
} from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import PathwayNav from '../../../../components/ai-literacy/PathwayNav'

// ── Types ───────────────────────────────────────────────────────────────────

interface PastSession {
  id: string
  topic: string
  course?: { id: string; title: string; courseCode: string } | null
  overallScore: number | null
  completedAt: string | null
  createdAt: string
  messages: unknown[]
}

interface EnrolledCourse {
  course: { id: string; title: string; code: string }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function StudyCoachHubPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [topic, setTopic] = useState('')
  const [courseId, setCourseId] = useState('')
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [sessions, setSessions] = useState<PastSession[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const headers = { 'x-demo-user-email': currentUser.email }

    Promise.all([
      fetch('/api/ai-literacy/student/study-coach', { headers }).then((r) =>
        r.ok ? r.json() : { sessions: [] },
      ),
      fetch('/api/ai-literacy/student/policies', { headers }).then((r) =>
        r.ok ? r.json() : { courses: [] },
      ),
    ]).then(([sessData, policyData]) => {
      setSessions(sessData.sessions || [])
      setCourses(policyData.courses || [])
      setLoading(false)
    })
  }, [currentUser])

  const startSession = async () => {
    if (!topic.trim() || starting) return
    setStarting(true)

    try {
      const res = await fetch('/api/ai-literacy/student/study-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ topic: topic.trim(), courseId: courseId || undefined }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/ai-literacy/student/study-coach/${data.session.id}`)
      }
    } finally {
      setStarting(false)
    }
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-700 bg-green-50'
    if (score >= 50) return 'text-blue-700 bg-blue-50'
    if (score >= 25) return 'text-amber-700 bg-amber-50'
    return 'text-gray-700 bg-gray-50'
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <Link href="/ai-literacy/student" className="hover:text-gray-900">Student</Link>
          <ChevronRight className="size-3" />
          <span>AI Study Coach</span>
        </nav>
      </div>

      <PageHeader
        title="AI Study Coach"
        subtitle="Practice learning with AI — a coach helps you build good habits"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* New Session Form */}
        <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-full bg-rose-50 flex items-center justify-center">
              <GraduationCap className="size-4 text-rose-600" />
            </div>
            <h2 className="text-base font-extrabold text-gray-900">Start a New Session</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="course-select" className="block text-xs font-medium text-gray-600 mb-1">
                Course (optional)
              </label>
              <select
                id="course-select"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
              >
                <option value="">Select a course (optional)</option>
                {courses.map((c) => (
                  <option key={c.course.id} value={c.course.id}>
                    {c.course.code} — {c.course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="topic-input" className="block text-xs font-medium text-gray-600 mb-1">
                What are you studying?
              </label>
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startSession()}
                placeholder="e.g., photosynthesis for my bio exam"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
              />
            </div>

            <button
              onClick={startSession}
              disabled={!topic.trim() || starting}
              className="bg-[#0033A0] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {starting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Session'
              )}
            </button>
          </div>
        </div>

        {/* Past Sessions */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-gray-400" />
          </div>
        ) : sessions.length > 0 ? (
          <div>
            <h2 className="text-base font-extrabold text-gray-900 mb-3">Past Sessions</h2>
            <div className="space-y-2">
              {sessions.map((s) => {
                const msgCount = Array.isArray(s.messages)
                  ? (s.messages as Array<Record<string, unknown>>).filter((m) => m && m.role === 'user').length
                  : 0

                return (
                  <Link
                    key={s.id}
                    href={`/ai-literacy/student/study-coach/${s.id}`}
                    className="block border-2 border-gray-200 rounded-2xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {s.topic}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          {s.course && (
                            <span className="text-xs text-gray-500">
                              {s.course.courseCode}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="size-3" />
                            {formatDate(s.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MessageCircle className="size-3" />
                            {msgCount} messages
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.overallScore != null ? (
                          <span
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${getScoreColor(s.overallScore)}`}
                          >
                            <Star className="size-3" />
                            {s.overallScore}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">In progress</span>
                        )}
                        <ChevronRight className="size-4 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Back link */}
        <PathwayNav />
      </div>
    </>
  )
}
