'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, ArrowRight, Sparkles, Hammer, Users, BarChart3, Bot, FileText } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { logEvaluatorAction } from '../lib/evaluator-session-log'

const TOUR_KEY = 'uky-evaluator-tour'

interface TourStep {
  route: string
  title: string
  description: string
  icon: typeof Sparkles
  targetSelector?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    route: '/evaluate',
    title: 'Welcome',
    description:
      'This guided tour will walk you through the key features of the platform. You\'ll see how faculty create AI tools, how students interact with them, and the analytics that tie it all together.',
    icon: Sparkles,
  },
  {
    route: '/build?evaluator=true',
    title: 'The Builder',
    description:
      'This is where the magic happens. Faculty describe a learning experience in plain language — a quiz, a simulation, an AI tutor — and it generates in minutes. Zero coding required.',
    icon: Hammer,
    targetSelector: '[data-tour="builder-input"]',
  },
  {
    route: '/hub?tab=tools',
    title: 'Student Experience',
    description:
      'Students browse published tools here. Each tool is an interactive AI experience tied to a course — from adaptive quizzes to clinical simulations. Every interaction generates learning signals.',
    icon: Users,
    targetSelector: '[data-tour="tools-grid"]',
  },
  {
    route: '/analytics/faculty',
    title: 'Faculty Analytics',
    description:
      'Real-time dashboards show engagement, mastery, and at-risk indicators — before grades are due. Faculty see which tools work and which students need help.',
    icon: BarChart3,
    targetSelector: '[data-tour="analytics-kpi"]',
  },
  {
    route: '/build?evaluator=true',
    title: 'Sandy — Your AI Concierge',
    description:
      'Sandy is built into every page. She helps faculty build tools, guides students to the right resources, and surfaces proactive insights based on what\'s happening in the platform.',
    icon: Bot,
    targetSelector: '[data-tour="sandy-panel"]',
  },
  {
    route: '/evaluate/summary',
    title: 'Your Session Summary',
    description:
      'At the end of your evaluation, a printable summary captures your session — time spent, steps completed, platform metrics, and key value propositions. You can email it to yourself or your team.',
    icon: FileText,
  },
]

interface TourState {
  active: boolean
  currentStep: number
}

function getTourState(): TourState {
  if (typeof window === 'undefined') return { active: false, currentStep: 0 }
  try {
    const raw = sessionStorage.getItem(TOUR_KEY)
    if (raw) return JSON.parse(raw) as TourState
  } catch {}
  return { active: false, currentStep: 0 }
}

function saveTourState(state: TourState) {
  try {
    sessionStorage.setItem(TOUR_KEY, JSON.stringify(state))
  } catch {}
}

export function startTour() {
  saveTourState({ active: true, currentStep: 0 })
  window.dispatchEvent(new CustomEvent('uky-tour-start'))
}

