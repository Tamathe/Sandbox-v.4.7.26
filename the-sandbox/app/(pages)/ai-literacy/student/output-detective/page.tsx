'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Loader2, Search, X, Send,
  Star, ArrowRight, CheckCircle2, XCircle, AlertTriangle,
  Fingerprint, HelpCircle, EyeOff,
} from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import { apiFetch } from '../../../../lib/api-client'
import PageHeader from '../../../../components/PageHeader'
import PathwayNav from '../../../../components/ai-literacy/PathwayNav'

// ---------- Types ----------

interface PlantedError {
  start: number
  end: number
  type: string
  explanation: string
}

interface StudentScenario {
  id: string
  title: string
  discipline: string
  tier: 1 | 2 | 3
  context: string
  aiResponse: string
  plantedErrors: PlantedError[]
}

interface Highlight {
  id: string
  span: string
  type: string
  explanation: string
  startOffset: number
  endOffset: number
}

interface EvalScores {
  detectionScore: number
  justificationScore: number
  overallScore: number
  feedback: string
}

type Stage = 'playing' | 'submitting' | 'results'

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

const TIERS = [
  { value: 0, label: 'All Tiers' },
  { value: 1, label: 'Tier 1 — Obvious' },
  { value: 2, label: 'Tier 2 — Subtle' },
  { value: 3, label: 'Tier 3 — Expert' },
]

const TIER_LABELS: Record<number, string> = { 1: 'Obvious', 2: 'Subtle', 3: 'Expert' }
const TIER_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-red-100 text-red-700',
}

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

