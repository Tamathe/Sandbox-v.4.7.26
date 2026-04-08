'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Compass, FileText, PenTool, Check, ArrowRight, Sparkles, Package, Loader2, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import StanceAssessment from './StanceAssessment'
import StanceMiniResult from './StanceMiniResult'
import InlinePolicyLite from './InlinePolicyLite'
import InlineScannerCompact from './InlineScannerCompact'
import { STANCE_QUESTIONS } from '../../lib/stance-constants'
import type { AIStance, DisciplineFamily } from '../../generated/prisma'

interface QuickStartWizardProps {
  onComplete: () => void
  onSkip: () => void
  initialStep?: number
}

type Phase = 'intro' | 'starter-pick' | 'stance' | 'stance-result' | 'policy' | 'scan'

interface StarterPackSummary {
  id: string
  disciplineFamily: string
  label: string
  description: string
  defaultStance: string
  assignments: { title: string }[]
  checkpoints: { name: string }[]
  adoptionCount: number
}

interface CourseOption {
  id: string
  courseCode: string
  title: string
}

function mapStepToPhase(step: number): Phase {
  if (step === 0) return 'intro'
  if (step === 1) return 'policy'
  if (step === 2) return 'scan'
  return 'intro'
}

const STEPS = [
  { label: 'How do you feel about AI in your classroom?', icon: Compass, color: 'bg-blue-50 text-blue-600', time: '~5 min' },
  { label: 'Get your course AI policy written', icon: FileText, color: 'bg-amber-50 text-amber-600', time: '~2 min' },
  { label: 'Check if AI can do your assignments', icon: PenTool, color: 'bg-red-50 text-red-600', time: '~3 min' },
]

function saveGoldenPathStep(key: 'stance' | 'policy' | 'scan', value = true) {
  try {
    const stored = localStorage.getItem('golden-path-progress')
    const progress = stored ? JSON.parse(stored) : { stance: false, policy: false, scan: false }
    progress[key] = value
    localStorage.setItem('golden-path-progress', JSON.stringify(progress))
  } catch {}
}

