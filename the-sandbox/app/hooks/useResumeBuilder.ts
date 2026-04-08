'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { ResumeBuilderPreflight } from '../lib/resume-builder-preflight'
import {
  parseResumeSections,
  extractChips,
  extractPhase,
  type ResumeInterviewState,
  type ParsedResumeSection,
  type ResumeSectionId,
} from '../lib/resume-builder-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

type InterviewPhase = ResumeInterviewState['phase']

const INITIAL_STATE: ResumeInterviewState = {
  phase: 'instant-draft',
  targetRole: null,
  experienceNotes: null,
  additionalSkills: [],
  style: null,
}

function phaseToStep(phase: InterviewPhase): number {
  switch (phase) {
    case 'instant-draft':
    case 'target-role':
      return 0
    case 'experience-detail':
      return 1
    case 'skills-confirm':
      return 2
    case 'style':
      return 3
    case 'refinement':
      return 4
    default:
      return 0
  }
}

export function useResumeBuilder() {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<ResumeBuilderPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Resume
  const [rawResume, setRawResume] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeSection, setActiveSection] = useState<ResumeSectionId | null>(null)

  // Interview
  const [interviewState, setInterviewState] = useState<ResumeInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

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

  // ── Preflight ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/write-room/resume-builder/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: ResumeBuilderPreflight = await res.json()
        if (!cancelled) { setPreflight(data); setIsPreflightLoading(false) }
      } catch { if (!cancelled) setIsPreflightLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [currentUser.email])

  // ── Instant draft ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!preflight || rawResume) return

    async function generateDraft() {
      setIsGenerating(true)
      try {
        await streamFetch(
          '/api/write-room/resume-builder/generate',
          { mode: 'instant-draft', preflight, interviewState: null },
          (chunk) => setRawResume((prev) => prev + chunk),
        )
      } catch {
        // Keep what streamed
      } finally {
        setIsGenerating(false)
        openSandyGreeting()
      }
    }

    void generateDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflight])

  // ── Sandy greeting ───────────────────────────────────────────────────────

  const openSandyGreeting = useCallback(() => {
    if (!preflight) return

    const firstName = preflight.user.name.split(' ')[0]
    const topExp = preflight.portfolio.experiences[0]
    const dept = preflight.user.department

    let greeting = `Hey ${firstName}! I built a starter resume from your profile`
    if (topExp?.organization) greeting += ` — your work at ${topExp.organization}`
    if (dept) greeting += `${topExp ? ' and' : ' —'} your ${dept} background give${topExp ? '' : 's'} you a solid foundation`
    greeting += '.\n\nTo tailor it, I need one thing: **What kind of role are you targeting?**'

    // Build chips from suggested roles + goals
    const dynamicChips: string[] = []
    if (preflight.suggestedRoles.length > 0) {
      dynamicChips.push(...preflight.suggestedRoles.slice(0, 3))
    }
    if (preflight.memories.goals.length > 0) {
      dynamicChips.push(preflight.memories.goals[0].slice(0, 40))
    }
    dynamicChips.push('Let me describe it')

    setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting }])
    setChips(dynamicChips.slice(0, 5))
    setInterviewState((prev) => ({ ...prev, phase: 'target-role' }))
  }, [preflight, nextMsgId])

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
          '/api/write-room/resume-builder/interview',
          {
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            preflight,
            interviewState,
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
          setInterviewState((prev) => ({ ...prev, phase: newPhase as InterviewPhase }))

          // Trigger full regeneration when entering refinement
          if (newPhase === 'refinement') {
            void triggerFullRegeneration()
          }
        }
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, messages, interviewState, nextMsgId, streamFetch],
  )

  const selectChip = useCallback(
    (chip: string) => {
      void sendMessage(chip)
    },
    [sendMessage],
  )

  // ── Full regeneration ────────────────────────────────────────────────────

  const triggerFullRegeneration = useCallback(async () => {
    if (!preflight) return
    setIsGenerating(true)
    setRawResume('')

    try {
      await streamFetch(
        '/api/write-room/resume-builder/generate',
        { mode: 'full-regeneration', preflight, interviewState },
        (chunk) => setRawResume((prev) => prev + chunk),
      )
    } catch {
      // Keep what streamed
    } finally {
      setIsGenerating(false)
    }
  }, [preflight, interviewState, streamFetch])

  // ── Section click ────────────────────────────────────────────────────────

  const clickSection = useCallback(
    (sectionId: ResumeSectionId) => {
      if (interviewState.phase !== 'refinement') return
      setActiveSection(sectionId)
      void sendMessage(`Let's refine the ${sectionId} section`)
    },
    [interviewState.phase, sendMessage],
  )

  // ── Derived state ────────────────────────────────────────────────────────

  const sections: ParsedResumeSection[] = rawResume ? parseResumeSections(rawResume) : []
  const currentStep = phaseToStep(interviewState.phase)
  const isRefinementMode = interviewState.phase === 'refinement'

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setRawResume('')
    setIsGenerating(false)
    setActiveSection(null)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setIsSandyTyping(false)
  }, [])

  return {
    preflight,
    isPreflightLoading,
    rawResume,
    sections,
    isGenerating,
    activeSection,
    isRefinementMode,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    sendMessage,
    selectChip,
    clickSection,
    startOver,
  }
}
