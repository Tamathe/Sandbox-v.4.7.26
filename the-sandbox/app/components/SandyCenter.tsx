'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bot, RotateCcw } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import type { Message, Action, CourseContext } from './concierge/concierge-utils'
import { extractActions, readCourseContext } from './concierge/concierge-utils'
import { usePageSuggestions } from '../hooks/usePageSuggestions'
import { useSandyStreamingTTS } from './concierge/useSandyStreamingTTS'
import { useSandyVoice } from './concierge/useSandyVoice'
import SandyMessage from './concierge/SandyMessage'
import SandyInputBar from './concierge/SandyInputBar'

interface SandyCenterProps {
  subtitle?: string
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getRoleSubtitle(role: string): string {
  switch (role) {
    case 'STUDENT':
      return 'Ask me anything about your courses, assignments, or campus life'
    case 'EDUCATOR':
      return 'Ask me anything about your week, students, or courses'
    case 'ADMIN':
      return 'Ask me anything about the platform, data, or operations'
    default:
      return 'Ask me anything'
  }
}

export default function SandyCenter({ subtitle = 'Your AI Assistant' }: SandyCenterProps) {
  const { currentUser, setCurrentUser, allUsers } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // ─── Core state ─────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rawMessages, setRawMessages] = useState<Map<string, string>>(new Map())
  const [courseContext, setCourseContext] = useState<CourseContext | null>(null)
  const [avatarMode, setAvatarMode] = useState(false)
  const [avatarMeta, setAvatarMeta] = useState<{ facultyName: string; courseCode: string } | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>([])

  // Dummy setters for useSandyVoice (no sidebar open/close in center mode)
  const noop = useCallback(() => {}, [])

  // ─── Starters ─────────────────────────────────────────────────────
  const ASSISTANT_STARTERS = [
    "What does my week look like?",
    "Suggest some options for 30 minutes with Dr. Stack",
    "Summarize my unread emails",
    "When is my next assignment due?",
    "Remind me to submit grades by Friday",
    "Block off next Friday afternoon",
    "Draft a reply to the student asking about the extension",
    "What's UK's policy on AI in coursework?",
    "What meetings do I have this week?",
    "Let's do a study buddy session on constitutional law",
  ]
  const isAssistantUser = currentUser?.role === 'EDUCATOR' || currentUser?.role === 'ADMIN'

  const pageSuggestions = usePageSuggestions()

  const starters = isAssistantUser
    ? ASSISTANT_STARTERS.sort(() => Math.random() - 0.5).slice(0, 6)
    : pageSuggestions.slice(0, 6)

  // ─── Auto-scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    if (distFromBottom < 150) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // ─── Course context sync ──────────────────────────────────────────
  useEffect(() => {
    setCourseContext(readCourseContext())
    setAvatarMode(false)
    setAvatarMeta(null)

    const syncCourseContext = (event: Event) => {
      const detail = (event as CustomEvent<CourseContext | null>).detail
      if (detail !== undefined) {
        setCourseContext(detail)
        return
      }
      setCourseContext(readCourseContext())
    }

    window.addEventListener('uky-course-context-changed', syncCourseContext)
    return () => window.removeEventListener('uky-course-context-changed', syncCourseContext)
  }, [pathname])

  // ─── Submit handler ───────────────────────────────────────────────
  const submit = useCallback(async (content: string) => {
    if (!content.trim() || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messagesRef.current, userMsg]
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          currentPage: pathname,
          userEmail: currentUser.email,
          courseContext,
        }),
      })

      if (!res.ok) throw new Error('Sandy is unavailable right now.')

      const avatarHeader = res.headers.get('x-avatar-meta')
      if (avatarHeader) {
        try {
          const meta = JSON.parse(avatarHeader) as { facultyName: string; courseCode: string }
          setAvatarMode(true)
          setAvatarMeta(meta)
        } catch { /* ignore parse errors */ }
      } else {
        setAvatarMode(false)
        setAvatarMeta(null)
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
    } finally {
      setLoading(false)
    }
  }, [courseContext, currentUser.email, loading, pathname])

  // ─── Sandy-prefill event listener ─────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; autoSend?: boolean }>).detail
      if (detail?.message) {
        setInput(detail.message)
        if (detail.autoSend) {
          window.setTimeout(() => {
            void submit(detail.message)
          }, 400)
        }
      }
    }
    window.addEventListener('sandy-prefill', handler)
    return () => window.removeEventListener('sandy-prefill', handler)
  }, [submit])

  // ─── Streaming TTS hook ───────────────────────────────────────────
  const tts = useSandyStreamingTTS({
    userEmail: currentUser.email,
  })

  // Keep refs for TTS functions used inside submit
  const feedTextRef = useRef(tts.feedText)
  const finalizeRef = useRef(tts.finalize)
  const resetRef = useRef(tts.reset)
  useEffect(() => {
    feedTextRef.current = tts.feedText
    finalizeRef.current = tts.finalize
    resetRef.current = tts.reset
  }, [tts.feedText, tts.finalize, tts.reset])

  // ─── Voice hook ───────────────────────────────────────────────────
  const {
    isRecording,
    isSupported,
    continuousMode,
    handleMicPointerDown,
    handleMicPointerUp,
    handleMicPointerLeave,
    startContinuousListening,
  } = useSandyVoice({
    submit,
    loading,
    setInput,
    setOpen: noop,
    setMobileOpen: noop,
    inputRef,
    onRecordingStart: tts.interrupt,
  })

  // Auto-listen after Sandy finishes speaking (voice conversation loop)
  useEffect(() => {
    if (!tts.voiceMode || tts.isSpeaking || loading || !isSupported) return
    const timer = setTimeout(() => {
      if (!continuousMode && !isRecording) {
        startContinuousListening()
      }
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.isSpeaking])

  // ─── Action handler ───────────────────────────────────────────────
  const handleAction = (action: Action) => {
    if (action.type === 'navigate' && action.href) {
      router.push(action.href)
    } else if (action.type === 'launch' && action.toolId) {
      const path = action.inject
        ? `/tools/${action.toolId}?inject=${encodeURIComponent(btoa(unescape(encodeURIComponent(action.inject))))}`
        : `/tools/${action.toolId}`
      router.push(path)
    } else if (action.type === 'switch-user' && action.email) {
      const targetUser = allUsers.find(u => u.email === action.email)
      if (targetUser) {
        setCurrentUser(targetUser)
        if (action.href) {
          router.push(action.href)
        }
      }
    }
  }

  // ─── Assistant action handler ─────────────────────────────────────
  const handleAssistantAction = useCallback((actionType: string, payload: unknown) => {
    if (actionType === 'book-meeting') {
      submit(`Book option ${(payload as { index: number })?.index ?? ''}`)
    } else if (actionType === 'approve-draft') {
      fetch(`/api/assistant/email/draft/${payload}/approve`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser?.email ?? '' },
      })
    } else if (actionType === 'discard-draft') {
      fetch(`/api/assistant/email/draft/${payload}/discard`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser?.email ?? '' },
      })
    } else if (actionType === 'complete-task') {
      fetch(`/api/assistant/tasks/${payload}`, {
        method: 'PATCH',
        headers: { 'x-demo-user-email': currentUser?.email ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
    }
  }, [submit, currentUser?.email])

  // ─── Clear chat ───────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    tts.interrupt()
    setMessages([])
    setRawMessages(new Map())
    setInput('')
  }, [tts])

  // ─── Greeting state ───────────────────────────────────────────────
  const firstName = currentUser.name.split(' ')[0]
  const timeGreeting = getTimeGreeting()
  const roleSubtitle = getRoleSubtitle(currentUser.role)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-2xl mx-auto w-full">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0033A0] flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="size-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-white font-semibold text-sm">Sandy</span>
            <span className="text-white/60 text-xs ml-1.5">{subtitle}</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-white/60 hover:text-white transition-colors flex-shrink-0"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
        {/* Hero greeting when no messages */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 select-none">
            {/* Sandy avatar */}
            <div className="size-16 bg-[#0033A0] rounded-full flex items-center justify-center mb-6 shadow-lg">
              <Bot className="size-8 text-white" />
            </div>

            {/* Time-aware greeting */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-2">
              {timeGreeting}, {firstName}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 text-center mb-8 max-w-md">
              {roleSubtitle}
            </p>

            {/* Starter chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {starters.map((starter) => (
                <button
                  key={starter}
                  onClick={() => submit(starter)}
                  className="text-sm text-[#0033A0] bg-white hover:bg-blue-50 border border-gray-200 hover:border-[#0033A0]/30 rounded-full px-4 py-2 transition-all shadow-sm hover:shadow"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => {
          const rawContent = rawMessages.get(msg.id)
          const extracted = rawContent ? extractActions(rawContent) : { actions: [], prereqMarkers: [], assistantActions: [] }

          return (
            <SandyMessage
              key={msg.id}
              msg={msg}
              trustPanel={null}
              actions={extracted.actions}
              prereqMarkers={extracted.prereqMarkers}
              assistantActions={extracted.assistantActions ?? []}
              isProactive={false}
              loading={loading}
              userEmail={currentUser?.email}
              onAction={handleAction}
              onPrereqClick={() => {}}
              onDismissProactive={() => {}}
              onAssistantAction={handleAssistantAction}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <SandyInputBar
        input={input}
        setInput={setInput}
        loading={loading}
        onSubmit={submit}
        inputRef={inputRef}
        isRecording={isRecording}
        isSupported={isSupported}
        continuousMode={continuousMode}
        onMicPointerDown={handleMicPointerDown}
        onMicPointerUp={handleMicPointerUp}
        onMicPointerLeave={handleMicPointerLeave}
        voiceMode={tts.voiceMode}
        isSpeaking={tts.isSpeaking}
        onToggleVoiceMode={tts.toggleVoiceMode}
        avatarMode={avatarMode}
        avatarMeta={avatarMeta}
      />
    </div>
  )
}
