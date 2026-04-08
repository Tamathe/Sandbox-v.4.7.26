'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import OutputEvalTierNav from '../../../components/ai-literacy/OutputEvalTierNav'
import OutputEvalScenario from '../../../components/ai-literacy/OutputEvalScenario'
import OutputEvalResults from '../../../components/ai-literacy/OutputEvalResults'
import ModuleProgress from '../../../components/ai-literacy/ModuleProgress'
import { OUTPUT_EVAL_TIERS } from '../../../lib/output-eval-constants'
import type { SeededScenario, PlantedError } from '../../../lib/output-eval-constants'
import LoadingSpinner from '../../../components/LoadingSpinner'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'

type Screen = 'tier-select' | 'evaluating' | 'results' | 'progress'

interface EvalResult {
  detectionScore: number
  justificationScore: number
  overallScore: number
  feedback: string
  userHighlights: { span: string; type: string; explanation: string }[]
  userRating: number
}

export default function OutputEvalPage() {
  const { currentUser } = useAuth()
  const [screen, setScreen] = useState<Screen>('tier-select')
  const [activeTier, setActiveTier] = useState<number | null>(null)
  const [scenario, setScenario] = useState<SeededScenario | null>(null)
  const [loading, setLoading] = useState(false)
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [tierProgress, setTierProgress] = useState<Record<number, { attempts: number; bestScore: number }>>({})

  const loadProgress = useCallback(async () => {
    const res = await fetch('/api/ai-literacy/output-eval/progress', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) {
      const data = await res.json()
      const map: Record<number, { attempts: number; bestScore: number }> = {}
      for (const tp of data.tierProgress ?? []) {
        map[tp.tier] = { attempts: tp.attempts, bestScore: tp.bestScore }
      }
      setTierProgress(map)
    }
  }, [currentUser.email])

  useEffect(() => { void loadProgress() }, [loadProgress])

  async function handleSelectTier(tier: number) {
    setActiveTier(tier)
    setLoading(true)

    try {
      const excludeParam = completedIds.length > 0 ? `&exclude=${completedIds.join(',')}` : ''
      const res = await fetch(`/api/ai-literacy/output-eval?tier=${tier}${excludeParam}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setScenario(data.scenario)
      setScreen('evaluating')
    } catch (err) {
      console.error('Failed to load output eval scenario:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleEvalSubmit(result: EvalResult) {
    setEvalResult(result)

    // Save attempt
    if (scenario) {
      await fetch('/api/ai-literacy/output-eval/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          scenarioId: scenario.id,
          tier: scenario.tier,
          question: scenario.question,
          aiResponse: scenario.aiResponse,
          plantedErrors: scenario.plantedErrors,
          userHighlights: result.userHighlights,
          userRating: result.userRating,
          detectionScore: result.detectionScore,
          justificationScore: result.justificationScore,
          overallScore: result.overallScore,
          feedback: result.feedback,
          isSeeded: scenario.id.startsWith('tier'),
        }),
      })
      setCompletedIds((prev) => [...prev, scenario.id])
    }

    setScreen('results')
  }

  function handleNext() {
    setEvalResult(null)
    setScenario(null)
    if (activeTier) {
      void handleSelectTier(activeTier)
    } else {
      void loadProgress()
      setScreen('tier-select')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Output Evaluator"
        subtitle="Learn to spot AI errors, hallucinations, and bias"
        action={
          <div className="flex items-center gap-2">
            {screen !== 'progress' ? (
              <button
                onClick={() => { void loadProgress(); setScreen('progress') }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="size-4" /> My Progress
              </button>
            ) : (
              <button
                onClick={() => setScreen('tier-select')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/ai-literacy" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-6 transition-colors">
          <ArrowLeft className="size-4" /> AI Literacy Hub
        </Link>

        {/* Tier select */}
        {screen === 'tier-select' && (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : (
            <OutputEvalTierNav
              activeTier={activeTier}
              onSelectTier={handleSelectTier}
              tierProgress={tierProgress}
            />
          )
        )}

        {/* Evaluating */}
        {screen === 'evaluating' && scenario && (
          <OutputEvalScenario
            key={scenario.id}
            scenario={scenario}
            userEmail={currentUser.email}
            onSubmit={handleEvalSubmit}
            onBack={() => { void loadProgress(); setScreen('tier-select') }}
          />
        )}

        {/* Results */}
        {screen === 'results' && evalResult && scenario && (
          <OutputEvalResults
            scores={evalResult}
            userHighlights={evalResult.userHighlights}
            plantedErrors={scenario.plantedErrors as PlantedError[]}
            aiResponse={scenario.aiResponse}
            onNext={handleNext}
          />
        )}

        {/* Progress */}
        {screen === 'progress' && (
          <ModuleProgress
            userEmail={currentUser.email}
            apiPath="/api/ai-literacy/output-eval/progress"
            levels={OUTPUT_EVAL_TIERS}
            scoreUnit="%"
            masteryThreshold={80}
            emptyHeading="No evaluations yet"
            emptySubtext="Complete some scenarios to see your progress here."
            levelPrefix="T"
          />
        )}

        <PathwayNav />
      </div>
    </div>
  )
}