export default function EvaluatorTour() {
  const { evaluatorMode } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [tourState, setTourState] = useState<TourState>({ active: false, currentStep: 0 })
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null)

  // Listen for tour start event
  useEffect(() => {
    function onStart() {
      const state = { active: true, currentStep: 0 }
      setTourState(state)
      saveTourState(state)
      logEvaluatorAction('tour-started')
    }
    window.addEventListener('uky-tour-start', onStart)
    return () => window.removeEventListener('uky-tour-start', onStart)
  }, [])

  // Restore tour state on mount
  useEffect(() => {
    if (!evaluatorMode) return
    const state = getTourState()
    if (state.active) setTourState(state)
  }, [evaluatorMode])

  const step = TOUR_STEPS[tourState.currentStep]

  // Navigate to the step's route if needed
  useEffect(() => {
    if (!tourState.active || !step) return
    const stepPath = step.route.split('?')[0]
    if (pathname !== stepPath) {
      router.push(step.route)
    }
  }, [tourState.active, tourState.currentStep, step, pathname, router])

  // Find and measure the target element for spotlight
  useEffect(() => {
    if (!tourState.active || !step) return

    const stepPath = step.route.split('?')[0]
    if (pathname !== stepPath) {
      setSpotlightRect(null)
      setTooltipPos(null)
      return
    }

    if (!step.targetSelector) {
      setSpotlightRect(null)
      setTooltipPos(null)
      return
    }

    // Delay to let page render
    const timeout = setTimeout(() => {
      const el = document.querySelector(step.targetSelector!)
      if (el) {
        const rect = el.getBoundingClientRect()
        setSpotlightRect(rect)

        // Position tooltip below the spotlight, centered
        const tooltipWidth = 380
        let left = rect.left + rect.width / 2 - tooltipWidth / 2
        left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
        const top = rect.bottom + 16
        setTooltipPos({ top, left })
      } else {
        setSpotlightRect(null)
        setTooltipPos(null)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [tourState.active, tourState.currentStep, step, pathname])

  const endTour = useCallback((completed: boolean) => {
    const state = { active: false, currentStep: 0 }
    setTourState(state)
    saveTourState(state)
    setSpotlightRect(null)
    setTooltipPos(null)
    if (completed) {
      logEvaluatorAction('tour-completed')
    }
  }, [])

  const goNext = useCallback(() => {
    const nextStep = tourState.currentStep + 1
    if (nextStep >= TOUR_STEPS.length) {
      endTour(true)
      return
    }
    const state = { active: true, currentStep: nextStep }
    setTourState(state)
    saveTourState(state)
    setSpotlightRect(null)
    setTooltipPos(null)
  }, [tourState.currentStep, endTour])

  if (!evaluatorMode || !tourState.active || !step) return null

  const stepPath = step.route.split('?')[0]
  const onCorrectPage = pathname === stepPath
  const isLastStep = tourState.currentStep === TOUR_STEPS.length - 1
  const hasSpotlight = spotlightRect && step.targetSelector && onCorrectPage
  const StepIcon = step.icon

  // Spotlight mask dimensions with padding
  const pad = 12
  const spotX = hasSpotlight ? spotlightRect!.left - pad : 0
  const spotY = hasSpotlight ? spotlightRect!.top - pad : 0
  const spotW = hasSpotlight ? spotlightRect!.width + pad * 2 : 0
  const spotH = hasSpotlight ? spotlightRect!.height + pad * 2 : 0

  return (
    <div className="fixed inset-0 z-[9995]">
      {/* Backdrop with optional spotlight cutout */}
      {hasSpotlight ? (
        <svg className="absolute inset-0 size-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotX}
                y={spotY}
                width={spotW}
                height={spotH}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tour-spotlight-mask)"
            style={{ pointerEvents: 'auto' }}
            onClick={() => endTour(false)}
          />
        </svg>
      ) : (
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => endTour(false)}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute animate-[fadeIn_0.3s_ease-out_both]"
        style={
          tooltipPos && hasSpotlight
            ? { top: tooltipPos.top, left: tooltipPos.left, width: 380 }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 420,
              }
        }
      >
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#0033A0]/20 overflow-hidden">
          {/* Header */}
          <div className="bg-[#0033A0] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <StepIcon className="size-5 text-white" />
              <span className="text-sm font-bold text-white">{step.title}</span>
            </div>
            <button
              onClick={() => endTour(false)}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="Close tour"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              {tourState.currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => endTour(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Skip Tour
              </button>
              {onCorrectPage ? (
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#002880] cursor-pointer"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                  <ArrowRight className="size-3.5" />
                </button>
              ) : (
                <span className="text-xs text-gray-400 italic">Navigating...</span>
              )}
            </div>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pb-3">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-full transition-colors ${
                  i === tourState.currentStep
                    ? 'bg-[#0033A0]'
                    : i < tourState.currentStep
                    ? 'bg-[#0033A0]/40'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
