'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles, User, Wrench, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../../lib/auth-context'
import ExamplesGallery from './ExamplesGallery'

type ChatRole = 'user' | 'assistant' | 'system'
type ChatVariant = 'markdown' | 'code-status' | 'runtime-error'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  variant: ChatVariant
}

interface PlaygroundChatProps {
  currentCode: string
  runtimeError: string | null
  autoRunOnGenerate: boolean
  hasStarted: boolean
  initialPrompt?: string
  onClearRuntimeError: () => void
  onDismissRuntimeError: () => void
  onStarted: () => void
  onPromptSubmitted: (prompt: string) => void
  onCodeGenerated: (code: string) => void
  onRunGeneratedCode: (code: string) => void
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
  currentCode,
  runtimeError,
  autoRunOnGenerate,
  hasStarted,
  initialPrompt,
  onClearRuntimeError,
  onDismissRuntimeError,
  onStarted,
  onPromptSubmitted,
  onCodeGenerated,
  onRunGeneratedCode,
}: PlaygroundChatProps) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const injectedErrorRef = useRef<string | null>(null)
  const seededPromptRef = useRef(false)
  const userScrolledUpRef = useRef(false)

  useEffect(() => {
    if (!initialPrompt || seededPromptRef.current) return

    setInput(initialPrompt)
    seededPromptRef.current = true
  }, [initialPrompt])

  // Only auto-scroll when the user hasn't manually scrolled up
  useEffect(() => {
    if (userScrolledUpRef.current) return
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, isLoading])

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
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
      if (!trimmed || isLoading) return

      onStarted()
      onPromptSubmitted(trimmed)
      onClearRuntimeError()

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        variant: 'markdown',
      }

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: '',
        variant: 'markdown',
      }

      const priorConversation = messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map(({ role, content }) => ({ role, content }))

      userScrolledUpRef.current = false  // snap back to bottom when user sends
      setMessages((previous) => [...previous, userMessage, assistantMessage])
      setInput('')
      setIsLoading(true)

      try {
        const response = await fetch('/api/playground/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({
            messages: [...priorConversation, { role: 'user', content: trimmed }],
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

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          fullResponse += decoder.decode(value, { stream: true })
          isCodeResponse = isCodeResponse || looksLikeHtmlDocument(fullResponse)

          if (isCodeResponse) {
            const { intro, html } = splitIntroAndHtml(fullResponse)

            // Push partial HTML to the code editor so the user sees it being written
            if (html) {
              onCodeGenerated(html)
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
        setIsLoading(false)
      }
    },
    [
      autoRunOnGenerate,
      currentCode,
      currentUser.email,
      isLoading,
      messages,
      onClearRuntimeError,
      onCodeGenerated,
      onPromptSubmitted,
      onRunGeneratedCode,
      onStarted,
    ]
  )

  const handleFixRuntimeError = useCallback(() => {
    if (!runtimeError) return
    void sendMessage(`Fix this runtime error:\n\n${runtimeError}`)
  }, [runtimeError, sendMessage])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-[#0033A0] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Playground Chat</h2>
            <p className="text-xs text-blue-100">
              Describe the app you want, then iterate until it feels right.
            </p>
          </div>
        </div>
      </div>

      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-sm leading-relaxed text-gray-700">
                Ask for a working educational tool, game, calculator, quiz, or UI prototype. The
                Playground will generate a full HTML app you can edit and run in the browser.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Starter prompts
              </div>
              <div className="flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={isLoading}
                    className="rounded-2xl border border-[#0033A0]/20 bg-white px-3 py-2 text-left text-xs font-medium text-[#0033A0] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {!hasStarted ? (
              <ExamplesGallery
                onSelect={(prompt) => {
                  setInput(prompt)
                  textareaRef.current?.focus()
                }}
              />
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
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  message.role === 'user'
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-[#0033A0] text-white'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
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
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.content}</p>
                  <button
                    type="button"
                    onClick={handleFixRuntimeError}
                    disabled={isLoading || runtimeError !== message.content}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
                  >
                    <Wrench className="h-3.5 w-3.5" />
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{message.content}</span>
                    </div>
                  ) : message.role === 'assistant' && message.content === '' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </div>
                  ) : message.role === 'assistant' ? (
                    <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3">
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
            placeholder="Describe the tool you want to build..."
            rows={2}
            disabled={isLoading}
            className="w-full resize-none rounded-3xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15 disabled:cursor-not-allowed disabled:bg-gray-50"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">Press Cmd/Ctrl+Enter to send</p>

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
