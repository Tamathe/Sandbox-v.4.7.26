'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Loader2, PenTool, Send,
  BarChart3, ArrowRight, RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import PathwayNav from '../../../../components/ai-literacy/PathwayNav'

// ---------- Types ----------

interface StudentChallenge {
  id: string
  title: string
  discipline: string
  level: number
  scenario: string
  originalPrompt: string
  evaluationCriteria: string
}

interface Scores {
  clarity: number
  specificity: number
  constraints: number
  effectiveness: number
}

type Stage = 'idle' | 'running' | 'comparing' | 'scoring' | 'scored'

// ---------- Constants ----------

const DISCIPLINES = [
  { value: '', label: 'All Disciplines' },
  { value: 'STEM', label: 'STEM' },
  { value: 'HUMANITIES', label: 'Humanities' },
  { value: 'SOCIAL_SCIENCES', label: 'Social Sciences' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'HEALTH_SCIENCES', label: 'Health Sciences' },
]

const LEVELS = [
  { value: 0, label: 'All Levels' },
  { value: 1, label: 'Beginner' },
  { value: 3, label: 'Intermediate' },
  { value: 5, label: 'Advanced' },
]

const DISCIPLINE_COLORS: Record<string, { bg: string; text: string }> = {
  STEM: { bg: 'bg-blue-50', text: 'text-blue-700' },
  HUMANITIES: { bg: 'bg-purple-50', text: 'text-purple-700' },
  SOCIAL_SCIENCES: { bg: 'bg-teal-50', text: 'text-teal-700' },
  ARTS: { bg: 'bg-rose-50', text: 'text-rose-700' },
  PROFESSIONAL: { bg: 'bg-amber-50', text: 'text-amber-700' },
  HEALTH_SCIENCES: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

const DISCIPLINE_LABELS: Record<string, string> = {
  STEM: 'STEM',
  HUMANITIES: 'Humanities',
  SOCIAL_SCIENCES: 'Social Sciences',
  ARTS: 'Arts',
  PROFESSIONAL: 'Professional',
  HEALTH_SCIENCES: 'Health Sciences',
}

const LEVEL_LABELS: Record<number, string> = { 1: 'Beginner', 3: 'Intermediate', 5: 'Advanced' }

// ---------- Score helpers ----------

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? 'bg-green-500' : value >= 4 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 capitalize">{label}</span>
        <span className="font-semibold text-gray-900">{value}/10</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  )
}

function scoreLabel(score: number): string {
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Developing'
  return 'Needs Work'
}

// ---------- Component ----------

