'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Vote, Loader2, CheckCircle, Wifi, WifiOff, Zap, Trophy, Paintbrush, Eraser, Hand, MicVocal, X, Sparkles } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'

interface ActivePoll {
  pollId: string
  question: string
  options: string[]
  openedAt: string
}

interface PollResults {
  totals: number[]
  totalVotes: number
}

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export default function SandcastleParticipatePage() {
  return <Suspense fallback={null}><SandcastleParticipatePageInner /></Suspense>
}

function SandcastleParticipatePageInner() {
  const params = useParams<{ roomId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentUser } = useAuth()

  const roomId = params.roomId
  const participantId = searchParams.get('participantId')

  const [phase, setPhase] = useState<string>('LOBBY')
  const [experienceType, setExperienceType] = useState<string>('LIVE_POLL')
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null)
  const [pollResults, setPollResults] = useState<PollResults | null>(null)
  const [myVote, setMyVote] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('connecting')

  // Canvas state
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const currentPathRef = useRef<{ x: number; y: number }[]>([])
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen')
  const [drawColor, setDrawColor] = useState('#000000')
  const [canvasCritique, setCanvasCritique] = useState<string>('')
  const [critiqueStreaming, setCritiqueStreaming] = useState(false)

  // Seminar state
  const [handRaised, setHandRaised] = useState(false)
  const [myQueuePosition, setMyQueuePosition] = useState<number | null>(null)
  const [raisingHand, setRaisingHand] = useState(false)
  const [loweringHand, setLoweringHand] = useState(false)
  const [speakerGranted, setSpeakerGranted] = useState(false)

  // Game show state
  const [activeQuestion, setActiveQuestion] = useState<{
    questionId: string
    text: string
    phase: 'open' | 'closed'
    winnerName?: string
    iWon?: boolean
  } | null>(null)
  const [scoreboard, setScoreboard] = useState<{ participantId: string; displayName: string; score: number }[]>([])
  const [buzzing, setBuzzing] = useState(false)
  const [hasBuzzed, setHasBuzzed] = useState(false)

  const sseRef = useRef<EventSource | null>(null)
  const connectSSERef = useRef<() => void>(() => undefined)

  function replayStrokeOnCanvas(canvas: HTMLCanvasElement | null, stroke: { tool: string; color: string; width: number; opacity: number; points: { x: number; y: number }[] }) {
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

  const connectSSE = useCallback(() => {
    if (!participantId) return
    if (sseRef.current) sseRef.current.close()

    const url = `/api/sandcastle/rooms/${roomId}/participate/stream?participantId=${encodeURIComponent(participantId)}`
    const es = new EventSource(url)
    sseRef.current = es

    es.addEventListener('connected', (e) => {
      setConnStatus('connected')
      const data = JSON.parse(e.data) as {
        phase: string
        experienceType?: string
        activePoll?: ActivePoll | null
      }
      setPhase(data.phase)
      if (data.experienceType) setExperienceType(data.experienceType)
      if (data.activePoll) {
        setActivePoll(data.activePoll)
      }
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data) as { phase: string }
      setPhase(data.phase)
    })

    es.addEventListener('poll_opened', (e) => {
      const data = JSON.parse(e.data) as ActivePoll
      setActivePoll(data)
      setPollResults(null)
      setMyVote(null)
      setVoteError(null)
    })

    es.addEventListener('poll_vote_update', (e) => {
      const data = JSON.parse(e.data) as PollResults
      setPollResults(data)
    })

    es.addEventListener('poll_closed', (e) => {
      const data = JSON.parse(e.data) as { finalTotals: number[]; totalVotes: number }
      setPollResults({ totals: data.finalTotals, totalVotes: data.totalVotes })
      // Keep activePoll for question/options display, mark it closed
    })

    es.addEventListener('room_ended', () => {
      setPhase('ENDED')
      es.close()
    })

    es.addEventListener('question_open', (e) => {
      const data = JSON.parse(e.data) as { questionId: string; text: string }
      setActiveQuestion({ questionId: data.questionId, text: data.text, phase: 'open' })
      setHasBuzzed(false)
    })

    es.addEventListener('buzzer_winner', (e) => {
      const data = JSON.parse(e.data) as { questionId: string; winnerId: string; winnerName: string }
      setActiveQuestion((prev) =>
        prev
          ? {
              ...prev,
              phase: 'closed',
              winnerName: data.winnerName,
              iWon: data.winnerId === participantId,
            }
          : prev,
      )
    })

    es.addEventListener('buzzer_locked', () => {
      setActiveQuestion((prev) => prev ? { ...prev, phase: 'closed' } : prev)
    })

    es.addEventListener('scoreboard_update', (e) => {
      const data = JSON.parse(e.data) as { scoreboard: typeof scoreboard }
      setScoreboard(data.scoreboard)
    })

    // Canvas events
    es.addEventListener('canvas_stroke', (e) => {
      const data = JSON.parse(e.data) as { stroke: { tool: string; color: string; width: number; opacity: number; points: { x: number; y: number }[] } }
      replayStrokeOnCanvas(drawCanvasRef.current, data.stroke)
    })

    es.addEventListener('canvas_cleared', () => {
      const canvas = drawCanvasRef.current
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
    es.addEventListener('speaker_granted', (e) => {
      const data = JSON.parse(e.data) as { participantId: string }
      if (data.participantId === participantId) {
        setHandRaised(false)
        setMyQueuePosition(null)
        setSpeakerGranted(true)
        setTimeout(() => setSpeakerGranted(false), 5000)
      }
    })

    es.addEventListener('hand_lowered', (e) => {
      const data = JSON.parse(e.data) as { participantId: string }
      if (data.participantId === participantId) {
        setHandRaised(false)
        setMyQueuePosition(null)
      }
    })

    es.addEventListener('speaker_queue', (e) => {
      const data = JSON.parse(e.data) as { queue: { participantId: string; queuePosition: number }[] }
      const myEntry = data.queue.find((q) => q.participantId === participantId)
      if (myEntry) {
        setMyQueuePosition(myEntry.queuePosition)
      }
    })

    es.onerror = () => {
      setConnStatus('reconnecting')
      setTimeout(() => connectSSERef.current(), 3000)
    }
  }, [roomId, participantId])

  useEffect(() => {
    if (!participantId) {
      router.replace('/sandcastle/join/' + roomId)
      return
    }
    connectSSERef.current = connectSSE
    connectSSE()
    return () => sseRef.current?.close()
  }, [connectSSE, participantId, roomId, router])

  // Hydrate canvas with existing strokes on mount
  useEffect(() => {
    if (experienceType !== 'COLLABORATIVE_CANVAS') return
    fetch(`/api/sandcastle/rooms/${roomId}/canvas`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { strokes?: { tool: string; color: string; width: number; opacity: number; points: { x: number; y: number }[] }[] }) => {
        if (data.strokes) {
          // Short delay to ensure canvas is mounted
          setTimeout(() => {
            data.strokes!.forEach((s) => replayStrokeOnCanvas(drawCanvasRef.current, s))
          }, 100)
        }
      })
      .catch(() => undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceType, roomId, currentUser.email])

  function getCanvasPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]!
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  function handleCanvasStart(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    isDrawingRef.current = true
    const pos = getCanvasPos(e.currentTarget, e)
    currentPathRef.current = [pos]
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = e.currentTarget
    const pos = getCanvasPos(canvas, e)
    currentPathRef.current.push(pos)

    // Live preview on local canvas
    const ctx = canvas.getContext('2d')
    if (!ctx || currentPathRef.current.length < 2) return
    const pts = currentPathRef.current
    ctx.globalAlpha = drawTool === 'eraser' ? 1 : 0.9
    ctx.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = drawColor
    ctx.lineWidth = drawTool === 'eraser' ? 20 : 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[pts.length - 2]!.x, pts[pts.length - 2]!.y)
    ctx.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  async function handleCanvasEnd(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawingRef.current || currentPathRef.current.length < 2 || !participantId) return
    isDrawingRef.current = false
    const points = [...currentPathRef.current]
    currentPathRef.current = []

    const stroke = {
      id: crypto.randomUUID(),
      tool: drawTool,
      color: drawColor,
      width: drawTool === 'eraser' ? 20 : 2,
      opacity: 0.9,
      points: points.slice(0, 500),
      authorId: participantId,
      timestamp: Date.now(),
    }

    await fetch(`/api/sandcastle/rooms/${roomId}/canvas/stroke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ stroke }),
    }).catch(() => undefined)
  }

  async function doRaiseHand() {
    if (!participantId || handRaised || raisingHand) return
    setRaisingHand(true)
    const res = await fetch(`/api/sandcastle/rooms/${roomId}/hand/raise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ participantId }),
    })
    setRaisingHand(false)
    if (res.ok) {
      const data = (await res.json()) as { queuePosition?: number }
      setHandRaised(true)
      setMyQueuePosition(data.queuePosition ?? null)
    }
  }

  async function doLowerHand() {
    if (!participantId || !handRaised || loweringHand) return
    setLoweringHand(true)
    await fetch(`/api/sandcastle/rooms/${roomId}/hand/lower`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ participantId }),
    })
    setLoweringHand(false)
    setHandRaised(false)
    setMyQueuePosition(null)
  }

  async function vote(optionIndex: number) {
    if (!activePoll || myVote !== null || voting || !participantId) return
    setVoting(true)
    setVoteError(null)

    const res = await fetch(
      `/api/sandcastle/rooms/${roomId}/polls/${activePoll.pollId}/vote`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ participantId, optionIndex }),
      },
    )

    const data = (await res.json()) as { type?: string; reason?: string }
    setVoting(false)

    if (res.ok && data.type === 'VOTE_ACK') {
      setMyVote(optionIndex)
    } else {
      setVoteError(
        data.reason === 'ALREADY_VOTED'
          ? 'You have already voted on this poll.'
          : data.reason === 'POLL_CLOSED'
            ? 'This poll has closed.'
            : 'Failed to record vote — please try again.',
      )
    }
  }

  async function pressBuzzer() {
    if (!activeQuestion || hasBuzzed || buzzing || !participantId) return
    setBuzzing(true)
    const res = await fetch(
      `/api/sandcastle/rooms/${roomId}/questions/${activeQuestion.questionId}/buzz`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ participantId }),
      },
    )
    setBuzzing(false)
    setHasBuzzed(true)
    if (res.ok) {
      const data = (await res.json()) as { won?: boolean }
      if (data.won) {
        setActiveQuestion((prev) => prev ? { ...prev, iWon: true, phase: 'closed' } : prev)
      }
    }
  }

  const totalVotes = pollResults?.totalVotes ?? 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-uk-blue" />
          <span className="font-bold text-gray-900 text-sm">University of Kentucky</span>
        </div>
        <div className="flex items-center gap-1.5">
          {connStatus === 'connected' ? (
            <Wifi className="size-4 text-green-500" />
          ) : connStatus === 'reconnecting' ? (
            <Loader2 className="size-4 animate-spin text-amber-500" />
          ) : (
            <WifiOff className="size-4 text-gray-400" />
          )}
          <span className="text-xs text-gray-500 capitalize">{connStatus}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
        {phase === 'LOBBY' && (
          <div className="text-center">
            <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="size-8 animate-spin text-uk-blue" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Waiting for instructor</h2>
            <p className="text-gray-500 mt-2">The room will start shortly. Hold tight!</p>
          </div>
        )}

        {(phase === 'ACTIVE' || phase === 'QUESTION_OPEN') && !activePoll && !activeQuestion && experienceType !== 'COLLABORATIVE_CANVAS' && experienceType !== 'SEMINAR' && (
          <div className="text-center">
            <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Vote className="size-8 text-uk-blue" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">You&apos;re in!</h2>
            <p className="text-gray-500 mt-2">A question or poll will appear here when your instructor opens it.</p>
          </div>
        )}

        {/* Collaborative Canvas — participant drawing view */}
        {experienceType === 'COLLABORATIVE_CANVAS' && phase !== 'ENDED' && (
          <div className="w-full space-y-3">
            {/* Speaker granted overlay */}
            {speakerGranted && (
              <div className="fixed inset-0 bg-uk-blue/90 flex items-center justify-center z-50 animate-pulse">
                <div className="text-center text-white">
                  <MicVocal className="size-20 mx-auto mb-4" />
                  <p className="text-4xl font-extrabold">You have the floor!</p>
                </div>
              </div>
            )}

            {/* Drawing tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setDrawTool('pen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${drawTool === 'pen' ? 'border-uk-blue bg-blue-50 text-uk-blue' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <Paintbrush className="size-3.5" />
                Pen
              </button>
              <button
                onClick={() => setDrawTool('eraser')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${drawTool === 'eraser' ? 'border-uk-blue bg-blue-50 text-uk-blue' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <Eraser className="size-3.5" />
                Eraser
              </button>
              {/* Color swatches */}
              {['#000000', '#0033A0', '#EF4444', '#10B981', '#F59E0B'].map((c) => (
                <button
                  key={c}
                  onClick={() => { setDrawColor(c); setDrawTool('pen') }}
                  className={`size-7 rounded-full border-2 transition-transform ${drawColor === c && drawTool === 'pen' ? 'border-gray-900 scale-110' : 'border-white shadow-sm hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <canvas
              ref={drawCanvasRef}
              width={800}
              height={480}
              className="w-full rounded-xl border-2 border-gray-200 bg-white touch-none"
              style={{ touchAction: 'none', cursor: drawTool === 'eraser' ? 'cell' : 'crosshair' }}
              onMouseDown={handleCanvasStart}
              onMouseMove={handleCanvasMove}
              onMouseUp={(e) => void handleCanvasEnd(e)}
              onMouseLeave={(e) => { if (isDrawingRef.current) void handleCanvasEnd(e) }}
              onTouchStart={handleCanvasStart}
              onTouchMove={handleCanvasMove}
              onTouchEnd={(e) => void handleCanvasEnd(e)}
            />

            {/* AI Critique — streamed by host, shown to all */}
            {(canvasCritique || critiqueStreaming) && (
              <div className="border-2 border-blue-200 rounded-2xl bg-blue-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-uk-blue" />
                    <span className="text-xs font-bold text-uk-blue uppercase tracking-wide">AI Feedback</span>
                    {critiqueStreaming && <Loader2 className="size-3.5 animate-spin text-uk-blue" />}
                  </div>
                  <button onClick={() => setCanvasCritique('')} className="text-gray-400 hover:text-gray-600">
                    <X className="size-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{canvasCritique}</p>
              </div>
            )}
          </div>
        )}

        {/* Seminar — participant hand-raise view */}
        {experienceType === 'SEMINAR' && phase !== 'ENDED' && (
          <div className="w-full space-y-4">
            {/* "You have the floor!" full-screen overlay */}
            {speakerGranted && (
              <div className="fixed inset-0 bg-uk-blue/90 flex items-center justify-center z-50">
                <div className="text-center text-white">
                  <MicVocal className="size-20 mx-auto mb-4" />
                  <p className="text-4xl font-extrabold">You have the floor!</p>
                  <p className="text-lg mt-2 text-blue-200">Please begin speaking</p>
                </div>
              </div>
            )}

            <div className="border-2 border-gray-200 rounded-2xl bg-white p-8 text-center">
              {phase === 'LOBBY' ? (
                <>
                  <Loader2 className="size-8 animate-spin text-uk-blue mx-auto mb-3" />
                  <p className="font-bold text-gray-700">Waiting for instructor to start…</p>
                </>
              ) : !handRaised ? (
                <>
                  <div className="size-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Hand className="size-10 text-uk-blue" />
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 mb-2">Want to speak?</h2>
                  <p className="text-gray-500 mb-6 text-sm">Tap to join the speaker queue</p>
                  <button
                    onClick={() => void doRaiseHand()}
                    disabled={raisingHand}
                    className="w-full py-5 text-xl font-extrabold text-white bg-uk-blue rounded-2xl hover:bg-blue-800 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                  >
                    {raisingHand ? <Loader2 className="size-7 animate-spin mx-auto" /> : (
                      <div className="flex items-center justify-center gap-3">
                        <Hand className="size-7" />
                        Raise Hand
                      </div>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="size-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Hand className="size-10 text-green-600" />
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 mb-1">Hand Raised</h2>
                  {myQueuePosition !== null && (
                    <p className="text-uk-blue font-bold text-lg mb-4">You are #{myQueuePosition} in queue</p>
                  )}
                  <p className="text-gray-500 mb-6 text-sm">Your instructor will call on you when it&apos;s your turn</p>
                  <button
                    onClick={() => void doLowerHand()}
                    disabled={loweringHand}
                    className="w-full py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {loweringHand ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'Lower Hand'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Game Show Buzzer */}
        {activeQuestion && phase !== 'ENDED' && (
          <div className="w-full space-y-4">
            <div className="border-2 border-gray-200 rounded-2xl bg-white p-6 text-center">
              <span className="text-xs font-bold text-uk-blue uppercase tracking-wide block mb-2">
                {activeQuestion.phase === 'open' ? 'Question Open' : 'Question Closed'}
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 mb-6">{activeQuestion.text}</h2>

              {activeQuestion.phase === 'open' && !hasBuzzed && (
                <button
                  onClick={() => void pressBuzzer()}
                  disabled={buzzing}
                  className="w-full py-8 text-2xl font-extrabold text-white bg-uk-blue rounded-2xl hover:bg-blue-800 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                >
                  {buzzing ? (
                    <Loader2 className="size-8 animate-spin mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <Zap className="size-8" />
                      BUZZ IN!
                    </div>
                  )}
                </button>
              )}

              {activeQuestion.phase === 'open' && hasBuzzed && !activeQuestion.iWon && (
                <div className="py-8 text-gray-400 font-bold text-lg">Waiting for result…</div>
              )}

              {activeQuestion.iWon && (
                <div className="py-6 flex flex-col items-center gap-3">
                  <Trophy className="size-12 text-amber-500" />
                  <span className="text-2xl font-extrabold text-amber-600">You buzzed in first!</span>
                </div>
              )}

              {activeQuestion.phase === 'closed' && !activeQuestion.iWon && activeQuestion.winnerName && (
                <div className="py-6 text-center">
                  <p className="text-gray-500 font-medium">Winner:</p>
                  <p className="text-xl font-extrabold text-gray-900 mt-1">{activeQuestion.winnerName}</p>
                </div>
              )}

              {activeQuestion.phase === 'closed' && !activeQuestion.winnerName && !activeQuestion.iWon && (
                <div className="py-6 text-center text-gray-400 font-medium">No one buzzed in time</div>
              )}
            </div>

            {/* Scoreboard */}
            {scoreboard.length > 0 && (
              <div className="border-2 border-gray-200 rounded-2xl bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="size-4 text-uk-blue" />
                  <span className="text-sm font-bold text-gray-900">Scoreboard</span>
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
          </div>
        )}

        {phase === 'ENDED' && (
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-gray-900">Room Ended</h2>
            <p className="text-gray-500 mt-2">Thanks for participating!</p>
          </div>
        )}

        {activePoll && phase !== 'ENDED' && (
          <div className="w-full border-2 border-gray-200 rounded-2xl bg-white p-6">
            <div className="mb-1">
              <span className="text-xs font-bold text-uk-blue uppercase tracking-wide">
                {pollResults && myVote !== null ? 'Results' : 'Live Poll'}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-5">{activePoll.question}</h2>

            <div className="space-y-3">
              {activePoll.options.map((option, i) => {
                const votes = pollResults?.totals[i] ?? 0
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                const isMyVote = myVote === i
                const showResults = myVote !== null || pollResults !== null

                return (
                  <button
                    key={i}
                    onClick={() => vote(i)}
                    disabled={myVote !== null || voting}
                    className={`w-full text-left rounded-xl border-2 overflow-hidden transition-all ${
                      isMyVote
                        ? 'border-uk-blue bg-blue-50'
                        : myVote !== null
                          ? 'border-gray-200 bg-white opacity-70'
                          : 'border-gray-200 bg-white hover:border-uk-blue hover:bg-blue-50'
                    }`}
                  >
                    <div className="px-4 py-3 relative">
                      {showResults && (
                        <div
                          className="absolute inset-0 bg-blue-100 opacity-40 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isMyVote && <CheckCircle className="size-4 text-uk-blue shrink-0" />}
                          <span className="font-medium text-gray-900 text-sm">{option}</span>
                        </div>
                        {showResults && (
                          <span className="text-sm font-bold text-gray-700 shrink-0 ml-2">
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {voting && (
              <div className="flex items-center gap-2 mt-4 text-gray-400">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Recording vote…</span>
              </div>
            )}

            {myVote !== null && !voting && (
              <p className="text-sm text-green-600 font-medium mt-4 flex items-center gap-1.5">
                <CheckCircle className="size-4" />
                Vote recorded
                {pollResults ? ` · ${totalVotes} vote${totalVotes !== 1 ? 's' : ''} total` : ''}
              </p>
            )}

            {voteError && (
              <p className="text-sm text-red-600 mt-4">{voteError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
