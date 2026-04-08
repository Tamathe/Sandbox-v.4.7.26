'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, Lightbulb, Clock,
  GraduationCap, BarChart3,
} from 'lucide-react'
import { useAuth } from '../../../../../lib/auth-context'
import StudyCoachChat from '../../../../../components/ai-literacy/StudyCoachChat'

// ── Types ───────────────────────────────────────────────────────────────────

interface SessionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  coachingNote?: string
  timestamp: string
}

interface SessionData {
  id: string
  topic: string
  courseId: string | null
  course?: { id: string; title: string; courseCode: string } | null
  messages: SessionMessage[]
  techniqueScores: {
    followUpQuality: number
    verificationHabits: number
    thinkingPauses: number
    contextProvision: number
  } | null
  overallScore: number | null
  completedAt: string | null
  createdAt: string
}

interface ScoreResult {
  techniqueScores: {
    followUpQuality: number
    verificationHabits: number
    thinkingPauses: number
    contextProvision: number
  }
  overallScore: number
  feedback: string
}

// ── Score Bar Component ─────────────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string
  score: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs font-semibold text-gray-900">{score}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

// ── Readiness Band ──────────────────────────────────────────────────────────

function getScoreBand(score: number) {
  if (score >= 75) return { label: 'Excellent', color: 'text-green-700', bg: 'bg-green-50' }
  if (score >= 50) return { label: 'Good', color: 'text-blue-700', bg: 'bg-blue-50' }
  if (score >= 25) return { label: 'Developing', color: 'text-amber-700', bg: 'bg-amber-50' }
  return { label: 'Getting Started', color: 'text-gray-700', bg: 'bg-gray-50' }
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function StudyCoachSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { currentUser } = useAuth()
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [coachingNotes, setCoachingNotes] = useState<string[]>([])
  const [ending, setEnding] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch session
  useEffect(() => {
    if (!currentUser || !sessionId) return

    fetch(`/api/ai-literacy/student/study-coach/${sessionId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.session) {
          setSession(data.session)

          // Extract existing coaching notes
          const msgs = (data.session.messages || []) as SessionMessage[]
          const notes = msgs
            .filter((m) => m.coachingNote)
            .map((m) => m.coachingNote!)
          setCoachingNotes(notes)

          // If already completed, build score result from stored data
          if (data.session.completedAt && data.session.techniqueScores) {
            setScoreResult({
              techniqueScores: data.session.techniqueScores,
              overallScore: data.session.overallScore || 0,
              feedback: '',
            })
          }
        }
        setLoading(false)
      })
  }, [currentUser, sessionId])

  // Duration timer
  useEffect(() => {
    if (!session || session.completedAt) return

    const start = new Date(session.createdAt).getTime()
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    timerRef.current = setInterval(tick, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session])

  // Stop timer when session completes
  useEffect(() => {
    if (scoreResult && timerRef.current) {
      clearInterval(timerRef.current)
    }
  }, [scoreResult])

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleCoachingNote = useCallback((note: string) => {
    setCoachingNotes((prev) => [note, ...prev])
  }, [])

  const endSession = async () => {
    setShowConfirm(false)
    setEnding(true)

    try {
      const res = await fetch(
        `/api/ai-literacy/student/study-coach/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
        },
      )

      if (res.ok) {
        const result = await res.json()
        setScoreResult(result)
        setSession((prev) =>
          prev ? { ...prev, completedAt: new Date().toISOString() } : prev,
        )
      }
    } finally {
      setEnding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Session not found.</p>
        <Link
          href="/ai-literacy/student/study-coach"
          className="text-[#0033A0] text-sm mt-2 inline-block"
        >
          Back to Study Coach
        </Link>
      </div>
    )
  }

  const isCompleted = !!session.completedAt || !!scoreResult

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy/student/study-coach" className="hover:text-gray-900">
            Study Coach
          </Link>
          <span className="text-gray-300">/</span>
          <span className="truncate max-w-[200px]">{session.topic}</span>
        </nav>
      </div>

      {/* Session Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">{session.topic}</h1>
            <div className="flex items-center gap-3 mt-1">
              {session.course && (
                <span className="text-xs text-gray-500">
                  {session.course.courseCode} — {session.course.title}
                </span>
              )}
              {!isCompleted && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="size-3" />
                  {formatDuration(elapsedSeconds)}
                </span>
              )}
            </div>
          </div>

          {!isCompleted && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={ending}
              className="border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              Ready to see how you did?
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Your session will be scored on 4 study techniques: follow-up quality,
              verification habits, thinking pauses, and context provision.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm hover:bg-gray-50"
              >
                Keep Going
              </button>
              <button
                onClick={endSession}
                className="flex-1 bg-[#0033A0] text-white rounded-xl px-3 py-2 text-sm hover:bg-[#002880]"
              >
                Score My Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoring overlay */}
      {ending && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-[#0033A0]" />
            <p className="text-sm font-medium text-gray-700">
              Analyzing your study session...
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {scoreResult ? (
          /* ── Scorecard ───────────────────────────── */
          <div className="space-y-6">
            <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <GraduationCap className="size-5 text-[#0033A0]" />
                <h2 className="text-base font-extrabold text-gray-900">Session Scorecard</h2>
              </div>

              {/* Overall score */}
              <div className="flex flex-col items-center mb-6">
                <div className="text-4xl font-extrabold text-gray-900">
                  {scoreResult.overallScore}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${getScoreBand(scoreResult.overallScore).bg} ${getScoreBand(scoreResult.overallScore).color}`}
                >
                  {getScoreBand(scoreResult.overallScore).label}
                </span>
              </div>

              {/* 4 technique bars */}
              <div className="space-y-3">
                <ScoreBar
                  label="Follow-Up Quality"
                  score={scoreResult.techniqueScores.followUpQuality}
                  color="bg-blue-500"
                />
                <ScoreBar
                  label="Verification Habits"
                  score={scoreResult.techniqueScores.verificationHabits}
                  color="bg-green-500"
                />
                <ScoreBar
                  label="Thinking Pauses"
                  score={scoreResult.techniqueScores.thinkingPauses}
                  color="bg-purple-500"
                />
                <ScoreBar
                  label="Context Provision"
                  score={scoreResult.techniqueScores.contextProvision}
                  color="bg-amber-500"
                />
              </div>

              {/* Feedback */}
              {scoreResult.feedback && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">
                    <BarChart3 className="size-4 inline mr-1" />
                    Coach Feedback
                  </h3>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {scoreResult.feedback}
                  </div>
                </div>
              )}
            </div>

            {/* Read-only chat */}
            <div className="border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500">Session Transcript</p>
              </div>
              <div className="h-[400px]">
                <StudyCoachChat
                  sessionId={sessionId}
                  initialMessages={session.messages}
                  completed={true}
                  onCoachingNote={() => {}}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/ai-literacy/student/study-coach"
                className="bg-[#0033A0] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#002880] transition-colors"
              >
                Start New Session
              </Link>
              <Link
                href="/ai-literacy/student"
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                Back to AI Literacy
              </Link>
            </div>
          </div>
        ) : (
          /* ── Active Session: Chat + Coaching Hints ── */
          <div className="flex gap-4">
            {/* Chat area */}
            <div className="flex-1 border-2 border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="h-[calc(100vh-280px)] min-h-[400px]">
                <StudyCoachChat
                  sessionId={sessionId}
                  initialMessages={session.messages}
                  completed={false}
                  onCoachingNote={handleCoachingNote}
                />
              </div>
            </div>

            {/* Coaching hints sidebar */}
            <div className="hidden lg:block w-72 shrink-0">
              <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-4 sticky top-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="size-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-gray-900">Technique Tips</h3>
                </div>

                {coachingNotes.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Tips will appear here as you chat with the coach.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                    {coachingNotes.map((note, i) => (
                      <div
                        key={i}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
