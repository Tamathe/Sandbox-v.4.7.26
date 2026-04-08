'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Gavel, ThumbsUp, Sparkles, ArrowLeft, KeyRound, Copy,
  CheckCircle, Clock, Loader2, Plus,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface ArgumentWithMeta {
  id: string
  roomId: string
  authorId: string
  author: { id: string; name: string }
  side: 'PRO' | 'CON'
  claim: string
  evidence: string
  reasoning: string
  voteCount: number
  iMineVoted: boolean
  createdAt: string
}

interface DebateRoom {
  id: string
  title: string
  proposition: string
  accessCode: string
  status: 'OPEN' | 'JUDGING' | 'COMPLETE'
  hostId: string
  host: { id: string; name: string }
  verdict: string | null
  verdictAt: string | null
}

interface RoomData {
  room: DebateRoom
  proArguments: ArgumentWithMeta[]
  conArguments: ArgumentWithMeta[]
  isHost: boolean
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  JUDGING: 'AI is deliberating…',
  COMPLETE: 'Verdict In',
}
const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  JUDGING: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-blue-100 text-blue-700',
}

function ArgumentCard({
  arg,
  currentUserId,
  onVote,
}: {
  arg: ArgumentWithMeta
  currentUserId: string
  onVote: (argumentId: string) => void
}) {
  const isOwn = arg.authorId === currentUserId

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-4 space-y-3">
      <p className="font-extrabold text-gray-900 leading-snug">{arg.claim}</p>
      <p className="text-sm italic text-gray-600">{arg.evidence}</p>
      <p className="text-sm text-gray-500">{arg.reasoning}</p>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-semibold text-gray-600">{arg.author.name}</span>
          <span>·</span>
          <span>{new Date(arg.createdAt).toLocaleDateString()}</span>
        </div>
        <button
          onClick={() => !isOwn && onVote(arg.id)}
          disabled={isOwn}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            isOwn
              ? 'text-gray-300 cursor-default'
              : arg.iMineVoted
              ? 'bg-[#0033A0] text-white'
              : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ThumbsUp className="size-3.5" />
          {arg.voteCount}
        </button>
      </div>
    </div>
  )
}

export default function DebateRoomPage() {
  const { currentUser } = useAuth()
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [data, setData] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestingVerdict, setRequestingVerdict] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/debate/rooms/${roomId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) { router.push('/debate'); return }
      const json = await res.json()
      setData(json)
    } catch {
      // silently ignore poll errors
    } finally {
      setLoading(false)
    }
  }, [roomId, currentUser.email, router])

  useEffect(() => {
    fetchRoom()
    const interval = setInterval(fetchRoom, 10_000)
    return () => clearInterval(interval)
  }, [fetchRoom])

  async function handleVote(argumentId: string) {
    await fetch(`/api/debate/rooms/${roomId}/arguments/${argumentId}/vote`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    fetchRoom()
  }

  async function handleRequestVerdict() {
    if (!data) return
    setRequestingVerdict(true)
    await fetch(`/api/debate/rooms/${roomId}/verdict`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    setRequestingVerdict(false)
    fetchRoom()
  }

  function copyCode() {
    if (!data) return
    navigator.clipboard.writeText(data.room.accessCode).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  const hasSubmittedPro = data?.proArguments.some((a) => a.authorId === currentUser.id)
  const hasSubmittedCon = data?.conArguments.some((a) => a.authorId === currentUser.id)
  const totalArguments = (data?.proArguments.length ?? 0) + (data?.conArguments.length ?? 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-gray-300 border-t-[#0033A0] rounded-full" />
      </div>
    )
  }

  if (!data) return null

  const { room, proArguments, conArguments, isHost } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Link href="/debate" className="text-gray-400 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="size-4" />
                </Link>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[room.status]}`}>
                  {STATUS_LABELS[room.status]}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{room.title}</h1>
              <p className="text-sm text-gray-500 mt-1 italic">"{room.proposition}"</p>
            </div>
            {isHost && (
              <button
                onClick={copyCode}
                className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors flex-shrink-0"
              >
                <KeyRound className="size-3.5" />
                {room.accessCode}
                {codeCopied ? <CheckCircle className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Two-column argument view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* PRO column */}
          <div>
            <div className="bg-[#0033A0] text-white rounded-t-2xl px-5 py-3 flex items-center justify-between">
              <h2 className="font-extrabold text-base">PRO</h2>
              <span className="text-blue-200 text-sm">{proArguments.length} argument{proArguments.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="border-2 border-t-0 border-gray-200 rounded-b-2xl bg-gray-50 p-4 min-h-48 space-y-3">
              {proArguments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No PRO arguments yet.</p>
              ) : (
                proArguments.map((arg) => (
                  <ArgumentCard
                    key={arg.id}
                    arg={arg}
                    currentUserId={currentUser.id}
                    onVote={handleVote}
                  />
                ))
              )}
            </div>
          </div>

          {/* CON column */}
          <div>
            <div className="bg-amber-600 text-white rounded-t-2xl px-5 py-3 flex items-center justify-between">
              <h2 className="font-extrabold text-base">CON</h2>
              <span className="text-amber-100 text-sm">{conArguments.length} argument{conArguments.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="border-2 border-t-0 border-gray-200 rounded-b-2xl bg-gray-50 p-4 min-h-48 space-y-3">
              {conArguments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No CON arguments yet.</p>
              ) : (
                conArguments.map((arg) => (
                  <ArgumentCard
                    key={arg.id}
                    arg={arg}
                    currentUserId={currentUser.id}
                    onVote={handleVote}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action zone */}
        {room.status === 'OPEN' && (
          <div className="flex flex-wrap items-center gap-4 mb-8">
            {(!hasSubmittedPro || !hasSubmittedCon) && (
              <Link
                href={`/debate/${roomId}/argue`}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors"
              >
                <Plus className="size-4" />
                Submit Your Argument
              </Link>
            )}
            {isHost && (
              <button
                onClick={handleRequestVerdict}
                disabled={totalArguments < 2 || requestingVerdict}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Gavel className="size-4" />
                {requestingVerdict ? 'Requesting…' : 'Request AI Verdict'}
              </button>
            )}
            {isHost && totalArguments < 2 && (
              <p className="text-xs text-gray-400">Need at least 2 arguments to request a verdict.</p>
            )}
          </div>
        )}

        {room.status === 'JUDGING' && (
          <div className="border-2 border-amber-200 rounded-2xl bg-amber-50 p-6 flex items-center gap-4 mb-8">
            <Loader2 className="size-6 text-amber-600 animate-spin flex-shrink-0" />
            <div>
              <p className="font-extrabold text-amber-800">AI is deliberating…</p>
              <p className="text-sm text-amber-600 mt-0.5">Claude is evaluating all arguments. This page updates automatically.</p>
            </div>
          </div>
        )}

        {room.status === 'COMPLETE' && room.verdict && (
          <div className="border-2 border-[#0033A0] rounded-2xl bg-[#0033A0] p-6 text-white mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="size-5 text-white" />
              </div>
              <div>
                <p className="font-extrabold text-lg">AI Verdict</p>
                {room.verdictAt && (
                  <p className="text-blue-200 text-xs flex items-center gap-1 mt-0.5">
                    <Clock className="size-3" />
                    {new Date(room.verdictAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <p className="text-blue-50 text-sm leading-relaxed whitespace-pre-wrap">{room.verdict}</p>
          </div>
        )}

      </div>
    </div>
  )
}
