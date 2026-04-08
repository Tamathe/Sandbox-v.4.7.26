'use client'

// ─── Sandy Ambient Context ──────────────────────────────────
// Lifts Sandy's core brain (messages, submit, voice, TTS) out of
// ConciergePanel so it persists across the entire app.
// Both ConciergePanel and SandyPip consume this context.

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import type { Message, CourseContext } from './concierge-utils'
import { extractActions, readCourseContext } from './concierge-utils'
import {
  isAreYouAliveQuestion,
  getAreYouAliveResponse,
} from '../../lib/easter-eggs'
import { useSandyVoice } from './useSandyVoice'
import { useSandyStreamingTTS } from './useSandyStreamingTTS'
import { buildBriefingGreeting } from '../faculty-home/briefing-utils'
import type { BriefingData } from '../faculty-home/briefing-utils'
import { useAgentProfiles, type AgentProfileSummary } from '../../hooks/useAgentProfiles'
import { useAgentStream } from '../../hooks/useAgentStream'
import type { AgentSSEEvent, ApprovalDecision } from '../../lib/agent/agent-types'
import type { SandyTrustPanelData } from '../../lib/provenance-types'

// ─── Context shape ──────────────────────────────────────────

interface SandyAmbientValue {
  // Messages
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  rawMessages: Map<string, string>
  setRawMessages: React.Dispatch<React.SetStateAction<Map<string, string>>>
  messageTrust: Map<string, SandyTrustPanelData>
  setMessageTrust: React.Dispatch<React.SetStateAction<Map<string, SandyTrustPanelData>>>
  input: string
  setInput: (v: string) => void
  loading: boolean
  submit: (content: string) => Promise<void>

  // Voice
  isRecording: boolean
  isSupported: boolean
  continuousMode: boolean
  handleMicPointerDown: (e: React.PointerEvent) => void
  handleMicPointerUp: () => void
  handleMicPointerLeave: () => void
  startContinuousListening: () => void
  stopContinuousListening: () => void

  // TTS
  voiceMode: boolean
  isSpeaking: boolean
  toggleVoiceMode: () => void
  interruptTTS: () => void

  // Avatar
  avatarMode: boolean
  avatarMeta: { facultyName: string; courseCode: string } | null

  // Briefing
  briefingData: BriefingData | null
  briefingChips: string[]

  // Refs for external consumers
  inputRef: React.RefObject<HTMLTextAreaElement | null>

  // Panel open controls (Pip needs these)
  openPanel: () => void

  // Profile state
  activeProfileId: string | null
  activeProfile: AgentProfileSummary | null
  favorites: AgentProfileSummary[]
  recentlyUsed: AgentProfileSummary[]
  setActiveProfileId: (id: string | null) => void
  clearConversation: () => void

  // Agent mode
  agentMode: boolean
  toggleAgentMode: () => void
  agentEvents: AgentSSEEvent[]
  isAgentStreaming: boolean
  sendAgentApproval: (approvalId: string, decision: ApprovalDecision, editedArgs?: Record<string, unknown>) => void

  // Sandy trace (transparency)
  sandyTrace: SandyTraceClient | null
}

export interface SandyTraceClient {
  sections: string[]
  totalTokens: number
  wasTrimmed: boolean
  droppedSections: string[]
  preferences: { tone?: string; proactivity?: string; responseLength?: string }
  dataSources: string[]
}

const SandyAmbientCtx = createContext<SandyAmbientValue | null>(null)

function decodeTrustHeader(value: string): SandyTrustPanelData | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const raw = atob(padded)
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as SandyTrustPanelData
  } catch {
    return null
  }
}

export function useSandyAmbient() {
  const ctx = useContext(SandyAmbientCtx)
  if (!ctx) throw new Error('useSandyAmbient must be used within SandyAmbientProvider')
  return ctx
}

// ─── Provider ───────────────────────────────────────────────

