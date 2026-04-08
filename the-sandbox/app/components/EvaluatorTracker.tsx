'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Clock, CheckCircle2, Circle, BarChart3, LogOut, ExternalLink, ArrowRight } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { logEvaluatorAction, clearEvaluatorLog } from '../lib/evaluator-session-log'

const EVALUATOR_START_KEY = 'uky-evaluator-start-time'
const EVALUATOR_PROGRESS_KEY = 'uky-evaluator-progress'
const EVALUATOR_DISMISSED_KEY = 'uky-evaluator-dismissed-callouts'

interface EvaluatorProgress {
  landed: boolean
  builtTool: boolean
  sawStudentExperience: boolean
  exploredAnalytics: boolean
}

interface DiscoveredMetrics {
  toolCount: number | null
  activeStudents: number | null
  avgSessionScore: number | null
}

function getProgress(): EvaluatorProgress {
  if (typeof window === 'undefined') return { landed: true, builtTool: false, sawStudentExperience: false, exploredAnalytics: false }
  try {
    const raw = sessionStorage.getItem(EVALUATOR_PROGRESS_KEY)
    if (raw) return JSON.parse(raw) as EvaluatorProgress
  } catch {}
  return { landed: true, builtTool: false, sawStudentExperience: false, exploredAnalytics: false }
}

function saveProgress(progress: EvaluatorProgress) {
  try {
    sessionStorage.setItem(EVALUATOR_PROGRESS_KEY, JSON.stringify(progress))
  } catch {}
}