export default function QuickStartWizard({ onComplete, onSkip, initialStep = 0 }: QuickStartWizardProps) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>(initialStep === 0 ? 'intro' : mapStepToPhase(initialStep))
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [stanceResult, setStanceResult] = useState<{ stance: string; score: number } | null>(null)
  const [starterPacks, setStarterPacks] = useState<StarterPackSummary[]>([])
  const [packCourses, setPackCourses] = useState<CourseOption[]>([])
  const [packLoading, setPackLoading] = useState(false)
  const [packAdopted, setPackAdopted] = useState(false)
  const [selectedPackCourse, setSelectedPackCourse] = useState('')
  const [adoptingPack, setAdoptingPack] = useState<string | null>(null)

  const saveProgress = useCallback(async (step: number, completed = false) => {
    await fetch('/api/ai-literacy/quick-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ step, completed }),
    }).catch(() => {})
  }, [currentUser.email])

  const handleStanceComplete = useCallback(async (responses: { questionId: string; selectedValue: number; optionLabel: string }[], disciplineFamily?: DisciplineFamily, reflectionNote?: string) => {
    const res = await fetch('/api/ai-literacy/stance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({ responses, disciplineFamily, reflectionNote }),
    })
    if (res.ok) {
      const data = await res.json()
      setStanceResult({ stance: data.stance, score: data.score })
      setPhase('stance-result')
      saveGoldenPathStep('stance')
      void saveProgress(1)
    }
  }, [currentUser.email, saveProgress])

  const buildHandoffParams = () => {
    const params = new URLSearchParams()
    // If stance result is available, map stance to comfort level
    if (stanceResult?.stance) {
      const stanceToComfort: Record<string, string> = {
        PROHIBIT: 'NERVOUS',
        CAUTIOUS: 'CAUTIOUS',
        GUIDED: 'OPEN',
        INTEGRATE: 'ENTHUSIASTIC',
        REQUIRE: 'ENTHUSIASTIC',
      }
      const comfort = stanceToComfort[stanceResult.stance]
      if (comfort) params.set('comfort', comfort)
    }
    const paramStr = params.toString()
    return paramStr ? `?${paramStr}` : ''
  }

  const handleShowStarterPacks = useCallback(async () => {
    setPhase('starter-pick')
    setPackLoading(true)
    try {
      const [packsRes, coursesRes] = await Promise.all([
        fetch('/api/ai-literacy/starter-packs', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/ai-literacy/policy', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])
      if (packsRes.ok) {
        const data = await packsRes.json()
        setStarterPacks(data.packs ?? [])
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json()
        const courses = (data.courses ?? []).map((c: { id: string; courseCode: string; title: string }) => ({
          id: c.id, courseCode: c.courseCode, title: c.title,
        }))
        setPackCourses(courses)
        if (courses.length > 0) setSelectedPackCourse(courses[0].id)
      }
    } catch { /* silently degrade */ }
    setPackLoading(false)
  }, [currentUser.email])

  const handleAdoptPack = useCallback(async (disciplineFamily: string) => {
    if (!selectedPackCourse) return
    setAdoptingPack(disciplineFamily)
    try {
      const res = await fetch('/api/ai-literacy/starter-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ courseId: selectedPackCourse, disciplineFamily }),
      })
      if (res.ok) {
        setPackAdopted(true)
        void saveProgress(3, true)
      }
    } catch { /* error state */ }
    setAdoptingPack(null)
  }, [selectedPackCourse, currentUser.email, saveProgress])

  if (phase === 'starter-pick') {
    if (packAdopted) {
      return (
        <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
          <div className="size-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="size-6 text-green-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Starter Pack adopted!</h2>
          <p className="text-sm text-gray-600">Policy and assignments have been created for your course.</p>
          <button onClick={onComplete} className="px-8 py-3 bg-[#0033A0] text-white rounded-lg font-semibold hover:bg-[#002880] transition-colors">
            Done
          </button>
        </div>
      )
    }

    return (
      <div className="max-w-3xl mx-auto py-8">
        <button onClick={() => setPhase('intro')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
          <ChevronLeft className="size-3.5" /> Back to Quick Start
        </button>
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">Choose a Starter Pack</h2>
        <p className="text-sm text-gray-500 mb-6">Pre-built policy + 3 assignments + 3 checkpoints, tailored to your discipline.</p>

        {packLoading ? (
          <div className="flex items-center gap-3 py-12 justify-center">
            <Loader2 className="size-5 text-[#0033A0] animate-spin" />
            <span className="text-sm text-gray-500">Loading packs…</span>
          </div>
        ) : (
          <>
            {packCourses.length === 1 && (
              <p className="text-sm text-gray-600 mb-6">
                Applying to: <span className="font-medium">{packCourses[0].courseCode} — {packCourses[0].title}</span>
              </p>
            )}
            {packCourses.length > 1 && (
              <div className="mb-6">
                <label htmlFor="pack-course" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Apply to course</label>
                <select
                  id="pack-course"
                  value={selectedPackCourse}
                  onChange={e => setSelectedPackCourse(e.target.value)}
                  className="w-full max-w-sm p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent"
                >
                  {packCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
                  ))}
                </select>
              </div>
            )}

            {packCourses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 mb-3">Add a course first to adopt a Starter Pack.</p>
                <button onClick={() => setPhase('intro')} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Back to Quick Start
                </button>
              </div>
            )}

            {packCourses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {starterPacks.map(pack => (
                  <div key={pack.id} className="border rounded-2xl shadow-sm bg-white p-4 space-y-3 hover:shadow-md hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Package className="size-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{pack.label}</h3>
                        <p className="text-[10px] text-gray-400">{pack.defaultStance} stance · {pack.adoptionCount} adopted</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{pack.description}</p>
                    <p className="text-xs text-gray-400">{pack.assignments.length} assignments · {pack.checkpoints.length} checkpoints</p>
                    <button
                      onClick={() => handleAdoptPack(pack.disciplineFamily)}
                      disabled={!selectedPackCourse || adoptingPack === pack.disciplineFamily}
                      className="w-full px-4 py-2 bg-[#0033A0] text-white rounded-lg text-xs font-medium hover:bg-[#002880] disabled:opacity-30 transition-colors"
                    >
                      {adoptingPack === pack.disciplineFamily ? 'Adopting…' : 'Adopt this pack'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="size-16 rounded-2xl bg-[#0033A0] flex items-center justify-center mx-auto mb-6">
          <Sparkles className="size-8 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">AI Literacy Quick Start</h2>
        <p className="text-gray-600 mb-8 max-w-lg mx-auto">
          Three quick steps — most people finish in under 10 minutes. No right answers — every position is supported.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-10">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center ${step.color}`}>
                <step.icon className="size-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-gray-700">{step.label}</span>
                <span className="text-xs text-gray-400">{step.time}</span>
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="size-4 text-gray-300 hidden sm:block" />}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPhase('stance')}
            className="px-8 py-3 bg-[#0033A0] text-white rounded-lg font-semibold hover:bg-[#002880] transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={onSkip}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
              i < currentStep ? 'bg-green-100 text-green-700' :
              i === currentStep ? 'bg-[#0033A0] text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < currentStep ? <Check className="size-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-green-200' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Phase content */}
      {phase === 'stance' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Discover Your AI Teaching Stance</h3>
          <StanceAssessment
            questions={STANCE_QUESTIONS}
            onComplete={handleStanceComplete}
            onCancel={onSkip}
          />
        </div>
      )}

      {phase === 'stance-result' && stanceResult && (
        <div className="space-y-6">
          <StanceMiniResult stance={stanceResult.stance as AIStance} score={stanceResult.score} onShowStarterPacks={handleShowStarterPacks} />
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => { setCurrentStep(1); setPhase('policy'); void saveProgress(1) }}
              className="px-6 py-2.5 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] transition-colors"
            >
              Continue to Policy Builder
            </button>
            <button
              onClick={() => { void saveProgress(1, true); onComplete() }}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              I&apos;m done for now
            </button>
          </div>
        </div>
      )}

      {phase === 'policy' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Build a Course AI Policy</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your stance is <span className="font-semibold text-[#0033A0]">{stanceResult?.stance?.replace(/_/g, ' ')}</span>.
            Let&apos;s turn that into a concrete policy for one of your courses.
          </p>
          <InlinePolicyLite
            stance={(stanceResult?.stance as AIStance) ?? 'GUIDED'}
            userEmail={currentUser.email}
            onComplete={() => { saveGoldenPathStep('policy'); setCurrentStep(2); setPhase('scan'); void saveProgress(2) }}
            onSkip={() => { setCurrentStep(2); setPhase('scan'); void saveProgress(2) }}
          />
        </div>
      )}

      {phase === 'scan' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Scan an Assignment</h3>
          <p className="text-sm text-gray-600 mb-4">
            Paste one of your assignment prompts to see how easily AI could complete it.
          </p>
          <InlineScannerCompact
            userEmail={currentUser.email}
            onComplete={() => {
              saveGoldenPathStep('scan')
              void saveProgress(3, true)
              const params = new URLSearchParams()
              if (stanceResult?.stance) params.set('stance', stanceResult.stance)
              try {
                const pName = localStorage.getItem('uky-last-policy-name')
                if (pName) params.set('policyName', pName)
              } catch {}
              params.set('scanCount', '1')
              router.push(`/onboard/complete?${params.toString()}`)
            }}
            onSkip={() => { void saveProgress(3, true); onComplete() }}
          />
        </div>
      )}
    </div>
  )
}
