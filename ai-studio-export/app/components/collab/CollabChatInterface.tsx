'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Loader2, LogOut, Send, Users, Wifi, WifiOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import type { DemoUser } from '../../lib/auth-context'
import type {
  CollabMessageSummary,
  CollabSessionState,
  CollabSSEEvent,
} from '../../lib/collab-types'

interface CollabChatInterfaceProps {
  initialSession: CollabSessionState
  currentUser: DemoUser
  personaName?: string | null
  onSessionClosed: (reason: 'left' | 'ended') => void
}

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const PARTICIPANT_STYLES = [
  'border-blue-200 bg-blue-50 text-blue-900',
  'border-purple-200 bg-purple-50 text-purple-900',
  'border-green-200 bg-green-50 text-green-900',
  'border-orange-200 bg-orange-50 text-orange-900',
]

function makeClientMessageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function CollabChatInterface({
  initialSession,
  currentUser,
  personaName,
  onSessionClosed,
}: CollabChatInterfaceProps) {
  const [session, setSession] = useState(initialSession)
  const [messages, setMessages] = useState<CollabMessageSummary[]>(initialSession.messageHistory)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [copiedState, setCopiedState] = useState<'join' | 'link' | null>(null)
  const [isEndingOrLeaving, setIsEndingOrLeaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamingMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    setSession(initialSession)
    setMessages(initialSession.messageHistory)
  }, [initialSession])

  useEffect(() => {
    streamingMessageIdRef.current = streamingMessageId
  }, [streamingMessageId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streamingContent])

  useEffect(() => {
    setConnectionStatus('connecting')
    const eventSource = new EventSource(
      `/api/collab/stream/${session.id}?email=${encodeURIComponent(currentUser.email)}`
    )

    eventSource.onopen = () => {
      setConnectionStatus('connected')
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as CollabSSEEvent

        switch (parsed.type) {
          case 'init_state': {
            setSession(parsed.payload)
            setMessages(parsed.payload.messageHistory)
            setStreamingMessageId(null)
            setStreamingContent('')
            break
          }
          case 'new_message': {
            setMessages((currentMessages) => {
              const duplicateIndex = currentMessages.findIndex(
                (message) =>
                  message.id === parsed.payload.id ||
                  (parsed.payload.clientMessageId &&
                    message.clientMessageId === parsed.payload.clientMessageId)
              )

              if (duplicateIndex >= 0) {
                return currentMessages.map((message, index) =>
                  index === duplicateIndex ? parsed.payload : message
                )
              }

              return [...currentMessages, parsed.payload]
            })
            break
          }
          case 'ai_stream_chunk': {
            setStreamingMessageId(parsed.payload.messageId)
            setStreamingContent((currentContent) =>
              streamingMessageIdRef.current && streamingMessageIdRef.current !== parsed.payload.messageId
                ? parsed.payload.chunk
                : currentContent + parsed.payload.chunk
            )
            break
          }
          case 'ai_stream_end': {
            setMessages((currentMessages) => {
              if (currentMessages.some((message) => message.id === parsed.payload.messageId)) {
                return currentMessages
              }

              return [
                ...currentMessages,
                {
                  id: parsed.payload.messageId,
                  role: 'assistant',
                  content: parsed.payload.fullContent,
                  senderId: null,
                  senderName: null,
                  senderEmail: null,
                  clientMessageId: null,
                  createdAt: parsed.payload.createdAt,
                  turnNumber: null,
                  triggeredArtifactUpdate: false,
                },
              ]
            })
            setStreamingMessageId(null)
            setStreamingContent('')
            break
          }
          case 'presence_update': {
            setSession((currentSession) => {
              const nextHostId = parsed.payload.promotedHostId ?? currentSession.hostId
              const nextHostName =
                parsed.payload.promotedHostId
                  ? parsed.payload.participants.find(
                      (participant) => participant.userId === parsed.payload.promotedHostId
                    )?.name ?? currentSession.hostName
                  : currentSession.hostName

              return {
                ...currentSession,
                hostId: nextHostId,
                hostName: nextHostName,
                participants: parsed.payload.participants,
              }
            })
            break
          }
          case 'session_end': {
            setSession((currentSession) => ({
              ...currentSession,
              status: 'ENDED',
              endedAt: parsed.payload.endedAt,
            }))
            setError(`${parsed.payload.endedByName} ended the collaborative session.`)
            break
          }
          case 'error': {
            setError(parsed.payload.message)
            break
          }
          case 'turn_change': {
            setSession((currentSession) => ({
              ...currentSession,
              currentTurnUserId: parsed.payload.activeUserId,
              currentTurnUserName: parsed.payload.activeName,
            }))
            break
          }
          case 'artifact_update': {
            setSession((currentSession) => ({
              ...currentSession,
              artifactContent: parsed.payload.artifact,
            }))
            break
          }
          case 'score_update': {
            setSession((currentSession) => ({
              ...currentSession,
              teamScore: parsed.payload.teamScore,
            }))
            break
          }
          default:
            break
        }
      } catch {}
    }

    eventSource.onerror = () => {
      setConnectionStatus((currentStatus) =>
        currentStatus === 'connected' ? 'reconnecting' : 'disconnected'
      )
    }

    return () => {
      eventSource.close()
    }
  }, [currentUser.email, session.id])

  const participantTone = useMemo(() => {
    const toneMap = new Map<string, string>()
    session.participants.forEach((participant, index) => {
      toneMap.set(participant.email, PARTICIPANT_STYLES[index % PARTICIPANT_STYLES.length])
    })
    return toneMap
  }, [session.participants])

  const myParticipant = session.participants.find((participant) => participant.email === currentUser.email)
  const isHost = myParticipant?.isHost ?? false
  const isMyTurn = !session.currentTurnUserId || session.currentTurnUserId === myParticipant?.userId
  const inputDisabled =
    isSending ||
    session.status === 'ENDED' ||
    (session.mode === 'TURN_BASED' && !isMyTurn)

  const copyValue = async (value: string, kind: 'join' | 'link') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedState(kind)
      window.setTimeout(() => setCopiedState(null), 1500)
    } catch {
      setCopiedState(null)
    }
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || inputDisabled) return

    const clientMessageId = makeClientMessageId()
    const optimisticMessage: CollabMessageSummary = {
      id: clientMessageId,
      role: 'user',
      content: trimmed,
      senderId: myParticipant?.userId ?? currentUser.email,
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      clientMessageId,
      createdAt: new Date().toISOString(),
      turnNumber: null,
      triggeredArtifactUpdate: false,
    }

    setMessages((currentMessages) => [...currentMessages, optimisticMessage])
    setInput('')
    setIsSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/collab/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          content: trimmed,
          clientMessageId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (sendError) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.clientMessageId !== clientMessageId)
      )
      setInput(trimmed)
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleComposerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await handleSend()
  }

  const handleLeaveOrEnd = async () => {
    if (isEndingOrLeaving) return
    setIsEndingOrLeaving(true)

    try {
      if (isHost) {
        const response = await fetch(`/api/collab/sessions/${session.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({ action: 'end' }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to end session')
        }

        onSessionClosed('ended')
        return
      }

      const response = await fetch(`/api/collab/sessions/${session.id}/leave`, {
        method: 'DELETE',
        headers: {
          'x-demo-user-email': currentUser.email,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to leave session')
      }

      onSessionClosed('left')
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : 'Failed to update session')
    } finally {
      setIsEndingOrLeaving(false)
    }
  }

  const renderMessage = (message: CollabMessageSummary) => {
    if (message.role === 'assistant') {
      return (
        <div key={message.id} className="rounded-2xl border border-[#0033A0]/15 bg-[#0033A0]/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0033A0] text-sm font-bold text-white">
              {(personaName?.trim() || 'Sandy').slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0033A0]">{personaName?.trim() || 'Sandy'}</p>
              <p className="text-xs text-gray-500">Shared AI response</p>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-gray-800">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      )
    }

    const tone = participantTone.get(message.senderEmail ?? '') ?? PARTICIPANT_STYLES[0]

    return (
      <div key={message.id} className={`rounded-2xl border p-4 ${tone}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{message.senderName ?? 'Participant'}</p>
            <p className="text-xs opacity-70">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
            {message.role}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gradient-to-r from-[#0033A0] to-[#1d4ed8] px-5 py-4 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-bold">Collaborative session</h2>
            </div>
            <p className="mt-1 text-sm text-blue-100">
              Shared thread, shared AI, one join code. Everyone sees the same conversation in real time.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 font-mono tracking-[0.2em] text-white">
                {session.joinCode}
              </span>
              <button
                onClick={() => copyValue(session.joinCode, 'join')}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-medium text-white transition hover:bg-white/20"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedState === 'join' ? 'Copied' : 'Copy code'}
              </button>
              <button
                onClick={() => copyValue(session.shareUrl, 'link')}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-medium text-white transition hover:bg-white/20"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedState === 'link' ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div className="flex items-center gap-2 text-blue-100">
              {connectionStatus === 'connected' ? (
                <Wifi className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wide">
                {connectionStatus === 'connected' ? 'Live sync' : connectionStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {session.participants.map((participant) => (
            <div
              key={participant.id}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                participant.isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-blue-100'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  participant.isActive ? 'bg-emerald-300' : 'bg-blue-200/70'
                }`}
              />
              {participant.name}
              {participant.isHost ? ' - Host' : ''}
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {session.status === 'ENDED' ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          This collaborative session has ended. You can still review the transcript below.
        </div>
      ) : null}

      {!isMyTurn && session.mode === 'TURN_BASED' ? (
        <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-[#0033A0]">
          It&apos;s currently {session.currentTurnUserName}&apos;s turn.
        </div>
      ) : null}

      <div className="max-h-[34rem] space-y-4 overflow-y-auto bg-gray-50 px-5 py-5">
        {messages.map(renderMessage)}

        {streamingContent ? (
          <div className="rounded-2xl border border-[#0033A0]/15 bg-[#0033A0]/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0033A0] text-sm font-bold text-white">
                {(personaName?.trim() || 'Sandy').slice(0, 1)}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#0033A0]">{personaName?.trim() || 'Sandy'}</p>
                <Loader2 className="h-4 w-4 animate-spin text-[#0033A0]" />
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-5 py-4">
        <form onSubmit={handleComposerSubmit} className="space-y-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              inputDisabled
                ? session.status === 'ENDED'
                  ? 'This session has ended.'
                  : 'Wait for your turn to contribute.'
                : 'Ask the AI something your whole group can build on...'
            }
            className="min-h-[110px] w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15 disabled:cursor-not-allowed disabled:bg-gray-50"
            disabled={inputDisabled}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {isHost
                ? 'As host, you can end the session for everyone.'
                : 'Leaving removes you from the shared session but keeps the host running.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLeaveOrEnd}
                disabled={isEndingOrLeaving}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {isHost ? 'End session' : 'Leave session'}
              </button>
              <button
                type="submit"
                disabled={inputDisabled || !input.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
