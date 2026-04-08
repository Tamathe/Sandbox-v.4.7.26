'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Beaker, BookOpen, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import PromptLabLevelNav from '../../../components/ai-literacy/PromptLabLevelNav'
import PromptLabChallenge from '../../../components/ai-literacy/PromptLabChallenge'
import PromptLabSandbox from '../../../components/ai-literacy/PromptLabSandbox'
import ModuleProgress from '../../../components/ai-literacy/ModuleProgress'
import { PROMPT_LAB_LEVELS } from '../../../lib/prompt-lab-constants'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'
import type { PromptLabChallenge as ChallengeType } from '../../../lib/prompt-lab-constants'
import LoadingSpinner from '../../../components/LoadingSpinner'

type Tab = 'challenges' | 'sandbox' | 'progress'
type Screen = 'level-select' | 'challenge'

export default function PromptLabPage() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState<Tab>('challenges')
  const [screen, setScreen] = useState<Screen>('level-select')
  const [activeLevel, setActiveLevel] = useState<number | null>(null)
  const [challenges, setChallenges] = useState<ChallengeType[]>([])
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [levelProgress, setLevelProgress] = useState<Record<number, { attempts: number; bestScore: number }>>({})

  // Load progress summary for level nav badges
  const loadProgress = useCallback(async () => {
    const res = await fetch('/api/ai-literacy/prompt-lab/progress', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) {
      const data = await res.json()
      const map: Record<number, { attempts: number; bestScore: number }> = {}
      for (const lp of data.levelProgress ?? []) {
        map[lp.level] = { attempts: lp.attempts, bestScore: lp.bestScore }
      }
      setLevelProgress(map)
    }
  }, [currentUser.email])

  useEffect(() => { void loadProgress() }, [loadProgress])

  async function handleSelectLevel(level: number) {
    setActiveLevel(level)
    setLoading(true)
    const res = await fetch(`/api/ai-literacy/prompt-lab?level=${level}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (res.ok) {
      const data = await res.json()
      setChallenges(data.challenges ?? [])
      setChallengeIndex(0)
      setScreen('challenge')
    }
    setLoading(false)
  }

  function handleChallengeComplete() {
    if (challengeIndex < challenges.length - 1) {
      setChallengeIndex(challengeIndex + 1)
    } else {
      // All challenges done for this level, go back to level select
      void loadProgress()
      setScreen('level-select')
    }
  }

  const currentChallenge = challenges[challengeIndex] ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Prompt Lab"
        subtitle="Master the art of prompt engineering"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <span>Prompt Lab</span>
        </nav>

        {/* Tab switcher (only on level-select screen) */}
        {screen === 'level-select' && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
            <button
              onClick={() => setTab('challenges')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'challenges' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen className="size-4" /> Challenges
            </button>
            <button
              onClick={() => setTab('sandbox')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'sandbox' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Beaker className="size-4" /> Sandbox
            </button>
            <button
              onClick={() => setTab('progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'progress' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="size-4" /> Progress
            </button>
          </div>
        )}

        {/* Progress tab */}
        {screen === 'level-select' && tab === 'progress' && (
          <ModuleProgress
            userEmail={currentUser.email}
            apiPath="/api/ai-literacy/prompt-lab/progress"
            levels={PROMPT_LAB_LEVELS}
            scoreUnit="/10"
            masteryThreshold={8}
            emptyHeading="No attempts yet"
            emptySubtext="Complete some challenges to see your progress here."
            levelPrefix="L"
          />
        )}

        {/* Sandbox tab */}
        {screen === 'level-select' && tab === 'sandbox' && (
          <PromptLabSandbox userEmail={currentUser.email} />
        )}

        {/* Challenges tab — level select */}
        {screen === 'level-select' && tab === 'challenges' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : (
              <PromptLabLevelNav
                activeLevel={activeLevel}
                onSelectLevel={handleSelectLevel}
                levelProgress={levelProgress}
              />
            )}
          </>
        )}

        {/* Challenge screen */}
        {screen === 'challenge' && currentChallenge && (
          <>
            <div className="text-xs text-gray-400 mb-4">
              Challenge {challengeIndex + 1} of {challenges.length}
            </div>
            <PromptLabChallenge
              key={currentChallenge.id}
              challenge={currentChallenge}
              userEmail={currentUser.email}
              onComplete={handleChallengeComplete}
              onBack={() => { void loadProgress(); setScreen('level-select') }}
            />
          </>
        )}

        <PathwayNav />
      </div>
    </div>
  )
}
