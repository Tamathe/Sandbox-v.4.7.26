'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { DataDeskPreflight } from '../lib/data-desk-preflight'
import {
  extractChips,
  extractPhase,
  getFramingChips,
  getSectionsForFraming,
  type DataDeskSlug,
  type DataDeskInterviewState,
  type AnalysisFraming,
} from '../lib/data-desk-elevation-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

export type DataDeskPhase = 'input' | 'framing' | 'follow-up' | 'analyzing' | 'results' | 'exploring'

const INITIAL_STATE: DataDeskInterviewState = {
  phase: 'input',
  framing: null,
  hypothesis: null,
  position: null,
  additionalContext: null,
}

// Map framing chip text to AnalysisFraming enum
const FRAMING_MAP: Record<string, Record<string, AnalysisFraming>> = {
  'chart-explainer': {
    'help me understand it': 'understand',
    'does it support my argument?': 'support-argument',
    'find flaws or bias': 'find-flaws',
    'explain it to my class': 'teach',
  },
  'survey-analyzer': {
    'overall summary': 'summary',
    'test a hypothesis': 'hypothesis',
    'find surprising patterns': 'surprises',
    'recommendations for action': 'recommendations',
  },
  'report-summarizer': {
    'executive summary': 'summary',
    'extract key data points': 'key-data',
    'arguments for/against my position': 'support-argument',
    'identify gaps & limitations': 'gaps-limitations',
  },
  'presentation-outliner': {},
}

