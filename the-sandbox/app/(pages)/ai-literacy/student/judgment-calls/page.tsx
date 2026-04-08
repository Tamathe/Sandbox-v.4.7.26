'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Scale, ChevronRight, Loader2, CheckCircle,
  Shield, BookOpen, AlertTriangle, Waypoints,
} from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import PathwayNav from '../../../../components/ai-literacy/PathwayNav'

interface Scenario {
  id: string
  title: string
  description: string
  category: 'ETHICS' | 'CITATION' | 'BOUNDARIES' | 'RESPONSIBLE_USE'
  disciplineFamily: string | null
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
}

interface UserAttempt {
  id: string
  scenarioId: string
  ethicalScore: number
  judgmentScore: number
  completedAt: string | null
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  ALL: { label: 'All', icon: Scale, color: 'text-gray-700' },
  ETHICS: { label: 'Ethics', icon: Shield, color: 'text-red-600' },
  CITATION: { label: 'Citation', icon: BookOpen, color: 'text-blue-600' },
  BOUNDARIES: { label: 'Boundaries', icon: AlertTriangle, color: 'text-amber-600' },
  RESPONSIBLE_USE: { label: 'Responsible Use', icon: Waypoints, color: 'text-green-600' },
}

const DIFFICULTY_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  BEGINNER: { label: 'Beginner', bg: 'bg-green-50', text: 'text-green-700' },
  INTERMEDIATE: { label: 'Intermediate', bg: 'bg-amber-50', text: 'text-amber-700' },
  ADVANCED: { label: 'Advanced', bg: 'bg-red-50', text: 'text-red-700' },
}

const DISCIPLINE_LABELS: Record<string, string> = {
  STEM: 'STEM',
  HUMANITIES: 'Humanities',
  SOCIAL_SCIENCES: 'Social Sciences',
  ARTS: 'Arts',
  PROFESSIONAL: 'Professional',
  HEALTH_SCIENCES: 'Health Sciences',
}

export default function JudgmentCallsHubPage() {
  const { currentUser } = useAuth()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [userAttempts, setUserAttempts] = useState<UserAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('ALL')
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    fetch('/api/ai-literacy/student/judgment-calls', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setScenarios(data.scenarios ?? [])
          setUserAttempts(data.userAttempts ?? [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser.email])

  const filtered = activeCategory === 'ALL'
    ? scenarios
    : scenarios.filter((s) => s.category === activeCategory)

  const attemptMap = new Map<string, UserAttempt>()
  for (const a of userAttempts) {
    if (!attemptMap.has(a.scenarioId)) attemptMap.set(a.scenarioId, a)
  }

  const completedCount = new Set(userAttempts.map((a) => a.scenarioId)).size

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <span>Judgment Calls</span>
        </nav>
      </div>
      <PageHeader
        title="Judgment Calls"
        subtitle="Navigate real-world AI dilemmas through branching scenarios — every choice has consequences"
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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-16">
            <Scale className="size-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No scenarios available yet. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0033A0] rounded-full transition-all"
                  style={{ width: `${(completedCount / scenarios.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 shrink-0">
                {completedCount}/{scenarios.length} completed
              </span>
            </div>

            {/* Category filter tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                const isActive = activeCategory === key
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-[#0033A0] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            {/* Scenario cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((scenario) => {
                const attempt = attemptMap.get(scenario.id)
                const diff = DIFFICULTY_BADGE[scenario.difficulty]
                const catCfg = CATEGORY_CONFIG[scenario.category]
                const CatIcon = catCfg?.icon ?? Scale

                return (
                  <Link
                    key={scenario.id}
                    href={`/ai-literacy/student/judgment-calls/${scenario.id}`}
                    className="block border-2 border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="size-8 rounded-full bg-amber-50 flex items-center justify-center">
                        <CatIcon className="size-4 text-amber-600" />
                      </div>
                      {attempt && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="size-3" />
                          Done
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-gray-900">{scenario.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{scenario.description}</p>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${diff.bg} ${diff.text}`}>
                        {diff.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {catCfg?.label}
                      </span>
                      {scenario.disciplineFamily && (
                        <span className="text-xs text-gray-400">
                          {DISCIPLINE_LABELS[scenario.disciplineFamily] ?? scenario.disciplineFamily}
                        </span>
                      )}
                    </div>

                    {attempt && (
                      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs">
                          <span className="text-gray-400">Ethical</span>
                          <span className="ml-1 font-semibold text-gray-700">{attempt.ethicalScore}%</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-400">Judgment</span>
                          <span className="ml-1 font-semibold text-gray-700">{attempt.judgmentScore}%</span>
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">No scenarios in this category.</p>
              </div>
            )}
          </>
        )}

        <PathwayNav />
      </div>
    </>
  )
}
