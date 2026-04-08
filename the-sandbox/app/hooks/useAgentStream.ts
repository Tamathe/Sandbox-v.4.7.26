'use client'

import { useState, useCallback, useRef } from 'react'
import type { AgentSSEEvent, AgentChatRequest, ApprovalDecision } from '../lib/agent/agent-types'

// ---------------------------------------------------------------------------
// useAgentStream — SSE parser hook for the Sandy Universal Agent
//
// Connects to POST /api/agent/chat, parses the AgentSSEEvent stream,
// and maintains an ordered list of events for rendering.
// ---------------------------------------------------------------------------

interface UseAgentStreamOptions {
  userEmail: string
  currentPage?: string
}

interface UseAgentStreamReturn {
  events: AgentSSEEvent[]
  isStreaming: boolean
  sessionId: string | null
  sendMessage: (messages: AgentChatRequest['messages'], profileId?: string | null) => Promise<void>
  sendApproval: (approvalId: string, decision: ApprovalDecision, editedArgs?: Record<string, unknown>) => void
  reset: () => void
}

export function useAgentStream({ userEmail, currentPage }: UseAgentStreamOptions): UseAgentStreamReturn {
  const [events, setEvents] = useState<AgentSSEEvent[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef<string>(generateSessionId())

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setEvents([])
    setIsStreaming(false)
    sessionIdRef.current = generateSessionId()
    setSessionId(null)
  }, [])

  const sendMessage = useCallback(async (messages: AgentChatRequest['messages'], profileId?: string | null) => {
    // Abort previous stream if any
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const sid = sessionIdRef.current
    setSessionId(sid)
    setIsStreaming(true)
    // Clear previous events for this turn
    setEvents([])

    try {
      const body: AgentChatRequest = {
        messages,
        currentPage,
        sessionId: sid,
        profileId: profileId ?? undefined,
      }

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Agent unavailable')
        setEvents(prev => [...prev, { type: 'error', message: errText }])
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines: "data: {...}\n\n"
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          const jsonStr = trimmed.slice(6)
          try {
            const event = JSON.parse(jsonStr) as AgentSSEEvent
            setEvents(prev => [...prev, event])

            if (event.type === 'done') {
              setIsStreaming(false)
              return
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setEvents(prev => [...prev, { type: 'error', message: (err as Error).message || 'Stream failed' }])
      }
    } finally {
      setIsStreaming(false)
    }
  }, [userEmail, currentPage])

  const sendApproval = useCallback((approvalId: string, decision: ApprovalDecision, editedArgs?: Record<string, unknown>) => {
    const sid = sessionIdRef.current
    fetch('/api/agent/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': userEmail,
      },
      body: JSON.stringify({
        sessionId: sid,
        approvalId,
        decision,
        editedArgs,
      }),
    }).catch(() => {
      // Best-effort — if it fails the agent loop will timeout and reject
    })
  }, [userEmail])

  return { events, isStreaming, sessionId, sendMessage, sendApproval, reset }
}

function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
