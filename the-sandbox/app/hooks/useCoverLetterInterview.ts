'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { CoverLetterPreflight } from '../lib/cover-letter-preflight'
import {
  parseLetterSections,
  replaceSection,
  extractChips,
  extractPhase,
  type InterviewState,
  type ParsedSection,
  type LetterSectionId,
} from '../lib/cover-letter-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

type InterviewPhase = InterviewState['phase']

const INITIAL_STATE: InterviewState = {
  phase: 'instant-draft',
  target: null,
  angle: null,
  tone: null,
  questionsAsked: 0,
}

function phaseToStep(phase: InterviewPhase): number {
  switch (phase) {
    case 'instant-draft':
    case 'awaiting-target':
      return 0
    case 'awaiting-angle':
      return 1
    case 'awaiting-tone':
      return 2
    case 'refinement':
      return 3
    default:
      return 0
  }
}

export function useCoverLetterInterview() {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<CoverLetterPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Letter
  const [rawLetter, setRawLetter] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeSection, setActiveSection] = useState<LetterSectionId | null>(null)

  // Interview
  const [interviewState, setInterviewState] = useState<InterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)

  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────

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

  // ── Preflight ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/write-room/cover-letter/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: CoverLetterPreflight = await res.json()
        if (!cancelled) {
          setPreflight(data)
          setIsPreflightLoading(false)
        }
      } catch {
        if (!cancelled) setIsPreflightLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentUser.email])

  // ── Instant draft (Beat 1) — triggered once preflight loads ──────────

  useEffect(() => {
    if (!preflight || rawLetter) return

    async function generateInstantDraft() {
      setIsGenerating(true)
      try {
        await streamFetch(
          '/api/write-room/cover-letter/generate',
          { mode: 'instant-draft', preflight, interviewState: null },
          (chunk) => setRawLetter((prev) => prev + chunk),
        )
      } catch {
        // Silent fail — user sees what streamed so far
      } finally {
        setIsGenerating(false)
        // Sandy opens (Beat 2)
        openSandyGreeting()
      }
    }

    void generateInstantDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflight])

  // ── Sandy greeting (Beat 2) ────────────────────────────────────────────

  const openSandyGreeting = useCallback(() => {
    if (!preflight) return

    const firstName = preflight.user.name.split(' ')[0]
    const topExp = preflight.portfolio.experiences[0]
    const dept = preflight.user.department

    let greeting = `Hey ${firstName}! I pulled together a starter letter from your profile`
    if (topExp?.organization) greeting += ` — your work at ${topExp.organization}`
    if (dept) greeting += `${topExp ? ' and' : ' —'} your ${dept} coursework give${topExp ? '' : 's'} you a solid foundation`
    greeting += '.\n\nTo make this letter land, I need one thing: **What role are you targeting?** Paste the job posting, or tell me the basics.'

    // Generate chips from user data
    const dynamicChips: string[] = ['Let me paste a job posting']
    if (preflight.goals.length > 0) {
      // Use goals for more specific chips
      dynamicChips.push(preflight.goals[0].slice(0, 40))
    } else if (preflight.interests.length >= 2) {
      dynamicChips.push(`${preflight.interests[0]} position`)
      dynamicChips.push(`${preflight.interests[1]} internship`)
    } else if (preflight.interests.length === 1) {
      dynamicChips.push(`${preflight.interests[0]} position`)
    }
    dynamicChips.push('Graduate school application')
    dynamicChips.push('Let me describe it')

    setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting }])
    setChips(dynamicChips)
    setInterviewState((prev) => ({ ...prev, phase: 'awaiting-target' }))
  }, [preflight, nextMsgId])

  // ── Send message to Sandy ──────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!preflight || isSandyTyping) return

      // Add user message
      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setChips([]) // Clear chips on any user action
      setIsSandyTyping(true)

      try {
        const assistantId = nextMsgId()
        let fullResponse = ''

        // Add empty assistant message that will be populated
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        fullResponse = await streamFetch(
          '/api/write-room/cover-letter/interview',
          {
            messages: [...newMessages.map((m) => ({ role: m.role, content: m.content }))],
            preflight,
            interviewState,
          },
          (chunk) => {
            fullResponse += '' // already accumulated by streamFetch
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
            )
          },
        )

        // Extract chips and phase from full response
        const newChips = extractChips(fullResponse)
        const newPhase = extractPhase(fullResponse)

        if (newChips.length > 0) setChips(newChips)

        if (newPhase) {
          setInterviewState((prev) => ({
            ...prev,
            phase: newPhase as InterviewPhase,
            questionsAsked: prev.questionsAsked + 1,
          }))

          // Trigger regeneration on phase transitions
          if (newPhase === 'refinement') {
            void triggerFullRegeneration()
          }
        }
      } catch {
        // Network error — show what we have
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, messages, interviewState, nextMsgId, streamFetch],
  )

  // ── Chip selection ─────────────────────────────────────────────────────

  const selectChip = useCallback(
    (chip: string) => {
      void sendMessage(chip)
    },
    [sendMessage],
  )

  // ── Full regeneration ──────────────────────────────────────────────────

  const triggerFullRegeneration = useCallback(async () => {
    if (!preflight) return
    setIsGenerating(true)
    setRawLetter('')

    try {
      await streamFetch(
        '/api/write-room/cover-letter/generate',
        { mode: 'full-regeneration', preflight, interviewState },
        (chunk) => setRawLetter((prev) => prev + chunk),
      )
    } catch {
      // Keep whatever streamed
    } finally {
      setIsGenerating(false)
    }
  }, [preflight, interviewState, streamFetch])

  // ── Section click (refinement mode) ────────────────────────────────────

  const clickSection = useCallback(
    (sectionId: LetterSectionId) => {
      if (interviewState.phase !== 'refinement') return
      setActiveSection(sectionId)
      // Send a message to Sandy about this section
      void sendMessage(`Let's refine the ${sectionId === 'body1' || sectionId === 'body2' ? 'body' : sectionId} paragraph`)
    },
    [interviewState.phase, sendMessage],
  )

  // ── Derived state ──────────────────────────────────────────────────────

  const sections: ParsedSection[] = rawLetter ? parseLetterSections(rawLetter) : []
  const currentStep = phaseToStep(interviewState.phase)
  const isRefinementMode = interviewState.phase === 'refinement'

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setRawLetter('')
    setIsGenerating(false)
    setActiveSection(null)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setIsSandyTyping(false)
  }, [])

  return {
    // Preflight
    preflight,
    isPreflightLoading,

    // Letter
    rawLetter,
    sections,
    isGenerating,
    activeSection,
    isRefinementMode,

    // Interview
    interviewState,
    messages,
    chips,
    isSandyTyping,
    currentStep,

    // Actions
    sendMessage,
    selectChip,
    clickSection,
    startOver,
  }
}
