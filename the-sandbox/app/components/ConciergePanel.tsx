'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { usePathname, useRouter } from 'next/navigation'
import { Send, X, ChevronRight, Bot, Loader2, Mic, MicOff, ExternalLink, Rocket } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Action {
  type: 'navigate' | 'launch'
  href?: string
  toolId?: string
  label: string
  inject?: string
}

interface CourseContext {
  courseId: string
  courseCode: string
  title: string
  description: string | null
  materialsCount?: number
}

const ACTION_REGEX = /<!--ACTION:([\s\S]*?)-->/g

function extractActions(text: string): { clean: string; actions: Action[] } {
  const actions: Action[] = []
  const clean = text.replace(ACTION_REGEX, (_, json) => {
    try {
      actions.push(JSON.parse(json) as Action)
    } catch {
      // Ignore malformed action tags in partial streams.
    }
    return ''
  }).trim()

  return { clean, actions }
}

function readCourseContext(): CourseContext | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem('sandbox-course-context')
    return raw ? (JSON.parse(raw) as CourseContext) : null
  } catch {
    return null
  }
}

function getPageStarters(pathname: string): string[] {
  if (pathname === '/') return [
    'What tools are trending this week?',
    'Find me something for law students',
    'Show me the highest-rated chatbots',
    "What's new since last week?",
  ]

  if (pathname.startsWith('/builder') || pathname.startsWith('/build')) {
    return [
      'Help me think through my tool idea',
      'What makes a good system prompt?',
      'Show me example tools like mine',
      'How do I add grading rubrics?',
    ]
  }

  if (pathname.startsWith('/analytics')) {
    return [
      'Why did engagement drop this week?',
      'Which students need attention?',
      'What do the trends tell me?',
      'Compare this tool to others in its category',
    ]
  }

  if (pathname.startsWith('/courses')) {
    return [
      'When is the next assignment due?',
      'What does the next module cover?',
      'Find tools that match my course content',
      'Summarize what we covered last week',
    ]
  }

  if (pathname.startsWith('/profile')) {
    return [
      'Find new tools relevant to my interests',
      'What tools have my peers been using?',
      'Show me my learning history',
      'What should I try next based on my goals?',
    ]
  }

  if (pathname.startsWith('/bounties')) {
    return [
      'What bounties match my skills?',
      'Help me write a good bounty request',
      'Which bounties have the most XP?',
      'Show me open bounties in my department',
    ]
  }

  if (pathname.startsWith('/tools/')) {
    return [
      'How do I get the most out of this tool?',
      'Find similar tools to this one',
      'What have other students said?',
      'Launch this tool with a specific scenario',
    ]
  }

  return [
    'Show me tools for my department',
    "What's in my courses this week?",
    'What should I try next?',
    'Launch the Socratic Tutor',
  ]
}

