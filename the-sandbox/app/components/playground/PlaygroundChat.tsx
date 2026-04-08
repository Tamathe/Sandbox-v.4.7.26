'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, ChevronDown, Loader2, Send, Sparkles, Trash2, User, Wrench, X } from 'lucide-react'
import DynamicMarkdown from '../DynamicMarkdown'
import { useAuth } from '../../lib/auth-context'
import ExamplesGallery from './ExamplesGallery'

export interface WarmStartContext {
  templateKey: string
  templateTitle: string
  templateDescription: string
  editorScrollTarget: string
}

type ChatRole = 'user' | 'assistant' | 'system'
type ChatVariant = 'markdown' | 'code-status' | 'runtime-error'

interface PlaygroundMessage {
  id: string
  role: ChatRole
  content: string
  variant: ChatVariant
}

interface PlaygroundChatProps {
  appId?: string | null
  currentCode: string
  runtimeError: string | null
  autoRunOnGenerate: boolean
  hasStarted: boolean
  hasManualEdits: boolean
  initialPrompt?: string
  warmStartContext?: WarmStartContext
  onClearRuntimeError: () => void
  onDismissRuntimeError: () => void
  onStarted: () => void
  onGeneratingChange: (val: boolean) => void
  onPromptSubmitted: (prompt: string) => void
  onCodeGenerated: (code: string) => void
  onRunGeneratedCode: (code: string) => void
  toolEvent?: Record<string, unknown> | null
  onToolEventHandled?: () => void
}

const STARTER_PROMPTS = [
  'Build me a flashcard quiz for my course',
  'Make a multiple choice quiz with a timer',
  'Create a class poll with live results',
]

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function looksLikeHtmlDocument(value: string) {
  return /^\s*(<!DOCTYPE|<html)/i.test(value) || /(<!DOCTYPE|<html)/i.test(value)
}

function splitIntroAndHtml(response: string): { intro: string; html: string } {
  const match = response.match(/(<!DOCTYPE|<html)/i)
  if (!match || match.index === undefined) {
    return { intro: response, html: '' }
  }
  return {
    intro: response.slice(0, match.index).trim(),
    html: response.slice(match.index),
  }
}

