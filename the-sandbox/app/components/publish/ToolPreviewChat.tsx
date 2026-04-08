'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DynamicMarkdown from '../DynamicMarkdown'
import { Bot, Loader2, RotateCcw, Send, User } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface PreviewMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ToolPreviewChatProps {
  toolName: string
  personaName: string
  systemPrompt: string
  welcomeMessage: string
  starterQuestions: string[]
  draftKey: string
}

export default function ToolPreviewChat({
  toolName,
  personaName,
  systemPrompt,
  welcomeMessage,
  starterQuestions,
  draftKey,
}: ToolPreviewChatProps) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<PreviewMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMessages([])
    setInput('')
    setError('')
    setLoading(false)
  }, [draftKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const displayPersonaName = personaName.trim() || 'Your AI tutor'
  const initialWelcome = useMemo(
    () => welcomeMessage.trim() || `Hi, I'm ${displayPersonaName}. Ask me a question the way one of your students might.`,
    [displayPersonaName, welcomeMessage]
  )

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || loading) return

    const userMessage: PreviewMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    const assistantMessage: PreviewMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
    }

    const history = [...messages, userMessage]
    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/publish/preview-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          toolName,
          personaName: displayPersonaName,
          systemPrompt,
          messages: history.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.error || 'Preview chat is unavailable right now.')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Preview stream unavailable.')
      }

      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullResponse += decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: fullResponse }
              : message
          )
        )
      }
    } catch (previewError) {
      const message =
        previewError instanceof Error ? previewError.message : 'Preview chat failed.'
      setError(message)
      setMessages((prev) =>
        prev.map((messageItem) =>
          messageItem.id === assistantMessage.id
            ? { ...messageItem, content: `I couldn't answer that preview message.\n\n${message}` }
            : messageItem
        )
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/70">
      <div className="flex items-start justify-between gap-4 border-b border-blue-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0033A0]">Test this tool first</h3>
          <p className="mt-1 text-xs leading-relaxed text-blue-800">
            Try a student-style question before publishing. This preview does not save a session or make the tool visible.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages([])
            setInput('')
            setError('')
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0033A0] transition-colors hover:border-[#0033A0]"
        >
          <RotateCcw className="size-3.5" />
          Reset test
        </button>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-white">
              <Bot className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{displayPersonaName}</div>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{initialWelcome}</p>
            </div>
          </div>
        </div>

        {messages.length === 0 && starterQuestions.filter(Boolean).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {starterQuestions.filter((question) => question.trim()).map((question, index) => (
              <button
                key={`${question}-${index}`}
                type="button"
                onClick={() => {
                  void sendMessage(question)
                }}
                className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-[#0033A0] transition-colors hover:border-[#0033A0] hover:bg-blue-50"
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}

        <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-blue-100 bg-white px-4 py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">
              Ask a question the way a student would and see how this draft tutor responds.
            </p>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`flex size-8 flex-shrink-0 items-center justify-center rounded-full ${
                  message.role === 'user'
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-[#0033A0] text-white'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-tr-sm bg-[#0033A0] text-white'
                    : 'rounded-tl-sm bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === 'assistant' ? (
                  message.content ? (
                    <DynamicMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="mt-1 list-disc space-y-0.5 pl-4">{children}</ul>,
                        ol: ({ children }) => <ol className="mt-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {message.content}
                    </DynamicMarkdown>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Loader2 className="size-4 animate-spin" />
                      Thinking...
                    </div>
                  )
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage(input)
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendMessage(input)
              }
            }}
            rows={2}
            placeholder="Try a question like: Can you walk me through the first concept step by step?"
            className="min-h-[52px] flex-1 resize-y rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#0033A0] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
