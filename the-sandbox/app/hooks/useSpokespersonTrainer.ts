'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type {
  SpokespersonPreflight,
  SpokespersonPhase,
  SpokespersonInterviewState,
  Difficulty,
  DrillScores,
  DrillHistoryEntry,
  CoachingNudge,
  AnswerAnnotation,
} from '../lib/crisis-comms/spokesperson-trainer/types'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: SpokespersonInterviewState = {
  phase: 'setup',
  scenarioId: null,
  scenarioTitle: null,
  difficulty: 'standard',
  userRole: 'University Spokesperson',
  confirmedFacts: [],
  unknownFacts: [],
  questionsAnswered: 0,
  scores: null,
  modelResponseRequested: false,
  keyMessages: [],
  injectDelivered: false,
}

function extractChips(text: string): string[] {
  const match = text.match(/<!--CHIPS:\[(.*?)\]-->/)
  if (!match) return []
  try {
    return JSON.parse(`[${match[1]}]`)
  } catch {
    return []
  }
}

function extractPhase(text: string): SpokespersonPhase | null {
  const match = text.match(/<!--PHASE:([\w-]+)-->/)
  return match ? (match[1] as SpokespersonPhase) : null
}

function clampScore(n: number): number {
  return Math.max(1, Math.min(10, n))
}

function extractScoresFromText(text: string): DrillScores | null {
  const scoreMap: Record<string, number> = {}
  const regex = /<!--SCORE:(\w+):(\d+)-->/g
  let match
  while ((match = regex.exec(text)) !== null) {
    scoreMap[match[1]] = clampScore(parseInt(match[2], 10))
  }

  if (
    scoreMap['clarity'] === undefined ||
    scoreMap['empathy'] === undefined ||
    scoreMap['speculationControl'] === undefined ||
    scoreMap['messageDiscipline'] === undefined
  ) {
    return null
  }

  return {
    clarity: scoreMap['clarity'],
    empathy: scoreMap['empathy'],
    speculationControl: scoreMap['speculationControl'],
    messageDiscipline: scoreMap['messageDiscipline'],
  }
}

/** Extract coaching nudge from <!--COACH:technique|label|suggestion--> marker */
function extractCoachingNudge(text: string): CoachingNudge | null {
  const match = text.match(/<!--COACH:([^|]+)\|([^|]+)\|([^>]+)-->/)
  if (!match) return null
  return {
    technique: match[1] as CoachingNudge['technique'],
    label: match[2],
    suggestion: match[3],
  }
}

/** Check if the inject was just delivered */
function checkInjectDelivered(text: string): boolean {
  return text.includes('<!--INJECT:delivered-->')
}

