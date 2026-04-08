'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Compass, BarChart3, Clock, Map, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import PageHeader from '../../../components/PageHeader'
import StanceAssessment from '../../../components/ai-literacy/StanceAssessment'
import StanceResult from '../../../components/ai-literacy/StanceResult'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'
import StanceSpectrum from '../../../components/ai-literacy/StanceSpectrum'
import CourseImpactPreview from '../../../components/ai-literacy/CourseImpactPreview'
import PeerDistribution from '../../../components/ai-literacy/PeerDistribution'
import StanceTimeline from '../../../components/ai-literacy/StanceTimeline'
import type { AIStance, DisciplineFamily } from '../../../generated/prisma'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Button from '../../../components/Button'

type View = 'loading' | 'landing' | 'assessment' | 'result' | 'explore'
type ExploreTab = 'spectrum' | 'impact' | 'peers' | 'journey'

interface StanceProfile {
  stance: AIStance | null
  score: number | null
  stanceUpdatedAt: string | null
  stanceRationale: string | null
  disciplineFamily: DisciplineFamily | null
  hasCompletedAssessment: boolean
  historyCount: number
  questions: Array<{
    id: string
    title: string
    prompt: string
    context: string
    options: { label: string; value: number }[]
  }>
}

interface AssessmentResult {
  stance: AIStance
  score: number
  breakdown: Record<string, number>
}

