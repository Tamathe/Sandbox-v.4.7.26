'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { MeetingMachinePreflight } from '../lib/meeting-machine-preflight'
import {
  extractChips,
  extractPhase,
  type MeetingToolSlug,
  type MeetingInterviewState,
} from '../lib/meeting-machine-elevation-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: MeetingInterviewState = {
  phase: 'greeting',
  meetingType: null,
  duration: null,
  attendees: [],
  topics: [],
  decisions: [],
  actionItems: [],
  tone: null,
}

const TOOL_GREETINGS: Record<MeetingToolSlug, (pf: MeetingMachinePreflight) => { message: string; chips: string[] }> = {
  'agenda-builder': (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    const courseChips = pf.courses.slice(0, 2).map((c) => `${c.code} class meeting`)
    return {
      message: `Hey ${firstName}! Let's build a meeting agenda. What kind of meeting is this?`,
      chips: [
        'Study group',
        ...courseChips,
        'Project sync',
        '1:1 with advisor',
        'Other...',
      ].slice(0, 5),
    }
  },
  'minutes-taker': (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    return {
      message: `Hey ${firstName}! Let's capture your meeting minutes. Paste your notes below, or I can walk you through the meeting step by step.`,
      chips: ['Paste my notes', 'Walk me through it', 'I have an agenda to follow'],
    }
  },
  'action-items': (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    return {
      message: `Hey ${firstName}! Let's extract action items. Paste your meeting notes or minutes and I'll find every task, commitment, and follow-up.`,
      chips: ['Paste meeting notes', 'Paste minutes', 'I\'ll describe what was decided'],
    }
  },
  'follow-up-drafter': (pf) => {
    const firstName = pf.user.name.split(' ')[0]
    return {
      message: `Hey ${firstName}! Let's draft follow-up emails. Tell me about the meeting — who was there, what was decided, and any action items.`,
      chips: ['Paste meeting notes', 'I\'ll describe it', 'One group email', 'Per-person emails'],
    }
  },
}

export function useMeetingMachineTool(toolSlug: MeetingToolSlug) {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<MeetingMachinePreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Output
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Interview
  const [interviewState, setInterviewState] = useState<MeetingInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  // Pipeline
  const [pipelineData, setPipelineData] = useState<Record<string, unknown> | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Stream helper ────────────────────────────────────────────────────────

  const streamFetch = useCallback(
    async (url: string, body: unknown, onChunk: (text: string) => void): Promise<string> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
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

  // ── Preflight ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/meeting-machine/${toolSlug}/preflight`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: MeetingMachinePreflight = await res.json()
        if (!cancelled) {
          setPreflight(data)
          setIsPreflightLoading(false)
        }
      } catch {
        if (!cancelled) setIsPreflightLoading(false)
      }
    }

    // Check for pipeline data in sessionStorage
    try {
      const key = `sandbox-meeting-pipeline-${toolSlug}`
      const raw = sessionStorage.getItem(key)
      if (raw) {
        setPipelineData(JSON.parse(raw))
        sessionStorage.removeItem(key) // consumed
      }
    } catch {
      // No pipeline data
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser.email, toolSlug])

  // ── Sandy greeting ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!preflight || messages.length > 0) return

    const greeting = TOOL_GREETINGS[toolSlug](preflight)
    setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting.message }])
    setChips(greeting.chips)
    setInterviewState((prev) => ({ ...prev, phase: 'interviewing' }))
  }, [preflight, messages.length, toolSlug, nextMsgId])

  // ── Send message ─────────────────────────────────────────────────────────

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
          `/api/meeting-machine/${toolSlug}/interview`,
          {
            toolSlug,
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            preflight,
            interviewState,
            pipelineData,
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
          setInterviewState((prev) => ({ ...prev, phase: newPhase }))

          // If phase is "generate" or "complete", trigger generation
          if (newPhase === 'generate' || newPhase === 'complete') {
            void triggerGeneration(text)
          }
        }
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, messages, interviewState, toolSlug, pipelineData, nextMsgId, streamFetch],
  )

  const selectChip = useCallback(
    (chip: string) => {
      void sendMessage(chip)
    },
    [sendMessage],
  )

  // ── Generate output ──────────────────────────────────────────────────────

  const triggerGeneration = useCallback(
    async (rawInput?: string) => {
      if (!preflight) return
      setIsGenerating(true)
      setOutput('')

      try {
        await streamFetch(
          `/api/meeting-machine/${toolSlug}/generate`,
          {
            toolSlug,
            mode: 'instant-draft',
            preflight,
            interviewState,
            pipelineData,
            rawInput,
          },
          (chunk) => setOutput((prev) => prev + chunk),
        )
      } catch {
        // Keep what streamed
      } finally {
        setIsGenerating(false)
      }
    },
    [preflight, interviewState, toolSlug, pipelineData, streamFetch],
  )

  // ── Generate on demand (for paste flows) ─────────────────────────────────

  const generateFromInput = useCallback(
    async (rawInput: string) => {
      if (!preflight) return
      setIsGenerating(true)
      setOutput('')

      try {
        await streamFetch(
          `/api/meeting-machine/${toolSlug}/generate`,
          {
            toolSlug,
            mode: 'instant-draft',
            preflight,
            interviewState,
            pipelineData,
            rawInput,
          },
          (chunk) => setOutput((prev) => prev + chunk),
        )
      } catch {
        // Keep what streamed
      } finally {
        setIsGenerating(false)
      }
    },
    [preflight, interviewState, toolSlug, pipelineData, streamFetch],
  )

  // ── Save to pipeline (for next tool in chain) ───────────────────────────

  const saveToPipeline = useCallback(
    (nextToolSlug: MeetingToolSlug) => {
      try {
        const key = `sandbox-meeting-pipeline-${nextToolSlug}`
        sessionStorage.setItem(
          key,
          JSON.stringify({
            fromTool: toolSlug,
            output,
            interviewState,
            timestamp: new Date().toISOString(),
          }),
        )
      } catch {
        // sessionStorage full or unavailable
      }
    },
    [toolSlug, output, interviewState],
  )

  // ── Start over ───────────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setOutput('')
    setIsGenerating(false)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setIsSandyTyping(false)

    // Re-trigger greeting
    if (preflight) {
      const greeting = TOOL_GREETINGS[toolSlug](preflight)
      setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting.message }])
      setChips(greeting.chips)
      setInterviewState((prev) => ({ ...prev, phase: 'interviewing' }))
    }
  }, [preflight, toolSlug, nextMsgId])

  return {
    preflight,
    isPreflightLoading,
    output,
    isGenerating,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    pipelineData,
    sendMessage,
    selectChip,
    generateFromInput,
    saveToPipeline,
    startOver,
  }
}
