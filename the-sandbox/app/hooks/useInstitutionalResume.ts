'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { InstitutionalResumePreflight } from '../lib/institutional-resume-preflight'
import {
  extractChips,
  extractPhase,
  type InstitutionalResumeInterviewState,
} from '../lib/institutional-resume-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: InstitutionalResumeInterviewState = {
  phase: 'instant-draft',
  purpose: null,
  emailExcerpts: null,
  additionalContext: null,
  style: null,
}

function phaseToStep(phase: string): number {
  switch (phase) {
    case 'instant-draft': return 0
    case 'purpose': return 1
    case 'email-context': return 2
    case 'gap-review': return 3
    case 'style': return 4
    case 'refinement': return 5
    default: return 0
  }
}

export function useInstitutionalResume() {
  const { currentUser } = useAuth()

  const [preflight, setPreflight] = useState<InstitutionalResumePreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)
  const [rawResume, setRawResume] = useState('')
  const [interviewState, setInterviewState] = useState<InstitutionalResumeInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => { msgIdCounter.current += 1; return `msg-${msgIdCounter.current}` }, [])
  const hasStartedDraft = useRef(false)

  const currentStep = phaseToStep(interviewState.phase)
  const isRefinementMode = interviewState.phase === 'refinement'

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
      if (!res.body) throw new Error('Response body is null')
      const reader = res.body.getReader()
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

  // ── Preflight load ─────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/write-room/institutional-resume/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: InstitutionalResumePreflight = await res.json()
        if (!cancelled) { setPreflight(data); setIsPreflightLoading(false) }
      } catch (err) { console.error('Resume preflight error:', err); if (!cancelled) setIsPreflightLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [currentUser.email])

  // ── Instant draft on preflight load ────────────────────────────────

  useEffect(() => {
    if (!preflight || hasStartedDraft.current) return
    hasStartedDraft.current = true
    setIsGenerating(true)

    void streamFetch(
      '/api/write-room/institutional-resume/generate',
      { mode: 'instant-draft', preflight, interviewState: INITIAL_STATE },
      (chunk) => setRawResume((prev) => prev + chunk),
    ).then(() => {
      setIsGenerating(false)
      const firstName = preflight.user.name.split(' ')[0]
      const activitySummary: string[] = []
      if (preflight.sandboxActivity.coursesOwned.length > 0) activitySummary.push(`${preflight.sandboxActivity.coursesOwned.length} courses taught`)
      if (preflight.sandboxActivity.committeeMemberships.length > 0) activitySummary.push(`${preflight.sandboxActivity.committeeMemberships.length} committee memberships`)
      if (preflight.portfolio.awards.length > 0) activitySummary.push(`${preflight.portfolio.awards.length} awards`)
      if (preflight.sandboxActivity.toolsBuilt.length > 0) activitySummary.push(`${preflight.sandboxActivity.toolsBuilt.length} tools built`)

      const greeting = activitySummary.length > 0
        ? `Hey ${firstName}! I pulled together your institutional data — I found ${activitySummary.join(', ')}. I've drafted a resume from what I know. What's this resume for?`
        : `Hey ${firstName}! I've drafted a starting resume from your profile. To make it really specific, tell me — what's this resume for?`

      msgIdCounter.current += 1
      setMessages([{ id: `msg-${msgIdCounter.current}`, role: 'assistant', content: greeting }])
      setChips(['New job application', 'Promotion packet', 'Annual review', 'Grant application', 'Just exploring'])
      setInterviewState((prev) => ({ ...prev, phase: 'purpose' }))
    }).catch((err) => { console.error('Resume generation error:', err); setIsGenerating(false) })
  }, [preflight, streamFetch])

  // ── Abort on unmount ──────────────────────────────────────────────
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // ── Send message ───────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return
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
          '/api/write-room/institutional-resume/interview',
          { messages: newMessages.map((m) => ({ role: m.role, content: m.content })), preflight, interviewState },
          (chunk) => {
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)))
          },
        )

        const newChips = extractChips(fullResponse)
        const newPhase = extractPhase(fullResponse)
        if (newChips.length > 0) setChips(newChips)
        if (newPhase) {
          const updated = { ...interviewState, phase: newPhase as InstitutionalResumeInterviewState['phase'] }
          if (interviewState.phase === 'purpose') updated.purpose = text
          if (interviewState.phase === 'email-context') updated.emailExcerpts = text
          if (interviewState.phase === 'style') updated.style = text
          setInterviewState(updated)

          if (newPhase === 'refinement') {
            setIsGenerating(true)
            setRawResume('')
            void streamFetch(
              '/api/write-room/institutional-resume/generate',
              { mode: 'full-regeneration', preflight, interviewState: updated },
              (chunk) => setRawResume((prev) => prev + chunk),
            ).then(() => setIsGenerating(false)).catch((err) => { console.error('Resume generation error:', err); setIsGenerating(false) })
          }
        }
      } catch (err) {
        console.error('Resume interview error:', err)
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, messages, interviewState, nextMsgId, streamFetch],
  )

  const selectChip = useCallback((chip: string) => { void sendMessage(chip) }, [sendMessage])

  // ── Section click ──────────────────────────────────────────────────

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      if (!isRefinementMode) return
      void sendMessage(`Let's refine the ${sectionId} section`)
    },
    [isRefinementMode, sendMessage],
  )

  // ── Start over ─────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    hasStartedDraft.current = false
    setRawResume('')
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setIsGenerating(false)
  }, [])

  return {
    preflight,
    isPreflightLoading,
    rawResume,
    isGenerating,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    currentStep,
    isRefinementMode,
    sendMessage,
    selectChip,
    handleSectionClick,
    startOver,
  }
}
