'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gavel, Plus, KeyRound, Users, MessageSquare, Sparkles, CheckCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth-context'

interface DebateRoomSummary {
  id: string
  title: string
  proposition: string
  accessCode: string
  status: 'OPEN' | 'JUDGING' | 'COMPLETE'
  hostId: string
  _count?: { arguments: number }
  createdAt: string
}

const HOW_IT_WORKS = [
  {
    Icon: Gavel,
    step: '1',
    title: 'Post a Proposition',
    description: 'Create a debate room with a clear proposition — a claim that can be argued for or against.',
  },
  {
    Icon: MessageSquare,
    step: '2',
    title: 'Argue Both Sides',
    description: 'Participants submit structured arguments with a claim, evidence, and reasoning. Vote on the strongest ones.',
  },
  {
    Icon: Sparkles,
    step: '3',
    title: 'AI Renders a Verdict',
    description: 'When the host calls for a verdict, Claude evaluates all arguments and delivers an impartial ruling.',
  },
]

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  JUDGING: 'Deliberating…',
  COMPLETE: 'Verdict In',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  JUDGING: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-blue-100 text-blue-700',
}

export default function DebateHubPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<DebateRoomSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    fetch('/api/debate/rooms', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { rooms?: DebateRoomSummary[] }) => setRooms(data.rooms ?? []))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [currentUser.email])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    setJoinError('')

    try {
      // Find room by code
      const res = await fetch(`/api/debate/rooms?code=${encodeURIComponent(joinCode.trim().toUpperCase())}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      // We'll do a simple redirect to join page
      router.push(`/debate/join?code=${encodeURIComponent(joinCode.trim().toUpperCase())}`)
    } catch {
      setJoinError('Could not find that code.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Debate Arena"
        subtitle="Structured argument. AI verdict."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/debate/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors"
            >
              <Plus className="size-4" />
              Create Debate
            </Link>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Join with code */}
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <KeyRound className="size-5 text-[#0033A0]" />
            Join with a Code
          </h2>
          <form onSubmit={handleJoin} className="flex items-center gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. LOGIC-247"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono font-semibold focus:outline-none focus:border-[#0033A0] uppercase"
            />
            <button
              type="submit"
              disabled={!joinCode.trim() || joining}
              className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          </form>
          {joinError && <p className="text-sm text-red-600 mt-2">{joinError}</p>}
        </div>

        {/* Room list */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <div className="animate-spin size-6 border-2 border-gray-300 border-t-[#0033A0] rounded-full mr-3" />
            Loading debates…
          </div>
        ) : rooms.length === 0 ? (
          <div className="border-2 border-[#0033A0] rounded-2xl bg-white p-10 text-center">
            <div className="size-16 rounded-full bg-[#0033A0] flex items-center justify-center mx-auto">
              <Gavel className="size-8 text-white" />
            </div>
            <h2 className="font-extrabold text-2xl text-gray-900 mt-4 mb-2">
              No debates yet
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Post a proposition, invite others to argue, and get an AI verdict.
            </p>
            <Link
              href="/debate/new"
              className="px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
            >
              Create Your First Debate
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="font-extrabold text-gray-900 text-lg mb-4">Your Debates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/debate/${room.id}`}
                  className="group border-2 border-gray-200 rounded-2xl bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[room.status]}`}>
                      {STATUS_LABELS[room.status]}
                    </span>
                    {room.status === 'COMPLETE' && (
                      <CheckCircle className="size-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="font-extrabold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-[#0033A0] transition-colors">
                    {room.title}
                  </p>
                  <p className="text-xs text-gray-500 italic line-clamp-2 mb-3">
                    "{room.proposition}"
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {room.hostId === currentUser.id && (
                      <span className="text-[#0033A0] font-semibold">Host</span>
                    )}
                    <span className="font-mono text-gray-400">{room.accessCode}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-8">
          <h2 className="font-extrabold text-gray-900 text-xl mb-6 text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ Icon, step, title, description }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="size-12 rounded-full bg-[#0033A0] flex items-center justify-center flex-shrink-0">
                  <Icon className="size-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    Step {step}
                  </p>
                  <p className="font-extrabold text-gray-900 mb-1">{title}</p>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