export default function StanceNavigatorPage() {
  const { currentUser } = useAuth()
  const [view, setView] = useState<View>('loading')
  const [profile, setProfile] = useState<StanceProfile | null>(null)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [exploreTab, setExploreTab] = useState<ExploreTab>('spectrum')
  const [submitting, setSubmitting] = useState(false)

  const loadProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await apiFetch<StanceProfile>(currentUser.email, '/api/ai-literacy/stance', {
        signal,
      })
      setProfile(data)
      setView(data.hasCompletedAssessment ? 'explore' : 'landing')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setView('landing')
    }
  }, [currentUser.email])

  useEffect(() => {
    const controller = new AbortController()
    void loadProfile(controller.signal)
    return () => controller.abort()
  }, [loadProfile])

  async function handleAssessmentComplete(
    responses: { questionId: string; selectedValue: number; optionLabel: string }[],
    disciplineFamily?: DisciplineFamily,
    reflectionNote?: string,
  ) {
    setSubmitting(true)
    try {
      const data = await apiFetch<AssessmentResult>(currentUser.email, '/api/ai-literacy/stance', {
        method: 'POST',
        body: JSON.stringify({ responses, disciplineFamily, reflectionNote }),
      })
      setResult({ stance: data.stance, score: data.score, breakdown: data.breakdown })
      setView('result')
      // Refresh profile in background
      void loadProfile()
    } catch {
      // handle error
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManualStanceSelect(stance: AIStance) {
    try {
      await apiFetch(currentUser.email, '/api/ai-literacy/stance', {
        method: 'POST',
        body: JSON.stringify({ manualStance: stance, rationale: 'Manual selection from spectrum' }),
      })
      void loadProfile()
    } catch {
      // handle error
    }
  }

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  const EXPLORE_TABS: { key: ExploreTab; label: string; icon: React.ReactNode }[] = [
    { key: 'spectrum', label: 'Stance Spectrum', icon: <Compass className="size-4" /> },
    { key: 'impact', label: 'Course Impact', icon: <Map className="size-4" /> },
    { key: 'peers', label: 'Peer Distribution', icon: <BarChart3 className="size-4" /> },
    { key: 'journey', label: 'Your Journey', icon: <Clock className="size-4" /> },
  ]

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <span>Stance Navigator</span>
        </nav>
      </div>
      <PageHeader
        title="Instructor Stance Navigator"
        subtitle="Discover where you stand on AI in your teaching — no right answers, just clarity"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Landing — no assessment yet */}
        {view === 'landing' && (
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="space-y-3">
              <h2 className="text-xl font-extrabold text-gray-900">Where do you stand on AI in your teaching?</h2>
              <p className="text-sm text-gray-500">10 questions. ~5 minutes. No right answers.</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setView('assessment')} size="lg">
                Start
              </Button>
              <Button variant="secondary" onClick={() => setView('explore')} size="lg">
                Explore the spectrum
              </Button>
            </div>

            {/* Compact spectrum preview */}
            <div className="flex items-center justify-center gap-1 mt-4">
              {['Prohibit', 'Cautious', 'Guided', 'Integrate', 'Require'].map(s => (
                <div key={s} className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessment wizard */}
        {view === 'assessment' && profile?.questions && (
          <div className="relative">
            {submitting && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-2xl">
                <Loader2 className="size-6 animate-spin text-[#0033A0]" />
              </div>
            )}
            <StanceAssessment
              questions={profile.questions}
              onComplete={handleAssessmentComplete}
              onCancel={() => setView(profile?.hasCompletedAssessment ? 'explore' : 'landing')}
            />
          </div>
        )}

        {/* Results after assessment */}
        {view === 'result' && result && (
          <StanceResult
            stance={result.stance}
            score={result.score}
            breakdown={result.breakdown}
            onRetake={() => setView('assessment')}
            onContinue={() => { setExploreTab('impact'); setView('explore') }}
          />
        )}

        {/* Explore mode (post-assessment or returning user) */}
        {view === 'explore' && (
          <div className="space-y-6">
            {/* Current stance summary */}
            {profile?.stance && (
              <div className="flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Your current stance:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stanceColor(profile.stance)}`}>
                    {stanceLabel(profile.stance)}
                  </span>
                  {profile.stanceUpdatedAt && (
                    <span className="text-xs text-gray-400">
                      since {new Date(profile.stanceUpdatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setView('assessment')}
                  className="text-sm text-[#0033A0] hover:underline"
                >
                  Retake assessment
                </button>
              </div>
            )}

            {!profile?.stance && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <p className="text-sm text-blue-800">Take the 5-minute reflection to discover your AI teaching stance.</p>
                <Button onClick={() => setView('assessment')}>
                  Start
                </Button>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex gap-1 border-b border-gray-200">
              {EXPLORE_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setExploreTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    exploreTab === tab.key
                      ? 'border-[#0033A0] text-[#0033A0]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-[400px]">
              {exploreTab === 'spectrum' && (
                <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">The AI Stance Spectrum</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Click any position to see what it looks like in practice — syllabus language, assignment implications, and more.
                    </p>
                  </div>
                  <StanceSpectrum
                    currentStance={profile?.stance ?? null}
                    onSelectStance={handleManualStanceSelect}
                    interactive
                  />
                </div>
              )}

              {exploreTab === 'impact' && (
                <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">Course Impact Preview</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      See how your stance applies to your actual courses and which assignments may need attention.
                    </p>
                  </div>
                  {profile?.stance ? (
                    <CourseImpactPreview />
                  ) : (
                    <p className="text-sm text-gray-500 py-8 text-center">Complete the stance assessment to see your course impact analysis.</p>
                  )}
                </div>
              )}

              {exploreTab === 'peers' && (
                <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">Where Faculty Stand</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Anonymized distribution of stances across the university. You&apos;re not alone in wherever you land.
                    </p>
                  </div>
                  <PeerDistribution
                    currentStance={profile?.stance ?? null}
                    disciplineFamily={profile?.disciplineFamily}
                  />
                </div>
              )}

              {exploreTab === 'journey' && (
                <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">Your Stance Journey</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Track how your thinking evolves over time. Most faculty&apos;s stances shift as they gain experience.
                    </p>
                  </div>
                  <StanceTimeline />
                </div>
              )}
            </div>
          </div>
        )}
        <PathwayNav />
      </div>
    </>
  )
}

function stanceColor(stance: AIStance): string {
  const map: Record<AIStance, string> = {
    PROHIBIT: 'bg-red-100 text-red-700',
    CAUTIOUS: 'bg-amber-100 text-amber-700',
    GUIDED: 'bg-blue-100 text-blue-700',
    INTEGRATE: 'bg-green-100 text-green-700',
    REQUIRE: 'bg-purple-100 text-purple-700',
  }
  return map[stance]
}

function stanceLabel(stance: AIStance): string {
  const map: Record<AIStance, string> = {
    PROHIBIT: 'Prohibit', CAUTIOUS: 'Cautious', GUIDED: 'Guided', INTEGRATE: 'Integrate', REQUIRE: 'Require',
  }
  return map[stance]
}
