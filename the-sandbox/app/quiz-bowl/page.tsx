'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Plus, LogIn, ArrowRight, Users, CheckCircle, Clock, Trophy, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth-context'

interface QuizSummary {
  id: string
  title: string
  topic: string
  accessCode: string
  status: string
  currentQ: number
  createdAt: string
  questionCount: number
  playerCount: number
  isHost: boolean
  asPlayer: boolean
}

const STATUS_LABEL: Record<string, string> = {
  LOBBY: 'Waiting',
  GENERATING: 'Generating…',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
}

const STATUS_COLOR: Record<string, string> = {
  LOBBY: 'bg-gray-100 text-gray-600',
  GENERATING: 'bg-amber-100 text-amber-700',
  READY: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETE: 'bg-purple-100 text-purple-700',
}

export default function QuizBowlPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/quiz-bowl', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then(d => setQuizzes(d.quizzes ?? []))
      .finally(() => setLoading(false))
  }, [currentUser.email])

  async function handleJoinByCode() {
    if (!joinCode.trim()) return
    setJoinError('')
    // Look up quiz by access code
    const match = quizzes.find(q => q.accessCode.toLowerCase() === joinCode.trim().toLowerCase())
    if (match) {
      router.push(`/quiz-bowl/${match.id}`)
      return
    }
    setJoinError('No quiz found with that code. Ask the host to confirm.')
  }

  return (
    <div>
      <PageHeader
        title="Quiz Bowl Blitz"
        subtitle="AI-generated quizzes. Pick a topic, students join with a code, compete live."
        action={
          <Link
            href="/quiz-bowl/new"
            className="inline-flex items-center gap-2 bg-[#0033A0] hover:bg-[#002580] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="size-4" />
            Create Quiz
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', icon: Zap, title: 'Pick a Topic', desc: 'Name any subject — AI writes the questions instantly.' },
            { step: '2', icon: Users, title: 'Students Join', desc: 'Share the access code. Players join from any device.' },
            { step: '3', icon: Trophy, title: 'Play Live', desc: 'Questions reveal one at a time. Leaderboard updates in real time.' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="border-2 border-gray-200 rounded-2xl bg-white p-5 flex items-start gap-4">
              <div className="size-10 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <Icon className="size-5 text-yellow-900" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/quiz-bowl/new"
            className="inline-flex items-center gap-2 bg-[#0033A0] hover:bg-[#002580] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Plus className="size-4" />
            Create a Quiz
          </Link>
          <button
            onClick={() => setShowJoin(v => !v)}
            className="inline-flex items-center gap-2 border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            <LogIn className="size-4" />
            Join with Code
          </button>
        </div>

        {showJoin && (
          <div className="border-2 border-yellow-200 bg-yellow-50 rounded-2xl p-5 flex items-center gap-3">
            <input
              type="text"
              placeholder="e.g. BLITZ-419"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={handleJoinByCode}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              Join
            </button>
            {joinError && <p className="text-xs text-red-600 mt-1">{joinError}</p>}
          </div>
        )}

        {/* Quiz list */}
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
            <Loader2 className="size-4 animate-spin" />
            Loading your quizzes…
          </div>
        ) : quizzes.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <Zap className="size-10 text-yellow-400 mx-auto mb-3" />
            <p className="font-bold text-gray-900">No quizzes yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first quiz or join one with an access code.</p>
            <Link
              href="/quiz-bowl/new"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] hover:underline"
            >
              Create a quiz <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-base font-extrabold text-gray-900 mb-4">Your Quizzes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map(quiz => (
                <Link
                  key={quiz.id}
                  href={`/quiz-bowl/${quiz.id}`}
                  className="group border-2 border-gray-200 rounded-2xl bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors leading-snug">{quiz.title}</p>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[quiz.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[quiz.status] ?? quiz.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 italic">{quiz.topic}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><CheckCircle className="size-3.5" />{quiz.questionCount} questions</span>
                    <span className="flex items-center gap-1"><Users className="size-3.5" />{quiz.playerCount} players</span>
                    {quiz.isHost && <span className="text-yellow-600 font-semibold">Host</span>}
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
                    {quiz.status === 'COMPLETE' ? 'View results' : 'Open'} <ArrowRight className="size-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
