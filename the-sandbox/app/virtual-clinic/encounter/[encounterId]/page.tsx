'use client'

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Send, Loader2, Bot, ChevronRight, ChevronDown, Plus, Trash2, GripVertical,
  Stethoscope, Brain, ClipboardList, FileText, MessageSquare, CheckCircle2,
  AlertTriangle, ArrowUp, ArrowDown, X, Monitor, Timer, Heart, Lightbulb,
  Clock, Gauge, Sparkles, Download, LogOut, RotateCcw, StickyNote,
} from 'lucide-react'
import DynamicMarkdown from '../../../components/DynamicMarkdown'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorBanner from '../../../components/ErrorBanner'
import IllnessScriptComparison from '../../../components/virtual-clinic/IllnessScriptComparison'
import NearMissFeedback from '../../../components/virtual-clinic/NearMissFeedback'
import ScaffoldingBanner from '../../../components/virtual-clinic/ScaffoldingBanner'
import LearningObjectiveCard from '../../../components/virtual-clinic/LearningObjectiveCard'
import QuestionStrategyCard from '../../../components/virtual-clinic/QuestionStrategyCard'
import ClinicalReasoningCard from '../../../components/virtual-clinic/ClinicalReasoningCard'
import DomainRadarChart from '../../../components/virtual-clinic/analytics/DomainRadarChart'
import InstructionCard, { getAdvanceTooltip } from '../../../components/virtual-clinic/InstructionCard'
import { checkScaffolding, getDomainChecklist } from '../../../lib/virtual-clinic/scaffolding-service'
import type {
  EncounterPhase, TranscriptMessage, DifferentialEntry,
  DiagnosticPlanInput, EncounterScores, CognitiveBias, CompetencyLevel,
  CommunicationSubScores, DomainScore, TeachingPoint, IllnessScriptComparison as IllnessScriptData,
  NearMissAnalysis, ScaffoldingLevel, AffectState, SelfAssessment, PhaseTimingData,
  KeyMoment, KeyMomentType, LearningObjectiveAlignment, QuestionStrategyAnalysis,
  ClinicalReasoningProcess,
} from '../../../lib/virtual-clinic/types'

// ─── Phase Config ───────────────────────────────────────────────────────────

const PHASES: { key: EncounterPhase; label: string }[] = [
  { key: 'OPENING', label: 'Opening' },
  { key: 'HISTORY_TAKING', label: 'History' },
  { key: 'PROBLEM_REPRESENTATION', label: 'Problem Rep' },
  { key: 'DIFFERENTIAL_DIAGNOSIS', label: 'Differential' },
  { key: 'PHYSICAL_EXAM', label: 'Physical Exam' },
  { key: 'DIAGNOSTIC_PLAN', label: 'Diagnostic Plan' },
  { key: 'FEEDBACK', label: 'Feedback' },
  { key: 'COMPLETED', label: 'Completed' },
]

const LEVEL_COLORS: Record<CompetencyLevel, string> = {
  NOVICE: 'bg-red-100 text-red-700',
  DEVELOPING: 'bg-amber-100 text-amber-700',
  COMPETENT: 'bg-blue-100 text-blue-700',
  PROFICIENT: 'bg-emerald-100 text-emerald-700',
}