export function SandyAmbientProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, evaluatorMode } = useAuth()
  const pathname = usePathname()

  // ─── Core state ─────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([])
  const [rawMessages, setRawMessages] = useState<Map<string, string>>(new Map())
  const [messageTrust, setMessageTrust] = useState<Map<string, SandyTrustPanelData>>(new Map())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [courseContext, setCourseContext] = useState<CourseContext | null>(null)
  const [avatarMode, setAvatarMode] = useState(false)
  const [avatarMeta, setAvatarMeta] = useState<{ facultyName: string; courseCode: string } | null>(null)
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null)
  const [briefingChips, setBriefingChips] = useState<string[]>([])
  const [sandyTrace, setSandyTrace] = useState<SandyTraceClient | null>(null)

  // Panel open state (shared so Pip can open the panel)
  const [, setPanelOpen] = useState(true)
  const [, setMobileOpen] = useState(false)

  // ─── Agent mode ────────────────────────────────────────
  // Auto-enable when evaluator mode is active
  const [agentMode, setAgentMode] = useState(false)
  const toggleAgentMode = useCallback(() => {
    setAgentMode(prev => !prev)
  }, [])

  useEffect(() => {
    if (evaluatorMode) setAgentMode(true)
  }, [evaluatorMode])

  const {
    activeProfileId,
    activeProfile,
    favorites,
    recentlyUsed,
    setActiveProfileId,
  } = useAgentProfiles()

  const agent = useAgentStream({ userEmail: currentUser.email, currentPage: pathname })

  const messagesRef = useRef<Message[]>([])
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => { messagesRef.current = messages }, [messages])

  // ─── Course context sync ────────────────────────────────
  useEffect(() => {
    setCourseContext(readCourseContext())
    setAvatarMode(false)
    setAvatarMeta(null)

    const sync = (event: Event) => {
      const detail = (event as CustomEvent<CourseContext | null>).detail
      if (detail !== undefined) { setCourseContext(detail); return }
      setCourseContext(readCourseContext())
    }
    window.addEventListener('uky-course-context-changed', sync)
    return () => window.removeEventListener('uky-course-context-changed', sync)
  }, [pathname])

  // ─── Briefing integration ───────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<BriefingData>).detail
      if (!data) return
      setBriefingData(data)
      if (messagesRef.current.length === 0) {
        const { text, chips } = buildBriefingGreeting(data)
        setMessages([{ id: 'briefing-greeting', role: 'assistant', content: text }])
        setBriefingChips(chips)
      }
    }
    window.addEventListener('uky-briefing-ready', handler)
    return () => window.removeEventListener('uky-briefing-ready', handler)
  }, [])

  useEffect(() => {
    if (pathname !== '/') {
      setBriefingData(null)
      setBriefingChips([])
    }
  }, [pathname])

  // ─── Streaming TTS ──────────────────────────────────────
  const tts = useSandyStreamingTTS({ userEmail: currentUser.email })

  const feedTextRef = useRef(tts.feedText)
  const finalizeRef = useRef(tts.finalize)
  const resetRef = useRef(tts.reset)
  useEffect(() => {
    feedTextRef.current = tts.feedText
    finalizeRef.current = tts.finalize
    resetRef.current = tts.reset
  }, [tts.feedText, tts.finalize, tts.reset])

  // ─── Submit handler ─────────────────────────────────────
  const clearConversation = useCallback(() => {
    tts.interrupt()
    agent.reset()
    messagesRef.current = []
    setMessages([])
    setRawMessages(new Map())
    setMessageTrust(new Map())
    setInput('')
    setLoading(false)
    setAvatarMode(false)
    setAvatarMeta(null)
    setSandyTrace(null)
  }, [agent, tts])

  const submit = useCallback(async (content: string) => {
    if (!content.trim() || loading) return

    // Signal first Sandy interaction (for first-run experience)
    window.dispatchEvent(new CustomEvent('uky-sandy-first-interaction'))

    const trimmed = content.trim()
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed }
    const assistantId = (Date.now() + 1).toString()

    // ─── Sandy personality: "are you alive?" intercept ────
    if (isAreYouAliveQuestion(trimmed)) {
      const response = getAreYouAliveResponse()
      setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: response }])
      setInput('')
      return
    }

    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    // ─── Agent mode: route through useAgentStream ───────
    if (agentMode) {
      try {
        const history = [...messagesRef.current, userMsg]
          .filter(m => m.id !== 'briefing-greeting')
          .map(m => ({ role: m.role, content: m.content }))
        await agent.sendMessage(history, activeProfileId)
        // Agent events are rendered by AgentMessageRenderer; mark assistant
        // message as agent-handled so ConciergePanel can switch renderer
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: '__AGENT_RESPONSE__' } : m
        ))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Agent unavailable.'
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: msg } : m))
      } finally {
        setLoading(false)
      }
      return
    }

    // ─── Standard concierge path ────────────────────────
    try {
      const history = [...messagesRef.current, userMsg]
        .filter(m => m.id !== 'briefing-greeting')
      const briefingContext = briefingData ? JSON.stringify({
        stats: briefingData.stats,
        emails: briefingData.emails.map(e => ({
          id: e.id, from: e.fromName, subject: e.subject,
          category: e.category, triage: e.triage,
        })),
        calendar: briefingData.calendar.map(e => ({
          id: e.id, title: e.title, startTime: e.startTime,
          endTime: e.endTime, category: e.category, annotation: e.annotation,
        })),
        tasks: briefingData.tasks,
        facultyHomepageV2: briefingData.facultyHomepageV2 ?? null,
      }) : undefined

      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          currentPage: pathname,
          userEmail: currentUser.email,
          courseContext,
          evaluatorMode,
          ...(briefingContext ? { briefingContext } : {}),
        }),
      })

      if (!res.ok) throw new Error('Sandy is unavailable right now.')

      const avatarHeader = res.headers.get('x-avatar-meta')
      if (avatarHeader) {
        try {
          const meta = JSON.parse(avatarHeader) as { facultyName: string; courseCode: string }
          setAvatarMode(true)
          setAvatarMeta(meta)
        } catch { /* ignore */ }
      } else {
        setAvatarMode(false)
        setAvatarMeta(null)
      }

      const trustHeader = res.headers.get('x-sandy-trust')
      const trustPayload = trustHeader ? decodeTrustHeader(trustHeader) : null
      if (trustPayload) {
        setMessageTrust(prev => new Map(prev).set(assistantId, trustPayload))
      } else {
        setMessageTrust(prev => {
          const next = new Map(prev)
          next.delete(assistantId)
          return next
        })
      }

      // Sandy trace — transparency data about what context was used
      const traceHeader = res.headers.get('x-sandy-trace')
      if (traceHeader) {
        try {
          const json = atob(traceHeader)
          const compact = JSON.parse(json) as { s: string[]; t: number; tr: boolean; d: string[]; p: Record<string, string>; ds: string[] }
          setSandyTrace({
            sections: compact.s,
            totalTokens: compact.t,
            wasTrimmed: compact.tr,
            droppedSections: compact.d,
            preferences: compact.p,
            dataSources: compact.ds,
          })
        } catch { /* ignore */ }
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      resetRef.current()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value)
        const { clean } = extractActions(fullText)
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: clean } : m))
        feedTextRef.current(clean)
      }

      setRawMessages(prev => new Map(prev).set(assistantId, fullText))
      const { clean } = extractActions(fullText)
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: clean } : m))
      finalizeRef.current(clean)

      if (fullText.includes('<!--SAVE_NOTE:')) {
        window.dispatchEvent(new CustomEvent('uky-note-saved'))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: msg } : m))
      setMessageTrust(prev => {
        const next = new Map(prev)
        next.delete(assistantId)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [activeProfileId, agentMode, agent, briefingData, courseContext, currentUser.email, evaluatorMode, loading, pathname])

  // ─── Voice hook ─────────────────────────────────────────
  const voice = useSandyVoice({
    submit,
    loading,
    setInput,
    setOpen: setPanelOpen,
    setMobileOpen,
    inputRef,
    onRecordingStart: tts.interrupt,
    voiceMode: tts.voiceMode,
    isSpeaking: tts.isSpeaking,
  })

  // Auto-listen loop: works even when panel is closed (ambient mode)
  useEffect(() => {
    if (!tts.voiceMode || tts.isSpeaking || loading || !voice.isSupported) return
    const timer = setTimeout(() => {
      if (!voice.continuousMode && !voice.isRecording) {
        voice.startContinuousListening()
      }
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.voiceMode, tts.isSpeaking, loading])

  // Stop mic when voice mode disabled
  useEffect(() => {
    if (!tts.voiceMode && voice.continuousMode) {
      voice.stopContinuousListening()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.voiceMode])

  // ─── Sandy-prefill event listener ───────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; autoSend?: boolean }>).detail
      if (detail?.message) {
        setInput(detail.message)
        setPanelOpen(true)
        setMobileOpen(true)
        if (detail.autoSend) {
          window.setTimeout(() => { void submit(detail.message) }, 400)
        }
      }
    }
    window.addEventListener('sandy-prefill', handler)
    return () => window.removeEventListener('sandy-prefill', handler)
  }, [submit])

  const openPanel = useCallback(() => {
    setPanelOpen(true)
    setMobileOpen(true)
  }, [])

  // ─── Context value ──────────────────────────────────────
  const value: SandyAmbientValue = {
    messages, setMessages,
    rawMessages, setRawMessages,
    messageTrust, setMessageTrust,
    input, setInput,
    loading, submit,
    isRecording: voice.isRecording,
    isSupported: voice.isSupported,
    continuousMode: voice.continuousMode,
    handleMicPointerDown: voice.handleMicPointerDown,
    handleMicPointerUp: voice.handleMicPointerUp,
    handleMicPointerLeave: voice.handleMicPointerLeave,
    startContinuousListening: voice.startContinuousListening,
    stopContinuousListening: voice.stopContinuousListening,
    voiceMode: tts.voiceMode,
    isSpeaking: tts.isSpeaking,
    toggleVoiceMode: tts.toggleVoiceMode,
    interruptTTS: tts.interrupt,
    avatarMode, avatarMeta,
    briefingData, briefingChips,
    inputRef,
    openPanel,
    activeProfileId,
    activeProfile,
    favorites,
    recentlyUsed,
    setActiveProfileId,
    clearConversation,
    agentMode,
    toggleAgentMode,
    agentEvents: agent.events,
    isAgentStreaming: agent.isStreaming,
    sendAgentApproval: agent.sendApproval,
    sandyTrace,
  }

  return (
    <SandyAmbientCtx.Provider value={value}>
      {children}
    </SandyAmbientCtx.Provider>
  )
}
