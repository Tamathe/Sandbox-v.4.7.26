'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, Users, Trophy, ChevronRight, Loader2, CheckCircle2,
  XCircle, Crown, ArrowLeft, Share2, Copy, Check,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'

interface PlayerSummary {
  id: string
  displayName: string
  score: number
  userId: string
}

interface QuizDetailQuestion {
  id: string
  orderIndex: number
  questionText: string
  options: string[]
  correctIndex?: number
  explanation?: string
  myAnswer?: { selectedIndex: number; isCorrect: boolean } | null
}

interface QuizDetail {
  id: string
  title: string
  topic: string
  accessCode: string
  status: string
  currentQ: number
  isHost: boolean
  myPlayer: { id: string; displayName: string; score: number; userId: string } | null
  questions: QuizDetailQuestion[]
  players: PlayerSummary[]
}

const OPTION_COLORS = [
  'bg-blue-600 hover:bg-blue-700',
  'bg-green-600 hover:bg-green-700',
  'bg-amber-500 hover:bg-amber-600',
  'bg-red-600 hover:bg-red-700',
]
const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function QuizBowlGamePage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params)
  const { currentUser } = useAuth()
  const router = useRouter()

  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState(currentUser.name ?? 'Player')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; correctIndex: number; explanation: string } | null>(null)
  const [answering, setAnswering] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [advanceCountdown, setAdvanceCountdown] = useState<number | null>(null)

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-demo-user-email': currentUser.email,
  }), [currentUser.email])

  const fetchQuiz = useCallback(async () => {
    const res = await fetch(`/api/quiz-bowl/${quizId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (!res.ok) return
    const data = await res.json()
    setQuiz(data.quiz)
  }, [quizId, currentUser.email])

  // Initial load
  useEffect(() => {
    fetchQuiz().finally(() => setLoading(false))
  }, [fetchQuiz])

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchQuiz, 3000)
    return () => clearInterval(interval)
  }, [fetchQuiz])

  // Reset answer result when question advances
  useEffect(() => {
    setAnswerResult(null)
    setAdvanceCountdown(null)
  }, [quiz?.currentQ])

  async function handleJoin() {
    if (!displayName.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(`/api/quiz-bowl/${quizId}/join`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ displayName: displayName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setJoinError(data.error ?? 'Failed to join'); return }
      await fetchQuiz()
    } catch {
      setJoinError('Network error')
    } finally {
      setJoining(false)
    }
  }

  async function handleStart() {
    setStarting(true)
    try {
      await fetch(`/api/quiz-bowl/${quizId}/start`, { method: 'POST', headers: headers() })
      await fetchQuiz()
    } finally {
      setStarting(false)
    }
  }

  async function handleAnswer(selectedIndex: number) {
    if (!quiz || answering || answerResult) return
    const q = quiz.questions[quiz.currentQ]
    if (!q) return
    setAnswering(true)
    try {
      const res = await fetch(`/api/quiz-bowl/${quizId}/answer`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ questionId: q.id, selectedIndex }),
      })
      const data = await res.json()
      if (res.ok) {
        setAnswerResult(data)
        // Start 5-second countdown for host to advance
        if (quiz.isHost) {
          let count = 5
          setAdvanceCountdown(count)
          const timer = setInterval(() => {
            count--
            setAdvanceCountdown(count)
            if (count <= 0) {
              clearInterval(timer)
              setAdvanceCountdown(null)
            }
          }, 1000)
        }
      }
    } finally {
      setAnswering(false)
      await fetchQuiz()
    }
  }

  async function handleAdvance() {
    setAdvancing(true)
    setAdvanceCountdown(null)
    try {
      await fetch(`/api/quiz-bowl/${quizId}/advance`, { method: 'POST', headers: headers() })
      await fetchQuiz()
    } finally {
      setAdvancing(false)
    }
  }

  function handleCopyCode() {
    if (!quiz) return
    navigator.clipboard.writeText(quiz.accessCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-yellow-400" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="font-bold text-gray-900">Quiz not found.</p>
        <Link href="/quiz-bowl" className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#0033A0] hover:underline">
          <ArrowLeft className="size-4" /> Back to Quiz Bowl
        </Link>
      </div>
    )
  }

  // ── Lobby / Generating / Ready ─────────────────────────────────────────────

  if (quiz.status === 'LOBBY' || quiz.status === 'GENERATING' || quiz.status === 'READY') {
    const needsJoin = !quiz.isHost && !quiz.myPlayer
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <Link href="/quiz-bowl" className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <p className="text-sm font-semibold text-slate-300">{quiz.title}</p>
          <div />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-12">
          {/* Access code */}
          <div className="text-center">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-2">Join code</p>
            <div className="flex items-center gap-3">
              <p className="text-5xl font-black tracking-widest text-yellow-400 font-mono">{quiz.accessCode}</p>
              <button onClick={handleCopyCode} className="text-slate-400 hover:text-white transition-colors">
                {copied ? <Check className="size-5 text-green-400" /> : <Copy className="size-5" />}
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2">Share this code with your players</p>
          </div>

          {/* Status */}
          {quiz.status === 'GENERATING' && (
            <div className="flex items-center gap-2 text-amber-400">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm font-semibold">AI is writing your questions…</span>
            </div>
          )}

          {/* Join form for non-host players */}
          {needsJoin && quiz.status !== 'GENERATING' && (
            <div className="w-full max-w-sm space-y-3">
              <p className="text-center text-slate-300 text-sm font-semibold">Enter your display name to join</p>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Your name"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={handleJoin}
                disabled={joining || !displayName.trim()}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {joining ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                Join Quiz
              </button>
              {joinError && <p className="text-red-400 text-xs text-center">{joinError}</p>}
            </div>
          )}

          {/* Joined as player */}
          {!quiz.isHost && quiz.myPlayer && (
            <div className="text-center text-green-400 flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              <span className="text-sm font-semibold">You&apos;re in as <strong>{quiz.myPlayer.displayName}</strong></span>
            </div>
          )}

          {/* Players list */}
          <div className="w-full max-w-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Users className="size-3.5" /> {quiz.players.length} players joined
            </p>
            <div className="space-y-2">
              {quiz.players.map(p => (
                <div key={p.id} className="bg-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-green-400" />
                  {p.displayName}
                  {p.userId === quiz.players.find(pl => pl.userId === currentUser.id)?.userId && (
                    <span className="ml-auto text-xs text-slate-500">(you)</span>
                  )}
                </div>
              ))}
              {quiz.players.length === 0 && (
                <p className="text-slate-600 text-xs text-center py-3">No players yet…</p>
              )}
            </div>
          </div>

          {/* Host start button */}
          {quiz.isHost && quiz.status === 'READY' && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 font-black text-lg px-10 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-lg shadow-yellow-400/20"
            >
              {starting ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5" />}
              Start Quiz!
            </button>
          )}
          {quiz.isHost && quiz.status !== 'READY' && quiz.status !== 'GENERATING' && (
            <p className="text-slate-500 text-sm">Waiting for questions to generate…</p>
          )}
          {!quiz.isHost && quiz.status === 'READY' && quiz.myPlayer && (
            <p className="text-slate-400 text-sm flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" /> Waiting for host to start…
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── In Progress ────────────────────────────────────────────────────────────

  if (quiz.status === 'IN_PROGRESS') {
    const currentQuestion = quiz.questions[quiz.currentQ]
    const totalQ = quiz.questions.length
    const myAnswer = answerResult ?? (currentQuestion?.myAnswer
      ? { isCorrect: currentQuestion.myAnswer.isCorrect, correctIndex: currentQuestion.correctIndex ?? -1, explanation: currentQuestion.explanation ?? '' }
      : null)
    const hasAnswered = !!myAnswer

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col">
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-700">
          <div
            className="h-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${((quiz.currentQ + 1) / totalQ) * 100}%` }}
          />
        </div>

        <div className="flex flex-col lg:flex-row flex-1">
          {/* Main game area */}
          <div className="flex-1 flex flex-col px-4 py-8 max-w-3xl mx-auto w-full">
            {/* Question counter */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-400 text-sm font-semibold">
                Question <span className="text-white">{quiz.currentQ + 1}</span> of {totalQ}
              </p>
              {quiz.myPlayer && (
                <p className="text-yellow-400 text-sm font-bold flex items-center gap-1">
                  <Trophy className="size-4" /> {quiz.myPlayer.score} pts
                </p>
              )}
            </div>

            {/* Question text */}
            {currentQuestion && (
              <>
                <div className="bg-slate-800 rounded-2xl p-6 mb-6 text-center">
                  <p className="text-xl font-bold text-white leading-relaxed">{currentQuestion.questionText}</p>
                </div>

                {/* Answer options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {currentQuestion.options.map((option, idx) => {
                    const isChosen = hasAnswered && (answerResult?.correctIndex !== undefined
                      ? currentQuestion.myAnswer?.selectedIndex === idx
                      : false)
                    const isCorrect = hasAnswered && currentQuestion.correctIndex === idx
                    const isWrong = hasAnswered && currentQuestion.myAnswer?.selectedIndex === idx && !currentQuestion.myAnswer?.isCorrect

                    let extraClass = ''
                    if (hasAnswered) {
                      if (isCorrect) extraClass = 'ring-4 ring-green-400 opacity-100'
                      else if (isWrong) extraClass = 'ring-4 ring-red-400 opacity-60'
                      else extraClass = 'opacity-40'
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !hasAnswered && handleAnswer(idx)}
                        disabled={hasAnswered || answering || !quiz.myPlayer}
                        className={`${OPTION_COLORS[idx]} disabled:cursor-default text-white rounded-xl py-4 px-5 text-left flex items-center gap-4 transition-all ${extraClass}`}
                      >
                        <span className="text-lg font-black opacity-80">{OPTION_LETTERS[idx]}</span>
                        <span className="text-sm font-semibold">{option}</span>
                        {hasAnswered && isCorrect && <CheckCircle2 className="size-5 ml-auto" />}
                        {hasAnswered && isWrong && <XCircle className="size-5 ml-auto" />}
                      </button>
                    )
                  })}
                </div>

                {/* Answer feedback */}
                {myAnswer && (
                  <div className={`rounded-2xl p-4 mb-4 ${myAnswer.isCorrect ? 'bg-green-900/40 border border-green-700' : 'bg-red-900/40 border border-red-700'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {myAnswer.isCorrect
                        ? <CheckCircle2 className="size-5 text-green-400" />
                        : <XCircle className="size-5 text-red-400" />}
                      <p className={`font-bold text-sm ${myAnswer.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                        {myAnswer.isCorrect ? '+100 points!' : 'Incorrect'}
                      </p>
                    </div>
                    {currentQuestion.explanation && (
                      <p className="text-slate-300 text-xs">{currentQuestion.explanation}</p>
                    )}
                  </div>
                )}

                {/* Host controls */}
                {quiz.isHost && hasAnswered && (
                  <button
                    onClick={handleAdvance}
                    disabled={advancing}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {advancing ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                    {advanceCountdown !== null && advanceCountdown > 0
                      ? `Next Question (${advanceCountdown}…)`
                      : quiz.currentQ + 1 >= totalQ ? 'Finish Quiz' : 'Next Question →'}
                  </button>
                )}
                {!quiz.myPlayer && !quiz.isHost && (
                  <p className="text-slate-500 text-xs text-center">You are spectating this quiz.</p>
                )}
                {quiz.isHost && !hasAnswered && (
                  <p className="text-slate-500 text-xs text-center">Waiting for players to answer…</p>
                )}
              </>
            )}
          </div>

          {/* Leaderboard sidebar */}
          <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-700 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Leaderboard</p>
            <div className="space-y-2">
              {quiz.players.slice(0, 5).map((p, rank) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-4 text-right">{rank + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.displayName}</p>
                  </div>
                  <span className="text-xs font-bold text-yellow-400">{p.score}</span>
                </div>
              ))}
              {quiz.players.length === 0 && (
                <p className="text-slate-600 text-xs">No players yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Complete ───────────────────────────────────────────────────────────────

  if (quiz.status === 'COMPLETE') {
    const sorted = [...quiz.players].sort((a, b) => b.score - a.score)
    const myScore = quiz.myPlayer?.score ?? 0
    const myRank = sorted.findIndex(p => p.userId === quiz.myPlayer?.userId) + 1

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <Link href="/quiz-bowl" className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <p className="font-bold text-white">{quiz.title}</p>
          <div />
        </div>

        <div className="flex-1 flex flex-col items-center px-4 py-10 gap-8">
          {/* Trophy header */}
          <div className="text-center">
            <Trophy className="size-16 text-yellow-400 mx-auto mb-2" />
            <h1 className="text-3xl font-black text-white">Game Over!</h1>
            {quiz.myPlayer && (
              <p className="text-slate-400 text-sm mt-2">
                You finished <strong className="text-yellow-400">#{myRank}</strong> with <strong className="text-yellow-400">{myScore} points</strong>
              </p>
            )}
          </div>

          {/* Podium */}
          {sorted.length >= 3 && (
            <div className="flex items-end gap-4 mb-2">
              {/* 2nd */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-bold text-slate-300">{sorted[1]?.displayName}</p>
                <div className="w-20 h-16 bg-slate-700 rounded-t-xl flex items-center justify-center">
                  <span className="text-2xl font-black text-slate-400">2</span>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center gap-2">
                <Crown className="size-6 text-yellow-400" />
                <p className="text-sm font-bold text-yellow-400">{sorted[0]?.displayName}</p>
                <div className="w-24 h-24 bg-yellow-400 rounded-t-xl flex items-center justify-center">
                  <span className="text-3xl font-black text-yellow-900">1</span>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-bold text-slate-300">{sorted[2]?.displayName}</p>
                <div className="w-20 h-12 bg-slate-600 rounded-t-xl flex items-center justify-center">
                  <span className="text-2xl font-black text-slate-400">3</span>
                </div>
              </div>
            </div>
          )}

          {/* Full leaderboard */}
          <div className="w-full max-w-md border-2 border-slate-700 rounded-2xl overflow-hidden">
            <div className="bg-slate-800 px-4 py-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Final Scores</p>
            </div>
            {sorted.map((p, rank) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 border-t border-slate-800 ${p.userId === quiz.myPlayer?.userId ? 'bg-yellow-400/10' : ''}`}
              >
                <span className="text-sm text-slate-500 w-5 text-center font-bold">
                  {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}
                </span>
                <p className="flex-1 text-sm font-semibold text-white">{p.displayName}</p>
                <p className="text-sm font-bold text-yellow-400">{p.score} pts</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {quiz.isHost && (
              <Link
                href="/quiz-bowl/new"
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors"
              >
                <Zap className="size-4" />
                Play Again
              </Link>
            )}
            <Link
              href="/quiz-bowl"
              className="border-2 border-slate-600 text-slate-300 hover:border-slate-500 font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="size-4" />
              All Quizzes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}
