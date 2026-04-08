'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Users,
  BarChart2,
  Play,
  Square,
  Plus,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Trophy,
  Zap,
  FileText,
  Paintbrush,
  Trash2,
  Hand,
  MicVocal,
  X,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from '../../components/DynamicChart'

interface RoomState {
  roomId: string
  title: string
  phase: string
  joinCode: string
  participantCount: number
  featureFlags: Record<string, boolean>
  experienceType: string
}

interface PollState {
  pollId: string
  question: string
  options: string[]
  totals: number[]
  totalVotes: number
  closed: boolean
}

interface SSEParticipant {
  participantId: string
  displayName: string
  totalCount: number
}

const CHART_COLORS = ['#0033A0', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function SandcastleHostPage() {
  return <Suspense fallback={null}><SandcastleHostPageInner /></Suspense>
}

function SandcastleHostPageInner() {
  const params = useParams<{ roomId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser } = useAuth()
  const roomId = params.roomId

  const [showNewBanner, setShowNewBanner] = useState(false)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<string[]>([])
  const [currentPoll, setCurrentPoll] = useState<PollState | null>(null)

  // Poll creation form
  const [showPollForm, setShowPollForm] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollCreating, setCreating] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)

  const [pollInsight, setPollInsight] = useState<string | null>(null)

  // Game show state
  const [activeQuestion, setActiveQuestion] = useState<{
    questionId: string
    text: string
    imageUrl?: string
    timeoutMs: number
    phase: 'open' | 'closed'
    winnerId?: string
    winnerName?: string
  } | null>(null)
  const [scoreboard, setScoreboard] = useState<{ participantId: string; displayName: string; score: number }[]>([])
  const [questionText, setQuestionText] = useState('')
  const [openingQuestion, setOpeningQuestion] = useState(false)
  const [closingQuestion, setClosingQuestion] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [reportStatus, setReportStatus] = useState<string | null>(null)

  // Canvas state
  const hostCanvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasCritique, setCanvasCritique] = useState<string>('')
  const [critiqueStreaming, setCritiqueStreaming] = useState(false)
  const [critiquePrompt, setCritiquePrompt] = useState('')
  const [showCritiqueForm, setShowCritiqueForm] = useState(false)
  const [requestingCritique, setRequestingCritique] = useState(false)
  const [clearingCanvas, setClearingCanvas] = useState(false)

  // Seminar state
  const [speakerQueue, setSpeakerQueue] = useState<{ participantId: string; displayName: string; handRaisedAt: string; queuePosition: number }[]>([])
  const [grantingFloor, setGrantingFloor] = useState<string | null>(null)
  const [loweringHand, setLoweringHand] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [closingPoll, setClosingPoll] = useState(false)

  // Show new-room banner when redirected from creation page
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowNewBanner(true)
    }
  }, [searchParams])

  // Auto-dismiss banner when room leaves LOBBY
  useEffect(() => {
    if (room && room.phase !== 'LOBBY') {
      setShowNewBanner(false)
    }
  }, [room?.phase])

  const sseRef = useRef<EventSource | null>(null)
  const connectSSERef = useRef<() => void>(() => undefined)

  // Fetch initial room state
  useEffect(() => {
    fetch(`/api/sandcastle/rooms/${roomId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: RoomState & { participants?: SSEParticipant[] }) => {
        setRoom(data)
        if (data.participants) {
          setParticipants(data.participants.map((p: SSEParticipant) => p.displayName))
        }
        // For game show rooms, fetch initial scoreboard
        if (data.experienceType === 'GAME_SHOW') {
          fetch(`/api/sandcastle/rooms/${roomId}/scoreboard`, {
            headers: { 'x-demo-user-email': currentUser.email },
          })
            .then((r) => r.json())
            .then((sb: { scoreboard?: { participantId: string; displayName: string; score: number }[] }) => {
              if (sb.scoreboard) setScoreboard(sb.scoreboard)
            })
            .catch(() => undefined)
        }
        // For seminar rooms, fetch initial hand-raise queue
        if (data.experienceType === 'SEMINAR') {
          fetch(`/api/sandcastle/rooms/${roomId}/hand/queue`, {
            headers: { 'x-demo-user-email': currentUser.email },
          })
            .then((r) => r.json())
            .then((q: { queue?: typeof speakerQueue }) => {
              if (q.queue) setSpeakerQueue(q.queue)
            })
            .catch(() => undefined)
        }
      })
      .catch(() => setError('Failed to load room'))
      .finally(() => setLoading(false))
  }, [roomId, currentUser.email])

  // SSE subscription
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close()
    const es = new EventSource(
      `/api/sandcastle/rooms/${roomId}/dashboard/stream`,
    )
    // EventSource doesn't support custom headers — Next.js will use cookie/session auth
    // For demo auth we append the email as a query param workaround
    sseRef.current = es

    es.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data) as { phase: string; participantCount: number }
      setRoom((prev) => prev ? { ...prev, phase: data.phase, participantCount: data.participantCount } : prev)
    })

    es.addEventListener('participant_joined', (e) => {
      const data = JSON.parse(e.data) as { displayName: string; totalCount: number }
      setParticipants((prev) => [...prev, data.displayName])
      setRoom((prev) => prev ? { ...prev, participantCount: data.totalCount } : prev)
    })

    es.addEventListener('participant_left', (e) => {
      const data = JSON.parse(e.data) as { totalCount: number }
      setRoom((prev) => prev ? { ...prev, participantCount: data.totalCount } : prev)
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data) as { phase: string }
      setRoom((prev) => prev ? { ...prev, phase: data.phase } : prev)
    })

    es.addEventListener('poll_opened', (e) => {
      const data = JSON.parse(e.data) as { pollId: string; question: string; options: string[] }
      setCurrentPoll({
        pollId: data.pollId,
        question: data.question,
        options: data.options,
        totals: Array(data.options.length).fill(0) as number[],
        totalVotes: 0,
        closed: false,
      })
    })

    es.addEventListener('poll_vote_update', (e) => {
      const data = JSON.parse(e.data) as { totals: number[]; totalVotes: number }
      setCurrentPoll((prev) => prev ? { ...prev, totals: data.totals, totalVotes: data.totalVotes } : prev)
    })

    es.addEventListener('poll_closed', (e) => {
      const data = JSON.parse(e.data) as { finalTotals: number[]; totalVotes: number }
      setCurrentPoll((prev) => prev ? { ...prev, totals: data.finalTotals, totalVotes: data.totalVotes, closed: true } : prev)
      setPollInsight(null)
    })

    es.addEventListener('poll_insight_ready', (e) => {
      const data = JSON.parse(e.data) as { pollId: string; insightText: string }
      setPollInsight(data.insightText)
    })

    es.addEventListener('question_open', (e) => {
      const data = JSON.parse(e.data) as { questionId: string; text: string; imageUrl?: string; timeoutMs: number }
      setActiveQuestion({ ...data, phase: 'open' })
    })

    es.addEventListener('buzzer_winner', (e) => {
      const data = JSON.parse(e.data) as { questionId: string; winnerId: string; winnerName: string }
      setActiveQuestion((prev) => prev ? { ...prev, phase: 'closed', winnerId: data.winnerId, winnerName: data.winnerName } : prev)
    })

    es.addEventListener('buzzer_locked', (e) => {
      const data = JSON.parse(e.data) as { questionId: string }
      setActiveQuestion((prev) => prev && prev.questionId === data.questionId ? { ...prev, phase: 'closed' } : prev)
    })

    es.addEventListener('scoreboard_update', (e) => {
      const data = JSON.parse(e.data) as { scoreboard: { participantId: string; displayName: string; score: number }[] }
      setScoreboard(data.scoreboard)
    })

    // Canvas events — replay incoming strokes onto host read-only canvas
    es.addEventListener('canvas_stroke', (e) => {
      const data = JSON.parse(e.data) as { stroke: { tool: string; color: string; width: number; opacity: number; points: { x: number; y: number }[] } }
      replayStroke(hostCanvasRef.current, data.stroke)
    })

    es.addEventListener('canvas_cleared', () => {
      const canvas = hostCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    })

    es.addEventListener('canvas_critique_chunk', (e) => {
      const data = JSON.parse(e.data) as { text: string }
      setCritiqueStreaming(true)
      setCanvasCritique((prev) => prev + data.text)
    })

    es.addEventListener('canvas_critique_done', () => {
      setCritiqueStreaming(false)
    })

    // Seminar events
    es.addEventListener('speaker_queue', (e) => {
      const data = JSON.parse(e.data) as { queue: typeof speakerQueue }
      setSpeakerQueue(data.queue)
    })

    es.addEventListener('room_ended', (e) => {
      const data = JSON.parse(e.data) as { endedAt: string; reportId?: string; reportStatus?: string }
      setRoom((prev) => prev ? { ...prev, phase: 'ENDED' } : prev)
      if (data.reportId) setReportId(data.reportId)
      if (data.reportStatus) setReportStatus(data.reportStatus)
      es.close()
    })

    es.onerror = () => {
      // Reconnect after 3 s
      setTimeout(() => connectSSERef.current(), 3000)
    }
  }, [roomId])

  useEffect(() => {
    connectSSERef.current = connectSSE
    connectSSE()
    return () => sseRef.current?.close()
  }, [connectSSE])

  // Hydrate host canvas with existing strokes
  useEffect(() => {
    if (room?.experienceType !== 'COLLABORATIVE_CANVAS') return
    fetch(`/api/sandcastle/rooms/${roomId}/canvas`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { strokes?: { tool: string; color: string; width: number; opacity: number; points: { x: number; y: number }[] }[] }) => {
        if (data.strokes) {
          data.strokes.forEach((s) => replayStroke(hostCanvasRef.current, s))
        }
      })
      .catch(() => undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.experienceType, roomId, currentUser.email])

  async function startRoom() {
    setStarting(true)
    await fetch(`/api/sandcastle/rooms/${roomId}/start`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    setStarting(false)
  }

  async function endRoom() {
    if (!confirm('End this room? Students will be disconnected.')) return
    setEnding(true)
    const res = await fetch(`/api/sandcastle/rooms/${roomId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ generateReport: true }),
    })
    if (res.ok) {
      const data = (await res.json()) as { reportId?: string; reportStatus?: string }
      if (data.reportId) setReportId(data.reportId)
      if (data.reportStatus) setReportStatus(data.reportStatus)
    }
    setEnding(false)
  }

  async function openQuestion() {
    if (!questionText.trim()) return
    setOpeningQuestion(true)
    await fetch(`/api/sandcastle/rooms/${roomId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ text: questionText.trim() }),
    })
    setQuestionText('')
    setOpeningQuestion(false)
  }

  async function closeQuestion() {
    if (!activeQuestion) return
    setClosingQuestion(true)
    const res = await fetch(`/api/sandcastle/rooms/${roomId}/questions/${activeQuestion.questionId}/close`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) {
      const data = (await res.json()) as { scoreboard?: typeof scoreboard }
      if (data.scoreboard) setScoreboard(data.scoreboard)
    }
    setClosingQuestion(false)
  }

  async function createPoll() {
    const opts = pollOptions.filter((o) => o.trim())
    if (!pollQuestion.trim()) { setPollError('Question is required'); return }
    if (opts.length < 2) { setPollError('At least 2 options are required'); return }
    setCreating(true)
    setPollError(null)
    const res = await fetch(`/api/sandcastle/rooms/${roomId}/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ question: pollQuestion.trim(), options: opts }),
    })
    setCreating(false)
    if (res.ok) {
      setShowPollForm(false)
      setPollQuestion('')
      setPollOptions(['', ''])
    } else {
      const data = (await res.json()) as { error?: string }
      setPollError(data.error ?? 'Failed to create poll')
    }
  }

  async function closePoll() {
    if (!currentPoll) return
    setClosingPoll(true)
    await fetch(`/api/sandcastle/rooms/${roomId}/polls/${currentPoll.pollId}/close`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    setClosingPoll(false)
  }

  function replayStroke(canvas: HTMLCanvasElement | null, stroke: { tool: string; color: string; width: number; opacity: number; points: { x: number; y: number }[] }) {
    if (!canvas || stroke.points.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.globalAlpha = stroke.opacity ?? 1
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = stroke.color ?? '#000000'
    ctx.lineWidth = stroke.width ?? 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  async function requestAICritique() {
    const canvas = hostCanvasRef.current
    if (!canvas) return
    setRequestingCritique(true)
    const snapshotDataUrl = canvas.toDataURL('image/png')
    const res = await fetch(`/api/sandcastle/rooms/${roomId}/canvas/critique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ snapshotDataUrl, prompt: critiquePrompt.trim() || undefined }),
    })
    setRequestingCritique(false)
    if (res.ok) {
      setCanvasCritique('')
      setCritiqueStreaming(true)
      setShowCritiqueForm(false)
    } else {
      const data = (await res.json()) as { error?: string; retryAfterMs?: number }
      alert(data.error ?? 'Failed to request critique')
    }
  }

  async function doClearCanvas() {
    if (!confirm('Clear the canvas for all participants?')) return
    setClearingCanvas(true)
    await fetch(`/api/sandcastle/rooms/${roomId}/canvas/clear`, {
      method: 'POST',
      headers: { 'x-demo-user-email': currentUser.email },
    })
    setClearingCanvas(false)
    const canvas = hostCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    setCanvasCritique('')
  }

  async function grantFloor(participantId: string) {
    setGrantingFloor(participantId)
    await fetch(`/api/sandcastle/rooms/${roomId}/hand/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ participantId }),
    })
    setGrantingFloor(null)
  }

  async function hostLowerHand(participantId: string) {
    setLoweringHand(participantId)
    await fetch(`/api/sandcastle/rooms/${roomId}/hand/lower`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ participantId }),
    })
    setLoweringHand(null)
  }

  function copyJoinCode() {
    if (!room) return
    navigator.clipboard.writeText(room.joinCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-uk-blue" />
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">{error ?? 'Room not found'}</p>
      </div>
    )
  }

  const chartData = currentPoll
    ? currentPoll.options.map((opt, i) => ({
        name: opt.length > 20 ? opt.slice(0, 18) + '…' : opt,
        votes: currentPoll.totals[i] ?? 0,
      }))
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={room.title}
        subtitle={`Phase: ${room.phase} · Code: ${room.joinCode}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={copyJoinCode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
              {room.joinCode}
            </button>

            {room.phase === 'LOBBY' && (
              <button
                onClick={startRoom}
                disabled={starting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-bold"
              >
                {starting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Start Room
              </button>
            )}

            {(room.phase === 'LOBBY' || room.phase === 'ACTIVE') && (
              <button
                onClick={endRoom}
                disabled={ending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-bold"
              >
                {ending ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}
                End Room
              </button>
            )}
          </div>
        }
      />

      {showNewBanner && room?.phase === 'LOBBY' && (
        <div className="bg-uk-blue px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-white text-sm font-medium">Room created! Share this code with your students:</span>
              <span className="text-3xl font-extrabold tracking-widest text-white">{room.joinCode}</span>
              <button
                onClick={copyJoinCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-white border-2 border-white rounded-lg hover:bg-white/10 transition-colors"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <button
              onClick={() => {
                setShowNewBanner(false)
                router.replace(`/sandcastle/${roomId}`, { scroll: false })
              }}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: participants */}
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-4 text-uk-blue" />
              <h2 className="font-bold text-gray-900">
                Participants <span className="text-gray-400 font-normal">({room.participantCount})</span>
              </h2>
            </div>
            {participants.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Waiting for students to join…
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {participants.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center text-uk-blue font-bold text-xs">
                      {name[0]?.toUpperCase()}
                    </div>
                    <span className="text-gray-700">{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Join link */}
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">Student join link</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-uk-blue bg-blue-50 px-2 py-1 rounded-lg flex-1 truncate">
                /sandcastle/join/{room.joinCode}
              </code>
              <ChevronRight className="size-3.5 text-gray-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Right columns: poll panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live poll results */}
          {currentPoll && (
            <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart2 className="size-4 text-uk-blue" />
                    <span className="text-xs font-bold text-uk-blue uppercase tracking-wide">
                      {currentPoll.closed ? 'Final Results' : 'Live Poll'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-gray-900">{currentPoll.question}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {currentPoll.totalVotes} vote{currentPoll.totalVotes !== 1 ? 's' : ''}
                  </p>
                </div>
                {!currentPoll.closed && (
                  <button
                    onClick={closePoll}
                    disabled={closingPoll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-bold"
                  >
                    {closingPoll ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}
                    Close Poll
                  </button>
                )}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v) => [`${v} votes`, 'Votes']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* AI Insight — shown after poll closes */}
              {currentPoll.closed && (
                <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="size-4 text-uk-blue" />
                    <span className="text-xs font-bold text-uk-blue uppercase tracking-wide">
                      AI Insight
                    </span>
                  </div>
                  {pollInsight ? (
                    <p className="text-sm text-gray-700 leading-relaxed">{pollInsight}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span className="text-sm">Generating insight…</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Poll creation */}
          {room.phase === 'ACTIVE' && (currentPoll == null || currentPoll.closed) && (
            <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
              {!showPollForm ? (
                <button
                  onClick={() => setShowPollForm(true)}
                  disabled={!!(currentPoll && !currentPoll.closed)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-uk-blue font-bold hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  {currentPoll && !currentPoll.closed ? 'Close current poll first' : 'Open New Poll'}
                </button>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-900">New Poll</h3>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Poll question…"
                    maxLength={400}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                  />
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions]
                          next[i] = e.target.value
                          setPollOptions(next)
                        }}
                        placeholder={`Option ${i + 1}`}
                        maxLength={100}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-sm text-uk-blue hover:underline"
                    >
                      + Add option
                    </button>
                  )}
                  {pollError && (
                    <p className="text-sm text-red-600">{pollError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowPollForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createPoll}
                      disabled={pollCreating}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-uk-blue text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 text-sm"
                    >
                      {pollCreating ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Launch Poll
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {room.phase === 'LOBBY' && (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
              <Play className="size-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">Start the room to open polls</p>
              <p className="text-sm mt-1">Students can join now — they&apos;ll wait in the lobby</p>
            </div>
          )}

          {/* Game Show UI */}
          {room.experienceType === 'GAME_SHOW' && room.phase !== 'ENDED' && (
            <div className="space-y-4">
              {/* Active question */}
              {activeQuestion && (
                <div className="border-2 border-uk-blue rounded-2xl bg-white p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="size-4 text-uk-blue" />
                        <span className="text-xs font-bold text-uk-blue uppercase tracking-wide">
                          {activeQuestion.phase === 'open' ? 'Question Open' : 'Question Closed'}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-gray-900 text-lg">{activeQuestion.text}</h3>
                    </div>
                    {activeQuestion.phase === 'open' && (
                      <button
                        onClick={closeQuestion}
                        disabled={closingQuestion}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-bold"
                      >
                        {closingQuestion ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}
                        Lock Buzzer
                      </button>
                    )}
                  </div>
                  {activeQuestion.phase === 'closed' && activeQuestion.winnerName && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-2">
                      <Trophy className="size-5 text-amber-500" />
                      <span className="font-bold text-amber-800">Winner: {activeQuestion.winnerName}</span>
                    </div>
                  )}
                  {activeQuestion.phase === 'closed' && !activeQuestion.winnerName && (
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-2">
                      <span className="text-sm text-gray-500">No one buzzed in time</span>
                    </div>
                  )}
                </div>
              )}

              {/* Open new question */}
              {room.phase === 'ACTIVE' && (!activeQuestion || activeQuestion.phase === 'closed') && (
                <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
                  <h3 className="font-bold text-gray-900 mb-3">Open Next Question</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void openQuestion() }}
                      placeholder="Question text…"
                      maxLength={400}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                    />
                    <button
                      onClick={() => void openQuestion()}
                      disabled={openingQuestion || !questionText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-uk-blue text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 text-sm"
                    >
                      {openingQuestion ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                      Open
                    </button>
                  </div>
                </div>
              )}

              {/* Scoreboard */}
              {scoreboard.length > 0 && (
                <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="size-4 text-uk-blue" />
                    <h3 className="font-bold text-gray-900">Scoreboard</h3>
                  </div>
                  <ol className="space-y-2">
                    {scoreboard.map((p, i) => (
                      <li key={p.participantId} className="flex items-center gap-3 text-sm">
                        <span className="size-6 rounded-full bg-blue-100 flex items-center justify-center font-bold text-uk-blue text-xs shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-gray-700 font-medium">{p.displayName}</span>
                        <span className="font-extrabold text-uk-blue">{p.score}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {room.phase === 'LOBBY' && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                  <Zap className="size-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">Start the room to open questions</p>
                  <p className="text-sm mt-1">Students can join now — they&apos;ll see the buzzer when a question opens</p>
                </div>
              )}
            </div>
          )}

          {/* Collaborative Canvas — host view */}
          {room.experienceType === 'COLLABORATIVE_CANVAS' && room.phase !== 'ENDED' && (
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Paintbrush className="size-4 text-uk-blue" />
                    <h3 className="font-bold text-gray-900">Collaborative Canvas</h3>
                    <span className="text-xs text-gray-400 font-normal">(read-only mirror)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCritiqueForm((v) => !v)}
                      disabled={room.phase !== 'ACTIVE'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-uk-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-bold transition-colors"
                    >
                      <Sparkles className="size-3.5" />
                      AI Critique
                    </button>
                    <button
                      onClick={() => void doClearCanvas()}
                      disabled={clearingCanvas || room.phase !== 'ACTIVE'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 font-bold transition-colors"
                    >
                      {clearingCanvas ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      Clear
                    </button>
                  </div>
                </div>

                {showCritiqueForm && (
                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      value={critiquePrompt}
                      onChange={(e) => setCritiquePrompt(e.target.value)}
                      placeholder="Optional framing for AI (e.g. 'focus on composition')…"
                      maxLength={500}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                    />
                    <button
                      onClick={() => void requestAICritique()}
                      disabled={requestingCritique}
                      className="flex items-center gap-1.5 px-4 py-2 bg-uk-blue text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 text-sm"
                    >
                      {requestingCritique ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      Send
                    </button>
                  </div>
                )}

                <canvas
                  ref={hostCanvasRef}
                  width={800}
                  height={480}
                  className="w-full rounded-xl border border-gray-200 bg-white"
                  style={{ touchAction: 'none' }}
                />
              </div>

              {/* AI Critique panel */}
              {(canvasCritique || critiqueStreaming) && (
                <div className="border-2 border-blue-200 rounded-2xl bg-blue-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-uk-blue" />
                      <span className="text-xs font-bold text-uk-blue uppercase tracking-wide">AI Canvas Critique</span>
                      {critiqueStreaming && <Loader2 className="size-3.5 animate-spin text-uk-blue" />}
                    </div>
                    <button onClick={() => setCanvasCritique('')} className="text-gray-400 hover:text-gray-600">
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{canvasCritique}</p>
                </div>
              )}

              {room.phase === 'LOBBY' && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400">
                  <Paintbrush className="size-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">Start the room to activate the canvas</p>
                </div>
              )}
            </div>
          )}

          {/* Seminar — host view */}
          {room.experienceType === 'SEMINAR' && room.phase !== 'ENDED' && (
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Hand className="size-4 text-uk-blue" />
                  <h3 className="font-bold text-gray-900">Speaker Queue</h3>
                  {speakerQueue.length > 0 && (
                    <span className="size-5 rounded-full bg-uk-blue text-white text-xs flex items-center justify-center font-bold">
                      {speakerQueue.length}
                    </span>
                  )}
                </div>

                {speakerQueue.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No hands raised — students tap &quot;Raise Hand&quot; on their device
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {speakerQueue.map((entry) => {
                      const elapsed = Math.floor((Date.now() - new Date(entry.handRaisedAt).getTime()) / 1000)
                      const timeLabel = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m`
                      return (
                        <li key={entry.participantId} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                          <span className="size-7 rounded-full bg-uk-blue text-white text-xs flex items-center justify-center font-extrabold shrink-0">
                            {entry.queuePosition}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{entry.displayName}</p>
                            <p className="text-xs text-gray-500">{timeLabel} in queue</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => void grantFloor(entry.participantId)}
                              disabled={grantingFloor === entry.participantId}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold transition-colors"
                            >
                              {grantingFloor === entry.participantId ? <Loader2 className="size-3 animate-spin" /> : <MicVocal className="size-3" />}
                              Grant Floor
                            </button>
                            <button
                              onClick={() => void hostLowerHand(entry.participantId)}
                              disabled={loweringHand === entry.participantId}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-bold transition-colors"
                            >
                              {loweringHand === entry.participantId ? <Loader2 className="size-3 animate-spin" /> : <Hand className="size-3" />}
                              Lower
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>

              {room.phase === 'LOBBY' && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400">
                  <Hand className="size-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">Start the room to open the seminar</p>
                </div>
              )}
            </div>
          )}

          {room.phase === 'ENDED' && (
            <div className="border-2 border-gray-200 rounded-2xl p-8 text-center text-gray-400">
              <p className="font-medium">Room ended</p>
              {reportId && (
                <a
                  href={`/sandcastle/${roomId}/report`}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-uk-blue text-white font-bold rounded-xl hover:bg-blue-800 text-sm transition-colors"
                >
                  <FileText className="size-4" />
                  {reportStatus === 'COMPLETE' ? 'View Report' : 'View Report (Generating…)'}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