const ERROR_TYPES = [
  { value: 'hallucination', label: 'Hallucination', color: 'bg-red-100 text-red-700 border-red-200', mark: 'bg-red-100/80' },
  { value: 'bias', label: 'Bias', color: 'bg-purple-100 text-purple-700 border-purple-200', mark: 'bg-purple-100/80' },
  { value: 'unsupported', label: 'Unsupported', color: 'bg-orange-100 text-orange-700 border-orange-200', mark: 'bg-orange-100/80' },
  { value: 'missing_context', label: 'Missing Context', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', mark: 'bg-yellow-100/80' },
] as const

const ERROR_ICONS: Record<string, typeof AlertTriangle> = {
  hallucination: AlertTriangle,
  bias: Fingerprint,
  unsupported: HelpCircle,
  missing_context: EyeOff,
}

const ERROR_STYLES: Record<string, { bg: string; label: string }> = {
  hallucination: { bg: 'bg-red-100 text-red-700 border-red-200', label: 'Hallucination' },
  bias: { bg: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Bias' },
  unsupported: { bg: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Unsupported' },
  missing_context: { bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Missing Context' },
}

// ---------- Score helper ----------

function ScoreCard({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'text-green-600' : value >= 40 ? 'text-yellow-600' : 'text-red-600'
  const bar = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="text-xs text-gray-500 uppercase font-semibold mb-2">{label}</div>
      <div className={`text-3xl font-extrabold ${color}`}>
        {value}<span className="text-lg text-gray-400">%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

// ---------- Component ----------

export default function StudentOutputDetectivePage() {
  const { currentUser } = useAuth()

  // List state
  const [scenarios, setScenarios] = useState<StudentScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [discipline, setDiscipline] = useState('')
  const [tier, setTier] = useState(0)

  // Player state
  const [activeScenario, setActiveScenario] = useState<StudentScenario | null>(null)
  const [stage, setStage] = useState<Stage>('playing')
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [rating, setRating] = useState(0)
  const [evalScores, setEvalScores] = useState<EvalScores | null>(null)

  // Selection toolbar state
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; startOffset: number; endOffset: number } | null>(null)
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [justification, setJustification] = useState('')
  const textRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const fetched = useRef(false)

  const closeToolbar = useCallback(() => {
    setSelectionInfo(null)
    setToolbarPos(null)
    setSelectedType(null)
    setJustification('')
  }, [])

  // Close toolbar on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        closeToolbar()
      }
    }
    if (toolbarPos) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [toolbarPos, closeToolbar])

  // Fetch student profile for default discipline
  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    apiFetch<{ profile?: { disciplineFamily?: string } }>(currentUser.email, '/api/ai-literacy/student/profile')
      .then((data) => {
        if (data?.profile?.disciplineFamily) {
          setDiscipline(data.profile.disciplineFamily)
        }
      })
      .catch(() => {})

    loadScenarios('', 0)
  }, [currentUser.email])

  // Reload when filters change
  useEffect(() => {
    if (!fetched.current) return
    loadScenarios(discipline, tier)
  }, [discipline, tier])

  function loadScenarios(disc: string, t: number) {
    setLoading(true)
    const params = new URLSearchParams({ context: 'student' })
    if (disc) params.set('discipline', disc)
    if (t) params.set('tier', String(t))

    apiFetch<{ scenarios?: StudentScenario[] }>(currentUser.email, `/api/ai-literacy/output-eval?${params}`)
      .then((data) => {
        if (data?.scenarios) setScenarios(data.scenarios)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // ---------- Highlight tool ----------

  function handleTextMouseUp() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !textRef.current) return

    const text = selection.toString().trim()
    if (!text || text.length < 5) return

    const range = selection.getRangeAt(0)
    const preRange = document.createRange()
    preRange.selectNodeContents(textRef.current)
    preRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preRange.toString().length
    const endOffset = startOffset + text.length

    // Check for overlapping highlights
    const overlaps = highlights.some(
      (h) => startOffset < h.endOffset && endOffset > h.startOffset,
    )
    if (overlaps) return

    const rect = range.getBoundingClientRect()
    const containerRect = textRef.current.getBoundingClientRect()
    setToolbarPos({
      top: rect.top - containerRect.top - 12,
      left: rect.left - containerRect.left + rect.width / 2,
    })
    setSelectionInfo({ text, startOffset, endOffset })
  }

  function handleAddHighlight() {
    if (!selectionInfo || !selectedType || !justification.trim()) return

    setHighlights((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        span: selectionInfo.text,
        type: selectedType,
        explanation: justification.trim(),
        startOffset: selectionInfo.startOffset,
        endOffset: selectionInfo.endOffset,
      },
    ])
    closeToolbar()
    window.getSelection()?.removeAllRanges()
  }

  function removeHighlight(id: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
  }

  // ---------- Render highlighted text ----------

  function renderHighlightedText() {
    if (!activeScenario) return null
    const text = activeScenario.aiResponse
    if (highlights.length === 0) return <span>{text}</span>

    const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset)
    const segments: React.ReactNode[] = []
    let lastEnd = 0

    for (const h of sorted) {
      if (h.startOffset > lastEnd) {
        segments.push(<span key={`t-${lastEnd}`}>{text.slice(lastEnd, h.startOffset)}</span>)
      }
      const typeInfo = ERROR_TYPES.find((t) => t.value === h.type)
      segments.push(
        <mark
          key={h.id}
          className={`${typeInfo?.mark ?? 'bg-gray-100'} rounded px-0.5 cursor-help relative group`}
          title={`${h.type}: ${h.explanation}`}
        >
          {text.slice(h.startOffset, h.endOffset)}
        </mark>,
      )
      lastEnd = h.endOffset
    }
    if (lastEnd < text.length) {
      segments.push(<span key={`t-${lastEnd}`}>{text.slice(lastEnd)}</span>)
    }
    return <>{segments}</>
  }

  // ---------- Submit & evaluate ----------

  async function handleSubmit() {
    if (!activeScenario || highlights.length === 0 || rating === 0) return
    setStage('submitting')

    try {
      // Evaluate via existing output-eval evaluate endpoint
      const result = await apiFetch<EvalScores>(currentUser.email, '/api/ai-literacy/output-eval/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: activeScenario.id,
          plantedErrors: activeScenario.plantedErrors.map((e) => ({
            span: activeScenario.aiResponse.slice(e.start, e.end),
            type: e.type,
            explanation: e.explanation,
          })),
          userHighlights: highlights.map((h) => ({ span: h.span, type: h.type, explanation: h.explanation })),
          userRating: rating,
        }),
      })
      setEvalScores(result)

      // Save attempt with student context
      await apiFetch(currentUser.email, '/api/ai-literacy/output-eval/attempt', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: activeScenario.id,
          tier: activeScenario.tier,
          question: activeScenario.context,
          aiResponse: activeScenario.aiResponse,
          plantedErrors: activeScenario.plantedErrors.map((e) => ({
            span: activeScenario.aiResponse.slice(e.start, e.end),
            type: e.type,
            explanation: e.explanation,
          })),
          userHighlights: highlights.map((h) => ({ span: h.span, type: h.type, explanation: h.explanation })),
          userRating: rating,
          detectionScore: result.detectionScore,
          justificationScore: result.justificationScore,
          overallScore: result.overallScore,
          feedback: result.feedback,
          isSeeded: true,
          context: 'student',
          disciplineFamily: activeScenario.discipline,
        }),
      })

      setStage('results')
    } catch {
      setStage('playing')
    }
  }

  // ---------- Navigation ----------

  function openScenario(s: StudentScenario) {
    setActiveScenario(s)
    setStage('playing')
    setHighlights([])
    setRating(0)
    setEvalScores(null)
    closeToolbar()
  }

  function closePlayer() {
    setActiveScenario(null)
    setStage('playing')
    setHighlights([])
    setRating(0)
    setEvalScores(null)
    closeToolbar()
  }

  function handleNextScenario() {
    closePlayer()
  }

  // ---------- Check if user found a planted error ----------

  function didUserFindError(error: PlantedError): boolean {
    const errorSpan = activeScenario!.aiResponse.slice(error.start, error.end).toLowerCase().trim()
    return highlights.some((h) => {
      const hNorm = h.span.toLowerCase().trim()
      return errorSpan.includes(hNorm) || hNorm.includes(errorSpan)
    })
  }

  // ---------- Render ----------

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <span>Output Detective</span>
        </nav>
      </div>
      <PageHeader
        title="Output Detective"
        subtitle="Find the errors hiding in AI-generated responses"
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
        {/* Active scenario player */}
        {activeScenario ? (
          stage === 'results' && evalScores ? (
            /* ── Results view ── */
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={closePlayer} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="size-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[activeScenario.discipline]?.bg ?? 'bg-gray-50'} ${DISCIPLINE_COLORS[activeScenario.discipline]?.text ?? 'text-gray-600'}`}>
                      {DISCIPLINE_LABELS[activeScenario.discipline] ?? activeScenario.discipline}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[activeScenario.tier] ?? ''}`}>
                      Tier {activeScenario.tier} — {TIER_LABELS[activeScenario.tier]}
                    </span>
                  </div>
                  <h2 className="text-base font-extrabold text-gray-900">{activeScenario.title} — Results</h2>
                </div>
              </div>

              {/* Score cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ScoreCard label="Detection" value={evalScores.detectionScore} />
                <ScoreCard label="Justification" value={evalScores.justificationScore} />
                <ScoreCard label="Overall" value={evalScores.overallScore} />
              </div>

              {/* Feedback */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
                <p className="text-sm text-gray-700">{evalScores.feedback}</p>
              </div>

              {/* Planted errors revealed */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="font-extrabold text-gray-900 mb-4">Planted Errors</h3>
                <div className="space-y-4">
                  {activeScenario.plantedErrors.map((error, i) => {
                    const found = didUserFindError(error)
                    const style = ERROR_STYLES[error.type]
                    const Icon = ERROR_ICONS[error.type]
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${found ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {found ? (
                            <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                          ) : (
                            <XCircle className="size-4 text-red-500 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-gray-600">
                            {found ? 'You found this!' : 'Missed'}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${style?.bg ?? 'bg-gray-100 text-gray-600'}`}>
                            {Icon && <Icon className="size-3 inline mr-1" />}
                            {style?.label ?? error.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 italic mb-2 bg-white/60 rounded-lg p-2">
                          &ldquo;{activeScenario.aiResponse.slice(error.start, error.end)}&rdquo;
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Why it&apos;s wrong:</span> {error.explanation}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Your highlights */}
              {highlights.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <h3 className="font-extrabold text-gray-900 mb-4">Your Highlights</h3>
                  <div className="space-y-3">
                    {highlights.map((h, i) => {
                      const style = ERROR_STYLES[h.type]
                      return (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${style?.bg ?? 'bg-gray-100 text-gray-600'}`}>
                              {style?.label ?? h.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 italic">&ldquo;{h.span}&rdquo;</p>
                          <p className="text-xs text-gray-500 mt-1">{h.explanation}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Next */}
              <button
                onClick={handleNextScenario}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] transition-colors"
              >
                Next Scenario <ArrowRight className="size-4" />
              </button>
            </div>
          ) : (
            /* ── Playing view ── */
            <div className="space-y-6">
              {/* Player header */}
              <div className="flex items-center gap-3">
                <button onClick={closePlayer} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="size-5" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[activeScenario.discipline]?.bg ?? 'bg-gray-50'} ${DISCIPLINE_COLORS[activeScenario.discipline]?.text ?? 'text-gray-600'}`}>
                      {DISCIPLINE_LABELS[activeScenario.discipline] ?? activeScenario.discipline}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[activeScenario.tier] ?? ''}`}>
                      Tier {activeScenario.tier} — {TIER_LABELS[activeScenario.tier]}
                    </span>
                  </div>
                  <h2 className="text-base font-extrabold text-gray-900">{activeScenario.title}</h2>
                </div>
              </div>

              {/* Academic context */}
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-gray-700">{activeScenario.context}</p>
              </div>

              {/* AI Response with highlighting */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 relative">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">AI Response</h3>
                <p className="text-xs text-gray-400 mb-4">Select text to mark errors. Click and drag to highlight suspicious passages.</p>

                <div
                  ref={textRef}
                  onMouseUp={handleTextMouseUp}
                  className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap select-text cursor-text"
                >
                  {renderHighlightedText()}
                </div>

                {/* Floating toolbar */}
                {toolbarPos && selectionInfo && (
                  <div
                    ref={toolbarRef}
                    className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 -translate-x-1/2"
                    style={{ top: toolbarPos.top, left: toolbarPos.left }}
                  >
                    {!selectedType ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-500 font-medium mb-1">What type of error?</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {ERROR_TYPES.map((et) => {
                            const Icon = ERROR_ICONS[et.value]
                            return (
                              <button
                                key={et.value}
                                onClick={() => setSelectedType(et.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${et.color}`}
                              >
                                {Icon && <Icon className="size-3.5" />} {et.label}
                              </button>
                            )
                          })}
                        </div>
                        <button onClick={closeToolbar} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 min-w-[280px]">
                        <p className="text-xs text-gray-500 font-medium">Why is this an error?</p>
                        <textarea
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          placeholder="Explain what's wrong..."
                          rows={2}
                          autoFocus
                          className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleAddHighlight}
                            disabled={!justification.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0033A0] text-white rounded-lg text-xs font-medium hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Add Highlight
                          </button>
                          <button onClick={closeToolbar} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Highlights list */}
              {highlights.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Your Highlights ({highlights.length})</h3>
                  <div className="space-y-2">
                    {highlights.map((h) => {
                      const typeInfo = ERROR_TYPES.find((t) => t.value === h.type)
                      return (
                        <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${typeInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
                            {typeInfo?.label ?? h.type}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 line-clamp-1 italic">&ldquo;{h.span}&rdquo;</p>
                            <p className="text-xs text-gray-500 mt-0.5">{h.explanation}</p>
                          </div>
                          <button onClick={() => removeHighlight(h.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                            <X className="size-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Rating + Submit */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Rate Overall AI Response Quality</h3>
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} className="transition-colors">
                      <Star className={`size-7 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                  {rating > 0 && <span className="text-sm text-gray-500 ml-2">{rating}/5</span>}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={highlights.length === 0 || rating === 0 || stage === 'submitting'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {stage === 'submitting' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {stage === 'submitting' ? 'Evaluating...' : 'Submit Evaluation'}
                </button>

                {highlights.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">Highlight at least one error in the AI response to submit.</p>
                )}
              </div>
            </div>
          )
        ) : (
          /* ── Scenario list ── */
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
                {TIERS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTier(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tier === t.value
                        ? 'bg-[#0033A0] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-gray-400" />
              </div>
            ) : scenarios.length === 0 ? (
              <div className="text-center py-16">
                <Search className="size-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No scenarios match your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {scenarios.map((s) => {
                  const dcol = DISCIPLINE_COLORS[s.discipline] ?? { bg: 'bg-gray-50', text: 'text-gray-600' }
                  return (
                    <button
                      key={s.id}
                      onClick={() => openScenario(s)}
                      className="w-full text-left border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${dcol.bg} ${dcol.text}`}>
                              {DISCIPLINE_LABELS[s.discipline] ?? s.discipline}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[s.tier] ?? ''}`}>
                              Tier {s.tier} — {TIER_LABELS[s.tier]}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.context}</p>
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