export function useSpokespersonTrainer() {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<SpokespersonPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Single source of truth for state — phase lives ONLY inside interviewState
  const [interviewState, setInterviewState] = useState<SpokespersonInterviewState>(INITIAL_STATE)
  const phase = interviewState.phase

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  // Scores + history
  const [scores, setScores] = useState<DrillScores | null>(null)
  const [drillHistory, setDrillHistory] = useState<DrillHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [drillSaved, setDrillSaved] = useState(false)

  // Debrief full text (for surfacing qualitative feedback in left panel)
  const [debriefText, setDebriefText] = useState<string>('')

  // Coaching nudges (real-time during interview)
  const [currentNudge, setCurrentNudge] = useState<CoachingNudge | null>(null)
  const [pastNudges, setPastNudges] = useState<CoachingNudge[]>([])

  // Annotations (replay mode)
  const [annotations, setAnnotations] = useState<AnswerAnnotation[]>([])
  const [isAnnotating, setIsAnnotating] = useState(false)

  // Track preflight load count so startOver can re-trigger
  const [preflightKey, setPreflightKey] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Preflight + greeting ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/crisis-comms/spokesperson-trainer/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: SpokespersonPreflight = await res.json()
        if (cancelled) return

        setPreflight(data)
        setIsPreflightLoading(false)

        const firstName = data.user.name.split(' ')[0]
        const hasHistory = data.pastDrills.length > 0
        const greeting = hasHistory
          ? `Welcome back, ${firstName}. You've done ${data.totalDrillCount} drill${data.totalDrillCount > 1 ? 's' : ''} so far. Pick a scenario and difficulty from the left panel, or tell me about a custom crisis you'd like to practice.`
          : `Hey ${firstName}! I'm your media training coach. Pick a crisis scenario, your role, and a difficulty level from the left panel to get started — or describe a custom scenario if you have something specific in mind.\n\nNew: You can define **key messages** you want to land, and try **Press Conference** mode for multi-reporter chaos.`

        setMessages([{
          id: 'msg-0',
          role: 'assistant',
          content: `${greeting}\n\n<!--CHIPS:["Tell me about the difficulty levels","I want to do a custom scenario"]-->\n<!--PHASE:setup-->`,
        }])
        setChips(['Tell me about the difficulty levels', 'I want to do a custom scenario'])
      } catch {
        if (!cancelled) {
          setIsPreflightLoading(false)
          setMessages([{
            id: 'msg-0',
            role: 'assistant',
            content: 'Sorry, I hit an error loading your profile. Please try refreshing.',
          }])
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [currentUser.email, preflightKey])

  // ── Stream helper ──────────────────────────────────────────────────

  const streamFetch = useCallback(
    async (url: string, body: unknown, onChunk: (text: string) => void): Promise<string> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        onChunk(chunk)
      }
      return full
    },
    [currentUser.email],
  )

  // ── Send message ───────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string, stateOverride?: Partial<SpokespersonInterviewState>) => {
      if (!preflight || isSandyTyping) return

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      setMessages((prev) => [...prev, userMsg])
      setChips([])
      setIsSandyTyping(true)
      setCurrentNudge(null)

      try {
        const assistantId = nextMsgId()
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        // Count user responses during interview phase (use closure phase, not override,
        // so the "begin interview" message doesn't count as an answered question)
        const updatedQuestions = phase === 'interview'
          ? interviewState.questionsAnswered + 1
          : interviewState.questionsAnswered

        const currentState: SpokespersonInterviewState = {
          ...interviewState,
          ...stateOverride,
          questionsAnswered: updatedQuestions,
        }

        const fullResponse = await streamFetch(
          '/api/crisis-comms/spokesperson-trainer/interview',
          {
            messages: [...messages, { role: 'user', content: text }].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            preflight,
            interviewState: currentState,
          },
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            )
          },
        )

        // Parse markers
        const newChips = extractChips(fullResponse)
        const newPhase = extractPhase(fullResponse)
        const nudge = extractCoachingNudge(fullResponse)
        const injectJustDelivered = checkInjectDelivered(fullResponse)

        // Show coaching nudge during interview
        if (nudge && (newPhase === 'interview' || (!newPhase && phase === 'interview'))) {
          setCurrentNudge(nudge)
        }

        // During interview phase, always include the debrief escape chip
        if ((newPhase === 'interview' || (!newPhase && phase === 'interview')) && !newChips.includes('End interview — get my debrief')) {
          newChips.push('End interview — get my debrief')
        }

        if (newChips.length > 0) setChips(newChips)

        const stateUpdates: Partial<SpokespersonInterviewState> = {
          questionsAnswered: updatedQuestions,
        }
        if (newPhase) stateUpdates.phase = newPhase
        if (injectJustDelivered) stateUpdates.injectDelivered = true

        setInterviewState((prev) => ({ ...prev, ...stateUpdates }))

        // Extract scores if debrief
        if (newPhase === 'debrief' || phase === 'debrief') {
          const extracted = extractScoresFromText(fullResponse)
          if (extracted) {
            setScores(extracted)
            setInterviewState((prev) => ({ ...prev, scores: extracted }))
          }
          // Store the full debrief text for left panel
          if (newPhase === 'debrief') {
            setDebriefText(fullResponse)
          }
        }
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, phase, messages, interviewState, nextMsgId, streamFetch],
  )

  // ── Save drill (called when scores are extracted) ──────────────────

  useEffect(() => {
    if (!scores || drillSaved || !preflight) return

    async function save() {
      try {
        await fetch('/api/crisis-comms/spokesperson-trainer/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify({
            scenarioTitle: interviewState.scenarioTitle ?? 'Custom',
            difficulty: interviewState.difficulty,
            scores,
            questionsAnswered: interviewState.questionsAnswered,
            keyMessages: interviewState.keyMessages,
          }),
        })
        setDrillSaved(true)
      } catch {
        // Non-critical — don't break the experience
      }
    }

    void save()
  }, [scores, drillSaved, preflight, interviewState, currentUser.email])

  // ── Key messages ────────────────────────────────────────────────────

  const setKeyMessages = useCallback(
    (keyMessages: string[]) => {
      setInterviewState((prev) => ({ ...prev, keyMessages }))
    },
    [],
  )

  // ── Select scenario ────────────────────────────────────────────────

  const selectScenario = useCallback(
    (scenarioId: string, scenarioTitle: string) => {
      setInterviewState((prev) => ({ ...prev, scenarioId, scenarioTitle }))
    },
    [],
  )

  // ── Select difficulty ──────────────────────────────────────────────

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      setInterviewState((prev) => ({ ...prev, difficulty }))
    },
    [],
  )

  // ── Select role ────────────────────────────────────────────────────

  const selectRole = useCallback(
    (userRole: string) => {
      setInterviewState((prev) => ({ ...prev, userRole }))
    },
    [],
  )

  // ── Begin interview (after scenario + difficulty selected) ─────────

  const beginInterview = useCallback(() => {
    if (!interviewState.scenarioId) return

    const keyMsgSummary = interviewState.keyMessages.length > 0
      ? ` My key messages: ${interviewState.keyMessages.map((m, i) => `(${i + 1}) ${m}`).join(', ')}.`
      : ''

    // Custom scenarios stay in setup phase — Sandy gathers facts via chat
    if (interviewState.scenarioId === 'custom') {
      void sendMessage(
        `I want to do a custom crisis scenario. I'll be the ${interviewState.userRole ?? 'University Spokesperson'} on ${interviewState.difficulty} difficulty.${keyMsgSummary}`,
      )
      return
    }

    // Preset scenarios advance to interview immediately
    setInterviewState((prev) => ({ ...prev, phase: 'interview' }))
    void sendMessage(
      `I've selected the "${interviewState.scenarioTitle}" scenario on ${interviewState.difficulty} difficulty. I'm the ${interviewState.userRole ?? 'University Spokesperson'}.${keyMsgSummary} Let's begin the interview.`,
      { phase: 'interview' },
    )
  }, [interviewState, sendMessage])

  // ── Request annotations (replay mode) ──────────────────────────────

  const requestAnnotations = useCallback(async () => {
    if (isAnnotating || annotations.length > 0) {
      // Already have annotations — just switch to replay view
      setInterviewState((prev) => ({ ...prev, phase: 'replay' }))
      return
    }

    setIsAnnotating(true)
    setInterviewState((prev) => ({ ...prev, phase: 'replay' }))

    try {
      const res = await fetch('/api/crisis-comms/spokesperson-trainer/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          keyMessages: interviewState.keyMessages,
          scenarioTitle: interviewState.scenarioTitle ?? 'Custom',
          difficulty: interviewState.difficulty,
        }),
      })

      if (res.ok) {
        const data: AnswerAnnotation[] = await res.json()
        setAnnotations(data)
      }
    } catch {
      // Non-critical
    } finally {
      setIsAnnotating(false)
    }
  }, [isAnnotating, annotations.length, messages, interviewState, currentUser.email])

  // ── Chip select ────────────────────────────────────────────────────

  const selectChip = useCallback(
    (chip: string) => {
      if (chip === 'View my drill history') {
        setShowHistory(true)
        return
      }
      if (chip === 'Run another drill') {
        startOver()
        return
      }
      if (chip === 'Back to debrief') {
        setInterviewState((prev) => ({ ...prev, phase: 'debrief' }))
        setChips(['Show me a model response', 'Review my answers', 'Run another drill', 'View my drill history'])
        return
      }
      if (chip === 'End interview — get my debrief') {
        void sendMessage('Debrief me. Score my performance.')
        return
      }
      if (chip === 'Review my answers') {
        void requestAnnotations()
        return
      }
      void sendMessage(chip)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendMessage, requestAnnotations],
  )

  // ── Back to debrief from replay ─────────────────────────────────────

  const backToDebrief = useCallback(() => {
    setInterviewState((prev) => ({ ...prev, phase: 'debrief' }))
    setChips(['Show me a model response', 'Review my answers', 'Run another drill', 'View my drill history'])
  }, [])

  // ── Dismiss coaching nudge ─────────────────────────────────────────

  const dismissNudge = useCallback(() => {
    setCurrentNudge((prev) => {
      if (prev) setPastNudges((list) => [...list, prev])
      return null
    })
  }, [])

  // ── Start over (proper state reset, no reload) ─────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    msgIdCounter.current = 0
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setIsSandyTyping(false)
    setScores(null)
    setDebriefText('')
    setDrillSaved(false)
    setShowHistory(false)
    setDrillHistory([])
    setCurrentNudge(null)
    setPastNudges([])
    setAnnotations([])
    setIsAnnotating(false)
    // Bump preflightKey to re-trigger the preflight effect + greeting
    setPreflightKey((k) => k + 1)
  }, [])

  // ── Load drill history (re-fetches every time toggle opens) ────────

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/crisis-comms/spokesperson-trainer/history', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data: DrillHistoryEntry[] = await res.json()
        setDrillHistory(data)
      }
    } catch {
      // Non-critical
    }
  }, [currentUser.email])

  useEffect(() => {
    if (showHistory) {
      void loadHistory()
    }
  }, [showHistory, loadHistory])

  return {
    preflight,
    isPreflightLoading,
    phase,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    scores,
    debriefText,
    drillHistory,
    showHistory,
    setShowHistory,
    currentNudge,
    pastNudges,
    annotations,
    isAnnotating,
    currentStep: phase === 'setup' ? 0 : phase === 'interview' ? 1 : 2,
    sendMessage,
    selectChip,
    selectScenario,
    selectDifficulty,
    selectRole,
    setKeyMessages,
    beginInterview,
    startOver,
    loadHistory,
    dismissNudge,
    requestAnnotations,
    backToDebrief,
  }
}
