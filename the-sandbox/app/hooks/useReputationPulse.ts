'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import {
  getScenarioData,
  SCENARIO_LIST,
  type ScenarioId,
} from '../lib/crisis-comms/reputation-pulse/synthetic-data/scenarios'
import type {
  ReputationPulsePreflight,
  RepPulsePhase,
  RepPulseInterviewState,
  CrisisIntelligenceBrief,
  PostForClient,
  AIDetectionResult,
  SentimentResult,
  ThemeCluster,
} from '../lib/crisis-comms/reputation-pulse/types'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: RepPulseInterviewState = {
  phase: 'loading',
  userRole: null,
}

interface SproutTopic {
  topic_id: number
  name: string
}

const LOADING_MESSAGES = [
  'Pulling a fresh sample from the social firehose...',
  'Scanning 48 hours of posts across 6 platforms...',
  'Running sentiment classifiers — this takes a sec...',
  'Checking for coordinated bot activity...',
  'Cross-referencing known campus accounts...',
  'Almost there — building your intelligence brief...',
]

function extractChips(text: string): string[] {
  const match = text.match(/<!--CHIPS:\[(.*?)\]-->/)
  if (!match) return []
  try {
    return JSON.parse(`[${match[1]}]`)
  } catch {
    return []
  }
}

function extractPhase(text: string): RepPulsePhase | null {
  const match = text.match(/<!--PHASE:([\w-]+)-->/)
  return match ? match[1] as RepPulsePhase : null
}