export default function PlaygroundChat({
  appId,
  currentCode,
  runtimeError,
  autoRunOnGenerate,
  hasStarted,
  hasManualEdits,
  initialPrompt,
  warmStartContext,
  onClearRuntimeError,
  onDismissRuntimeError,
  onStarted,
  onGeneratingChange,
  onPromptSubmitted,
  onCodeGenerated,
  onRunGeneratedCode,
  toolEvent,
  onToolEventHandled,
}: PlaygroundChatProps) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [generationStats, setGenerationStats] = useState<{ chars: number; lines: number } | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const injectedErrorRef = useRef<string | null>(null)
  const seededPromptRef = useRef(false)
  const userScrolledUpRef = useRef(false)

  // Rehydrate chat history from localStorage on mount
  useEffect(() => {
    if (!appId) return
    try {
      const stored = localStorage.getItem(`playground:chat:${appId}`)
      if (stored) {
        const parsed = JSON.parse(stored) as PlaygroundMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        }
      }
    } catch { /* invalid JSON or missing storage — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]) // intentionally run once on mount

  // Persist chat messages to localStorage whenever they change
  useEffect(() => {
    if (!appId || messages.length === 0) return
    const persistable = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-30)
    try {
      localStorage.setItem(`playground:chat:${appId}`, JSON.stringify(persistable))
    } catch { /* storage quota exceeded — ignore */ }
  }, [messages, appId])

  useEffect(() => {
    if (!initialPrompt || seededPromptRef.current) return

    setInput(initialPrompt)
    seededPromptRef.current = true
  }, [initialPrompt])

  // Auto-greeting from Sandy
  const warmGreetingRef = useRef(false)
  useEffect(() => {
    if (warmGreetingRef.current) return
    warmGreetingRef.current = true

    const greeting: PlaygroundMessage = {
      id: createMessageId(),
      role: 'assistant',
      content: warmStartContext
        ? `I see you're exploring the **${warmStartContext.templateTitle}**. The key logic starts at the \`${warmStartContext.editorScrollTarget}\` section — want me to walk you through how it works?`
        : `Hey! I'm Sandy, your AI building partner. Describe the app you want to create and I'll generate the code for you — then we can iterate until it's exactly right. Pick a starter prompt below or type your own idea!`,
      variant: 'markdown',
    }
    setMessages((prev) => [...prev, greeting])
  }, [warmStartContext])

  // Only auto-scroll when the user hasn't manually scrolled up
  useEffect(() => {
    if (userScrolledUpRef.current) return
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
    setShowScrollBtn(false)
  }, [messages, loading])

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
    setShowScrollBtn(distanceFromBottom > 200)
  }, [])

  useEffect(() => {
    if (!runtimeError) {
      injectedErrorRef.current = null
      return
    }

    if (injectedErrorRef.current === runtimeError) return

    injectedErrorRef.current = runtimeError
    setMessages((previous) => [
      ...previous,
      {
        id: createMessageId(),
        role: 'system',
        content: runtimeError,
        variant: 'runtime-error',
      },
    ])
  }, [runtimeError])

  const markdownComponents = useMemo(
    () => ({
      p: ({ children }: { children?: ReactNode }) => (
        <p className="mb-1 last:mb-0">{children}</p>
      ),
      strong: ({ children }: { children?: ReactNode }) => (
        <strong className="font-semibold">{children}</strong>
      ),
      em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
      ul: ({ children }: { children?: ReactNode }) => (
        <ul className="list-disc space-y-1 pl-4">{children}</ul>
      ),
      ol: ({ children }: { children?: ReactNode }) => (
        <ol className="list-decimal space-y-1 pl-4">{children}</ol>
      ),
      li: ({ children }: { children?: ReactNode }) => <li>{children}</li>,
      code: ({ children }: { children?: ReactNode }) => (
        <code className="rounded bg-black/10 px-1 py-0.5 text-[12px]">{children}</code>
      ),
      pre: ({ children }: { children?: ReactNode }) => (
        <pre className="overflow-x-auto rounded-2xl bg-black/10 p-3 text-xs">{children}</pre>
      ),
      a: ({ href, children }: { href?: string; children?: ReactNode }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#0033A0] underline underline-offset-2"
        >
          {children}
        </a>
      ),
    }),
    []
  )

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const trimmed = rawContent.trim()
      if (!trimmed || loading) return

      if (hasManualEdits && messages.length > 0) {
        setPendingMessage(trimmed)
        setInput('')
        return
      }

      onStarted()
      onPromptSubmitted(trimmed)
      onClearRuntimeError()

      const userMessage: PlaygroundMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        variant: 'markdown',
      }

      const assistantMessage: PlaygroundMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: '',
        variant: 'markdown',
      }

      const allPrior = messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map(({ role, content }) => ({ role, content }))

      const priorConversation = allPrior.length <= 16
        ? allPrior
        : [...allPrior.slice(0, 2), ...allPrior.slice(-14)]

      // Inject warm-start template context on the first user message
      const warmStartPrefix = warmStartContext && priorConversation.length === 0
        ? `[TEMPLATE CONTEXT] The user loaded a pre-built template: '${warmStartContext.templateTitle}' — ${warmStartContext.templateDescription}. The code is already in the editor. Help them understand and modify it rather than generating from scratch. The key section to explore is marked with '${warmStartContext.editorScrollTarget}' in the code.\n\n`
        : ''

      userScrolledUpRef.current = false  // snap back to bottom when user sends
      setMessages((previous) => [...previous, userMessage, assistantMessage])
      setInput('')
      onGeneratingChange(true)
      setLoading(true)

      try {
        const response = await fetch('/api/playground/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({
            messages: [...priorConversation, { role: 'user', content: warmStartPrefix + trimmed }],
            currentCode,
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Playground request failed')
        }

        if (!response.body) {
          throw new Error('No response body returned from Playground chat')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''
        let isCodeResponse = false

        const STREAM_ERROR_SENTINEL = '__SANDBOX_STREAM_ERROR__:'

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          fullResponse += decoder.decode(value, { stream: true })

          // Check for stream error sentinel before any other processing
          if (fullResponse.includes(STREAM_ERROR_SENTINEL)) {
            const sentinelIdx = fullResponse.indexOf(STREAM_ERROR_SENTINEL)
            const errorMsg = fullResponse.slice(sentinelIdx + STREAM_ERROR_SENTINEL.length).trim()
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: `⚠️ ${errorMsg}`, variant: 'markdown' }
                  : message
              )
            )
            break
          }

          isCodeResponse = isCodeResponse || looksLikeHtmlDocument(fullResponse)

          if (isCodeResponse) {
            const { intro, html } = splitIntroAndHtml(fullResponse)

            // Push partial HTML to the code editor so the user sees it being written
            if (html) {
              onCodeGenerated(html)
              setGenerationStats({
                chars: html.length,
                lines: (html.match(/\n/g) ?? []).length,
              })
            }

            setMessages((previous) =>
              previous.map((message) => {
                if (message.id !== assistantMessage.id) return message
                if (intro) {
                  // Show the intro/questions text while code streams
                  return { ...message, content: intro, variant: 'markdown' }
                }
                return { ...message, content: 'Generating your app...', variant: 'code-status' }
              })
            )
          } else {
            setMessages((previous) =>
              previous.map((message) => {
                if (message.id !== assistantMessage.id) return message
                return { ...message, content: fullResponse, variant: 'markdown' }
              })
            )
          }
        }

        fullResponse += decoder.decode()

        if (isCodeResponse) {
          const { intro, html } = splitIntroAndHtml(fullResponse)
          const finalHtml = html || fullResponse
          onCodeGenerated(finalHtml)

          // Truncation detection — warn user if HTML was cut off
          const isTruncated = !finalHtml.trimEnd().toLowerCase().endsWith('</html>')
          if (isTruncated) {
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantMessage.id
                  ? {
                      ...message,
                      content: '⚠️ The app was too large to generate completely — it was cut off before `</html>`. Try asking for a simpler version, or break it into smaller steps.',
                      variant: 'markdown',
                    }
                  : message
              )
            )
            return
          }

          if (autoRunOnGenerate) {
            onRunGeneratedCode(finalHtml)
          }

          const completionNote = autoRunOnGenerate
            ? 'App generated — see the preview.'
            : 'App generated — click Run when you are ready to preview it.'

          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    content: intro ? `${intro}\n\n${completionNote}` : completionNote,
                    variant: 'markdown',
                  }
                : message
            )
          )
          return
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  content: fullResponse.trim() || 'What would you like to build or change?',
                  variant: 'markdown',
                }
              : message
          )
        )
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Something went wrong while generating your app.'

        setMessages((previous) =>
          previous.map((entry) =>
            entry.id === assistantMessage.id
              ? {
                  ...entry,
                  content: `Warning: ${message}`,
                  variant: 'markdown',
                }
              : entry
          )
        )
      } finally {
        onGeneratingChange(false)
        setLoading(false)
        setGenerationStats(null)
      }
    },
    [
      autoRunOnGenerate,
      currentCode,
      currentUser.email,
      hasManualEdits,
      loading,
      messages,
      onClearRuntimeError,
      onCodeGenerated,
      onGeneratingChange,
      onPromptSubmitted,
      onRunGeneratedCode,
      onStarted,
      warmStartContext,
    ]
  )

  // Auto-compose a tutoring message when the tool reports a wrong answer
  const toolEventHandledRef = useRef<string | null>(null)
  useEffect(() => {
    if (!toolEvent || loading) return
    const eventKey = JSON.stringify(toolEvent)
    if (toolEventHandledRef.current === eventKey) return
    toolEventHandledRef.current = eventKey

    const mod = String(toolEvent.module || 'ear training')
    const expected = String(toolEvent.expected || 'the correct answer')
    const selected = String(toolEvent.selected || 'something else')

    const tutorMessage = `I was doing ${mod} and heard a ${expected} but guessed ${selected}. What's the difference between those two, and do you have any tips to help me tell them apart next time?`

    onToolEventHandled?.()
    void sendMessage(tutorMessage)
  }, [toolEvent, loading, sendMessage, onToolEventHandled])

  const handleFixRuntimeError = useCallback(() => {
    if (!runtimeError) return
    void sendMessage(`Fix this runtime error:\n\n${runtimeError}`)
  }, [runtimeError, sendMessage])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-[#0033A0] px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/15">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Playground Chat</h2>
              <p className="text-xs text-blue-100">
                Describe the app you want, then iterate until it feels right.
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            clearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-100">Clear chat?</span>
                <button
                  type="button"
                  onClick={() => setClearConfirm(false)}
                  className="rounded-xl border border-white/30 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([])
                    setInput('')
                    injectedErrorRef.current = null
                    userScrolledUpRef.current = false
                    seededPromptRef.current = false
                    if (appId) { try { localStorage.removeItem(`playground:chat:${appId}`) } catch {} }
                    setClearConfirm(false)
                  }}
                  className="rounded-xl bg-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/30"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setClearConfirm(true)}
                className="flex items-center justify-center rounded-xl p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Clear chat history"
                title="Clear chat history"
              >
                <Trash2 className="size-4" />
              </button>
            )
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
      <div ref={messagesContainerRef} onScroll={handleScroll} className="h-full space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-5">
            <p className="text-lg font-semibold text-gray-800">What will you build today?</p>

            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={loading}
                  className="rounded-2xl border border-[#0033A0]/20 bg-white px-4 py-3 text-left text-sm font-medium text-[#0033A0] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {!hasStarted ? (
              <>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-[#0033A0] hover:underline">
                    See 10 example projects ↓
                  </summary>
                  <div className="mt-3">
                    <ExamplesGallery
                      onSelect={(prompt) => { void sendMessage(prompt) }}
                    />
                  </div>
                </details>
                <Link
                  href="/hub"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] hover:underline mt-2"
                >
                  Or explore a pre-built template <ArrowRight className="size-3.5" />
                </Link>
              </>
            ) : null}
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {message.role === 'system' ? null : (
              <div
                className={`mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-full ${
                  message.role === 'user'
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-[#0033A0] text-white'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>
            )}

            <div className="max-w-[85%]">
              {message.variant === 'runtime-error' ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">Runtime error</div>
                    <button
                      type="button"
                      onClick={() => {
                        setMessages((previous) =>
                          previous.filter((entry) => entry.id !== message.id)
                        )
                        onDismissRuntimeError()
                      }}
                      className="rounded-full p-1 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-700"
                      aria-label="Dismiss runtime error"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.content}</p>
                  <button
                    type="button"
                    onClick={handleFixRuntimeError}
                    disabled={loading || runtimeError !== message.content}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
                  >
                    <Wrench className="size-3.5" />
                    Fix this
                  </button>
                </div>
              ) : (
                <div
                  className={`rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.variant === 'code-status' ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span>
                        {generationStats
                          ? `Writing… ${generationStats.lines} lines, ${generationStats.chars.toLocaleString()} chars`
                          : 'Generating your app…'}
                      </span>
                    </div>
                  ) : message.role === 'assistant' && message.content === '' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                      <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </div>
                  ) : message.role === 'assistant' ? (
                    <DynamicMarkdown components={markdownComponents}>{message.content}</DynamicMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showScrollBtn && (
        <button
          type="button"
          onClick={() => {
            userScrolledUpRef.current = false
            setShowScrollBtn(false)
            messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' })
          }}
          className="absolute bottom-4 right-4 flex size-9 items-center justify-center rounded-full bg-[#0033A0] text-white shadow-lg transition-opacity hover:bg-[#002580]"
          aria-label="Scroll to latest message"
        >
          <ChevronDown className="size-4" />
        </button>
      )}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        {pendingMessage !== null ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Sending this message will replace your manual edits with new AI-generated code.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingMessage(null)}
                className="rounded-2xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const msg = pendingMessage
                  setPendingMessage(null)
                  void sendMessage(msg)
                }}
                className="rounded-2xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Continue anyway →
              </button>
            </div>
          </div>
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage(input)
          }}
          className="space-y-3"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                void sendMessage(input)
              }
            }}
            placeholder={hasStarted ? 'What would you like to change?' : 'Describe the tool you want to build…'}
            rows={2}
            disabled={loading}
            className="w-full resize-none rounded-3xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15 disabled:cursor-not-allowed disabled:bg-gray-50"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">Press Cmd/Ctrl+Enter to send</p>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