function formatElapsed(startTime: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function EvaluatorTracker() {
  const { evaluatorMode, currentUser, setEvaluatorMode } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [progress, setProgress] = useState<EvaluatorProgress>(getProgress)
  const [elapsed, setElapsed] = useState('0:00')
  const [metrics, setMetrics] = useState<DiscoveredMetrics>({
    toolCount: null,
    activeStudents: null,
    avgSessionScore: null,
  })
  const [exitState, setExitState] = useState<'idle' | 'confirm' | 'thankyou'>('idle')

  // Update elapsed time every second
  useEffect(() => {
    if (!evaluatorMode) return
    const startTime = sessionStorage.getItem(EVALUATOR_START_KEY)
    if (!startTime) return

    setElapsed(formatElapsed(startTime))
    const interval = setInterval(() => {
      setElapsed(formatElapsed(startTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [evaluatorMode])

  // Track progress based on page visits
  const updateProgress = useCallback((updates: Partial<EvaluatorProgress>) => {
    setProgress(prev => {
      const next = { ...prev, ...updates }
      saveProgress(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (!evaluatorMode) return

    // "Built your first AI tool" — detect when builder completes
    const handleBuildComplete = () => {
      updateProgress({ builtTool: true })
      logEvaluatorAction('tool-built')
    }
    window.addEventListener('uky-build-complete', handleBuildComplete)

    // Also check if they're on a build page that shows a result
    if (pathname.startsWith('/build') && pathname.includes('result')) {
      updateProgress({ builtTool: true })
    }

    return () => {
      window.removeEventListener('uky-build-complete', handleBuildComplete)
    }
  }, [evaluatorMode, pathname, updateProgress])

  useEffect(() => {
    if (!evaluatorMode) return

    // "Saw the student experience" — visiting a tool page
    if (pathname.startsWith('/tools/') && pathname.split('/').length >= 3) {
      updateProgress({ sawStudentExperience: true })
    }

    // "Explored analytics"
    if (pathname.startsWith('/analytics')) {
      updateProgress({ exploredAnalytics: true })
    }
  }, [evaluatorMode, pathname, updateProgress])

  // Fetch platform metrics when visiting analytics or hub
  useEffect(() => {
    if (!evaluatorMode) return
    if (!pathname.startsWith('/analytics') && pathname !== '/hub' && pathname !== '/') return

    const headers: Record<string, string> = { 'x-demo-user-email': currentUser.email }

    fetch('/api/dashboard', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setMetrics(prev => ({
          toolCount: data.toolCount ?? prev.toolCount,
          activeStudents: data.studentCount ?? prev.activeStudents,
          avgSessionScore: data.avgScore ?? prev.avgSessionScore,
        }))
      })
      .catch(() => {})
  }, [evaluatorMode, pathname, currentUser.email])

  const handleEndEvaluation = useCallback(() => {
    logEvaluatorAction('evaluation-ended')
    setExitState('thankyou')
    setTimeout(() => {
      router.push('/evaluate/summary')
      // Delay cleanup so the summary page reads sessionStorage before we clear it
      setTimeout(() => {
        try {
          sessionStorage.removeItem(EVALUATOR_START_KEY)
          sessionStorage.removeItem(EVALUATOR_PROGRESS_KEY)
          sessionStorage.removeItem(EVALUATOR_DISMISSED_KEY)
          sessionStorage.removeItem('uky-evaluator-mode')
        } catch {}
        clearEvaluatorLog()
        setEvaluatorMode(false)
      }, 1000)
    }, 1200)
  }, [router, setEvaluatorMode])

  if (!evaluatorMode) return null

  const steps = [
    { label: 'Landed on the platform', done: progress.landed },
    { label: 'Built your first AI tool', done: progress.builtTool },
    { label: 'Saw the student experience', done: progress.sawStudentExperience },
    { label: 'Explored analytics', done: progress.exploredAnalytics },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allComplete = completedCount === steps.length
  const hasMetrics = metrics.toolCount !== null || metrics.activeStudents !== null || metrics.avgSessionScore !== null

  return (
    <div className="fixed bottom-24 right-4 z-[9990] w-72 font-sans">
      {/* Header — always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between rounded-t-xl border-2 border-[#0033A0] bg-[#0033A0] px-4 py-2.5 text-white transition-colors hover:bg-[#002880]"
      >
        <div className="flex items-center gap-2">
          <Clock className="size-4" />
          <span className="text-sm font-semibold">Your Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
            {elapsed}
          </span>
          {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {/* Body — collapsible */}
      {!collapsed && (
        <div className="rounded-b-xl border-2 border-t-0 border-[#0033A0]/20 bg-white shadow-lg">
          {/* Steps checklist */}
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Steps
              </span>
              <span className="text-xs text-gray-400">
                {completedCount}/{steps.length}
              </span>
            </div>
            <div className="space-y-2">
              {steps.map((step) => (
                <div key={step.label} className="flex items-center gap-2">
                  {step.done ? (
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="size-4 text-gray-300 shrink-0" />
                  )}
                  <span className={`text-sm ${step.done ? 'text-gray-700' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0033A0] transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Discovered metrics */}
          {hasMetrics && (
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-[#0033A0]" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Key Metrics
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {metrics.toolCount !== null && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#0033A0]">{metrics.toolCount}</div>
                    <div className="text-[10px] text-gray-400 leading-tight">Tools</div>
                  </div>
                )}
                {metrics.activeStudents !== null && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#0033A0]">{metrics.activeStudents}</div>
                    <div className="text-[10px] text-gray-400 leading-tight">Students</div>
                  </div>
                )}
                {metrics.avgSessionScore !== null && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#0033A0]">
                      {Math.round(metrics.avgSessionScore * 100)}%
                    </div>
                    <div className="text-[10px] text-gray-400 leading-tight">Avg Score</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compare link */}
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => router.push('/evaluate/compare')}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-blue-50 hover:text-[#0033A0] cursor-pointer"
            >
              <span>See the difference</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          {/* Exit / Summary actions */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-2">
            {/* "View Summary" link — only when all 4 steps done */}
            {allComplete && exitState === 'idle' && (
              <button
                onClick={() => router.push('/evaluate/summary')}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0033A0]/20 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#0033A0] transition hover:bg-blue-100 cursor-pointer"
              >
                <ExternalLink className="size-3.5" />
                View Summary
              </button>
            )}

            {/* Thank-you state */}
            {exitState === 'thankyou' && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-center">
                <p className="text-sm font-semibold text-green-700">Thank you for exploring!</p>
                <p className="text-xs text-green-600 mt-0.5">Redirecting to your summary...</p>
              </div>
            )}

            {/* Confirmation state */}
            {exitState === 'confirm' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-800 mb-2">End your evaluation?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleEndEvaluation}
                    className="flex-1 rounded-md bg-[#0033A0] px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-[#002880] cursor-pointer"
                  >
                    Yes, end
                  </button>
                  <button
                    onClick={() => setExitState('idle')}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* End Evaluation button — default state */}
            {exitState === 'idle' && (
              <button
                onClick={() => setExitState('confirm')}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-red-300 hover:text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                End Evaluation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
