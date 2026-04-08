'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import {
  extractChips,
  extractPhase,
  type ContractDrafterInterviewState,
  type ContractType,
} from '../lib/contract-drafter-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

const INITIAL_STATE: ContractDrafterInterviewState = {
  phase: 'contract-type',
  contractType: null,
  parties: null,
  keyTerms: null,
  additionalContext: null,
}

function phaseToStep(phase: string): number {
  switch (phase) {
    case 'contract-type': return 0
    case 'parties': return 1
    case 'key-terms': return 2
    case 'compliance': return 3
    case 'drafting': return 4
    case 'refinement': return 5
    default: return 0
  }
}

const TYPE_MAP: Record<string, ContractType> = {
  'service agreement': 'service-agreement',
  'mou': 'mou',
  'memorandum of understanding': 'mou',
  'vendor agreement': 'vendor',
  'consulting agreement': 'consulting',
  'speaker / event': 'speaker-event',
  'speaker/event agreement': 'speaker-event',
  'facilities use': 'facilities-use',
  'data sharing agreement': 'data-sharing',
  'data sharing': 'data-sharing',
}

import type { ToolPreflightData as PreflightData } from '../lib/types'

export function useContractDrafter() {
  const { currentUser } = useAuth()

  const [preflight, setPreflight] = useState<PreflightData | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)
  const [rawDraft, setRawDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [interviewState, setInterviewState] = useState<ContractDrafterInterviewState>(INITIAL_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => { msgIdCounter.current += 1; return `msg-${msgIdCounter.current}` }, [])

  const currentStep = phaseToStep(interviewState.phase)
  const isRefinementMode = interviewState.phase === 'refinement'

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
        const res = await fetch('/api/write-room/contract-drafter/preflight', {
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
            content: `Hey ${firstName}! What kind of contract do you need to draft?`,
          }])
          setChips(['Service Agreement', 'MOU', 'Vendor Agreement', 'Consulting Agreement', 'Speaker / Event', 'Facilities Use', 'Data Sharing Agreement'])
        }
      } catch (err) { console.error('Contract drafter preflight error:', err); if (!cancelled) setIsPreflightLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [currentUser.email])

  // ── Abort on unmount ──────────────────────────────────────────────
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      if (!preflight || isSandyTyping) return

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setChips([])
      setIsSandyTyping(true)

      // Track contract type from chip selection
      const updatedState = { ...interviewState }
      if (interviewState.phase === 'contract-type') {
        const matched = TYPE_MAP[text.toLowerCase()]
        if (matched) updatedState.contractType = matched
      }
      if (interviewState.phase === 'parties') updatedState.parties = text
      if (interviewState.phase === 'key-terms') updatedState.keyTerms = text

      try {
        const assistantId = nextMsgId()
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        const fullResponse = await streamFetch(
          '/api/write-room/contract-drafter/interview',
          { messages: newMessages.map(m => ({ role: m.role, content: m.content })), preflight, interviewState: updatedState },
          (chunk) => {
            setMessages((prev) => prev.map(m => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)))
          },
        )

        const newChips = extractChips(fullResponse)
        const newPhase = extractPhase(fullResponse)
        if (newChips.length > 0) setChips(newChips)

        if (newPhase) {
          const stateWithPhase = { ...updatedState, phase: newPhase as ContractDrafterInterviewState['phase'] }
          setInterviewState(stateWithPhase)

          if (newPhase === 'drafting' || newPhase === 'refinement') {
            setIsGenerating(true)
            setRawDraft('')
            const contractDetails = newMessages.map(m => `${m.role}: ${m.content}`).join('\n')
            void streamFetch(
              '/api/write-room/contract-drafter/generate',
              { preflight, interviewState: stateWithPhase, contractDetails },
              (chunk) => setRawDraft((prev) => prev + chunk),
            ).then(() => {
              setIsGenerating(false)
              setInterviewState(prev => ({ ...prev, phase: 'refinement' }))
            }).catch((err) => { console.error('Contract drafter generation error:', err); setIsGenerating(false) })
          }
        } else {
          setInterviewState(updatedState)
        }
      } catch (err) { console.error('Contract drafter interview error:', err) } finally { setIsSandyTyping(false) }
    },
    [preflight, isSandyTyping, messages, interviewState, nextMsgId, streamFetch],
  )

  const selectChip = useCallback((chip: string) => { void sendMessage(chip) }, [sendMessage])

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      if (!isRefinementMode) return
      void sendMessage(`Let's refine the ${sectionId} section`)
    },
    [isRefinementMode, sendMessage],
  )

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setRawDraft('')
    setIsGenerating(false)
    setInterviewState(INITIAL_STATE)
    setMessages([])
    setChips([])
    if (preflight) {
      const firstName = preflight.user.name.split(' ')[0]
      setMessages([{ id: nextMsgId(), role: 'assistant', content: `OK ${firstName}, starting fresh. What kind of contract?` }])
      setChips(['Service Agreement', 'MOU', 'Vendor Agreement', 'Consulting Agreement', 'Speaker / Event', 'Facilities Use', 'Data Sharing Agreement'])
    }
  }, [preflight, nextMsgId])

  return {
    preflight, isPreflightLoading, rawDraft, isGenerating, interviewState,
    messages, chips, isSandyTyping, currentStep, isRefinementMode,
    sendMessage, selectChip, handleSectionClick, startOver,
  }
}