export function useReputationPulse() {
  const { currentUser } = useAuth()

  // Scenario
  const [scenarioId, setScenarioId] = useState<ScenarioId>('normal-week')

  // Preflight
  const [preflight, setPreflight] = useState<ReputationPulsePreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Sprout Social
  const [sproutConfigured, setSproutConfigured] = useState(false)
  const [sproutTopics, setSproutTopics] = useState<SproutTopic[]>([])
  const [sproutTopicId, setSproutTopicId] = useState<number | null>(null)
  const [isLiveLoading, setIsLiveLoading] = useState(false)

  // Phase + state
  const [phase, setPhase] = useState<RepPulsePhase>('loading')
  const [interviewState, setInterviewState] = useState<RepPulseInterviewState>(INITIAL_STATE)

  // Analysis results
  const [brief, setBrief] = useState<CrisisIntelligenceBrief | null>(null)
  const [posts, setPosts] = useState<PostForClient[]>([])
  const [aiDetection, setAiDetection] = useState<AIDetectionResult[]>([])
  const [sentimentResults, setSentimentResults] = useState<SentimentResult[]>([])
  const [themes, setThemes] = useState<ThemeCluster[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Sandy chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Preflight + instant seeded load ────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function loadAndAnalyze() {
      try {
        // 1. Preflight — server call (gets user name/role) + Sprout check
        const [pfRes, topicRes] = await Promise.all([
          fetch('/api/crisis-comms/reputation-pulse/preflight', {
            headers: { 'x-demo-user-email': currentUser.email },
          }),
          fetch('/api/sprout/topics', {
            headers: { 'x-demo-user-email': currentUser.email },
          }).catch(() => null),
        ])
        if (!pfRes.ok) throw new Error('Preflight failed')
        const pfData: ReputationPulsePreflight = await pfRes.json()
        if (cancelled) return

        setPreflight(pfData)
        setIsPreflightLoading(false)

        // Check Sprout availability
        if (topicRes?.ok) {
          const topicData = await topicRes.json()
          if (!cancelled && topicData.configured) {
            setSproutConfigured(true)
            setSproutTopics(topicData.topics ?? [])
          }
        }

        // 2. Live Sprout scenario — fetch from API
        if (scenarioId === 'live-sprout' && sproutTopicId) {
          setIsLiveLoading(true)
          try {
            const sproutRes = await fetch('/api/sprout/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
              body: JSON.stringify({ topicId: sproutTopicId, maxPosts: 250, format: 'posts' }),
            })
            if (!sproutRes.ok) throw new Error('Sprout fetch failed')
            const sproutData = await sproutRes.json()
            if (cancelled) return

            const livePosts = sproutData.posts ?? []
            setPosts(livePosts)
            // For live data: skip seeded analysis, show posts without pre-computed brief
            // Sandy will analyze via the interview endpoint
            setBrief(null)
            setAiDetection([])
            setSentimentResults([])
            setThemes([])
            setPhase('deep-dive')
            setInterviewState({ phase: 'deep-dive', userRole: null })

            const firstName = pfData.user.name.split(' ')[0]
            setMessages([
              {
                id: 'msg-0',
                role: 'assistant',
                content: `Hey ${firstName}! I just pulled ${livePosts.length} live posts from Sprout Social (last 7 days). This is real-time data — not a demo scenario. The posts are loaded on the left. Ask me to analyze themes, flag concerns, or draft a response.`,
              },
            ])
            setChips(['Summarize the sentiment landscape', 'Any coordinated activity?', 'What needs immediate attention?', 'Draft a response'])
            setIsSandyTyping(false)
          } finally {
            setIsLiveLoading(false)
          }
          return
        }

        // 3. Load seeded scenario data — no API call
        const scenario = getScenarioData(scenarioId as Exclude<ScenarioId, 'live-sprout'>)
        setBrief(scenario.brief)
        setPosts(scenario.posts)
        setAiDetection(scenario.aiDetection)
        setSentimentResults(scenario.sentimentResults)
        setThemes(scenario.themes)
        setPhase('deep-dive')
        setInterviewState({ phase: 'deep-dive', userRole: null })

        // 3. Sandy narration — seeded, no streaming call
        const firstName = pfData.user.name.split(' ')[0]
        const narration = scenario.getNarration(firstName)
        const narrationChips = extractChips(narration)

        setMessages([
          {
            id: 'msg-0',
            role: 'assistant',
            content: `Hey ${firstName}! Let me pull up your social media analysis...`,
          },
          {
            id: 'msg-1',
            role: 'assistant',
            content: narration,
          },
        ])

        setIsSandyTyping(false)
        if (narrationChips.length > 0) setChips(narrationChips)
      } catch {
        if (!cancelled) {
          setIsPreflightLoading(false)
          setIsAnalyzing(false)
          setMessages([{
            id: 'msg-0',
            role: 'assistant',
            content: 'Sorry, the analysis hit an error. Please try refreshing the page.',
          }])
        }
      }
    }

    void loadAndAnalyze()
    return () => { cancelled = true }
  }, [currentUser.email, scenarioId, sproutTopicId])

  // ── Switch scenario ────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    abortRef.current?.abort()
    msgIdCounter.current = 0
    setPhase('loading')
    setInterviewState(INITIAL_STATE)
    setBrief(null)
    setPosts([])
    setAiDetection([])
    setSentimentResults([])
    setThemes([])
    setIsAnalyzing(false)
    setMessages([])
    setChips([])
    setIsSandyTyping(false)
  }, [])

  const switchScenario = useCallback((id: ScenarioId) => {
    if (id === scenarioId && id !== 'live-sprout') return
    resetState()
    setScenarioId(id)
  }, [scenarioId, resetState])

  /** Switch to live Sprout data for a specific listening topic */
  const loadLiveSprout = useCallback((topicId: number) => {
    resetState()
    setSproutTopicId(topicId)
    setScenarioId('live-sprout')
  }, [resetState])

  // ── Stream helper ────────────────────────────────────────────────────

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

  // ── Send message (deep-dive Q&A — still live via Haiku) ──────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!preflight || isSandyTyping) return

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setChips([])
      setIsSandyTyping(true)

      try {
        const assistantId = nextMsgId()
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        const fullResponse = await streamFetch(
          '/api/crisis-comms/reputation-pulse/interview',
          {
            messages: [...messages, { role: 'user', content: text }].map((m) => ({ role: m.role, content: m.content })),
            preflight,
            interviewState: { ...interviewState, phase },
            brief,
          },
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            )
          },
        )

        const newChips = extractChips(fullResponse)
        const newPhase = extractPhase(fullResponse)
        if (newChips.length > 0) setChips(newChips)
        if (newPhase) {
          setPhase(newPhase)
          setInterviewState((prev) => ({ ...prev, phase: newPhase }))
        }
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, phase, messages, interviewState, brief, nextMsgId, streamFetch],
  )

  const selectChip = useCallback(
    (chip: string) => { void sendMessage(chip) },
    [sendMessage],
  )

  // ── Start over (picks a new random scenario) ────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    msgIdCounter.current = 0
    setPhase('loading')
    setInterviewState(INITIAL_STATE)
    setBrief(null)
    setPosts([])
    setAiDetection([])
    setSentimentResults([])
    setThemes([])
    setIsAnalyzing(false)
    setChips([])
    setIsSandyTyping(true)

    // Show sequential loading messages in Sandy panel
    setMessages([{ id: 'loading-0', role: 'assistant', content: LOADING_MESSAGES[0] }])

    const timers: ReturnType<typeof setTimeout>[] = []
    LOADING_MESSAGES.slice(1).forEach((msg, i) => {
      timers.push(setTimeout(() => {
        setMessages(prev => [...prev, { id: `loading-${i + 1}`, role: 'assistant', content: msg }])
      }, (i + 1) * 800))
    })

    // After all messages, pick a new random scenario and load it
    timers.push(setTimeout(() => {
      // Pick a different scenario than the current one
      const otherScenarios = SCENARIO_LIST.filter(s => s.id !== scenarioId)
      const pick = otherScenarios[Math.floor(Math.random() * otherScenarios.length)]
      setScenarioId(pick.id as ScenarioId)
      setIsSandyTyping(false)
    }, LOADING_MESSAGES.length * 800))

    return () => timers.forEach(clearTimeout)
  }, [scenarioId])

  return {
    preflight,
    isPreflightLoading,
    phase,
    brief,
    posts,
    aiDetection,
    sentimentResults,
    themes,
    isAnalyzing,
    messages,
    chips,
    isSandyTyping,
    currentStep: phase === 'loading' ? 0 : phase === 'ready' ? 1 : 2,
    sendMessage,
    selectChip,
    startOver,
    interviewState,
    scenarioId,
    switchScenario,
    // Sprout Social
    sproutConfigured,
    sproutTopics,
    isLiveLoading,
    loadLiveSprout,
  }
}
