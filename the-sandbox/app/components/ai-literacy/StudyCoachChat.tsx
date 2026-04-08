'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

// ── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  coachingNote?: string
  timestamp: string
}

interface StudyCoachChatProps {
  sessionId: string
  initialMessages: Message[]
  completed: boolean
  onCoachingNote: (note: string) => void
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripCoachingNote(text: string): string {
  return text.replace(/\[COACHING_NOTE:\s*.*?\]/gs, '').trim()
}

function extractCoachingNote(text: string): string | null {
  const match = text.match(/\[COACHING_NOTE:\s*(.*?)\]/s)
  return match ? match[1].trim() : null
}

// ── Component ───────────────────────────────────────────────────────────────

export default function StudyCoachChat({
  sessionId,
  initialMessages,
  completed,
  onCoachingNote,
}: StudyCoachChatProps) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync if parent re-fetches
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-grow textarea
  const handleInputChange = (val: string) => {
    setInput(val)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming || completed) return

    const userMsg: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setStreaming(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch(
        `/api/ai-literacy/student/study-coach/${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({ message: userMsg.content }),
        },
      )

      if (res.ok && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assistantText = ''

        const assistantMsg: Message = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          assistantText += decoder.decode(value, { stream: true })
          setMessages([...updated, { ...assistantMsg, content: assistantText }])
        }

        // Extract coaching note from completed response
        const note = extractCoachingNote(assistantText)
        if (note) {
          onCoachingNote(note)
        }

        // Final state with clean content
        setMessages([
          ...updated,
          { ...assistantMsg, content: assistantText, coachingNote: note || undefined },
        ])
      }
    } catch (err) {
      console.error('[StudyCoachChat] stream error', err)
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, completed, messages, sessionId, currentUser.email, onCoachingNote])

  // Visible messages (skip system)
  const visibleMessages = messages.filter((m) => m.role !== 'system')

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {visibleMessages.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-8">
            Start the conversation — ask about your topic!
          </div>
        )}

        {visibleMessages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="size-7 rounded-full bg-[#0033A0] flex items-center justify-center mr-2 shrink-0 mt-1">
                <Bot className="size-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-gray-100 rounded-2xl rounded-br-sm px-4 py-3 ml-12'
                  : 'bg-blue-50 rounded-2xl rounded-bl-sm px-4 py-3 mr-12'
              }`}
            >
              {m.role === 'assistant' ? stripCoachingNote(m.content) : m.content}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex items-center gap-2 text-xs text-gray-400 pl-9">
            <Loader2 className="size-3 animate-spin" />
            Sandy is thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {!completed && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Ask about your topic..."
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0] disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="bg-[#0033A0] text-white rounded-xl p-2 hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Ctrl+Enter to send</p>
        </div>
      )}
    </div>
  )
}
