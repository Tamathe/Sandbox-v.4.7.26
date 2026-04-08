'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  LifeBuoy,
  Mail,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { getStudentServiceTool } from '../../lib/student-services'
import { useAuth } from '../../lib/auth-context'
import AppointmentCard from '../../components/AppointmentCard'
import type { CollegeAdvisorContact } from '../../lib/student-services'

const SLUG = 'academic-advisor'

const SOURCES_BLOCK_RE = /\*\*Sources consulted:\*\*\s*([\s\S]+?)(?:\n\n|$)/

function parseSourcesList(block: string): string[] {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
}

const PETITION_CREATED_REGEX = /\[PETITION_CREATED:[^\]]+\]/g

function stripMarkers(text: string): string {
  return text.replace(PETITION_CREATED_REGEX, '').trim()
}

import type { ChatMessage as Message } from '../../lib/types'

export default function AcademicAdvisorPage() {
  const { currentUser } = useAuth()
  const tool = getStudentServiceTool(SLUG)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const welcomeAddedRef = useRef(false)

  // Normalize college name for lookup: strip "College of" prefix and replace "&" with "and"
  function normalizeCollege(college: string): string {
    return college.replace(/^College of\s+/i, '').replace(/&/g, 'and').trim()
  }

  // College-matched advisor contact
  const contact: CollegeAdvisorContact | null = (() => {
    if (!tool?.advisorContactByCollege) return null
    const raw = currentUser?.college ?? ''
    const normalized = normalizeCollege(raw)
    return (
      tool.advisorContactByCollege[normalized] ??
      tool.advisorContactByCollege[raw] ??
      tool.advisorContactByCollege['_default'] ??
      null
    )
  })()

  useEffect(() => {
    if (!tool || welcomeAddedRef.current) return
    welcomeAddedRef.current = true
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "Hi, I'm Sandy — your AI academic advisor for UK. I can help you understand degree requirements, plan your schedule, and navigate university policies. For official decisions, your college advisor is always the final word. What would you like to explore?",
      },
    ])
  }, [tool])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading || !tool) return

      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setLoading(true)
      setStreamingMsgId(assistantMsg.id)

      try {
        const history = messages.filter((m) => m.id !== 'welcome').concat(userMsg)

        const res = await fetch(`/api/student-services/${SLUG}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }))
          throw new Error(err.error ?? 'Request failed')
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          fullResponse += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: stripMarkers(fullResponse) }
                : m,
            ),
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: `_Error: ${msg}_` } : m,
          ),
        )
      } finally {
        setLoading(false)
        setStreamingMsgId(null)
      }
    },
    [messages, loading, tool, currentUser.email],
  )

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

  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <LifeBuoy className="size-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Service not found</h1>
        <p className="text-gray-500 mb-6">This student service tool doesn&apos;t exist.</p>
        <Link
          href="/student-services"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Student Services
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div
        className="flex-shrink-0 border-b border-white/20 bg-[#0033A0]"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/student-services"
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            <ArrowLeft className="size-4" />
            <LifeBuoy className="size-3.5" />
            <span className="hidden sm:inline">Student Services</span>
          </Link>
          <span className="text-white/30 text-xs">·</span>
          <div className="size-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bot className="size-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm">Sandy</div>
            <div className="text-white/70 text-xs truncate">Academic Advisor</div>
          </div>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setMessages([{
                  id: 'welcome',
                  role: 'assistant',
                  content: "Hi, I'm Sandy — your AI academic advisor for UK. I can help you understand degree requirements, plan your schedule, and navigate university policies. For official decisions, your college advisor is always the final word. What would you like to explore?",
                }])
                setInput('')
              }}
              title="New conversation"
              className="flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white flex-shrink-0"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Body: chat + right rail */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full px-4 py-4 lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">

          {/* Chat column */}
          <div className="flex flex-col h-full min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl border-2 border-gray-200 p-4 space-y-4">
              {messages.map((msg) => {
                const isStreaming = msg.id === streamingMsgId
                const sourcesMatch =
                  !isStreaming && msg.role === 'assistant' && tool.showCitationsInline
                    ? SOURCES_BLOCK_RE.exec(msg.content)
                    : null
                const sourcesBlock = sourcesMatch ? sourcesMatch[1] : null
                const displayContent = sourcesBlock
                  ? msg.content.replace(SOURCES_BLOCK_RE, '').trim()
                  : msg.content

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        msg.role === 'user' ? 'bg-gray-200' : 'bg-[#0033A0]'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="size-4 text-gray-600" />
                      ) : (
                        <Bot className="size-4 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col max-w-[85%]">
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-[#0033A0] text-white rounded-tr-sm'
                            : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                        }`}
                      >
                        {msg.content === '' && msg.role === 'assistant' ? (
                          <div className="flex items-center gap-1.5">
                            {[0, 150, 300].map((d) => (
                              <span
                                key={d}
                                className="size-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: `${d}ms` }}
                              />
                            ))}
                          </div>
                        ) : msg.role === 'assistant' ? (
                          <DynamicMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                              strong: ({ children }) => (
                                <strong className="font-bold">{children}</strong>
                              ),
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => (
                                <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>
                              ),
                              li: ({ children }) => <li>{children}</li>,
                              code: ({ children }) => (
                                <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {displayContent}
                          </DynamicMarkdown>
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
                      </div>

                      {/* Citation list — only for completed assistant messages */}
                      {tool.showCitationsInline && sourcesBlock && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                            Sources
                          </p>
                          <ul className="space-y-0.5">
                            {parseSourcesList(sourcesBlock).map((src, i) => (
                              <li
                                key={i}
                                className="text-xs text-gray-500 flex items-start gap-1.5"
                              >
                                <ExternalLink className="size-3 shrink-0 mt-0.5 text-gray-400" />
                                <span>{src}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Escalation footer */}
            {tool.escalationEmail && (
              <div className="flex-shrink-0 bg-white border border-gray-200 rounded-xl mt-2 px-4 py-2 flex items-center gap-2">
                <Mail className="size-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500">
                  Need to speak with someone directly?{' '}
                  <a
                    href={`mailto:${tool.escalationEmail}`}
                    className="text-[#0033A0] font-medium hover:underline"
                  >
                    {tool.escalationEmail}
                  </a>
                </span>
              </div>
            )}

            {/* Privacy note */}
            <div className="flex-shrink-0 px-1 py-1">
              <span className="text-[10px] text-gray-400">
                UKY Protected Environment · AI guidance only — not a substitute for official advising
              </span>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border border-gray-200 rounded-2xl bg-white p-3 mt-1">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  disabled={loading}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
                  style={{ minHeight: '42px', maxHeight: '120px' }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="size-10 bg-[#0033A0] hover:bg-[#002580] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right rail — appointment card (desktop only; stacks below on mobile) */}
          {tool.showAppointmentCard && contact && (
            <div className="hidden lg:block self-start sticky top-4">
              <AppointmentCard contact={contact} />
            </div>
          )}
        </div>

        {/* Mobile: appointment card below chat */}
        {tool.showAppointmentCard && contact && (
          <div className="lg:hidden max-w-6xl mx-auto px-4 pb-4">
            <AppointmentCard contact={contact} />
          </div>
        )}
      </div>
    </div>
  )
}