const LEVEL_DESCRIPTIONS: Record<CompetencyLevel, string> = {
  NOVICE: 'Beginning to develop clinical reasoning skills. Focus on systematic data gathering and building your clinical knowledge base.',
  DEVELOPING: 'Showing growth in clinical thinking. Continue practicing structured approaches to history-taking and differential diagnosis.',
  COMPETENT: 'Demonstrating solid clinical reasoning with appropriate data gathering and diagnostic thinking. Refine your efficiency and pattern recognition.',
  PROFICIENT: 'Excellent clinical reasoning with thorough, efficient data gathering and well-supported diagnostic plans. Ready for increased complexity.',
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface EncounterData {
  id: string
  caseId: string
  phase: EncounterPhase
  transcript: TranscriptMessage[]
  historyDomainsHit: Record<string, boolean> | null
  examManeuversRequested: string[]
  startedAt: string
  problemRepresentation: string | null
  differentialDiagnosis: DifferentialEntry[] | null
  diagnosticPlan: DiagnosticPlanInput | null
  scores: EncounterScores | null
  overallScore: number | null
  overallLevel: CompetencyLevel | null
  cognitiveBiases: CognitiveBias[] | null
  feedbackNarrative: string | null
  clinicalCase: {
    title: string
    chiefComplaint: string
    patientName: string
    patientAge: number
    patientSex: string
    difficulty: string
    scaffoldingLevel: string
  }
}

interface ExtendedScores extends EncounterScores {
  illnessScript?: IllnessScriptData
  nearMisses?: NearMissAnalysis
  keyMoments?: KeyMoment[]
  learningObjectives?: LearningObjectiveAlignment
  questionStrategy?: QuestionStrategyAnalysis
  clinicalReasoning?: ClinicalReasoningProcess
  selfAssessment?: SelfAssessment
  phaseTimestamps?: PhaseTimingData
  communication: DomainScore & { subScores?: CommunicationSubScores }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function EncounterPage() {
  const { encounterId } = useParams<{ encounterId: string }>()
  const router = useRouter()
  const { currentUser } = useAuth()
  const [encounter, setEncounter] = useState<EncounterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scoring, setScoring] = useState(false)
  const [showMobileBanner, setShowMobileBanner] = useState(false)
  const leftPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem('vc-mobile-banner-dismissed')
    if (!dismissed && window.innerWidth < 768) setShowMobileBanner(true)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<EncounterData>(currentUser.email, `/api/virtual-clinic/encounters/${encounterId}`, { signal: controller.signal })
      .then(setEncounter)
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser.email, encounterId])

  const handleAdvancePhase = useCallback(async () => {
    if (!encounter) return
    try {
      const updated = await apiFetch<EncounterData>(currentUser.email, `/api/virtual-clinic/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'advance_phase' }),
      })
      // Re-fetch full encounter with clinicalCase
      const full = await apiFetch<EncounterData>(currentUser.email, `/api/virtual-clinic/encounters/${encounterId}`)
      setEncounter(full)
    } catch (err: unknown) {
      setError((err as Error).message)
    }
  }, [encounter, currentUser.email, encounterId])

  const handleScore = useCallback(async () => {
    setScoring(true)
    try {
      const scored = await apiFetch<EncounterData>(currentUser.email, `/api/virtual-clinic/encounters/${encounterId}/score`, {
        method: 'POST',
      })
      setEncounter(scored)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setScoring(false)
    }
  }, [currentUser.email, encounterId])

  const handleWithdraw = useCallback(async () => {
    try {
      await apiFetch(currentUser.email, `/api/virtual-clinic/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'withdraw' }),
      })
      router.push('/virtual-clinic')
    } catch (err: unknown) {
      setError((err as Error).message)
    }
  }, [currentUser.email, encounterId, router])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>
  if (error && !encounter) return <div className="max-w-4xl mx-auto p-6"><ErrorBanner message={error} /></div>
  if (!encounter) return <div className="max-w-4xl mx-auto p-6"><ErrorBanner message="Encounter not found" /></div>

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {error && <ErrorBanner message={error} retry={() => setError('')} />}

      {showMobileBanner && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <Monitor className="size-4 flex-shrink-0" />
          <span className="flex-1">Virtual Clinic works best on a laptop or desktop.</span>
          <button
            onClick={() => {
              setShowMobileBanner(false)
              localStorage.setItem('vc-mobile-banner-dismissed', '1')
            }}
            className="p-0.5 rounded hover:bg-amber-100 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Top Bar — Phase Indicator */}
      <PhaseBar
        currentPhase={encounter.phase}
        startedAt={encounter.startedAt}
        onAdvance={handleAdvancePhase}
        onScore={handleScore}
        onWithdraw={handleWithdraw}
        hasScores={encounter.overallScore !== null}
        scoring={scoring}
      />

      {/* Split Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Left — Phase Forms (7 cols) */}
        <div ref={leftPanelRef} className="w-7/12 border-r border-gray-200 overflow-y-auto p-5">
          <PhasePanel
            encounter={encounter}
            email={currentUser.email}
            encounterId={encounterId}
            onUpdate={setEncounter}
            scoring={scoring}
            scrollContainerRef={leftPanelRef}
          />
        </div>

        {/* Right — Chat (5 cols) */}
        <div className="w-5/12 flex flex-col min-h-0">
          <ChatPanel
            encounter={encounter}
            email={currentUser.email}
            encounterId={encounterId}
            onNewMessage={(msg) => setEncounter((e) => e ? { ...e, transcript: [...e.transcript, msg] } : e)}
            onRefresh={() => {
              apiFetch<EncounterData>(currentUser.email, `/api/virtual-clinic/encounters/${encounterId}`)
                .then(setEncounter)
                .catch(() => {})
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Phase Bar ──────────────────────────────────────────────────────────────

function PhaseBar({ currentPhase, startedAt, onAdvance, onScore, onWithdraw, hasScores, scoring }: {
  currentPhase: EncounterPhase
  startedAt: string
  onAdvance: () => void
  onScore: () => void
  onWithdraw: () => void
  hasScores: boolean
  scoring: boolean
}) {
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase)
  const canAdvance = currentPhase !== 'COMPLETED' && currentPhase !== 'FEEDBACK' && !scoring
  const canScore = currentPhase === 'DIAGNOSTIC_PLAN' && !hasScores && !scoring
  const canWithdraw = currentPhase !== 'COMPLETED' && currentPhase !== 'FEEDBACK' && !scoring
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)

  useEffect(() => {
    if (!confirmWithdraw) return
    const timeout = setTimeout(() => setConfirmWithdraw(false), 3000)
    return () => clearTimeout(timeout)
  }, [confirmWithdraw])

  return (
    <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
      {canWithdraw && (
        <button
          onClick={() => {
            if (confirmWithdraw) { onWithdraw(); return }
            setConfirmWithdraw(true)
          }}
          title={confirmWithdraw ? 'Tap again to withdraw' : 'Withdraw from encounter'}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            confirmWithdraw
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          }`}
        >
          <LogOut className="size-3.5" />
          {confirmWithdraw ? 'Tap again' : 'Withdraw'}
        </button>
      )}
      <div className="flex items-center gap-1.5 flex-1">
        {PHASES.map((p, i) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <div
              className={`size-3 rounded-full transition-colors ${
                i < currentIdx ? 'bg-emerald-500' :
                i === currentIdx ? 'bg-[#0033A0] ring-2 ring-[#0033A0]/30' :
                'bg-gray-200'
              }`}
              title={p.label}
            />
            {i < PHASES.length - 1 && (
              <div className={`w-4 h-0.5 ${i < currentIdx ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
      <ElapsedTimer startedAt={startedAt} frozen={currentPhase === 'FEEDBACK' || currentPhase === 'COMPLETED' || scoring} />
      <span className="text-sm font-semibold text-gray-700">
        {scoring ? 'Scoring...' : PHASES[currentIdx]?.label ?? currentPhase}
      </span>
      {scoring && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white">
          <Loader2 className="size-3.5 animate-spin" /> Analyzing...
        </span>
      )}
      {canScore && (
        <button onClick={onScore} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
          Score Encounter
        </button>
      )}
      {canAdvance && (
        <button
          onClick={onAdvance}
          title={getAdvanceTooltip(currentPhase)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] transition-colors"
        >
          Advance Phase <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Elapsed Timer ─────────────────────────────────────────────────────────

function ElapsedTimer({ startedAt, frozen }: { startedAt: string; frozen: boolean }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    if (frozen) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, frozen])

  const hrs = Math.floor(elapsed / 3600)
  const mins = Math.floor((elapsed % 3600) / 60)
  const secs = elapsed % 60
  const display = hrs > 0
    ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 tabular-nums" title="Elapsed time">
      <Timer className="size-3.5" />
      {display}
    </div>
  )
}

// ─── Phase Panel (Left Side) ────────────────────────────────────────────────

function PhasePanel({ encounter, email, encounterId, onUpdate, scoring, scrollContainerRef }: {
  encounter: EncounterData
  email: string
  encounterId: string
  onUpdate: (e: EncounterData) => void
  scoring: boolean
  scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
  const phase = encounter.phase

  if (scoring) {
    return <ScoringOverlay />
  }

  if (phase === 'PROBLEM_REPRESENTATION') {
    return <ProblemRepForm encounter={encounter} email={email} encounterId={encounterId} onUpdate={onUpdate} />
  }
  if (phase === 'DIFFERENTIAL_DIAGNOSIS') {
    return <DifferentialForm encounter={encounter} email={email} encounterId={encounterId} onUpdate={onUpdate} />
  }
  if (phase === 'DIAGNOSTIC_PLAN') {
    return <DiagnosticPlanForm encounter={encounter} email={email} encounterId={encounterId} onUpdate={onUpdate} />
  }
  if (phase === 'FEEDBACK' || phase === 'COMPLETED') {
    return <FeedbackView encounter={encounter} email={email} encounterId={encounterId} onUpdate={onUpdate} scrollContainerRef={scrollContainerRef} />
  }

  // Default — InstructionCard for OPENING, HISTORY_TAKING, PHYSICAL_EXAM
  return (
    <InstructionCard
      phase={phase}
      caseTitle={encounter.clinicalCase.title}
      patientName={encounter.clinicalCase.patientName}
      patientAge={encounter.clinicalCase.patientAge}
      patientSex={encounter.clinicalCase.patientSex}
      difficulty={encounter.clinicalCase.difficulty}
      transcript={encounter.transcript}
      historyDomainsHit={(encounter.historyDomainsHit ?? {}) as Record<string, boolean>}
      examManeuversRequested={encounter.examManeuversRequested}
    />
  )
}

// ─── Scoring Overlay ──────────────────────────────────────────────────────

const SCORING_STEPS = [
  { label: 'Analyzing history taking...', delay: 0 },
  { label: 'Evaluating physical exam...', delay: 2000 },
  { label: 'Reviewing differential diagnosis...', delay: 4000 },
  { label: 'Assessing diagnostic plan...', delay: 6000 },
  { label: 'Scoring communication skills...', delay: 8000 },
  { label: 'Detecting cognitive biases...', delay: 10000 },
  { label: 'Comparing illness scripts...', delay: 12000 },
  { label: 'Mapping clinical reasoning...', delay: 14000 },
  { label: 'Extracting key moments...', delay: 16000 },
  { label: 'Analyzing question strategy...', delay: 18000 },
  { label: 'Evaluating learning objectives...', delay: 20000 },
  { label: 'Generating feedback narrative...', delay: 22000 },
]

function ScoringOverlay() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timers = SCORING_STEPS.slice(1).map((step, i) =>
      setTimeout(() => setActiveStep(i + 1), step.delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="relative mx-auto mb-6 size-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#0033A0] animate-spin" />
          <Sparkles className="absolute inset-0 m-auto size-6 text-[#0033A0]" />
        </div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-2">Scoring Your Encounter</h2>
        <p className="text-sm text-gray-500 mb-6">12 AI analyses running in parallel — this takes 15–25 seconds.</p>
        <div className="space-y-1.5 text-left">
          {SCORING_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg transition-all duration-300 ${
                i < activeStep ? 'text-emerald-600 bg-emerald-50' :
                i === activeStep ? 'text-[#0033A0] bg-blue-50 font-semibold' :
                'text-gray-300'
              }`}
            >
              {i < activeStep ? (
                <CheckCircle2 className="size-3.5 flex-shrink-0" />
              ) : i === activeStep ? (
                <Loader2 className="size-3.5 flex-shrink-0 animate-spin" />
              ) : (
                <Clock className="size-3.5 flex-shrink-0" />
              )}
              {step.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Problem Representation Form ────────────────────────────────────────────

function ProblemRepForm({ encounter, email, encounterId, onUpdate }: {
  encounter: EncounterData; email: string; encounterId: string; onUpdate: (e: EncounterData) => void
}) {
  const [text, setText] = useState(encounter.problemRepresentation ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch(email, `/api/virtual-clinic/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'save_artifact', artifactType: 'problem_representation', artifactData: text }),
      })
      const full = await apiFetch<EncounterData>(email, `/api/virtual-clinic/encounters/${encounterId}`)
      onUpdate(full)
    } catch { /* error handled by parent */ }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="size-5 text-[#0033A0]" />
        <h2 className="text-lg font-extrabold text-gray-900">Problem Representation</h2>
      </div>
      <p className="text-sm text-gray-600">
        Summarize the key clinical features into a concise problem representation statement.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-none"
        placeholder="e.g. A 55-year-old male with a history of hypertension presenting with acute onset substernal chest pain radiating to the left arm..."
      />
      <button
        onClick={handleSave}
        disabled={saving || !text.trim()}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] transition-colors disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save Problem Representation'}
      </button>
    </div>
  )
}

// ─── Differential Diagnosis Form ────────────────────────────────────────────

