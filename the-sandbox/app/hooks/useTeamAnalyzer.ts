'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import {
  extractChips,
  extractPhase,
  type TeamAnalyzerInterviewState,
} from '../lib/team-analyzer-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: TeamAnalyzerInterviewState = {
  phase: 'team-setup',
  teamMembers: null,
  activityData: null,
  additionalContext: null,
}

function phaseToStep(phase: string): number {
  switch (phase) {
    case 'team-setup': return 0
    case 'data-intake': return 1
    case 'analysis': return 2
    case 'results': return 3
    case 'exploring': return 4
    default: return 0
  }
}

import type { ToolPreflightData as PreflightData } from '../lib/types'

export function useTeamAnalyzer() {
  const { currentUser } = useAuth()

  const [preflight, setPreflight] = useState<PreflightData | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [interviewState, setInterviewState] = useState<TeamAnalyzerInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)
  const [inputText, setInputText] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => { msgIdCounter.current += 1; return `msg-${msgIdCounter.current}` }, [])

  const currentStep = phaseToStep(interviewState.phase)

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

  // ── Preflight ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/data-desk/team-analyzer/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data = await res.json()
        if (!cancelled) {
          setPreflight(data)
          setIsPreflightLoading(false)
          const firstName = data.user.name.split(' ')[0]
          msgIdCounter.current += 1
          setMessages([{
            id: `msg-${msgIdCounter.current}`,
            role: 'assistant',
            content: `Hey ${firstName}! Let's map what your team actually does — not what the org chart says. Who's on your team? Give me names and official titles.`,
          }])
          setChips(['I\'ll type them out', 'It\'s just me for now', 'Let me paste a list'])
        }
      } catch (err) { console.error('Team analyzer preflight error:', err); if (!cancelled) setIsPreflightLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [currentUser.email])

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

      // Track data in interview state
      const updatedState = { ...interviewState }
      if (interviewState.phase === 'team-setup') updatedState.teamMembers = text
      if (interviewState.phase === 'data-intake') updatedState.activityData = text

      try {
        const assistantId = nextMsgId()
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        const fullResponse = await streamFetch(
          '/api/data-desk/team-analyzer/interview',
          { messages: newMessages.map(m => ({ role: m.role, content: m.content })), preflight, interviewState: updatedState },
          (chunk) => {
            setMessages((prev) => prev.map(m => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)))
          },
        )

        const newChips = extractChips(fullResponse)
        const newPhase = extractPhase(fullResponse)
        if (newChips.length > 0) setChips(newChips)

        if (newPhase) {
          const stateWithPhase = { ...updatedState, phase: newPhase as TeamAnalyzerInterviewState['phase'] }
          setInterviewState(stateWithPhase)

          if (newPhase === 'analysis' || newPhase === 'results') {
            // Trigger generation
            setIsGenerating(true)
            setOutput('')
            const teamData = [stateWithPhase.teamMembers, stateWithPhase.activityData, stateWithPhase.additionalContext].filter(Boolean).join('\n\n')
            void streamFetch(
              '/api/data-desk/team-analyzer/generate',
              { preflight, interviewState: stateWithPhase, teamData },
              (chunk) => setOutput((prev) => prev + chunk),
            ).then(() => {
              setIsGenerating(false)
              setInterviewState(prev => ({ ...prev, phase: 'results' }))
            }).catch((err) => { console.error('Team analyzer generation error:', err); setIsGenerating(false) })
          }
        } else {
          setInterviewState(updatedState)
        }
      } catch (err) {
        console.error('Team analyzer interview error:', err)
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, isSandyTyping, messages, interviewState, nextMsgId, streamFetch],
  )

  const selectChip = useCallback((chip: string) => { void sendMessage(chip) }, [sendMessage])

  const submitData = useCallback(() => {
    if (inputText.trim()) {
      void sendMessage(inputText.trim())
      setInputText('')
    }
  }, [inputText, sendMessage])

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setOutput('')
    setIsGenerating(false)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    setInputText('')
    if (preflight) {
      const firstName = preflight.user.name.split(' ')[0]
      setMessages([{
        id: nextMsgId(),
        role: 'assistant',
        content: `OK ${firstName}, starting fresh. Who's on your team?`,
      }])
      setChips(['I\'ll type them out', 'It\'s just me for now'])
    }
  }, [preflight, nextMsgId])

  return {
    preflight, isPreflightLoading, output, isGenerating, interviewState,
    messages, chips, isSandyTyping, currentStep, inputText, setInputText,
    sendMessage, selectChip, submitData, startOver,
  }
}