export default function ConciergePanel() {
  const { currentUser } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { isRecording, interimTranscript, isSupported, startRecording, stopRecording } = useSpeechRecognition()

  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [rawMessages, setRawMessages] = useState<Map<string, string>>(new Map())
  const [courseContext, setCourseContext] = useState<CourseContext | null>(null)

  const starters = getPageStarters(pathname)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript)
  }, [interimTranscript])

  useEffect(() => {
    setCourseContext(readCourseContext())

    const syncCourseContext = (event: Event) => {
      const detail = (event as CustomEvent<CourseContext | null>).detail
      if (detail !== undefined) {
        setCourseContext(detail)
        return
      }
      setCourseContext(readCourseContext())
    }

    window.addEventListener('sandbox-course-context-changed', syncCourseContext)
    return () => window.removeEventListener('sandbox-course-context-changed', syncCourseContext)
  }, [pathname])

  const submit = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = [...messagesRef.current, userMsg]
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          currentPage: pathname,
          userEmail: currentUser.email,
          courseContext,
        }),
      })

      if (!res.ok) throw new Error('Sandy is unavailable right now.')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value)
        const { clean } = extractActions(fullText)
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: clean } : m))
      }

      setRawMessages(prev => new Map(prev).set(assistantId, fullText))
      const { clean } = extractActions(fullText)
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: clean } : m))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: msg } : m))
    } finally {
      setIsLoading(false)
    }
  }, [courseContext, currentUser.email, isLoading, pathname])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; autoSend?: boolean }>).detail
      if (detail?.message) {
        setInput(detail.message)
        setOpen(true)
        setMobileOpen(true)
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

  const handleMic = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording((finalText: string) => {
        if (finalText.trim()) {
          setInput(finalText)
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      })
    }
  }

  const handleAction = (action: Action) => {
    if (action.type === 'navigate' && action.href) {
      router.push(action.href)
    } else if (action.type === 'launch' && action.toolId) {
      const path = action.inject
        ? `/tools/${action.toolId}?inject=${encodeURIComponent(btoa(unescape(encodeURIComponent(action.inject))))}`
        : `/tools/${action.toolId}`
      router.push(path)
    }

    setMobileOpen(false)
  }

  const panelContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0033A0] to-purple-700 flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          S
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">Sandy</div>
          <div className="text-blue-200 text-[10px]">
            {pathname === '/courses' || pathname.startsWith('/courses/')
              ? courseContext
                ? `${courseContext.courseCode} Course Concierge`
                : 'Course Concierge'
              : 'Your Sandbox Concierge'}
          </div>
        </div>
        <button
          onClick={() => { setOpen(false); setMobileOpen(false) }}
          className="text-white/60 hover:text-white transition-colors flex-shrink-0"
          aria-label="Close Sandy"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-[#0033A0] to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                S
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm border border-gray-100 text-sm text-gray-800 max-w-[85%]">
                {pathname === '/courses' || pathname.startsWith('/courses/')
                  ? `Hi ${currentUser.name.split(' ')[0]}! I'm your course concierge${courseContext ? ` for ${courseContext.courseCode}` : ''}. Ask me about the selected course materials, linked tools, or the next step to take on this page.`
                  : `Hi ${currentUser.name.split(' ')[0]}! I'm Sandy. I can help you find tools, navigate this page, and launch the next useful step. What are you working on?`
                }
              </div>
            </div>
            <div className="pl-9 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 px-1">
                Suggestions for this page
              </div>
              {starters.map((starter) => (
                <button
                  key={starter}
                  onClick={() => submit(starter)}
                  className="block w-full text-left text-xs text-[#0033A0] bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-3 py-2 transition-colors"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const rawContent = rawMessages.get(msg.id)
          const actions = rawContent ? extractActions(rawContent).actions : []

          return (
            <div key={msg.id} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-gradient-to-br from-[#0033A0] to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  S
                </div>
              )}
              <div className={`max-w-[87%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#0033A0] text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                }`}>
                  {msg.content === '' && msg.role === 'assistant' ? (
                    <div className="flex items-center gap-1.5 py-0.5">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em:     ({ children }) => <em className="italic">{children}</em>,
                        ul:     ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                        ol:     ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                        li:     ({ children }) => <li>{children}</li>,
                        code:   ({ children }) => <code className="bg-gray-200 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                      }}
                    >{msg.content}</ReactMarkdown>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>

                {actions.length > 0 && (
                  <div className="space-y-1.5 w-full">
                    {actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleAction(action)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          action.type === 'launch'
                            ? 'bg-gradient-to-r from-[#0033A0] to-purple-700 text-white hover:opacity-90'
                            : 'bg-white border border-[#0033A0] text-[#0033A0] hover:bg-blue-50'
                        }`}
                      >
                        {action.type === 'launch'
                          ? <Rocket className="w-3.5 h-3.5 flex-shrink-0" />
                          : <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        }
                        <span className="flex-1 text-left">{action.label}</span>
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-white">
        <form onSubmit={e => { e.preventDefault(); submit(input) }} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) } }}
            placeholder={isRecording ? 'Listening...' : 'Ask Sandy anything...'}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '40px', maxHeight: '80px' }}
          />
          {isSupported && (
            <button
              type="button"
              onClick={handleMic}
              disabled={isLoading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 bg-gradient-to-br from-[#0033A0] to-purple-700 text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      <div className={`hidden lg:flex fixed top-16 right-0 h-[calc(100vh-64px)] w-80 flex-col bg-white shadow-xl border-l border-gray-200 z-40 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {panelContent}
      </div>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="hidden lg:flex fixed top-1/2 right-0 -translate-y-1/2 z-40 bg-gradient-to-b from-[#0033A0] to-purple-700 text-white rounded-l-xl px-2 py-4 items-center gap-1 shadow-lg hover:opacity-90 transition-opacity"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <Bot className="w-4 h-4 mb-1" style={{ transform: 'rotate(90deg)' }} />
          <span className="text-[11px] font-semibold tracking-wide" style={{ transform: 'rotate(180deg)' }}>Sandy</span>
        </button>
      )}

      <button
        onClick={() => { setMobileOpen(true); setOpen(true) }}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#0033A0] to-purple-700 text-white rounded-full shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Open Sandy"
      >
        <Bot className="w-6 h-6" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ height: '80vh' }}>
            {panelContent}
          </div>
        </div>
      )}
    </>
  )
}
