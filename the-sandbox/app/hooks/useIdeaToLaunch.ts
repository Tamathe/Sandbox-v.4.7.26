'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { InnovationLabPreflight } from '../lib/innovation-lab-preflight'
import {
  extractChips,
  extractPhase,
  stripMetadata,
  phaseToStep,
  INITIAL_STATE,
  PHASE_LABELS,
  type IdeaInterviewState,
  type IdeaPhase,
} from '../lib/innovation-lab-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

export function useIdeaToLaunch() {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<InnovationLabPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Brief output
  const [rawBrief, setRawBrief] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Interview
  const [interviewState, setInterviewState] = useState<IdeaInterviewState>({ ...INITIAL_STATE })
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chips, setChips] = useState<string[]>([])
  const [isSandyTyping, setIsSandyTyping] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const msgIdCounter = useRef(0)
  const nextMsgId = useCallback(() => {
    msgIdCounter.current += 1
    return `msg-${msgIdCounter.current}`
  }, [])

  // ── Stream helper ──────────────────────────────────────────────────────

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

  // ── Preflight ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    fetch('/api/innovation-lab/idea-to-launch/preflight', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setPreflight(data)
          setIsPreflightLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsPreflightLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentUser.email])

  // ── Sandy greeting ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!preflight) return

    const greeting = `Hey ${preflight.user.name.split(' ')[0]}! 👋 I'm Sandy, your innovation concierge.

I'm going to walk you through turning your idea into something real — from the initial spark all the way to a protection strategy and action plan.

**Here's what we'll cover:**
1. **The Spark** — Tell me about your idea
2. **IP Landscape** — What can be protected?
3. **Market Validation** — Who needs this?
4. **Protection Strategy** — Patents, trade secrets, or both?
5. **Pitch Builder** — Your executive summary
6. **Action Plan** — Concrete next steps

So — **what's the idea that's been keeping you up at night?**`

    setMessages([{ id: nextMsgId(), role: 'assistant', content: greeting }])
    setChips([
      'I have a software idea',
      'I invented something in the lab',
      'I want to start a company',
      "I'm not sure where to start",
    ])
  }, [preflight, nextMsgId])

  // ── Send message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!preflight || isSandyTyping) return

      const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text }
      const assistantMsg: ChatMessage = { id: nextMsgId(), role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setChips([])
      setIsSandyTyping(true)

      try {
        const allMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const full = await streamFetch(
          '/api/innovation-lab/idea-to-launch/interview',
          { messages: allMessages, preflight, interviewState },
          (chunk) => {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: last.content + chunk }
              }
              return updated
            })
          },
        )

        // Extract metadata from full response
        const newPhase = extractPhase(full)
        const newChips = extractChips(full)

        // Update interview state with new phase
        if (newPhase && newPhase !== interviewState.phase) {
          setInterviewState((prev) => ({ ...prev, phase: newPhase }))
        }

        // Update state fields based on phase progression
        if (interviewState.phase === 'spark' && newPhase === 'landscape') {
          setInterviewState((prev) => ({ ...prev, ideaSummary: text, phase: 'landscape' }))
        } else if (interviewState.phase === 'landscape' && newPhase === 'market') {
          setInterviewState((prev) => ({ ...prev, ipType: text, phase: 'market' }))
        } else if (interviewState.phase === 'market' && newPhase === 'protection') {
          setInterviewState((prev) => ({ ...prev, targetUser: text, phase: 'protection' }))
        } else if (newPhase) {
          setInterviewState((prev) => ({ ...prev, phase: newPhase }))
        }

        // Strip metadata from displayed message
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: stripMetadata(last.content) }
          }
          return updated
        })

        setChips(newChips)

        // Auto-generate brief when reaching pitch phase
        if (newPhase === 'pitch' || newPhase === 'action-plan') {
          generateBrief()
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last.role === 'assistant' && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content: "Sorry, I hit a snag. Could you try again?",
              }
            }
            return updated
          })
        }
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, messages, interviewState, isSandyTyping, nextMsgId, streamFetch],
  )

  // ── Select chip ────────────────────────────────────────────────────────

  const selectChip = useCallback(
    (chip: string) => {
      sendMessage(chip)
    },
    [sendMessage],
  )

  // ── Generate brief ─────────────────────────────────────────────────────

  const generateBrief = useCallback(async () => {
    if (!preflight) return
    setIsGenerating(true)
    setRawBrief('')

    try {
      await streamFetch(
        '/api/innovation-lab/idea-to-launch/generate',
        { mode: 'full-regeneration', preflight, interviewState },
        (chunk) => {
          setRawBrief((prev) => prev + chunk)
        },
      )
    } catch {
      // ignore abort
    } finally {
      setIsGenerating(false)
    }
  }, [preflight, interviewState, streamFetch])

  // ── Start over ─────────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    setInterviewState({ ...INITIAL_STATE })
    setMessages([])
    setChips([])
    setRawBrief('')
    setIsGenerating(false)
    // Re-trigger greeting
    setPreflight((prev) => (prev ? { ...prev } : null))
  }, [])

  return {
    isPreflightLoading,
    rawBrief,
    isGenerating,
    messages,
    chips,
    isSandyTyping,
    currentStep: phaseToStep(interviewState.phase),
    currentPhase: interviewState.phase,
    phaseLabel: PHASE_LABELS[interviewState.phase],
    sendMessage,
    selectChip,
    generateBrief,
    startOver,
  }
}