function DifferentialForm({ encounter, email, encounterId, onUpdate }: {
  encounter: EncounterData; email: string; encounterId: string; onUpdate: (e: EncounterData) => void
}) {
  const [entries, setEntries] = useState<DifferentialEntry[]>(
    encounter.differentialDiagnosis ?? [{ rank: 1, diagnosis: '', supportingFindings: [], opposingFindings: [] }],
  )
  const [saving, setSaving] = useState(false)

  const addEntry = () => {
    setEntries((prev) => [...prev, { rank: prev.length + 1, diagnosis: '', supportingFindings: [], opposingFindings: [] }])
  }

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, rank: i + 1 })))
  }

  const moveEntry = (idx: number, dir: -1 | 1) => {
    setEntries((prev) => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr.map((e, i) => ({ ...e, rank: i + 1 }))
    })
  }

  const updateEntry = (idx: number, field: keyof DifferentialEntry, value: unknown) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch(email, `/api/virtual-clinic/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'save_artifact', artifactType: 'differential_list', artifactData: entries }),
      })
      const full = await apiFetch<EncounterData>(email, `/api/virtual-clinic/encounters/${encounterId}`)
      onUpdate(full)
    } catch { /* error handled by parent */ }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-5 text-[#0033A0]" />
        <h2 className="text-lg font-extrabold text-gray-900">Differential Diagnosis</h2>
      </div>
      <p className="text-sm text-gray-600">Rank your differential diagnoses from most to least likely.</p>

      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 text-gray-300" />
              <span className="text-xs font-semibold text-gray-400 w-5">#{entry.rank}</span>
              <input
                type="text"
                value={entry.diagnosis}
                onChange={(e) => updateEntry(idx, 'diagnosis', e.target.value)}
                placeholder="Diagnosis name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
              />
              <button onClick={() => moveEntry(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                <ArrowUp className="size-3.5" />
              </button>
              <button onClick={() => moveEntry(idx, 1)} disabled={idx === entries.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                <ArrowDown className="size-3.5" />
              </button>
              <button onClick={() => removeEntry(idx)} disabled={entries.length <= 1} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30">
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <TagInput label="Supporting findings" value={entry.supportingFindings} onChange={(v) => updateEntry(idx, 'supportingFindings', v)} />
            <TagInput label="Opposing findings" value={entry.opposingFindings} onChange={(v) => updateEntry(idx, 'opposingFindings', v)} />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={addEntry} className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#0033A0] border border-[#0033A0] rounded-lg hover:bg-blue-50 transition-colors">
          <Plus className="size-3.5" /> Add Diagnosis
        </button>
        <button
          onClick={handleSave}
          disabled={saving || entries.every((e) => !e.diagnosis.trim())}
          className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save Differential'}
        </button>
      </div>
    </div>
  )
}

// ─── Diagnostic Plan Form ───────────────────────────────────────────────────

function DiagnosticPlanForm({ encounter, email, encounterId, onUpdate }: {
  encounter: EncounterData; email: string; encounterId: string; onUpdate: (e: EncounterData) => void
}) {
  const [plan, setPlan] = useState<DiagnosticPlanInput>(
    encounter.diagnosticPlan ?? { labs: [], imaging: [], referrals: [], followUp: '' },
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch(email, `/api/virtual-clinic/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'save_artifact', artifactType: 'diagnostic_plan', artifactData: plan }),
      })
      const full = await apiFetch<EncounterData>(email, `/api/virtual-clinic/encounters/${encounterId}`)
      onUpdate(full)
    } catch { /* error handled by parent */ }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-[#0033A0]" />
        <h2 className="text-lg font-extrabold text-gray-900">Diagnostic Plan</h2>
      </div>
      <p className="text-sm text-gray-600">Order labs, imaging, and referrals for this patient.</p>

      <TagInput label="Labs" value={plan.labs} onChange={(v) => setPlan((p) => ({ ...p, labs: v }))} />
      <TagInput label="Imaging" value={plan.imaging} onChange={(v) => setPlan((p) => ({ ...p, imaging: v }))} />
      <TagInput label="Referrals" value={plan.referrals} onChange={(v) => setPlan((p) => ({ ...p, referrals: v }))} />

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Follow-up Plan</label>
        <textarea
          value={plan.followUp}
          onChange={(e) => setPlan((p) => ({ ...p, followUp: e.target.value }))}
          rows={3}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-none"
          placeholder="Follow-up instructions..."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] transition-colors disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save Plan'}
      </button>
    </div>
  )
}

// ─── Feedback View ──────────────────────────────────────────────────────────

// ─── Encounter Summary Export ──────────────────────────────────────────────