export default function StudentPromptCraftPage() {
  const { currentUser } = useAuth()

  // State
  const [challenges, setChallenges] = useState<StudentChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [discipline, setDiscipline] = useState('')
  const [level, setLevel] = useState(0)
  const [activeChallenge, setActiveChallenge] = useState<StudentChallenge | null>(null)

  // Player state
  const [stage, setStage] = useState<Stage>('idle')
  const [userPrompt, setUserPrompt] = useState('')
  const [originalOutput, setOriginalOutput] = useState('')
  const [userOutput, setUserOutput] = useState('')
  const [scores, setScores] = useState<Scores | null>(null)
  const [overallScore, setOverallScore] = useState(0)
  const [feedback, setFeedback] = useState('')

  const fetched = useRef(false)
  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }

  // Fetch student profile to get inferred discipline
  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    // Try to get profile for default discipline
    fetch('/api/ai-literacy/student/profile', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.profile?.disciplineFamily) {
          setDiscipline(data.profile.disciplineFamily)
        }
      })
      .catch(() => {})

    // Load all challenges
    loadChallenges('', 0)
  }, [currentUser.email])

  // Reload challenges when filters change
  useEffect(() => {
    if (!fetched.current) return
    loadChallenges(discipline, level)
  }, [discipline, level])

  function loadChallenges(disc: string, lvl: number) {
    setLoading(true)
    const params = new URLSearchParams({ context: 'student' })
    if (disc) params.set('discipline', disc)
    if (lvl) params.set('level', String(lvl))

    fetch(`/api/ai-literacy/prompt-lab?${params}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.challenges) setChallenges(data.challenges)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Player functions (same flow as PromptLabChallenge)
  async function handleRunBoth() {
    if (!userPrompt.trim() || !activeChallenge) return
    setStage('running')

    try {
      const [origRes, userRes] = await Promise.all([
        fetch('/api/ai-literacy/prompt-lab/execute', {
          method: 'POST', headers, body: JSON.stringify({ prompt: activeChallenge.originalPrompt }),
        }),
        fetch('/api/ai-literacy/prompt-lab/execute', {
          method: 'POST', headers, body: JSON.stringify({ prompt: userPrompt }),
        }),
      ])

      const origData = await origRes.json()
      const userData = await userRes.json()
      setOriginalOutput(origData.output ?? '')
      setUserOutput(userData.output ?? '')
      setStage('comparing')
    } catch (err) {
      console.error('Failed to compare prompt outputs:', err)
      setStage('idle')
    }
  }

  async function handleScore() {
    if (!activeChallenge) return
    setStage('scoring')

    try {
      const res = await fetch('/api/ai-literacy/prompt-lab/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          original: activeChallenge.originalPrompt,
          rewritten: userPrompt,
          originalOutput,
          rewrittenOutput: userOutput,
          challengeContext: `${activeChallenge.scenario}\nEvaluation criteria: ${activeChallenge.evaluationCriteria}`,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setScores(data.scores)
      setOverallScore(data.overallScore)
      setFeedback(data.feedback)
      setStage('scored')
    } catch {
      setStage('comparing')
    }
  }

  async function handleSave() {
    if (!activeChallenge) return

    await fetch('/api/ai-literacy/prompt-lab/attempt', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        challengeId: activeChallenge.id,
        level: activeChallenge.level,
        originalPrompt: activeChallenge.originalPrompt,
        userPrompt,
        originalOutput,
        userOutput,
        scores,
        overallScore,
        feedback,
        context: 'student',
        disciplineFamily: activeChallenge.discipline,
      }),
    })

    // Reset and go back to list
    resetPlayer()
    setActiveChallenge(null)
  }

  function resetPlayer() {
    setStage('idle')
    setUserPrompt('')
    setOriginalOutput('')
    setUserOutput('')
    setScores(null)
    setOverallScore(0)
    setFeedback('')
  }

  function openChallenge(c: StudentChallenge) {
    resetPlayer()
    setActiveChallenge(c)
  }

  function closePlayer() {
    resetPlayer()
    setActiveChallenge(null)
  }

  // ---------- Render ----------

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <span>Prompt Craft</span>
        </nav>
      </div>
      <PageHeader
        title="Prompt Craft"
        subtitle="Learn to communicate effectively with AI for your coursework"
        action={
          <Link
            href="/ai-literacy"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active challenge player */}
        {activeChallenge ? (
          <div className="space-y-6">
            {/* Player header */}
            <div className="flex items-center gap-3">
              <button onClick={closePlayer} className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[activeChallenge.discipline]?.bg ?? 'bg-gray-50'} ${DISCIPLINE_COLORS[activeChallenge.discipline]?.text ?? 'text-gray-600'}`}>
                    {DISCIPLINE_LABELS[activeChallenge.discipline] ?? activeChallenge.discipline}
                  </span>
                  <span className="text-xs text-gray-400">
                    {LEVEL_LABELS[activeChallenge.level] ?? `Level ${activeChallenge.level}`}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-gray-900">{activeChallenge.title}</h2>
              </div>
            </div>

            {/* Scenario context */}
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-gray-700">{activeChallenge.scenario}</p>
            </div>

            {/* Side-by-side prompts & outputs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original side */}
              <div className="space-y-4">
                <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">The Weak Prompt</h3>
                  <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 italic">{activeChallenge.originalPrompt}</p>
                </div>
                {originalOutput && (
                  <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Original Output</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{originalOutput}</p>
                  </div>
                )}
              </div>

              {/* Student side */}
              <div className="space-y-4">
                <div className="border-2 border-green-200 rounded-2xl shadow-sm p-5">
                  <h3 className="text-xs font-semibold text-green-700 uppercase mb-2">Your Improved Prompt</h3>
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="Rewrite the prompt to get a better, more useful result..."
                    rows={5}
                    disabled={stage === 'running' || stage === 'scoring'}
                    className="w-full bg-green-50/50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 resize-y disabled:opacity-50"
                  />
                </div>
                {userOutput && (
                  <div className="border-2 border-green-200 rounded-2xl shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-green-700 uppercase mb-2">Your Output</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{userOutput}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {stage === 'idle' && (
                <button
                  onClick={handleRunBoth}
                  disabled={!userPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="size-4" /> Run Both Prompts
                </button>
              )}
              {stage === 'running' && (
                <div className="flex items-center gap-2 px-5 py-2.5 text-[#0033A0] font-medium text-sm">
                  <Loader2 className="size-4 animate-spin" /> Running both prompts...
                </div>
              )}
              {stage === 'comparing' && (
                <button
                  onClick={handleScore}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] transition-colors"
                >
                  <BarChart3 className="size-4" /> Score My Rewrite
                </button>
              )}
              {stage === 'scoring' && (
                <div className="flex items-center gap-2 px-5 py-2.5 text-[#0033A0] font-medium text-sm">
                  <Loader2 className="size-4 animate-spin" /> Evaluating your rewrite...
                </div>
              )}
              {stage === 'scored' && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] transition-colors"
                >
                  Save &amp; Try Another <ArrowRight className="size-4" />
                </button>
              )}

              {(stage === 'comparing' || stage === 'scored') && (
                <button
                  onClick={() => { setStage('idle'); setOriginalOutput(''); setUserOutput(''); setScores(null); setFeedback('') }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  <RotateCcw className="size-3.5" /> Retry
                </button>
              )}
            </div>

            {/* Score results */}
            {stage === 'scored' && scores && (
              <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-gray-900">Your Score</h3>
                  <div className="text-right">
                    <div className={`text-2xl font-extrabold ${
                      overallScore >= 7 ? 'text-green-600' : overallScore >= 4 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {overallScore}/10
                    </div>
                    <p className="text-xs text-gray-400">{scoreLabel(overallScore)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ScoreBar label="Clarity" value={scores.clarity} />
                  <ScoreBar label="Specificity" value={scores.specificity} />
                  <ScoreBar label="Constraints" value={scores.constraints} />
                  <ScoreBar label="Effectiveness" value={scores.effectiveness} />
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 mb-1">Feedback</p>
                  <p className="text-sm text-gray-700">{feedback}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
              >
                {DISCIPLINES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>

              <div className="flex gap-1">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      level === l.value
                        ? 'bg-[#0033A0] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge list */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-gray-400" />
              </div>
            ) : challenges.length === 0 ? (
              <div className="text-center py-16">
                <PenTool className="size-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No challenges match your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {challenges.map((c) => {
                  const dcol = DISCIPLINE_COLORS[c.discipline] ?? { bg: 'bg-gray-50', text: 'text-gray-600' }
                  return (
                    <button
                      key={c.id}
                      onClick={() => openChallenge(c)}
                      className="w-full text-left border-2 border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${dcol.bg} ${dcol.text}`}>
                              {DISCIPLINE_LABELS[c.discipline] ?? c.discipline}
                            </span>
                            <span className="text-xs text-gray-400">
                              {LEVEL_LABELS[c.level] ?? `Level ${c.level}`}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.scenario}</p>
                        </div>
                        <ChevronRight className="size-4 text-gray-300 shrink-0 mt-1" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        <PathwayNav />
      </div>
    </>
  )
}
