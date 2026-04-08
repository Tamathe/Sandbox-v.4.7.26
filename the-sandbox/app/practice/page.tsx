'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Theater, Play, Send, Award, TrendingUp, Clock, RotateCcw,
  ChevronRight, Star, BookOpen, Briefcase, Heart, MessageSquare, Handshake,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

// ── Types ───────────────────────────────────────────────────────────────

interface Scenario {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  emoji: string
  aiRole: string
  studentRole: string
  estimatedMinutes: number
  turnLimit: number
  isBuiltIn: boolean
}

interface SimSession {
  id: string
  scenarioId: string
  phase: 'BRIEFING' | 'ACTIVE' | 'DEBRIEF'
  transcript: { role: string; content: string }[]
  turnCount: number
  scores: { dimensions: { name: string; score: number; feedback: string }[]; overall: number } | null
  strengths: string[]
  growthAreas: string[]
  overallScore: number | null
  savedToPortfolio: boolean
  startedAt: string
  completedAt: string | null
  scenario: Scenario
}

interface PastSession {
  id: string
  overallScore: number | null
  startedAt: string
  completedAt: string | null
  scenario: { title: string; emoji: string; category: string }
}

const categoryIcons: Record<string, React.ReactNode> = {
  career: <Briefcase className="size-4" />,
  academic: <BookOpen className="size-4" />,
  healthcare: <Heart className="size-4" />,
  business: <TrendingUp className="size-4" />,
  communication: <MessageSquare className="size-4" />,
}

const difficultyColors: Record<string, string> = {
  warmup: 'bg-green-100 text-green-700',
  standard: 'bg-blue-100 text-blue-700',
  advanced: 'bg-amber-100 text-amber-700',
}