function buildSummaryHTML(encounter: EncounterData): string {
  const scores = encounter.scores as ExtendedScores
  const biases = encounter.cognitiveBiases ?? []
  const domainKeys: (keyof EncounterScores)[] = ['history', 'exam', 'differential', 'plan', 'communication']
  const domainLabels: Record<string, string> = {
    history: 'History Taking', exam: 'Physical Exam', differential: 'Differential Diagnosis',
    plan: 'Diagnostic Plan', communication: 'Communication',
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const stripMarkers = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '').trim()

  const domainRows = domainKeys.map((k) => {
    const d = scores[k]
    const tps = d.teachingPoints?.map((tp) => `<li><strong>${esc(tp.missed)}</strong>: ${esc(tp.reason)}</li>`).join('') ?? ''
    return `
      <div class="domain">
        <div class="domain-header">
          <span class="domain-name">${domainLabels[k]}</span>
          <span class="domain-score">${d.score}/100 &mdash; ${d.level}</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${d.score}%"></div></div>
        <p class="feedback">${esc(d.feedback)}</p>
        ${d.keyFindings.length > 0 ? `<ul class="findings">${d.keyFindings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        ${tps ? `<div class="teaching-points"><strong>Teaching Points:</strong><ul>${tps}</ul></div>` : ''}
      </div>`
  }).join('')

  const biasSection = biases.length > 0
    ? `<h2>Cognitive Biases</h2>${biases.map((b) => `<div class="bias"><strong>${b.type.replace('_', ' ')}</strong><p>${esc(b.evidence)}</p><p class="suggestion">${esc(b.suggestion)}</p></div>`).join('')}`
    : ''

  const keyMoments = scores.keyMoments ?? []
  const momentLabels: Record<string, string> = {
    breakthrough_question: 'Breakthrough', missed_red_flag: 'Missed Red Flag',
    rapport_building: 'Rapport', premature_closure: 'Premature Closure',
    systematic_approach: 'Systematic', critical_finding: 'Critical Finding',
  }
  const momentsSection = keyMoments.length > 0
    ? `<h2>Key Moments</h2>${keyMoments.map((m) => `<div class="moment ${m.impact}"><span class="moment-type">${momentLabels[m.type] ?? m.type}</span><blockquote>&ldquo;${esc(m.quote)}&rdquo;</blockquote><p>${esc(m.explanation)}</p></div>`).join('')}`
    : ''

  const calibration = scores.selfAssessment
    ? `<h2>Self-Assessment Calibration</h2><table class="cal-table"><tr><th>Domain</th><th>Estimated</th><th>Actual</th><th>Deviation</th></tr>${
        domainKeys.map((k) => {
          const est = scores.selfAssessment![k as keyof typeof scores.selfAssessment] as number
          const act = scores[k].score
          const diff = est - act
          return `<tr><td>${domainLabels[k]}</td><td>${est}</td><td>${act}</td><td class="${Math.abs(diff) <= 10 ? 'good' : Math.abs(diff) <= 20 ? 'ok' : 'bad'}">${diff > 0 ? '+' : ''}${diff}</td></tr>`
        }).join('')
      }</table>`
    : ''

  // Communication sub-scores
  const commSubScores = (scores as ExtendedScores).communication.subScores
  const commSubSection = commSubScores
    ? `<h2>Communication Sub-Scores</h2><table class="cal-table"><tr><th>Dimension</th><th>Score</th></tr><tr><td>Empathy</td><td>${commSubScores.empathy}/100</td></tr><tr><td>Question Quality</td><td>${commSubScores.questionQuality}/100</td></tr><tr><td>Active Listening</td><td>${commSubScores.activeListening}/100</td></tr><tr><td>Patient Education</td><td>${commSubScores.patientEducation}/100</td></tr></table>`
    : ''

  // Phase timing
  const phaseTimestamps = scores.phaseTimestamps?.phaseEnteredAt
  const phaseTimingSection = phaseTimestamps && Object.keys(phaseTimestamps).length > 1
    ? (() => {
        const phaseOrder: EncounterPhase[] = ['OPENING', 'HISTORY_TAKING', 'PROBLEM_REPRESENTATION', 'DIFFERENTIAL_DIAGNOSIS', 'PHYSICAL_EXAM', 'DIAGNOSTIC_PLAN', 'FEEDBACK']
        const phaseLabelsHtml: Record<string, string> = { OPENING: 'Opening', HISTORY_TAKING: 'History Taking', PROBLEM_REPRESENTATION: 'Problem Rep', DIFFERENTIAL_DIAGNOSIS: 'Differential', PHYSICAL_EXAM: 'Physical Exam', DIAGNOSTIC_PLAN: 'Diagnostic Plan', FEEDBACK: 'Feedback' }
        const entries = phaseOrder.filter((p) => phaseTimestamps[p])
        const rows = entries.map((p, i) => {
          const start = new Date(phaseTimestamps[p]!).getTime()
          const next = i < entries.length - 1 ? new Date(phaseTimestamps[entries[i + 1]]!).getTime() : null
          const duration = next ? Math.round((next - start) / 1000) : null
          const mins = duration !== null ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : '—'
          return `<tr><td>${phaseLabelsHtml[p] ?? p}</td><td>${mins}</td></tr>`
        }).join('')
        return `<h2>Phase Timing</h2><table class="cal-table"><tr><th>Phase</th><th>Duration</th></tr>${rows}</table>`
      })()
    : ''

  // Illness script comparison
  const illnessScriptSection = scores.illnessScript
    ? `<h2>Illness Script Comparison (${scores.illnessScript.overallAlignment}% aligned)</h2><table class="cal-table"><tr><th>Element</th><th>Student</th><th>Expert</th><th>Alignment</th></tr>${
        scores.illnessScript.rows.map((r) => {
          const color = r.alignment === 'match' ? '#059669' : r.alignment === 'partial' ? '#d97706' : '#dc2626'
          return `<tr><td><strong>${esc(r.element)}</strong></td><td>${esc(r.studentModel)}</td><td>${esc(r.expertModel)}</td><td style="color:${color};font-weight:600">${r.alignment}</td></tr>`
        }).join('')
      }</table>`
    : ''

  // Near-miss differential
  const nearMissSection = scores.nearMisses && scores.nearMisses.entries.length > 0
    ? `<h2>Differential Diagnosis Analysis</h2>${
        scores.nearMisses.entries.map((e) => {
          const statusColors: Record<string, string> = { correct: '#10b981', 'present-but-misranked': '#f59e0b', missing: '#ef4444', extraneous: '#3b82f6' }
          const borderColor = statusColors[e.status] ?? '#e5e7eb'
          return `<div class="domain" style="border-left:3px solid ${borderColor}"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><strong>${esc(e.diagnosis)}</strong><span style="font-size:11px;font-weight:600;color:${borderColor}">${e.status.replace(/-/g, ' ')}</span></div><p class="feedback">${esc(e.explanation)}</p><p style="font-size:12px;color:#0033A0;margin-top:4px"><strong>Teaching point:</strong> ${esc(e.teachingPoint)}</p></div>`
        }).join('')
      }`
    : ''

  // Question strategy examples
  const questionExamplesSection = scores.questionStrategy?.exampleQuestions && scores.questionStrategy.exampleQuestions.length > 0
    ? `<div style="margin-top:12px"><strong style="font-size:12px">Example Questions:</strong>${
        scores.questionStrategy.exampleQuestions.map((eq) => {
          const typeColors: Record<string, string> = { 'open-ended': '#059669', 'follow-up': '#3b82f6', closed: '#d97706', leading: '#dc2626' }
          return `<div style="padding:8px;margin:6px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:12px"><span style="color:${typeColors[eq.type] ?? '#666'};font-weight:600;font-size:11px;text-transform:uppercase">${eq.type}</span><p style="margin:4px 0;font-style:italic;color:#333">&ldquo;${esc(eq.question)}&rdquo;</p>${eq.suggestion ? `<p style="color:#0033A0;font-size:11px">&rarr; ${esc(eq.suggestion)}</p>` : ''}</div>`
        }).join('')
      }</div>`
    : ''

  // Clinical reasoning process
  const reasoningSection = scores.clinicalReasoning && scores.clinicalReasoning.hypothesisEvolution.length > 0
    ? (() => {
        const cr = scores.clinicalReasoning!
        const trajColors: Record<string, string> = { convergent: '#059669', divergent: '#3b82f6', scattered: '#dc2626', linear: '#d97706' }
        const pivotRows = cr.pivots.map((p) => {
          const outcomeColors: Record<string, string> = { refined: '#3b82f6', confirmed: '#059669', abandoned: '#d97706' }
          return `<div style="padding:8px;margin:6px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:12px"><span style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase">${p.phase.replace(/_/g, ' ')}</span> <span style="font-size:11px;font-weight:600;color:${outcomeColors[p.outcome] ?? '#666'}">${p.outcome}</span><p style="margin:4px 0;font-weight:600">${esc(p.hypothesis)}</p><p style="color:#666">&rarr; ${esc(p.trigger)}</p></div>`
        }).join('')
        return `<h2>Clinical Reasoning Process (Efficiency: ${cr.efficiencyScore}/100)</h2><div class="domain" style="border-left:3px solid ${trajColors[cr.trajectory] ?? '#666'}"><strong style="text-transform:capitalize">${cr.trajectory} Reasoning</strong><p class="feedback">${esc(cr.trajectoryDescription)}</p></div><div style="margin:12px 0"><strong style="font-size:12px">Reasoning Arc:</strong><ol style="margin:8px 0 0 16px;font-size:12px;color:#333">${cr.hypothesisEvolution.map((s) => `<li style="margin:4px 0">${esc(s)}</li>`).join('')}</ol></div><p style="font-size:12px;background:#f8fafc;padding:10px;border-radius:8px;margin:8px 0">${esc(cr.efficiencyExplanation)}</p>${pivotRows ? `<div style="margin-top:8px"><strong style="font-size:12px">Diagnostic Pivots:</strong>${pivotRows}</div>` : ''}`
      })()
    : ''

  const transcript = encounter.transcript
    .map((m) => `<div class="msg ${m.role}"><span class="role">${m.role === 'user' ? 'Student' : 'Patient'}</span><span class="phase">${m.phase}</span><p>${esc(stripMarkers(m.content))}</p></div>`)
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Encounter Summary — ${esc(encounter.clinicalCase.title)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;color:#111;max-width:800px;margin:0 auto;padding:40px 24px;font-size:13px;line-height:1.5}
  h1{font-size:20px;color:#0033A0;margin-bottom:4px}h2{font-size:15px;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #0033A0;color:#0033A0}
  .meta{color:#666;font-size:12px;margin-bottom:24px}.overall{text-align:center;padding:20px;background:#f8fafc;border-radius:12px;margin:16px 0}
  .overall .score{font-size:40px;font-weight:800;color:#0033A0}.overall .level{display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;margin-top:6px}
  .domain{margin:12px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px}.domain-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .domain-name{font-weight:700}.domain-score{font-size:12px;font-weight:600;color:#0033A0}
  .bar{height:6px;background:#f1f5f9;border-radius:3px;margin-bottom:6px}.bar-fill{height:100%;background:#0033A0;border-radius:3px}
  .feedback{color:#555;font-size:12px}.findings{font-size:12px;color:#666;margin:4px 0 0 16px}.teaching-points{margin-top:8px;font-size:12px;background:#eff6ff;padding:8px 12px;border-radius:8px}
  .teaching-points ul{margin:4px 0 0 16px}
  .bias{padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin:8px 0}.bias strong{color:#92400e;font-size:12px;text-transform:uppercase}.suggestion{font-style:italic;color:#92400e;font-size:12px}
  .moment{padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin:8px 0}.moment.positive{border-color:#bbf7d0;background:#f0fdf4}.moment.negative{border-color:#fecaca;background:#fef2f2}
  .moment-type{font-size:11px;font-weight:600;text-transform:uppercase;color:#555}blockquote{font-style:italic;color:#444;margin:4px 0}
  .cal-table{width:100%;border-collapse:collapse;font-size:12px}.cal-table th,.cal-table td{padding:6px 10px;border:1px solid #e5e7eb;text-align:left}.cal-table th{background:#f8fafc;font-weight:600}
  .good{color:#059669}.ok{color:#d97706}.bad{color:#dc2626}
  .transcript{margin-top:12px}.msg{padding:8px 12px;margin:4px 0;border-radius:8px;font-size:12px}.msg.user{background:#0033A0;color:#fff;margin-left:20%}.msg.assistant{background:#f1f5f9;margin-right:20%}
  .role{font-weight:600;font-size:11px;text-transform:uppercase}.phase{font-size:10px;opacity:.6;margin-left:8px}
  .narrative{background:#f8fafc;padding:16px;border-radius:10px;white-space:pre-line;font-size:13px}
  @media print{body{padding:20px 16px}h2{break-after:avoid}.domain,.msg{break-inside:avoid}}
</style></head><body>
<h1>${esc(encounter.clinicalCase.title)}</h1>
<div class="meta">Patient: ${esc(encounter.clinicalCase.patientName)}, ${encounter.clinicalCase.patientAge}${encounter.clinicalCase.patientSex === 'Male' ? 'M' : encounter.clinicalCase.patientSex === 'Female' ? 'F' : ''} &bull; Difficulty: ${encounter.clinicalCase.difficulty} &bull; ${new Date(encounter.startedAt).toLocaleDateString()}</div>

<div class="overall">
  <div class="score">${encounter.overallScore}/100</div>
  <div class="level">${encounter.overallLevel}</div>
</div>

<h2>Domain Scores</h2>
${domainRows}

${commSubSection}
${phaseTimingSection}
${calibration}
${momentsSection}
${biasSection}

${illnessScriptSection}
${nearMissSection}

${scores.learningObjectives && scores.learningObjectives.results.length > 0
    ? `<h2>Learning Objectives (${scores.learningObjectives.metCount}/${scores.learningObjectives.totalCount} met)</h2>${
        scores.learningObjectives.results.map((r) => `<div class="domain" style="border-left:3px solid ${r.status === 'met' ? '#10b981' : r.status === 'partially_met' ? '#f59e0b' : '#ef4444'}"><strong>${esc(r.objective)}</strong> &mdash; <em>${r.status.replace('_', ' ')}</em><p class="feedback">${esc(r.evidence)}</p></div>`).join('')
      }`
    : ''}

${scores.questionStrategy && scores.questionStrategy.totalQuestions > 0
    ? `<h2>Question Strategy (${scores.questionStrategy.totalQuestions} questions, ${Math.round(scores.questionStrategy.openEndedRatio * 100)}% open)</h2><table class="cal-table"><tr><th>Type</th><th>Count</th></tr><tr><td>Open-ended</td><td>${scores.questionStrategy.openEndedCount}</td></tr><tr><td>Follow-up</td><td>${scores.questionStrategy.followUpCount}</td></tr><tr><td>Closed</td><td>${scores.questionStrategy.closedCount}</td></tr><tr><td>Leading</td><td>${scores.questionStrategy.leadingCount}</td></tr></table>${
        scores.questionStrategy.strengths.length > 0 ? `<p style="margin-top:8px"><strong>Strengths:</strong> ${scores.questionStrategy.strengths.map(esc).join('; ')}</p>` : ''
      }${scores.questionStrategy.improvements.length > 0 ? `<p><strong>Try next time:</strong> ${scores.questionStrategy.improvements.map(esc).join('; ')}</p>` : ''}${questionExamplesSection}`
    : ''}

${reasoningSection}

${encounter.feedbackNarrative ? `<h2>Performance Summary</h2><div class="narrative">${esc(encounter.feedbackNarrative)}</div>` : ''}

${(() => {
    const notesData = (encounter.historyDomainsHit as Record<string, unknown> | null)
    const notesText = typeof notesData?.__notes === 'string' ? notesData.__notes : ''
    return notesText ? `<h2>Student Notes</h2><div class="narrative" style="background:#fffbeb;border:1px solid #fde68a">${esc(notesText)}</div>` : ''
  })()}

<h2>Full Transcript</h2>
<div class="transcript">${transcript}</div>

<div style="text-align:center;margin-top:32px;color:#999;font-size:11px">Generated by University of Kentucky Virtual Clinic &bull; ${new Date().toLocaleDateString()}</div>
</body></html>`
}

// ─── Feedback Section Navigation ──────────────────────────────────────────

interface FeedbackSection {
  id: string
  label: string
  visible: boolean
}

function useActiveSection(sectionIds: string[], scrollContainerRef: RefObject<HTMLElement | null>): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || sectionIds.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { root: container, rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    )

    for (const id of sectionIds) {
      const el = container.querySelector(`#${id}`)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [sectionIds, scrollContainerRef])

  return activeId
}

function FeedbackNav({ sections, activeId, scrollContainerRef }: {
  sections: FeedbackSection[]
  activeId: string | null
  scrollContainerRef: RefObject<HTMLElement | null>
}) {
  const visibleSections = sections.filter((s) => s.visible)
  if (visibleSections.length <= 1) return null

  const handleClick = (id: string) => {
    const container = scrollContainerRef.current
    const el = container?.querySelector(`#${id}`)
    if (el && container) {
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 48
      container.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 -mx-5 px-5 py-2 mb-4">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            onClick={() => handleClick(s.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeId === s.id
                ? 'bg-[#0033A0] text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FeedbackView({ encounter, email, encounterId, onUpdate, scrollContainerRef }: {
  encounter: EncounterData; email: string; encounterId: string; onUpdate: (e: EncounterData) => void; scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [attemptHistory, setAttemptHistory] = useState<{ attempt: number; overallScore: number; scores: EncounterScores | null; completedAt: string }[] | null>(null)
  const [retrying, setRetrying] = useState(false)
  // Hook must be called unconditionally — pass empty array when no scores
  const [feedbackSectionIds, setFeedbackSectionIds] = useState<string[]>([])
  const activeId = useActiveSection(feedbackSectionIds, scrollContainerRef)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<{ id: string; overallScore: number | null; scores: unknown; completedAt: string | null }[]>(
      currentUser.email,
      '/api/virtual-clinic/encounters?status=completed',
      { signal: controller.signal },
    )
      .then((allCompleted) => {
        const sameCaseEncounters = allCompleted
          .filter((e) => (e as unknown as { caseId: string }).caseId === encounter.caseId && e.overallScore !== null)
          .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
          .map((e, i) => ({
            attempt: i + 1,
            overallScore: e.overallScore!,
            scores: e.scores as EncounterScores | null,
            completedAt: e.completedAt!,
          }))
        if (sameCaseEncounters.length >= 2) setAttemptHistory(sameCaseEncounters)
      })
      .catch(() => { /* non-fatal */ })
    return () => controller.abort()
  }, [currentUser.email, encounter.caseId])

  if (!encounter.scores || encounter.overallScore === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md">
          <CheckCircle2 className="size-10 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-extrabold text-gray-900 mb-2">Awaiting Scores</h2>
          <p className="text-sm text-gray-500">Scoring has not been completed yet. Use the "Score Encounter" button above.</p>
        </div>
      </div>
    )
  }

  const scores = encounter.scores
  const biases = encounter.cognitiveBiases ?? []
  const extendedScores = scores as ExtendedScores
  const hasSelfAssessment = !!extendedScores.selfAssessment

  const domains: { key: keyof EncounterScores; label: string; icon: React.ReactNode }[] = [
    { key: 'history', label: 'History Taking', icon: <MessageSquare className="size-4" /> },
    { key: 'exam', label: 'Physical Exam', icon: <Stethoscope className="size-4" /> },
    { key: 'differential', label: 'Differential Diagnosis', icon: <ClipboardList className="size-4" /> },
    { key: 'plan', label: 'Diagnostic Plan', icon: <FileText className="size-4" /> },
    { key: 'communication', label: 'Communication', icon: <MessageSquare className="size-4" /> },
  ]

  // Find current attempt number in history
  const currentAttemptNum = attemptHistory
    ? attemptHistory.findIndex((a) => a.completedAt === (encounter as unknown as { completedAt: string }).completedAt) + 1 || attemptHistory.length
    : null

  // Gate: show self-assessment form before revealing scores
  if (!hasSelfAssessment) {
    return (
      <div className="space-y-6">
        <SelfAssessmentSection
          encounter={encounter}
          email={email}
          encounterId={encounterId}
          onUpdate={onUpdate}
        />
      </div>
    )
  }

  const extScores = scores as ExtendedScores
  const hasCalibration = hasSelfAssessment
  const hasTiming = !!(extScores.phaseTimestamps?.phaseEnteredAt && Object.keys(extScores.phaseTimestamps.phaseEnteredAt).length > 1)
  const hasKeyMoments = !!(extScores.keyMoments && extScores.keyMoments.length > 0)
  const hasAttempts = !!(attemptHistory && attemptHistory.length >= 2)
  const hasCommSub = !!(extScores.communication.subScores)
  const hasBiases = biases.length > 0
  const hasIllnessScript = !!extScores.illnessScript
  const hasNearMisses = !!(extScores.nearMisses && extScores.nearMisses.entries.length > 0)
  const hasLearningObj = !!(extScores.learningObjectives && extScores.learningObjectives.results.length > 0)
  const hasQuestionStrategy = !!(extScores.questionStrategy && extScores.questionStrategy.totalQuestions > 0)
  const hasClinicalReasoning = !!(extScores.clinicalReasoning && extScores.clinicalReasoning.hypothesisEvolution.length > 0)
  const hasNarrative = !!encounter.feedbackNarrative
  const encounterNotes = (() => {
    const data = encounter.historyDomainsHit as Record<string, unknown> | null
    return typeof data?.__notes === 'string' ? data.__notes : ''
  })()
  const hasNotes = encounterNotes.length > 0

  const feedbackSections: FeedbackSection[] = [
    { id: 'fb-overall', label: 'Overall', visible: true },
    { id: 'fb-calibration', label: 'Calibration', visible: hasCalibration },
    { id: 'fb-timing', label: 'Timing', visible: hasTiming },
    { id: 'fb-moments', label: 'Key Moments', visible: hasKeyMoments },
    { id: 'fb-attempts', label: 'Attempts', visible: hasAttempts },
    { id: 'fb-domains', label: 'Domains', visible: true },
    { id: 'fb-communication', label: 'Communication', visible: hasCommSub },
    { id: 'fb-biases', label: 'Biases', visible: hasBiases },
    { id: 'fb-illness', label: 'Illness Scripts', visible: hasIllnessScript },
    { id: 'fb-nearmiss', label: 'Near-Misses', visible: hasNearMisses },
    { id: 'fb-objectives', label: 'Objectives', visible: hasLearningObj },
    { id: 'fb-questions', label: 'Questions', visible: hasQuestionStrategy },
    { id: 'fb-reasoning', label: 'Reasoning', visible: hasClinicalReasoning },
    { id: 'fb-narrative', label: 'Summary', visible: hasNarrative },
    { id: 'fb-notes', label: 'Notes', visible: hasNotes },
  ]

  const visibleSectionIds = feedbackSections.filter((s) => s.visible).map((s) => s.id)

  // Update section IDs for the scroll-tracking hook
  useEffect(() => {
    setFeedbackSectionIds(visibleSectionIds)
  }, [visibleSectionIds.join(',')])

  return (
    <div className="space-y-6">
      <FeedbackNav sections={feedbackSections} activeId={activeId} scrollContainerRef={scrollContainerRef} />

      {/* Overall Score */}
      <div id="fb-overall" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
        <h2 className="text-lg font-extrabold text-gray-900 mb-3">Overall Performance</h2>
        {currentAttemptNum !== null && (
          <p className="text-xs text-gray-500 mb-2">Attempt {currentAttemptNum} of {attemptHistory!.length}</p>
        )}
        <div className="text-4xl font-extrabold text-[#0033A0] mb-2">{encounter.overallScore}<span className="text-lg text-gray-400">/100</span></div>
        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${LEVEL_COLORS[encounter.overallLevel!]}`}>
          {encounter.overallLevel}
        </span>
        <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto">{LEVEL_DESCRIPTIONS[encounter.overallLevel!]}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              const html = buildSummaryHTML(encounter)
              const win = window.open('', '_blank')
              if (win) { win.document.write(html); win.document.close() }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="size-3.5" /> Download Summary
          </button>
          <button
            onClick={async () => {
              setRetrying(true)
              try {
                const newEncounter = await apiFetch<{ id: string }>(currentUser.email, '/api/virtual-clinic/encounters', {
                  method: 'POST',
                  body: JSON.stringify({ caseId: encounter.caseId, isPracticeRetry: true }),
                })
                router.push(`/virtual-clinic/encounter/${newEncounter.id}`)
              } catch {
                setRetrying(false)
              }
            }}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] transition-colors disabled:opacity-40"
          >
            <RotateCcw className={`size-3.5 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Starting...' : 'Try Again'}
          </button>
        </div>
      </div>

      {/* Self-Assessment Calibration */}
      <div id="fb-calibration">
        <CalibrationDisplay assessment={extendedScores.selfAssessment!} scores={scores} />
      </div>

      {/* Phase Timing Breakdown */}
      <div id="fb-timing">
        <PhaseTimingBreakdown encounter={encounter} />
      </div>

      {/* Key Moments Timeline */}
      {extendedScores.keyMoments && extendedScores.keyMoments.length > 0 && (
        <div id="fb-moments">
          <KeyMomentsTimeline moments={extendedScores.keyMoments} transcript={encounter.transcript} />
        </div>
      )}

      {/* Attempt History */}
      {attemptHistory && attemptHistory.length >= 2 && (
        <div id="fb-attempts" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-extrabold text-gray-900 mb-3">Progress Across Attempts</h3>
          <div className="space-y-2">
            {attemptHistory.map((attempt, i) => {
              const prev = i > 0 ? attemptHistory[i - 1] : null
              const overallDelta = prev ? attempt.overallScore - prev.overallScore : null
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-xs font-medium text-gray-500 w-20 shrink-0">Attempt {attempt.attempt}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-[#0033A0] rounded-full transition-all" style={{ width: `${attempt.overallScore}%` }} />
                  </div>
                  <span className="font-semibold text-gray-700 w-12 text-right">{Math.round(attempt.overallScore)}</span>
                  {overallDelta !== null && (
                    <span className={`text-xs font-medium w-12 text-right flex items-center justify-end gap-0.5 ${overallDelta > 0 ? 'text-green-600' : overallDelta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {overallDelta > 0 ? <ArrowUp className="size-3" /> : overallDelta < 0 ? <ArrowDown className="size-3" /> : null}
                      {overallDelta > 0 ? '+' : ''}{Math.round(overallDelta)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {/* Per-domain deltas between last two attempts */}
          {attemptHistory.length >= 2 && (() => {
            const prev = attemptHistory[attemptHistory.length - 2]
            const curr = attemptHistory[attemptHistory.length - 1]
            if (!prev.scores || !curr.scores) return null
            const domainKeys: (keyof EncounterScores)[] = ['history', 'exam', 'differential', 'plan', 'communication']
            const domainLabels: Record<string, string> = { history: 'History', exam: 'Exam', differential: 'Differential', plan: 'Plan', communication: 'Communication' }
            return (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Domain changes (latest vs previous)</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {domainKeys.map((dk) => {
                    const delta = curr.scores![dk].score - prev.scores![dk].score
                    return (
                      <div key={dk} className="text-center">
                        <div className="text-xs text-gray-500">{domainLabels[dk]}</div>
                        <div className={`text-sm font-semibold flex items-center justify-center gap-0.5 ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {delta > 0 ? <ArrowUp className="size-3" /> : delta < 0 ? <ArrowDown className="size-3" /> : null}
                          {delta > 0 ? '+' : ''}{Math.round(delta)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Domain Radar Chart */}
      <div id="fb-domains" className="space-y-3">
      <DomainRadarChart
        scores={{
          history: scores.history.score,
          exam: scores.exam.score,
          differential: scores.differential.score,
          plan: scores.plan.score,
          communication: scores.communication.score,
        }}
        previousScores={(() => {
          if (!attemptHistory || attemptHistory.length < 2) return undefined
          const prevAttempt = attemptHistory[attemptHistory.length - 2]
          if (!prevAttempt.scores) return undefined
          return {
            history: prevAttempt.scores.history.score,
            exam: prevAttempt.scores.exam.score,
            differential: prevAttempt.scores.differential.score,
            plan: prevAttempt.scores.plan.score,
            communication: prevAttempt.scores.communication.score,
          }
        })()}
        label="Domain Performance Overview"
      />

      {/* Domain Cards */}
      <div className="grid grid-cols-1 gap-3">
        {domains.map(({ key, label, icon }) => (
          <DomainCard key={key} label={label} icon={icon} domain={scores[key]} />
        ))}
      </div>
      </div>

      {/* Communication Sub-Scores Breakdown */}
      {(scores as ExtendedScores).communication.subScores && (
        <div id="fb-communication">
          <CommunicationBreakdown subScores={(scores as ExtendedScores).communication.subScores!} />
        </div>
      )}

      {/* Cognitive Biases */}
      {biases.length > 0 && (
        <div id="fb-biases" className="space-y-3">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-amber-500" /> Cognitive Biases Detected
          </h3>
          {biases.map((bias, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-700 mb-1">{bias.type.replace('_', ' ')}</div>
              <p className="text-sm text-gray-700 mb-2">{bias.evidence}</p>
              <p className="text-xs text-amber-600 italic">{bias.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Illness Script Comparison */}
      {(scores as ExtendedScores).illnessScript && (
        <div id="fb-illness">
          <IllnessScriptComparison data={(scores as ExtendedScores).illnessScript!} />
        </div>
      )}

      {/* Near-Miss Differential Analysis */}
      {(scores as ExtendedScores).nearMisses && (
        <div id="fb-nearmiss">
          <NearMissFeedback data={(scores as ExtendedScores).nearMisses!} />
        </div>
      )}

      {/* Learning Objective Alignment */}
      {extendedScores.learningObjectives && extendedScores.learningObjectives.results.length > 0 && (
        <div id="fb-objectives">
          <LearningObjectiveCard data={extendedScores.learningObjectives} />
        </div>
      )}

      {/* Question Strategy Analysis */}
      {extendedScores.questionStrategy && extendedScores.questionStrategy.totalQuestions > 0 && (
        <div id="fb-questions">
          <QuestionStrategyCard data={extendedScores.questionStrategy} />
        </div>
      )}

      {/* Clinical Reasoning Process Map */}
      {extendedScores.clinicalReasoning && extendedScores.clinicalReasoning.hypothesisEvolution.length > 0 && (
        <div id="fb-reasoning">
          <ClinicalReasoningCard data={extendedScores.clinicalReasoning} />
        </div>
      )}

      {/* Feedback Narrative */}
      {encounter.feedbackNarrative && (
        <div id="fb-narrative" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-extrabold text-gray-900 mb-3">Performance Summary</h3>
          <div className="text-sm text-gray-700 prose prose-sm max-w-none whitespace-pre-line">
            {encounter.feedbackNarrative}
          </div>
        </div>
      )}

      {/* Student Notes */}
      {encounterNotes && (
        <div id="fb-notes" className="bg-white border border-amber-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-1.5">
            <StickyNote className="size-4 text-amber-600" /> Your Notes
          </h3>
          <div className="text-sm text-gray-700 whitespace-pre-line bg-amber-50/50 rounded-lg p-3">
            {encounterNotes}
          </div>
        </div>
      )}
    </div>
  )
}

function DomainCard({ label, icon, domain }: { label: string; icon: React.ReactNode; domain: DomainScore }) {
  const [showTeachingPoints, setShowTeachingPoints] = useState(false)
  const hasTeachingPoints = domain.teachingPoints && domain.teachingPoints.length > 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {icon} {label}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-gray-900">{domain.score}/100</span>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${LEVEL_COLORS[domain.level]}`}>
            {domain.level}
          </span>
        </div>
      </div>
      {/* Score bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-2">
        <div className="h-full bg-[#0033A0] rounded-full transition-all" style={{ width: `${domain.score}%` }} />
      </div>
      <p className="text-xs text-gray-600 mb-1">{domain.feedback}</p>
      {domain.keyFindings.length > 0 && (
        <ul className="text-xs text-gray-500 space-y-0.5">
          {domain.keyFindings.map((f, i) => <li key={i}>• {f}</li>)}
        </ul>
      )}
      {hasTeachingPoints && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowTeachingPoints((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:text-[#002580] transition-colors"
          >
            <Lightbulb className="size-3.5" />
            {domain.teachingPoints!.length} Teaching Point{domain.teachingPoints!.length > 1 ? 's' : ''}
            {showTeachingPoints ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
          {showTeachingPoints && (
            <div className="mt-2 space-y-2">
              {domain.teachingPoints!.map((tp, i) => (
                <TeachingPointCard key={i} point={tp} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TeachingPointCard({ point }: { point: TeachingPoint }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
      <div className="text-xs font-semibold text-blue-800 mb-0.5">{point.missed}</div>
      <p className="text-xs text-blue-700">{point.reason}</p>
    </div>
  )
}

// ─── Key Moments Timeline ──────────────────────────────────────────────────

const MOMENT_CONFIG: Record<KeyMomentType, { label: string; color: string; bgColor: string }> = {
  breakthrough_question: { label: 'Breakthrough', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  missed_red_flag: { label: 'Missed Red Flag', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  rapport_building: { label: 'Rapport', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  premature_closure: { label: 'Premature Closure', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  systematic_approach: { label: 'Systematic', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  critical_finding: { label: 'Critical Finding', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
}

function KeyMomentsTimeline({ moments, transcript }: { moments: KeyMoment[]; transcript: TranscriptMessage[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const sorted = [...moments].sort((a, b) => a.transcriptIndex - b.transcriptIndex)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Key Moments</h3>
        <span className="ml-auto text-xs text-gray-400">{moments.length} identified</span>
      </div>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
        <div className="space-y-3">
          {sorted.map((moment, i) => {
            const config = MOMENT_CONFIG[moment.type]
            const isExpanded = expandedIdx === i
            const msg = transcript[moment.transcriptIndex]
            return (
              <div key={i} className="relative pl-6">
                <div className={`absolute left-0 top-2 size-3.5 rounded-full border-2 border-white shadow-sm ${
                  moment.impact === 'positive' ? 'bg-emerald-500' : moment.impact === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className={`w-full text-left border rounded-xl p-3 transition-colors ${config.bgColor}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                    {msg && (
                      <span className="text-xs text-gray-400">
                        Message #{moment.transcriptIndex + 1} ({msg.role})
                      </span>
                    )}
                    <ChevronDown className={`size-3 text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-xs text-gray-600 italic">&ldquo;{moment.quote}&rdquo;</p>
                </button>
                {isExpanded && (
                  <div className="mt-1.5 ml-3 pl-3 border-l-2 border-gray-200">
                    <p className="text-xs text-gray-700">{moment.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Phase Timing Breakdown ────────────────────────────────────────────────

const PHASE_LABELS_SHORT: Partial<Record<EncounterPhase, string>> = {
  OPENING: 'Opening',
  HISTORY_TAKING: 'History Taking',
  PROBLEM_REPRESENTATION: 'Problem Rep',
  DIFFERENTIAL_DIAGNOSIS: 'Differential',
  PHYSICAL_EXAM: 'Physical Exam',
  DIAGNOSTIC_PLAN: 'Diagnostic Plan',
}

function PhaseTimingBreakdown({ encounter }: { encounter: EncounterData }) {
  const scores = encounter.scores as ExtendedScores | null
  const timingData = scores?.phaseTimestamps ?? null
  if (!timingData?.phaseEnteredAt) return null

  const phaseOrder: EncounterPhase[] = [
    'OPENING', 'HISTORY_TAKING', 'PROBLEM_REPRESENTATION',
    'DIFFERENTIAL_DIAGNOSIS', 'PHYSICAL_EXAM', 'DIAGNOSTIC_PLAN',
  ]

  const durations: { phase: string; seconds: number }[] = []
  for (let i = 0; i < phaseOrder.length; i++) {
    const startTime = timingData.phaseEnteredAt[phaseOrder[i]]
    if (!startTime) continue
    const nextPhaseKey = phaseOrder[i + 1]
    const endTime = nextPhaseKey
      ? timingData.phaseEnteredAt[nextPhaseKey]
      : timingData.phaseEnteredAt.FEEDBACK ?? timingData.phaseEnteredAt.COMPLETED
    if (!endTime) continue
    const secs = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
    if (secs >= 0) {
      durations.push({ phase: PHASE_LABELS_SHORT[phaseOrder[i]] ?? phaseOrder[i], seconds: secs })
    }
  }

  if (durations.length === 0) return null

  const totalSeconds = durations.reduce((sum, d) => sum + d.seconds, 0)
  const maxSeconds = Math.max(...durations.map((d) => d.seconds))

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Time Per Phase</h3>
        <span className="ml-auto text-xs text-gray-500">Total: {formatTime(totalSeconds)}</span>
      </div>
      <div className="space-y-2.5">
        {durations.map(({ phase, seconds }) => (
          <div key={phase}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">{phase}</span>
              <span className="text-xs font-semibold text-gray-900 tabular-nums">{formatTime(seconds)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-full bg-[#0033A0] rounded-full transition-all"
                style={{ width: `${maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Self-Assessment Calibration ──────────────────────────────────────────

function SelfAssessmentSection({ encounter, email, encounterId, onUpdate }: {
  encounter: EncounterData; email: string; encounterId: string; onUpdate: (e: EncounterData) => void
}) {
  const scores = encounter.scores as ExtendedScores | null
  if (!scores) return null

  const existingAssessment = scores.selfAssessment ?? null

  // If self-assessment exists, show calibration
  if (existingAssessment) {
    return <CalibrationDisplay assessment={existingAssessment} scores={scores} />
  }

  // Show self-assessment form
  return (
    <SelfAssessmentForm
      email={email}
      encounterId={encounterId}
      onSubmitted={() => {
        apiFetch<EncounterData>(email, `/api/virtual-clinic/encounters/${encounterId}`)
          .then(onUpdate)
          .catch(() => {})
      }}
    />
  )
}

const DOMAIN_KEYS_LABELS: { key: keyof EncounterScores; label: string }[] = [
  { key: 'history', label: 'History Taking' },
  { key: 'exam', label: 'Physical Exam' },
  { key: 'differential', label: 'Differential' },
  { key: 'plan', label: 'Diagnostic Plan' },
  { key: 'communication', label: 'Communication' },
]

function SelfAssessmentForm({ email, encounterId, onSubmitted }: {
  email: string; encounterId: string; onSubmitted: () => void
}) {
  const [estimates, setEstimates] = useState<Record<string, number>>({
    history: 50, exam: 50, differential: 50, plan: 50, communication: 50,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const selfAssessment: SelfAssessment = {
        ...estimates as Pick<SelfAssessment, 'history' | 'exam' | 'differential' | 'plan' | 'communication'>,
        submittedAt: new Date().toISOString(),
      }
      await apiFetch(email, `/api/virtual-clinic/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'save_self_assessment', selfAssessment }),
      })
      onSubmitted()
    } catch { /* error handled by parent */ }
    setSaving(false)
  }

  return (
    <div className="bg-white border border-[#0033A0]/20 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <Gauge className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Self-Assessment</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Before viewing your scores, estimate your performance in each domain. This builds metacognitive calibration — a critical clinical skill.
      </p>
      <div className="space-y-3">
        {DOMAIN_KEYS_LABELS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">{label}</span>
              <span className="text-xs font-semibold text-gray-900 tabular-nums w-8 text-right">{estimates[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={estimates[key]}
              onChange={(e) => setEstimates((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#0033A0]"
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="mt-4 w-full px-4 py-2 text-sm font-semibold rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] transition-colors disabled:opacity-40"
      >
        {saving ? 'Submitting...' : 'Submit Self-Assessment & View Scores'}
      </button>
    </div>
  )
}

function CalibrationDisplay({ assessment, scores }: { assessment: SelfAssessment; scores: EncounterScores }) {
  const calibrationData = DOMAIN_KEYS_LABELS.map(({ key, label }) => {
    const estimated = assessment[key]
    const actual = scores[key].score
    const diff = estimated - actual
    return { key, label, estimated, actual, diff }
  })

  const avgAbsDiff = Math.round(
    calibrationData.reduce((sum, d) => sum + Math.abs(d.diff), 0) / calibrationData.length,
  )
  const calibrationLabel = avgAbsDiff <= 8 ? 'Excellent' : avgAbsDiff <= 15 ? 'Good' : avgAbsDiff <= 25 ? 'Developing' : 'Needs Work'
  const calibrationColor = avgAbsDiff <= 8 ? 'text-emerald-600' : avgAbsDiff <= 15 ? 'text-blue-600' : avgAbsDiff <= 25 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <Gauge className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Self-Assessment Calibration</h3>
        <span className={`ml-auto text-xs font-semibold ${calibrationColor}`}>{calibrationLabel}</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Average deviation: {avgAbsDiff} points — {avgAbsDiff <= 15 ? 'well-calibrated clinical self-awareness.' : 'practice reflecting on your performance after encounters.'}
      </p>
      <div className="space-y-3">
        {calibrationData.map(({ key, label, estimated, actual, diff }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 w-24 shrink-0">{label}</span>
            <div className="flex-1 relative h-6 bg-gray-50 rounded-lg overflow-hidden">
              {/* Actual score bar */}
              <div
                className="absolute top-0 left-0 h-full bg-[#0033A0]/15 rounded-lg"
                style={{ width: `${actual}%` }}
              />
              {/* Actual score marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-[#0033A0]"
                style={{ left: `${actual}%` }}
                title={`Actual: ${actual}`}
              />
              {/* Estimated marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-amber-500 border-dashed"
                style={{ left: `${Math.min(estimated, 100)}%` }}
                title={`Estimated: ${estimated}`}
              />
            </div>
            <span className={`text-xs font-semibold w-10 text-right tabular-nums ${
              Math.abs(diff) <= 10 ? 'text-emerald-600' : Math.abs(diff) <= 20 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {diff > 0 ? '+' : ''}{diff}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-[#0033A0]" /> Actual</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-amber-500" /> Your Estimate</span>
        </div>
      </div>
    </div>
  )
}

// ─── Communication Sub-Scores Breakdown ────────────────────────────────────

const COMM_SUB_LABELS: { key: keyof CommunicationSubScores; label: string }[] = [
  { key: 'empathy', label: 'Empathy' },
  { key: 'questionQuality', label: 'Question Quality' },
  { key: 'activeListening', label: 'Active Listening' },
  { key: 'patientEducation', label: 'Patient Education' },
]

function CommunicationBreakdown({ subScores }: { subScores: CommunicationSubScores }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-1.5">
        <MessageSquare className="size-4 text-[#0033A0]" /> Communication Breakdown
      </h3>
      <div className="space-y-2.5">
        {COMM_SUB_LABELS.map(({ key, label }) => {
          const value = subScores[key]
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <span className="text-xs font-semibold text-gray-900">{value}/100</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${
                    value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Notepad Drawer ───────────────────────────────────────────────────────

function NotepadDrawer({ open, notes, onSave, disabled }: {
  open: boolean
  notes: string
  onSave: (notes: string) => void
  disabled: boolean
}) {
  const [text, setText] = useState(notes)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from prop when it changes externally
  useEffect(() => { setText(notes) }, [notes])

  // Auto-save debounce: save 1.5s after user stops typing
  const debouncedSave = useCallback((value: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      onSave(value)
    }, 1500)
  }, [onSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [])

  if (!open) return null

  return (
    <div className="border-t border-gray-200 bg-amber-50/50">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <StickyNote className="size-3.5 text-amber-600" /> My Notes
          </span>
          {saving && <span className="text-xs text-gray-400">Saving...</span>}
        </div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            debouncedSave(e.target.value)
          }}
          disabled={disabled}
          rows={4}
          placeholder="Jot down observations, hypotheses, or reminders..."
          className="w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
        />
      </div>
    </div>
  )
}

// ─── Chat Panel (Right Side) ────────────────────────────────────────────────

function ChatPanel({ encounter, email, encounterId, onNewMessage, onRefresh }: {
  encounter: EncounterData
  email: string
  encounterId: string
  onNewMessage: (msg: TranscriptMessage) => void
  onRefresh: () => void
}) {
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [notepadOpen, setNotepadOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Read notes from encounter metadata
  const encounterNotes = useMemo(() => {
    const data = encounter.historyDomainsHit as Record<string, unknown> | null
    return (typeof data?.__notes === 'string' ? data.__notes : '') as string
  }, [encounter.historyDomainsHit])

  const handleSaveNotes = useCallback(async (notes: string) => {
    try {
      await apiFetch(email, `/api/virtual-clinic/encounters/${encounterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'save_notes', notes }),
      })
    } catch { /* non-fatal — notes are best-effort */ }
  }, [email, encounterId])

  // Patient engagement (affect state)
  const affectState = useMemo(() => {
    const data = encounter.historyDomainsHit as Record<string, unknown> | null
    return (data?.__affectState ?? null) as AffectState | null
  }, [encounter.historyDomainsHit])

  // Scaffolding computation
  const scaffoldingLevel = (encounter.clinicalCase.scaffoldingLevel ?? 'none') as ScaffoldingLevel
  const domainsHit = useMemo(
    () => (encounter.historyDomainsHit ?? {}) as Record<string, boolean>,
    [encounter.historyDomainsHit],
  )
  const scaffoldingPrompt = useMemo(
    () => encounter.phase === 'HISTORY_TAKING'
      ? checkScaffolding(scaffoldingLevel, encounter.transcript, domainsHit)
      : null,
    [scaffoldingLevel, encounter.phase, encounter.transcript, domainsHit],
  )
  const domainChecklist = useMemo(
    () => scaffoldingLevel === 'full' && encounter.phase === 'HISTORY_TAKING'
      ? getDomainChecklist(domainsHit)
      : null,
    [scaffoldingLevel, encounter.phase, domainsHit],
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [encounter.transcript, streaming, streamText])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Optimistic add user message
    const userMsg: TranscriptMessage = { role: 'user', content: text, phase: encounter.phase, timestamp: new Date().toISOString() }
    onNewMessage(userMsg)

    setStreaming(true)
    setStreamText('')

    try {
      const res = await fetch(`/api/virtual-clinic/encounters/${encounterId}/chat`, {
        method: 'POST',
        headers: { 'x-demo-user-email': email, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Chat failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setStreamText(fullText)
      }

      // Add assistant message
      const assistantMsg: TranscriptMessage = { role: 'assistant', content: fullText, phase: encounter.phase, timestamp: new Date().toISOString() }
      onNewMessage(assistantMsg)

      // Delayed refresh to pick up server-side affect state update
      setTimeout(onRefresh, 2000)
    } catch (err) {
      // Show error as a temporary message
      console.error('Chat error:', err)
    } finally {
      setStreaming(false)
      setStreamText('')
    }
  }, [input, streaming, encounter.phase, encounterId, email, onNewMessage, onRefresh])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  const isCompleted = encounter.phase === 'COMPLETED'

  // Strip hidden markers for display
  const stripMarkers = (text: string) =>
    text.replace(/<!--(?:DOMAIN|MANEUVER):[^>]*-->/g, '').trim()

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#0033A0] px-4 py-3 flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-full bg-white/20">
          <Bot className="size-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">{encounter.clinicalCase.patientName}</div>
          <div className="text-xs text-white/70">AI Patient • Virtual Clinic</div>
        </div>
        {affectState && <EngagementBadge level={affectState.engagementLevel} delta={affectState.lastDelta} />}
        <button
          onClick={() => setNotepadOpen((v) => !v)}
          title={notepadOpen ? 'Hide notes' : 'Show notes'}
          className={`flex items-center justify-center size-7 rounded-full transition-colors ${
            notepadOpen ? 'bg-amber-400/30 text-amber-200' : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          <StickyNote className="size-3.5" />
        </button>
      </div>

      {/* Scaffolding Banner */}
      {scaffoldingPrompt && (
        <ScaffoldingBanner prompt={scaffoldingPrompt} domainChecklist={domainChecklist} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {encounter.transcript.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex items-start gap-2.5'}>
            {msg.role === 'assistant' && (
              <div className="flex items-center justify-center size-7 rounded-full bg-[#0033A0] shrink-0 mt-0.5">
                <Bot className="size-3.5 text-white" />
              </div>
            )}
            <div className={
              msg.role === 'user'
                ? 'bg-[#0033A0] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]'
                : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]'
            }>
              <div className={`text-sm ${msg.role === 'user' ? 'whitespace-pre-wrap' : 'text-gray-800 prose prose-sm max-w-none'}`}>
                {msg.role === 'assistant' ? (
                  <DynamicMarkdown>{stripMarkers(msg.content)}</DynamicMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streaming && streamText && (
          <div className="flex items-start gap-2.5">
            <div className="flex items-center justify-center size-7 rounded-full bg-[#0033A0] shrink-0 mt-0.5">
              <Bot className="size-3.5 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
              <div className="text-sm text-gray-800 prose prose-sm max-w-none">
                <DynamicMarkdown>{stripMarkers(streamText)}</DynamicMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {streaming && !streamText && (
          <div className="flex items-start gap-2.5">
            <div className="flex items-center justify-center size-7 rounded-full bg-[#0033A0] shrink-0 mt-0.5">
              <Bot className="size-3.5 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Notepad Drawer */}
      <NotepadDrawer
        open={notepadOpen}
        notes={encounterNotes}
        onSave={handleSaveNotes}
        disabled={isCompleted}
      />

      {/* Input */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isCompleted ? 'Encounter completed' : 'Talk to the patient...'}
            disabled={isCompleted || streaming}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isCompleted || streaming}
            className="flex items-center justify-center size-9 rounded-xl bg-[#0033A0] text-white hover:bg-[#002580] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Engagement Badge ──────────────────────────────────────────────────────

function EngagementBadge({ level, delta }: { level: number; delta: number }) {
  const label = level >= 70 ? 'Open' : level >= 40 ? 'Neutral' : 'Withdrawn'
  const color = level >= 70
    ? 'bg-emerald-400/20 text-emerald-200'
    : level >= 40
      ? 'bg-amber-400/20 text-amber-200'
      : 'bg-red-400/20 text-red-200'
  const heartColor = level >= 70 ? 'text-emerald-300' : level >= 40 ? 'text-amber-300' : 'text-red-300'

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`} title={`Patient engagement: ${level}/100`}>
      <Heart className={`size-3 ${heartColor}`} />
      {label}
      {delta !== 0 && (
        <span className={delta > 0 ? 'text-emerald-300' : 'text-red-300'}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
    </div>
  )
}

// ─── Tag Input (Shared) ─────────────────────────────────────────────────────

function TagInput({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = text.trim()
      if (tag && !value.includes(tag)) {
        onChange([...value, tag])
      }
      setText('')
    }
  }

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="text-blue-400 hover:text-blue-600">&times;</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Add ${label.toLowerCase()} (Enter to add)`}
        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
      />
    </div>
  )
}
