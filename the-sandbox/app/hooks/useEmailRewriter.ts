'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { EmailRewriterPreflight } from '../lib/email-rewriter-preflight'
import {
  buildSandyAnalysis,
  extractChips,
  getVariantLabel,
  type EmailIntent,
  type VariantId,
} from '../lib/email-rewriter-service'
import type { ChatMessage } from '../components/SandyInterviewPanel'

// ── Types ──────────────────────────────────────────────────────────────────

export type RewriterPhase = 'paste' | 'analyzing' | 'variants' | 'selected' | 'refining'

export interface VariantData {
  id: VariantId
  label: string
  text: string
  isStreaming: boolean
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useEmailRewriter() {
  const { currentUser } = useAuth()

  // Preflight
  const [preflight, setPreflight] = useState<EmailRewriterPreflight | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState(true)

  // Phase
  const [phase, setPhase] = useState<RewriterPhase>('paste')

  // Original email
  const [originalEmail, setOriginalEmail] = useState('')

  // Intent
  const [intent, setIntent] = useState<EmailIntent | null>(null)

  // Variants
  const [variants, setVariants] = useState<VariantData[]>([])
  const [activeVariantId, setActiveVariantId] = useState<string>('polished')

  // Selected version
  const [selectedRewrite, setSelectedRewrite] = useState<string | null>(null)
  const [isRefining, setIsRefining] = useState(false)

  // Sandy
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
        const res = await fetch('/api/write-room/email-rewriter/preflight', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Preflight failed')
        const data: EmailRewriterPreflight = await res.json()
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

  // ── Submit email (paste → analyze → variants) ───────────────────────────

  const submitEmail = useCallback(async () => {
    if (!originalEmail.trim() || !preflight) return

    setPhase('analyzing')
    setVariants([
      { id: 'polished', label: 'Professional', text: '', isStreaming: true },
      { id: 'warm', label: 'Friendly', text: '', isStreaming: true },
      { id: 'concise', label: 'Concise', text: '', isStreaming: true },
    ])
    setActiveVariantId('polished')

    try {
      const res = await fetch('/api/write-room/email-rewriter/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ originalEmail, preflight }),
      })

      if (!res.ok) throw new Error('Rewrite failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value)

        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // Keep incomplete line in buffer

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ') && eventType) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)

              if (eventType === 'intent') {
                setIntent(parsed as EmailIntent)
                setPhase('variants')

                // Update variant labels from intent
                const intentData = parsed as EmailIntent
                setVariants((prev) =>
                  prev.map((v) => ({
                    ...v,
                    label: getVariantLabel(v.id, intentData),
                  })),
                )

                // Build Sandy's analysis
                const analysis = buildSandyAnalysis(intentData, preflight)
                setMessages([{ id: nextMsgId(), role: 'assistant', content: analysis }])

                // Build selection chips
                const variantChips = (['polished', 'warm', 'concise'] as VariantId[]).map(
                  (vid) => `Use the ${getVariantLabel(vid, intentData).toLowerCase()} version`,
                )
                setChips([...variantChips, 'I want something different'])
              } else if (eventType === 'variant') {
                const { id, chunk } = parsed as { id: string; label: string; chunk: string }
                setVariants((prev) =>
                  prev.map((v) => (v.id === id ? { ...v, text: v.text + chunk } : v)),
                )
              } else if (eventType === 'done') {
                setVariants((prev) => prev.map((v) => ({ ...v, isStreaming: false })))
              }
            } catch {
              // Incomplete JSON — skip
            }
            eventType = ''
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('Submit email error:', err)
      setPhase('paste')
    }
  }, [originalEmail, preflight, currentUser.email, nextMsgId])

  // ── Select a variant ─────────────────────────────────────────────────────

  const selectVariant = useCallback(
    (id: string) => {
      const variant = variants.find((v) => v.id === id)
      if (!variant) return

      setSelectedRewrite(variant.text)
      setPhase('selected')
      setChips([
        'Make it shorter',
        'Softer tone',
        'More assertive',
        "I'm done — copy it",
      ])
    },
    [variants],
  )

  // ── Send message to Sandy ────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!preflight || !intent || isSandyTyping) return

      // Check if this is a variant selection
      const lowerText = text.toLowerCase()
      for (const v of variants) {
        if (lowerText.includes(v.label.toLowerCase()) || lowerText.includes(v.id)) {
          selectVariant(v.id)
          return
        }
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
          '/api/write-room/email-rewriter/interview',
          { messages: newMessages.map((m) => ({ role: m.role, content: m.content })), originalEmail, intent, preflight },
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            )
          },
        )

        const newChips = extractChips(fullResponse)
        if (newChips.length > 0) setChips(newChips)
      } catch {
        // Keep what streamed
      } finally {
        setIsSandyTyping(false)
      }
    },
    [preflight, intent, isSandyTyping, messages, variants, originalEmail, nextMsgId, streamFetch, selectVariant],
  )

  // ── Chip selection ───────────────────────────────────────────────────────

  const selectChip = useCallback(
    (chip: string) => {
      // Handle "I'm done — copy it"
      if (chip.toLowerCase().includes("i'm done")) {
        if (selectedRewrite) {
          void navigator.clipboard.writeText(selectedRewrite)
        }
        return
      }

      // Handle variant selection chips
      const lowerChip = chip.toLowerCase()
      for (const v of variants) {
        if (lowerChip.includes(v.label.toLowerCase()) || lowerChip.includes(v.id)) {
          selectVariant(v.id)
          return
        }
      }

      // If in selected/refining phase, this is a refinement request
      if ((phase === 'selected' || phase === 'refining') && selectedRewrite && intent && preflight) {
        setIsRefining(true)
        setPhase('refining')

        void (async () => {
          try {
            let refined = ''
            await streamFetch(
              '/api/write-room/email-rewriter/refine',
              { originalEmail, currentRewrite: selectedRewrite, instruction: chip, intent, preflight },
              (chunk) => {
                refined += chunk
                setSelectedRewrite(refined)
              },
            )
          } catch {
            // Keep what streamed
          } finally {
            setIsRefining(false)
            setPhase('selected')
            setChips([
              'Make it shorter',
              'Softer tone',
              'More assertive',
              "I'm done — copy it",
            ])
          }
        })()
        return
      }

      // Default: send as chat message
      void sendMessage(chip)
    },
    [variants, phase, selectedRewrite, intent, preflight, originalEmail, selectVariant, streamFetch, sendMessage],
  )

  // ── Start over ───────────────────────────────────────────────────────────

  const startOver = useCallback(() => {
    abortRef.current?.abort()
    setPhase('paste')
    setOriginalEmail('')
    setIntent(null)
    setVariants([])
    setSelectedRewrite(null)
    setMessages([])
    setChips([])
    setIsRefining(false)
  }, [])

  // ── Export ───────────────────────────────────────────────────────────────

  const exportRewrite = useCallback(
    async (format: 'clipboard' | 'clipboard-with-subject') => {
      if (!selectedRewrite) return
      let text = selectedRewrite
      if (format === 'clipboard-with-subject' && intent?.subjectLine) {
        text = `Subject: ${intent.subjectLine}\n\n${text}`
      }
      await navigator.clipboard.writeText(text)
    },
    [selectedRewrite, intent],
  )

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    preflight,
    isPreflightLoading,
    phase,
    originalEmail,
    setOriginalEmail,
    intent,
    variants,
    activeVariantId,
    setActiveVariantId,
    selectedRewrite,
    isRefining,
    messages,
    chips,
    isSandyTyping,
    submitEmail,
    selectVariant,
    sendMessage,
    selectChip,
    startOver,
    exportRewrite,
  }
}