// ── Page ────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const { currentUser } = useAuth()
  const email = currentUser.email
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [pastSessions, setPastSessions] = useState<PastSession[]>([])
  const [activeSession, setActiveSession] = useState<SimSession | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [scenData, sessData] = await Promise.all([
        apiFetch<{ scenarios: Scenario[] }>(email, '/api/practice/scenarios'),
        apiFetch<{ sessions: PastSession[] }>(email, '/api/practice/sessions'),
      ])
      setScenarios(scenData.scenarios)
      setPastSessions(sessData.sessions)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [email])

  useEffect(() => { void fetchData() }, [fetchData])

  const handleStartSession = async (scenarioId: string) => {
    const data = await apiFetch<{ session: SimSession }>(email, '/api/practice/sessions', {
      method: 'POST',
      body: JSON.stringify({ scenarioId }),
    })
    setActiveSession(data.session)
  }

  if (activeSession) {
    return (
      <SimulationView
        session={activeSession}
        email={email}
        onUpdate={s => setActiveSession(s)}
        onExit={() => { setActiveSession(null); void fetchData() }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Practice"
        subtitle="Realistic simulations. Fail safe. Learn fast."
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Past sessions summary */}
        {pastSessions.filter(s => s.completedAt).length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Simulations Done</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{pastSessions.filter(s => s.completedAt).length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Score</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                {(() => {
                  const scored = pastSessions.filter(s => s.overallScore !== null)
                  return scored.length > 0 ? `${(scored.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scored.length).toFixed(1)}/10` : '—'
                })()}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Categories</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">
                {new Set(pastSessions.filter(s => s.completedAt).map(s => s.scenario.category)).size}
              </p>
            </div>
          </div>
        )}

        {/* Scenario Grid */}
        <h3 className="font-extrabold text-gray-900 mb-4">Choose a Simulation</h3>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading scenarios...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {scenarios.map(s => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-gray-900">{s.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[s.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="size-3" /> {s.estimatedMinutes}m
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3 flex-1">{s.description}</p>
                <div className="text-xs text-gray-400 mb-3">
                  You: <span className="text-gray-600">{s.studentRole}</span>
                </div>
                <Button size="sm" onClick={() => handleStartSession(s.id)} icon={<Play />} className="w-full">
                  Start Simulation
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <div>
            <h3 className="font-extrabold text-gray-900 mb-4">Recent Sessions</h3>
            <div className="space-y-2">
              {pastSessions.slice(0, 5).map(s => (
                <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">{s.scenario.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{s.scenario.title}</p>
                    <p className="text-xs text-gray-400">{new Date(s.startedAt).toLocaleDateString()}</p>
                  </div>
                  {s.overallScore !== null && (
                    <span className="text-sm font-extrabold text-[#0033A0]">{s.overallScore.toFixed(1)}/10</span>
                  )}
                  {!s.completedAt && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">In progress</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Simulation View ─────────────────────────────────────────────────────

function SimulationView({ session, email, onUpdate, onExit }: {
  session: SimSession; email: string; onUpdate: (s: SimSession) => void; onExit: () => void
}) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(session.transcript ?? [])
  const [phase, setPhase] = useState(session.phase)
  const [debrief, setDebrief] = useState<{
    dimensions: { name: string; score: number; feedback: string }[]
    overall: number
    strengths?: string[]
    growthAreas?: string[]
  } | null>(session.scores)
  const [turnsRemaining, setTurnsRemaining] = useState(session.scenario.turnLimit - session.turnCount)
  const [savingPortfolio, setSavingPortfolio] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send briefing on mount if no messages yet
  useEffect(() => {
    if (messages.length === 0 && phase === 'BRIEFING') {
      void sendMessage('Start the briefing')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    setSending(true)

    // Show user message immediately
    if (text !== 'Start the briefing') {
      setMessages(prev => [...prev, { role: 'user', content: text }])
    }
    setInput('')

    try {
      const data = await apiFetch<{
        reply: string | null; phase: string; debrief?: typeof debrief; turnCount?: number; turnsRemaining?: number
      }>(email, '/api/practice/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: session.id, message: text }),
      })

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply! }])
      }
      if (data.phase) setPhase(data.phase as SimSession['phase'])
      if (data.debrief) setDebrief(data.debrief)
      if (data.turnsRemaining !== undefined) setTurnsRemaining(data.turnsRemaining)
    } finally { setSending(false) }
  }

  const handlePortfolio = async () => {
    setSavingPortfolio(true)
    try {
      await apiFetch(email, '/api/practice/sessions', {
        method: 'POST',
        body: JSON.stringify({ action: 'portfolio', sessionId: session.id }),
      })
    } finally { setSavingPortfolio(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={onExit} className="text-gray-400 hover:text-gray-600">
            <ChevronRight className="size-5 rotate-180" />
          </button>
          <span className="text-xl">{session.scenario.emoji}</span>
          <div className="flex-1">
            <h2 className="font-extrabold text-gray-900">{session.scenario.title}</h2>
            <p className="text-xs text-gray-500">
              {phase === 'BRIEFING' && 'Setting the scene...'}
              {phase === 'ACTIVE' && `Turn ${session.scenario.turnLimit - turnsRemaining}/${session.scenario.turnLimit}`}
              {phase === 'DEBRIEF' && 'Simulation complete'}
            </p>
          </div>
          {phase === 'ACTIVE' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {turnsRemaining} turns left
            </span>
          )}
        </div>
      </div>

      {/* Debrief View */}
      {phase === 'DEBRIEF' && debrief ? (
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-14 rounded-2xl bg-[#0033A0] text-white flex items-center justify-center text-2xl font-extrabold">
                  {debrief.overall.toFixed(1)}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">Simulation Complete</h3>
                  <p className="text-sm text-gray-500">Overall score out of 10</p>
                </div>
              </div>

              {/* Dimension scores */}
              <div className="space-y-3 mb-6">
                {debrief.dimensions.map(d => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{d.name}</span>
                      <span className="text-sm font-extrabold text-gray-900">{d.score}/10</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-[#0033A0] rounded-full transition-all" style={{ width: `${d.score * 10}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">{d.feedback}</p>
                  </div>
                ))}
              </div>

              {/* Strengths & Growth */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1"><Star className="size-4" /> Strengths</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    {(session.strengths?.length ? session.strengths : debrief.strengths ?? []).map((s: string, i: number) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1"><TrendingUp className="size-4" /> Growth Areas</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {(session.growthAreas?.length ? session.growthAreas : debrief.growthAreas ?? []).map((g: string, i: number) => <li key={i}>• {g}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handlePortfolio} loading={savingPortfolio} icon={<Award />} variant="secondary">
                Save to Portfolio
              </Button>
              <Button onClick={onExit} icon={<RotateCcw />} variant="secondary">
                Try Another
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Chat View */
        <>
          <div className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-[#0033A0] text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm text-gray-800'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-gray-400">Sandy is typing...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <div className="max-w-6xl mx-auto flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !sending && sendMessage(input)}
                placeholder={phase === 'BRIEFING' ? 'Say "I\'m ready" to begin...' : 'Your response...'}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-[#0033A0]"
                disabled={sending}
              />
              <Button onClick={() => sendMessage(input)} loading={sending} disabled={!input.trim()} icon={<Send />}>
                Send
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