export function useDataDeskTool(toolSlug: DataDeskSlug) {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<DataDeskPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Phase
  const [phase, setPhase] = useState<DataDeskPhase>('input')

  // Input data (file or text)
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [inputText, setInputText] = useState('')

  // Analysis output
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeSections, setActiveSections] = useState<string[]>([])

  // Interview
  const [interviewState, setInterviewState] = useState<DataDeskInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Preflight ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/data-desk/${toolSlug}/preflight`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: DataDeskPreflight = await res.json()
        if (!cancelled) { setPreflight(data); setIsPreflightLoading(false) }
      } catch { if (!cancelled) setIsPreflightLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [currentUser.email, toolSlug])

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

  // ── Submit data (file or text) ───────────────────────────────────────────

  const submitData = useCallback(() => {
    if (!preflight) return

    const firstName = preflight.user.name.split(' ')[0]

    // For presentation outliner, go straight to Sandy interview (no data upload)
    if (toolSlug === 'presentation-outliner') {
      setPhase('framing')
      setMessages([{
        id: nextMsgId(),
        role: 'assistant',
        content: `Hey ${firstName}! Let's build a slide deck. What kind of presentation is this?`,
      }])
      setChips(getFramingChips(toolSlug))
      return
    }

    // Data provided — show framing question
    setPhase('framing')

    let dataDesc = 'your data'
    if (inputFile) {
      dataDesc = inputFile.type.includes('image') ? 'the chart' : inputFile.name
    } else if (inputText) {
      const lines = inputText.trim().split('\n').length
      dataDesc = `${lines} lines of data`
    }

    setMessages([{
      id: nextMsgId(),
      role: 'assistant',
      content: `Got it — I have ${dataDesc}. What do you need from this analysis?`,
    }])
    setChips(getFramingChips(toolSlug))
  }, [preflight, toolSlug, inputFile, inputText, nextMsgId])

  // ── Select framing ──────────────────────────────────────────────────────

  const selectFraming = useCallback(
    (chipText: string) => {
      const map = FRAMING_MAP[toolSlug] ?? {}
      const framing: AnalysisFraming = map[chipText.toLowerCase()] ?? null

      setInterviewState((prev) => ({ ...prev, framing, phase: 'framing-selected' }))

      // Add user message
      setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', content: chipText }])

      // Some framings need a follow-up question
      if (framing === 'hypothesis') {
        setPhase('follow-up')
        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), role: 'assistant', content: "What's your hypothesis? I'll test the data against it." },
        ])
        setChips(['Type my hypothesis...'])
        return
      }

      if (framing === 'support-argument') {
        setPhase('follow-up')
        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), role: 'assistant', content: "What's your position or argument? I'll evaluate the evidence." },
        ])
        setChips(['Type my position...'])
        return
      }

      // All other framings — go straight to generation
      const sections = getSectionsForFraming(toolSlug, framing)
      setActiveSections(sections)
      void triggerGeneration(framing, null, null)
    },
    [toolSlug, nextMsgId],
  )

  // ── Handle follow-up answer ──────────────────────────────────────────────

  const handleFollowUp = useCallback(
    (answer: string) => {
      const framing = interviewState.framing
      const newState = { ...interviewState }

      if (framing === 'hypothesis') {
        newState.hypothesis = answer
      } else if (framing === 'support-argument') {
        newState.position = answer
      }

      setInterviewState(newState)
      setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', content: answer }])

      const sections = getSectionsForFraming(toolSlug, framing)
      setActiveSections(sections)
      void triggerGeneration(framing, newState.hypothesis, newState.position)
    },
    [interviewState, toolSlug, nextMsgId],
  )

  // ── Generate analysis ────────────────────────────────────────────────────

  const triggerGeneration = useCallback(
    async (framing: AnalysisFraming, hypothesis: string | null, position: string | null) => {
      if (!preflight) return

      setPhase('analyzing')
      setIsGenerating(true)
      setOutput('')

      // Build the raw input from file or text
      let rawInput = inputText
      if (inputFile && !inputFile.type.includes('image')) {
        rawInput = await inputFile.text()
      }

      // For image files, we need multipart — use the existing /api/data-desk endpoint
      // For text/PDF/form, use the new elevation endpoint
      if (inputFile && inputFile.type.includes('image')) {
        // Use existing multipart endpoint for images (Sonnet vision)
        const formData = new FormData()
        formData.append('slug', toolSlug)
        formData.append('file', inputFile)
        // Add framing to system prompt by using the existing route
        try {
          const res = await fetch('/api/data-desk', {
            method: 'POST',
            headers: { 'x-demo-user-email': currentUser.email },
            body: formData,
          })
          if (!res.ok) throw new Error('Analysis failed')
          const reader = res.body!.getReader()
          const decoder = new TextDecoder()
          let acc = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            acc += decoder.decode(value)
            setOutput(acc)
          }
        } catch {
          // Keep what streamed
        }
      } else {
        // Text-based tools — use elevation generate endpoint
        try {
          await streamFetch(
            `/api/data-desk/${toolSlug}/generate`,
            {
              toolSlug,
              preflight,
              interviewState: { ...interviewState, framing, hypothesis, position },
              rawInput,
            },
            (chunk) => setOutput((prev) => prev + chunk),
          )
        } catch {
          // Keep what streamed
        }
      }

      setIsGenerating(false)
      setPhase('results')

      // Sandy comments on results
      if (preflight) {
        const firstName = preflight.user.name.split(' ')[0]
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            role: 'assistant',
            content: `Here's your analysis, ${firstName}. Click any section to dig deeper, or ask me a follow-up question.`,
          },
        ])
        setChips(['Summarize in one paragraph', 'Generate discussion questions', 'What did I miss?', "I'm done"])
      }
    },
    [preflight, inputFile, inputText, toolSlug, interviewState, currentUser.email, streamFetch, nextMsgId],
  )

  // ── Send message (for exploration phase) ─────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!preflight || isSandyTyping) return

      // Check if this is a framing selection
      if (phase === 'framing') {
        selectFraming(text)
        return
      }

      // Check if this is a follow-up answer
      if (phase === 'follow-up') {
        handleFollowUp(text)
        return
      }

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setChips([])
      setIsSandyTyping(true)

      try {
        const assistantId = nextMsgId()
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        const fullResponse = await streamFetch(
          `/api/data-desk/${toolSlug}/interview`,
          {
            toolSlug,
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
        if (newPhase) setInterviewState((prev) => ({ ...prev, phase: newPhase }))
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, phase, messages, toolSlug, interviewState, nextMsgId, streamFetch, selectFraming, handleFollowUp],
  )

  const selectChip = useCallback(
    (chip: string) => {
      void sendMessage(chip)
    },
    [sendMessage],
  )

  // ── Start over ───────────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setPhase('input')
    setInputFile(null)
    setInputText('')
    setOutput('')
    setIsGenerating(false)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setActiveSections([])
  }, [])

  return {
    preflight,
    isPreflightLoading,
    phase,
    inputFile,
    setInputFile,
    inputText,
    setInputText,
    output,
    isGenerating,
    activeSections,
    interviewState,
    messages,
    chips,
    isSandyTyping,
    submitData,
    sendMessage,
    selectChip,
    startOver,
  }
}
