'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { LinkedInPreflight } from '../lib/linkedin-optimizer-preflight'
import {
  parseLinkedInSections,
  sectionsToRecord,
  extractChips,
  extractPhase,
  SECTION_CHAR_LIMITS,
  type LinkedInSectionId,
  type LinkedInInterviewState,
} from '../lib/linkedin-optimizer-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

type InterviewPhase = LinkedInInterviewState['phase']

const INITIAL_STATE: LinkedInInterviewState = {
  phase: 'instant-draft',
  targetRole: null,
  differentiator: null,
  leadExperience: null,
  tone: null,
}

function phaseToStep(phase: InterviewPhase): number {
  switch (phase) {
    case 'instant-draft':
    case 'target-role':
      return 0
    case 'differentiator':
      return 1
    case 'experience-highlight':
      return 2
    case 'tone':
      return 3
    case 'polish':
      return 4
    default:
      return 0
  }
}

export function useLinkedInOptimizer() {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<LinkedInPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Sections
  const [sections, setSections] = useState<Record<LinkedInSectionId, string>>({
    headline: '',
    about: '',
    'experience-bullets': '',
    skills: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeSection, setActiveSection] = useState<LinkedInSectionId | null>(null)
  const [updatingSection, setUpdatingSection] = useState<LinkedInSectionId | null>(null)

  // Interview
  const [interviewState, setInterviewState] = useState<LinkedInInterviewState>(INITIAL_STATE)
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
        const res = await fetch('/api/write-room/linkedin-optimizer/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: LinkedInPreflight = await res.json()
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

  // ── Instant draft ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!preflight || sections.headline) return

    async function generateDraft() {
      setIsGenerating(true)
      let accumulated = ''
      try {
        await streamFetch(
          '/api/write-room/linkedin-optimizer/generate',
          { mode: 'instant-draft', preflight, existingContent: null, interviewState: null, targetSection: null },
          (chunk) => {
            accumulated += chunk
            // Parse sections as they stream
            const parsed = parseLinkedInSections(accumulated)
            if (parsed.length > 0) setSections(sectionsToRecord(parsed))
          },
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

    let greeting = `Hey ${firstName}! I built out your LinkedIn profile from your platform data`
    if (topExp?.organization) {
      greeting += ` — your work at ${topExp.organization}`
    }
    if (preflight.user.department) {
      greeting += `${topExp ? ' and' : ' —'} your ${preflight.user.department} background`
    }
    greeting += ' give you a solid foundation.'
    greeting += '\n\nI have one question that\'ll sharpen everything: **What kind of roles are you targeting?** This changes which keywords I optimize for.'

    // Generate chips from data
    const dynamicChips: string[] = []
    if (preflight.derivedKeywords.length > 0) {
      dynamicChips.push(`${preflight.derivedKeywords[0]} roles`)
    }
    if (preflight.derivedKeywords.length > 1) {
      dynamicChips.push(`${preflight.derivedKeywords[1]} internships`)
    }
    if (preflight.user.role === 'EDUCATOR') {
      dynamicChips.push('Research collaborators')
      dynamicChips.push('Grant reviewers')
    } else {
      dynamicChips.push('Graduate school admissions')
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
          '/api/write-room/linkedin-optimizer/interview',
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
          setInterviewState((prev) => ({
            ...prev,
            phase: newPhase as InterviewPhase,
          }))
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

  // ── Section click ────────────────────────────────────────────────────────

  const clickSection = useCallback(
    (sectionId: LinkedInSectionId) => {
      setActiveSection(sectionId)
      if (interviewState.phase === 'polish') {
        void sendMessage(`Let's work on my ${sectionId.replace('-', ' ')} section`)
      }
    },
    [interviewState.phase, sendMessage],
  )

  // ── Derived state ────────────────────────────────────────────────────────

  const currentStep = phaseToStep(interviewState.phase)
  const isPolishMode = interviewState.phase === 'polish'

  // Character counts
  const charCounts: Partial<Record<LinkedInSectionId, { count: number; limit: number | null }>> = {}
  for (const [id, content] of Object.entries(sections)) {
    const limit = SECTION_CHAR_LIMITS[id as LinkedInSectionId] ?? null
    charCounts[id as LinkedInSectionId] = { count: content.length, limit }
  }

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setSections({ headline: '', about: '', 'experience-bullets': '', skills: '' })
    setIsGenerating(false)
    setActiveSection(null)
    setUpdatingSection(null)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setIsSandyTyping(false)
  }, [])

  return {
    preflight,
    isPreflightLoading,
    sections,
    isGenerating,
    activeSection,
    updatingSection,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    isPolishMode,
    charCounts,
    sendMessage,
    selectChip,
    clickSection,
    startOver,
  }
}
