'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import {
  extractChips,
  extractPhase,
  type SentimentAnalyzerInterviewState,
} from '../lib/sentiment-analyzer-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: SentimentAnalyzerInterviewState = {
  phase: 'input',
  institutionalContext: null,
  additionalContext: null,
}

import type { ToolPreflightData as PreflightData } from '../lib/types'

export function useSentimentAnalyzer() {
  const { currentUser } = useAuth()

  const [preflight, setPreflight] = useState<PreflightData | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [interviewState, setInterviewState] = useState<SentimentAnalyzerInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)
  const [phase, setPhase] = useState<'input' | 'context' | 'analyzing' | 'results' | 'exploring'>('input')

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => { msgIdCounter.current += 1; return `msg-${msgIdCounter.current}` }, [])

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

  // Preflight
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/data-desk/sentiment-analyzer/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data = await res.json()
        if (!cancelled) { setPreflight(data); setIsPreflightLoading(false) }
      } catch (err) { console.error('Sentiment analyzer preflight error:', err); if (!cancelled) setIsPreflightLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [currentUser.email])

  // ── Abort on unmount ──────────────────────────────────────────────
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // Submit text for analysis
  const submitData = useCallback(() => {
    if (!preflight || !inputText.trim()) return
    setPhase('context')
    const firstName = preflight.user.name.split(' ')[0]
    const lines = inputText.trim().split('\n').length
    setMessages([{
      id: nextMsgId(),
      role: 'assistant',
      content: `Got it — ${lines} lines of text. What's the institutional context? Is this about a policy change, crisis, event, or general discussion?`,
    }])
    setChips(['Policy change', 'Crisis response', 'Campus event', 'General discussion', 'Skip — just analyze'])
  }, [preflight, inputText, nextMsgId])

  // Trigger generation
  const triggerGeneration = useCallback(
    async (context: string | null, rawInput: string) => {
      if (!preflight) return
      setPhase('analyzing')
      setIsGenerating(true)
      setOutput('')

      const updatedState = { ...interviewState, phase: 'analyzing' as const, institutionalContext: context }
      setInterviewState(updatedState)

      try {
        await streamFetch(
          '/api/data-desk/sentiment-analyzer/generate',
          { preflight, interviewState: updatedState, rawInput },
          (chunk) => setOutput((prev) => prev + chunk),
        )
      } catch (err) { console.error('Sentiment analyzer generation error:', err) } finally { setIsGenerating(false) }

      setPhase('results')
      const firstName = preflight.user.name.split(' ')[0]
      msgIdCounter.current += 1
      setMessages((prev) => [...prev, {
        id: `msg-${msgIdCounter.current}`,
        role: 'assistant',
        content: `Analysis complete, ${firstName}. The results are on the left. Ask me to dig deeper into any theme or draft a specific response.`,
      }])
      setChips(['Draft a public statement', 'Which concern is most urgent?', 'Compare to previous sentiment', 'I\'m done'])
    },
    [preflight, interviewState, streamFetch],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      if (!preflight || isSandyTyping) return

      // Handle context phase
      if (phase === 'context') {
        setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', content: text }])
        const context = text.toLowerCase().includes('skip') ? null : text
        void triggerGeneration(context, inputText)
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
          '/api/data-desk/sentiment-analyzer/interview',
          { messages: newMessages.map(m => ({ role: m.role, content: m.content })), preflight, interviewState, rawInput: inputText },
          (chunk) => {
            setMessages((prev) => prev.map(m => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)))
          },
        )

        const newChips = extractChips(fullResponse)
        if (newChips.length > 0) setChips(newChips)
        const newPhase = extractPhase(fullResponse)
        if (newPhase) setInterviewState((prev) => ({ ...prev, phase: newPhase as SentimentAnalyzerInterviewState['phase'] }))
      } catch (err) { console.error('Sentiment analyzer interview error:', err) } finally { setIsSandyTyping(false) }
    },
    [preflight, isSandyTyping, phase, messages, interviewState, inputText, nextMsgId, streamFetch, triggerGeneration],
  )

  const selectChip = useCallback((chip: string) => { void sendMessage(chip) }, [sendMessage])

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setPhase('input')
    setInputText('')
    setOutput('')
    setIsGenerating(false)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
  }, [])

  return {
    preflight, isPreflightLoading, phase, inputText, setInputText,
    output, isGenerating, messages, chips, isSandyTyping,
    submitData, sendMessage, selectChip, startOver,
  }
}
