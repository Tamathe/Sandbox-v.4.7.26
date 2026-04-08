'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, Bot, User, Loader2, Mic, MicOff, Download, Lightbulb, X, Headphones } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../lib/auth-context'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { extractCompleteSentences, sanitizeSpeechText } from '../lib/audio-experience'
import { StarRating } from './StarRating'
import { PrivacyFooter } from './PrivacyFooter'
import { getUIMode, IS_PROFESSIONAL } from '../lib/ui-mode'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  toolId: string
  toolName?: string
  thumbnailUrl?: string | null
  systemPrompt?: string | null
  personaName?: string | null
  personaAvatar?: string | null
  welcomeMessage?: string | null
  starterQuestions?: string[]
  courseId?: string
  totalSteps?: number | null
  stepLabel?: string | null
  injectContext?: string
  audioEnabled?: boolean
  audioPersonaName?: string | null
  audioVoiceName?: string | null
  audioSpeed?: number
  audioBackgroundTrack?: string | null
  onMessagesChange?: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void
  onUserMessageCountChange?: (count: number) => void
  resumeSessionId?: string
  onRatingChange?: (summary: { avg: number; count: number; userRating: number | null }) => void
}

type PrefillChatEventDetail = {
  toolId: string
  message: string
}

export default function ChatInterface({
  toolId,
  toolName,
  thumbnailUrl,
  personaName,
  personaAvatar,
  welcomeMessage,
  starterQuestions = [],
  courseId,
  totalSteps,
  stepLabel,
  injectContext,
  audioEnabled = false,
  audioPersonaName,
  audioVoiceName,
  audioSpeed = 1,
  audioBackgroundTrack,
  onMessagesChange,
  onUserMessageCountChange,
  resumeSessionId,
  onRatingChange,
}: ChatInterfaceProps) {
  const { currentUser } = useAuth()
  const uiMode = getUIMode(currentUser.role)
  const isProfessionalUI = IS_PROFESSIONAL(uiMode)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(injectContext ?? '')
  const [injectBanner, setInjectBanner] = useState(!!injectContext)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(`sandbox-session-${toolId}`) ?? null
  })
  const [endFlowStep, setEndFlowStep] = useState<'rating' | 'journal' | null>(null)
  const [journalNote, setJournalNote] = useState('')
  const [sessionRating, setSessionRating] = useState<number | null>(null)
  const [endFlowLoading, setEndFlowLoading] = useState(false)
  const [sessionJustCompleted, setSessionJustCompleted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const {
    isRecording,
    interimTranscript,
    error: micError,
    isSupported: micSupported,
    startRecording,
    stopRecording,
  } = useSpeechRecognition()
  const {
    activate,
    configurePersona,
    deactivate,
    enqueue,
    stop: stopAudioPlayback,
    currentText,
    isPlaying,
    persona: activeAudioPersona,
  } = useAudioPlayer()
  const displayPersonaName = personaName?.trim() || 'Sandy'
  const displayPersonaAvatar = personaAvatar?.trim() || ''
  const audioPersona = useMemo(
    () =>
      audioEnabled && audioVoiceName
        ? {
            toolId,
            toolName: toolName?.trim() || displayPersonaName,
            personaName: audioPersonaName?.trim() || displayPersonaName,
            voiceName: audioVoiceName,
            speed: audioSpeed,
            backgroundTrack: audioBackgroundTrack ?? null,
            artworkUrl: thumbnailUrl ?? null,
          }
        : null,
    [
      audioBackgroundTrack,
      audioEnabled,
      audioPersonaName,
      audioSpeed,
      audioVoiceName,
      displayPersonaName,
      thumbnailUrl,
      toolId,
      toolName,
    ]
  )
  const [audioMode, setAudioMode] = useState(false)
  const visibleMessageCount = messages.length
  const userMessageCount = messages.filter((message) => message.role === 'user').length
  const progressLabel = stepLabel?.trim() || 'Step'
  const currentStep = totalSteps ? Math.min(totalSteps, userMessageCount) : null
  const audioActivatedRef = useRef(false)
  const audioListeningStartedAtRef = useRef<number | null>(null)
  const audioListeningMsRef = useRef(0)
  const sessionObjectiveIdsRef = useRef<string[]>([])

  useEffect(() => {
    const handlePrefill = (event: Event) => {
      const customEvent = event as CustomEvent<PrefillChatEventDetail>
      if (customEvent.detail?.toolId !== toolId) return

      const nextMessage = customEvent.detail.message ?? ''
      setInput(nextMessage)

      requestAnimationFrame(() => {
        inputRef.current?.focus()
        const cursor = nextMessage.length
        inputRef.current?.setSelectionRange(cursor, cursor)
      })
    }

    window.addEventListener('sandbox-prefill-chat', handlePrefill)
    return () => window.removeEventListener('sandbox-prefill-chat', handlePrefill)
  }, [toolId])

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [])

  const prevMessageCount = useRef(0)
  useEffect(() => {
    if (messages.length !== prevMessageCount.current || endFlowStep !== null) {
      prevMessageCount.current = messages.length
      scrollToBottom()
    }
  }, [messages.length, endFlowStep, scrollToBottom])

  useEffect(() => {
    onMessagesChange?.(messages.map(({ role, content }) => ({ role, content })))
    onUserMessageCountChange?.(messages.filter((message) => message.role === 'user').length)
  }, [messages, onMessagesChange, onUserMessageCountChange])

  const getAudioSessionDurationSecs = useCallback(() => {
    const activeMs =
      audioListeningStartedAtRef.current !== null
        ? Date.now() - audioListeningStartedAtRef.current
        : 0

    return Math.round((audioListeningMsRef.current + activeMs) / 1000)
  }, [])

  const syncAudioSessionMetrics = useCallback(async () => {
    if (!sessionId || !audioActivatedRef.current) return

    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({
        audioActivated: true,
        audioSessionDurationSecs: getAudioSessionDurationSecs(),
      }),
    }).catch(() => {})
  }, [currentUser.email, getAudioSessionDurationSecs, sessionId])

  useEffect(() => {
    const isThisToolPlaying = Boolean(audioMode && isPlaying && activeAudioPersona?.toolId === toolId)

    if (isThisToolPlaying && audioListeningStartedAtRef.current === null) {
      audioListeningStartedAtRef.current = Date.now()
      return
    }

    if (!isThisToolPlaying && audioListeningStartedAtRef.current !== null) {
      audioListeningMsRef.current += Date.now() - audioListeningStartedAtRef.current
      audioListeningStartedAtRef.current = null
    }
  }, [activeAudioPersona?.toolId, audioMode, isPlaying, toolId])

  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ toolId, courseId }),
      })
      if (!res.ok) return null
      const session = await res.json()
      setSessionId(session.id)
      sessionStorage.setItem(`sandbox-session-${toolId}`, session.id)
      return session.id as string
    } catch {
      return null
    }
  }, [toolId, courseId, currentUser.email])

  useEffect(() => {
    let cancelled = false

    const initializeSession = async () => {
      if (resumeSessionId) {
        try {
          const response = await fetch(`/api/sessions/${resumeSessionId}/messages`, {
            headers: { 'x-demo-user-email': currentUser.email },
          })
          if (response.ok) {
            const saved: Array<{ role: 'user' | 'assistant'; content: string; createdAt?: string }> =
              await response.json()
            if (cancelled) return
            setMessages(
              saved.map((message, index) => ({
                id: `${resumeSessionId}-${message.createdAt ?? index}`,
                role: message.role,
                content: message.content,
              }))
            )
            setSessionId(resumeSessionId)
            return
          }
        } catch {
          if (cancelled) return
        }
      }

      let recoveredSessionId = sessionId

      if (recoveredSessionId) {
        try {
          const response = await fetch(`/api/sessions/${recoveredSessionId}/messages`, {
            headers: { 'x-demo-user-email': currentUser.email },
          })
          if (response.ok) {
            const saved: Array<{ role: 'user' | 'assistant'; content: string; createdAt?: string }> =
              await response.json()
            if (cancelled) return
            setMessages(
              saved.map((message, index) => ({
                id: `${recoveredSessionId}-${message.createdAt ?? index}`,
                role: message.role,
                content: message.content,
              }))
            )
            return
          }
        } catch {
          if (cancelled) return
        }

        recoveredSessionId = null
        sessionStorage.removeItem(`sandbox-session-${toolId}`)
        setSessionId(null)
      }

      if (!cancelled && !recoveredSessionId) {
        await createSession()
      }
    }

    initializeSession()

    return () => {
      cancelled = true
    }
  }, [resumeSessionId, currentUser.email, createSession, sessionId, toolId])

  useEffect(() => {
    return () => {
      if (audioListeningStartedAtRef.current !== null) {
        audioListeningMsRef.current += Date.now() - audioListeningStartedAtRef.current
        audioListeningStartedAtRef.current = null
      }
      void syncAudioSessionMetrics()
    }
  }, [syncAudioSessionMetrics])

  const handleExport = () => {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const transcript = messages
      .map((message) => `${message.role === 'user' ? 'You' : displayPersonaName}: ${message.content}`)
      .join('\n\n')
    const lines = [
      `Session: ${displayPersonaName}`,
      `Date: ${date}`,
      '-'.repeat(40),
      '',
      transcript,
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `session-${displayPersonaName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const completeSession = useCallback(
    async (note?: string) => {
      if (sessionId) {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({
            notes: note ?? undefined,
            status: 'completed',
            messageCount: messages.filter((message) => message.role === 'user').length,
            audioActivated: audioActivatedRef.current,
            audioSessionDurationSecs: getAudioSessionDurationSecs(),
          }),
        }).catch(() => {})
      }

      if (audioListeningStartedAtRef.current !== null) {
        audioListeningMsRef.current += Date.now() - audioListeningStartedAtRef.current
        audioListeningStartedAtRef.current = null
      }

      setEndFlowStep(null)
      setJournalNote('')
      setSessionRating(null)
      setMessages([])
      setInput('')
      setAudioMode(false)
      deactivate()
      setSessionId(null)
      sessionStorage.removeItem(`sandbox-session-${toolId}`)
    },
    [currentUser.email, deactivate, getAudioSessionDurationSecs, messages, sessionId, toolId]
  )

  const handleSubmitRating = async (rating: number) => {
    setSessionRating(rating)
    setEndFlowLoading(true)
    try {
      const response = await fetch(`/api/tools/${toolId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ rating }),
      })
      if (response.ok) {
        const summary = await response.json()
        onRatingChange?.(summary)
        setSessionJustCompleted(true)
      }
    } finally {
      setEndFlowLoading(false)
      setEndFlowStep('journal')
    }
  }

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const activeSessionId = sessionId ?? (await createSession())
      if (!activeSessionId) return

      if (audioMode && audioPersona) {
        audioActivatedRef.current = true
        stopAudioPlayback()
        if (activeAudioPersona?.toolId === toolId) {
          configurePersona(audioPersona)
        } else {
          activate(audioPersona)
        }
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setInput('')
      setIsLoading(true)

      try {
        const allMessages = [...messages, userMessage]
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({
            toolId,
            courseId,
            sessionId: activeSessionId,
            audioMode,
            messages: allMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || 'Chat request failed')
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let audioRemainder = ''
        let fullAssistantText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          fullAssistantText += text
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content + text }
                : message
            )
          )

          if (audioMode && audioPersona) {
            audioRemainder += text
            const { sentences, remainder } = extractCompleteSentences(audioRemainder)
            audioRemainder = remainder
            sentences
              .map(sanitizeSpeechText)
              .filter(Boolean)
              .forEach((sentence) => enqueue(sentence))
          }
        }

        if (audioMode && audioPersona) {
          const { sentences } = extractCompleteSentences(audioRemainder, true)
          sentences
            .map(sanitizeSpeechText)
            .filter(Boolean)
            .forEach((sentence) => enqueue(sentence))
        }

        // Parse learning objective tags, strip them from the visible message, and log progress
        const OBJECTIVE_TAG_RE = /<!--OBJECTIVES:([\s\S]*?)-->/g
        type ObjectiveUpdate = { id: string; quality: 'green' | 'yellow' }
        const objectiveUpdates: ObjectiveUpdate[] = []
        let tagMatch: RegExpExecArray | null
        while ((tagMatch = OBJECTIVE_TAG_RE.exec(fullAssistantText)) !== null) {
          try {
            const parsed = JSON.parse(tagMatch[1])
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (typeof item === 'string') {
                  objectiveUpdates.push({ id: item, quality: 'yellow' })
                } else if (item && typeof item.id === 'string') {
                  objectiveUpdates.push({ id: item.id, quality: item.quality === 'green' ? 'green' : 'yellow' })
                }
              }
            }
          } catch { /* ignore malformed tags */ }
        }

        sessionObjectiveIdsRef.current = [...new Set(objectiveUpdates.map(u => u.id))]

        if (objectiveUpdates.length > 0 || fullAssistantText.includes('<!--OBJECTIVES:')) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content.replace(/<!--OBJECTIVES:[\s\S]*?-->/g, '').trim() }
                : message
            )
          )
          if (courseId && objectiveUpdates.length > 0) {
            // Deduplicate: if same id appears as both green and yellow, keep green
            const deduped = new Map<string, 'green' | 'yellow'>()
            for (const u of objectiveUpdates) {
              const existing = deduped.get(u.id)
              if (!existing || u.quality === 'green') deduped.set(u.id, u.quality)
            }
            fetch('/api/objectives/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
              body: JSON.stringify({
                objectiveUpdates: Array.from(deduped.entries()).map(([id, quality]) => ({ id, quality })),
                courseId,
              }),
            }).catch(() => {})
          }
        }
      } catch (err) {
        console.error('Chat error:', err)
        const errMsg =
          err instanceof Error ? err.message : 'Sorry, something went wrong. Please try again.'
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: `Warning: ${errMsg}` }
              : message
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [
      activeAudioPersona?.toolId,
      activate,
      audioMode,
      audioPersona,
      configurePersona,
      courseId,
      createSession,
      currentUser.email,
      enqueue,
      isLoading,
      messages,
      sessionId,
      stopAudioPlayback,
      toolId,
    ]
  )

  const handleELI5 = useCallback(() => {
    sendMessage(
      'Can you explain that again using a simple analogy? Pretend I have no background in this subject.'
    )
  }, [sendMessage])

  const handleToggleAudioMode = useCallback(async () => {
    if (!audioPersona) return

    if (audioMode) {
      setAudioMode(false)
      deactivate()
      await syncAudioSessionMetrics()
      return
    }

    audioActivatedRef.current = true
    setAudioMode(true)
    stopAudioPlayback()
    activate(audioPersona)
  }, [activate, audioMode, audioPersona, deactivate, stopAudioPlayback, syncAudioSessionMetrics])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="relative flex h-[500px] lg:h-[600px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 bg-[#0033A0] px-4 py-3 text-white flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          {displayPersonaAvatar ? (
            <span className="text-sm leading-none" aria-hidden="true">
              {displayPersonaAvatar}
            </span>
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold">{displayPersonaName}</div>
          <div className="flex items-center gap-1 text-xs text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Online
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {audioPersona ? (
            <button
              type="button"
              onClick={() => {
                void handleToggleAudioMode()
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                audioMode
                  ? 'border-white/30 bg-white/15 text-white'
                  : 'border-white/20 text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
              title={audioMode ? 'Turn off audio mode' : 'Turn on hands-free audio mode'}
            >
              <Headphones className="h-3.5 w-3.5" />
              {audioMode ? 'Audio On' : 'Audio'}
            </button>
          ) : null}
          {visibleMessageCount > 0 && (
            <>
              <button
                type="button"
                onClick={handleExport}
                title="Export conversation"
                className="rounded-lg p-1.5 text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionRating(null)
                  setJournalNote('')
                  setEndFlowStep('rating')
                }}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                End Session
              </button>
            </>
          )}
        </div>
      </div>

      {totalSteps ? (
        <div className="border-b border-gray-100 bg-white px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>
              {progressLabel} {Math.min(currentStep ?? 0, totalSteps)} of {totalSteps}
            </span>
            <span>{Math.round((((currentStep ?? 0) / totalSteps) || 0) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#0033A0] transition-all duration-300"
              style={{ width: `${Math.min(100, (((currentStep ?? 0) / totalSteps) || 0) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {welcomeMessage && messages.length === 0 && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0033A0]">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-800">
              <ReactMarkdown
                components={{
                  p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  em:     ({ children }) => <em className="italic">{children}</em>,
                  ul:     ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                  ol:     ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                  li:     ({ children }) => <li>{children}</li>,
                }}
              >
                {welcomeMessage}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {sessionJustCompleted && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
            <span className="font-semibold text-green-800">
              {isProfessionalUI ? 'Session saved to your learning history.' : 'Session complete! XP awarded.'}
            </span>
            <div className="flex items-center gap-3">
              <Link href="/analytics/student" className="font-semibold text-[#0033A0] hover:underline">
                {isProfessionalUI ? 'View history ->' : 'View progress ->'}
              </Link>
              <button
                type="button"
                onClick={() => setSessionJustCompleted(false)}
                className="text-green-400 hover:text-green-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {starterQuestions.length > 0 && messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-11">
            {starterQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => sendMessage(question)}
                disabled={isLoading}
                className="rounded-xl border border-[#0033A0] bg-white px-3 py-2 text-xs text-[#0033A0] transition-colors hover:bg-blue-50 disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => {
          const isSpeaking =
            message.role === 'assistant' &&
            Boolean(
              audioMode &&
                currentText &&
                activeAudioPersona?.toolId === toolId &&
                message.content.includes(currentText)
            )

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  message.role === 'user'
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-[#0033A0] text-white'
                }`}
              >
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className="max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-tr-sm bg-[#0033A0] text-white'
                      : isSpeaking
                        ? 'rounded-tl-sm border border-blue-200 bg-blue-50 text-gray-800 shadow-sm shadow-blue-100'
                        : 'rounded-tl-sm bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.content === '' && message.role === 'assistant' ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  ) : message.role === 'assistant' ? (
                    <div className="text-sm leading-relaxed space-y-2">
                      <ReactMarkdown
                        components={{
                          p:          ({ children }) => <p className="mb-1">{children}</p>,
                          strong:     ({ children }) => <strong className="font-bold">{children}</strong>,
                          em:         ({ children }) => <em className="italic">{children}</em>,
                          ul:         ({ children }) => <ul className="list-disc pl-4 space-y-0.5">{children}</ul>,
                          ol:         ({ children }) => <ol className="list-decimal pl-4 space-y-0.5">{children}</ol>,
                          li:         ({ children }) => <li className="mb-0.5">{children}</li>,
                          h1:         ({ children }) => <h1 className="font-bold text-base mt-2 mb-1">{children}</h1>,
                          h2:         ({ children }) => <h2 className="font-bold text-sm mt-2 mb-1">{children}</h2>,
                          h3:         ({ children }) => <h3 className="font-semibold text-sm mt-1.5 mb-0.5">{children}</h3>,
                          code:       ({ children }) => <code className="bg-gray-200 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                          pre:        ({ children }) => <pre className="bg-gray-200 rounded p-2 overflow-x-auto text-xs">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-400 pl-3 italic text-gray-600">{children}</blockquote>,
                          a:          ({ href, children }) => <a href={href} className="text-[#0033A0] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
                {message.role === 'assistant' && index === messages.length - 1 && !isLoading && (
                  <div className="mt-1 ml-10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleELI5}
                      className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-[#0033A0]"
                    >
                      <Lightbulb className="w-3 h-3" />
                      Simplify this
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {/* Flag session for review — shown after a completed exchange that covered objectives */}
        {!isLoading && sessionObjectiveIdsRef.current.length > 0 && courseId && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                fetch('/api/objectives/progress', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
                  body: JSON.stringify({
                    objectiveIds: sessionObjectiveIdsRef.current,
                    flagForReview: true,
                    courseId,
                  }),
                }).catch(() => {})
                sessionObjectiveIdsRef.current = []
              }}
              className="text-xs text-amber-600 border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 font-medium"
            >
              🔖 Flag this session for review
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0">
        {injectBanner && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2">
            <span className="flex-1 text-xs text-purple-700">
              <span className="font-semibold">Sandy pre-loaded context:</span> {injectContext}
            </span>
            <button
              type="button"
              onClick={() => setInjectBanner(false)}
              className="mt-0.5 flex-shrink-0 text-xs text-purple-400 hover:text-purple-600"
              aria-label="Dismiss context banner"
            >
              x
            </button>
          </div>
        )}
        {isRecording && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-500">
              {interimTranscript || 'Listening...'}
            </span>
          </div>
        )}
        {micError && <div className="mb-2 px-1 text-xs text-red-500">{micError}</div>}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={isRecording ? interimTranscript || input : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Listening...' : 'Type or speak a message...'}
            disabled={isLoading || isRecording}
            rows={1}
            className="chat-input max-h-32 flex-1 resize-none overflow-y-auto rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50"
            style={{ minHeight: '42px' }}
          />
          {micSupported && (
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  stopRecording()
                } else {
                  startRecording((text) => {
                    setInput(text)
                    setTimeout(() => inputRef.current?.focus(), 50)
                  })
                }
              }}
              disabled={isLoading}
              title={isRecording ? 'Stop recording' : 'Speak your message'}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0033A0] text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        {input.trim() === '' && messages.length === 0 ? (
          <p className="mt-1 text-center text-xs text-gray-400">
            Choose a starter question above, or type to begin
          </p>
        ) : (
          <div className="mt-1.5 text-center text-[10px] text-gray-400">
            Press the mic to speak or type to continue
          </div>
        )}
        <PrivacyFooter />
      </div>

      {endFlowStep === 'rating' && (
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white p-4 shadow-lg">
          <p className="mb-2 text-sm font-medium text-gray-800">How helpful was this session?</p>
          <div className="mb-3">
            <StarRating
              avg={0}
              count={0}
              userRating={sessionRating}
              onRate={handleSubmitRating}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEndFlowStep('journal')}
              disabled={endFlowLoading}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {endFlowStep === 'journal' && (
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white p-4 shadow-lg">
          <p className="mb-2 text-sm font-medium text-gray-800">Add a private note about this session</p>
          <textarea
            value={journalNote}
            onChange={(e) => setJournalNote(e.target.value)}
            placeholder="e.g. Finally understood the hearsay rule..."
            className="h-20 w-full resize-none rounded-lg border border-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                setEndFlowLoading(true)
                try {
                  await completeSession(journalNote.trim() || undefined)
                } finally {
                  setEndFlowLoading(false)
                }
              }}
              disabled={endFlowLoading}
              className="rounded-lg bg-[#0033A0] px-4 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {endFlowLoading ? 'Saving...' : 'Save Note'}
            </button>
            <button
              type="button"
              onClick={async () => {
                setEndFlowLoading(true)
                try {
                  await completeSession()
                } finally {
                  setEndFlowLoading(false)
                }
              }}
              disabled={endFlowLoading}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

