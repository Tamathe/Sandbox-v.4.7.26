'use client'

import { useParams } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DynamicMarkdown from '../../components/DynamicMarkdown'
import { ArrowLeft, Send, Loader2, Bot, User, Mic, MicOff, FlaskConical, Download, PanelLeftOpen, PanelLeftClose, RotateCcw } from 'lucide-react'
import { getResearchTool } from '../../lib/research-hub'
import { useAuth } from '../../lib/auth-context'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import SessionSidebar, { type SessionSummary } from '../../components/research-hub/SessionSidebar'
import SaveSessionButton from '../../components/research-hub/SaveSessionButton'
import DocumentUploadButton from '../../components/research-hub/DocumentUploadButton'

import type { ChatMessage as Message } from '../../lib/types'

export default function ResearchHubToolPage() {
  const params = useParams()
  const { currentUser } = useAuth()
  const slug = params.slug as string
  const tool = getResearchTool(slug)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const welcomeAddedRef = useRef(false)

  const { isRecording, interimTranscript, isSupported: micSupported, startRecording, stopRecording } =
    useSpeechRecognition()

  useEffect(() => {
    if (!tool || welcomeAddedRef.current) return
    welcomeAddedRef.current = true
    setMessages([{ id: 'welcome', role: 'assistant', content: tool.welcomeMessage }])
  }, [tool])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript)
  }, [interimTranscript])

  // Fetch saved sessions on mount
  useEffect(() => {
    if (!currentUser?.email) return
    setLoadingSessions(true)
    fetch('/api/workshop/research-hub/sessions', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(data => setSessions(data.sessions))
      .finally(() => setLoadingSessions(false))
  }, [currentUser?.email])

  // Load a saved session
  const loadSession = useCallback(async (id: string) => {
    if (!currentUser?.email) return
    try {
      const res = await fetch(`/api/workshop/research-hub/sessions/${id}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const data = await res.json()
      const loadedMessages = (data.session.messages as Array<{ role: 'user' | 'assistant'; content: string }>).map(
        (m, i) => ({ id: `loaded-${i}`, role: m.role, content: m.content })
      )
      setMessages(loadedMessages)
      setSessionId(data.session.id)
      welcomeAddedRef.current = true
    } catch { /* silent */ }
  }, [currentUser?.email])

  // Delete a session
  const deleteSession = useCallback(async (id: string) => {
    if (!currentUser?.email) return
    try {
      const res = await fetch(`/api/workshop/research-hub/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      setSessions(prev => prev.filter(s => s.id !== id))
      if (sessionId === id) {
        setSessionId(null)
        setMessages(tool ? [{ id: 'welcome', role: 'assistant', content: tool.welcomeMessage }] : [])
      }
    } catch { /* silent */ }
  }, [currentUser?.email, sessionId, tool])

  // Start new session
  const handleNewSession = useCallback(() => {
    setSessionId(null)
    welcomeAddedRef.current = false
    setMessages(tool ? [{ id: 'welcome', role: 'assistant', content: tool.welcomeMessage }] : [])
  }, [tool])

  // Handle session saved
  const handleSessionSaved = useCallback((saved: { id: string; title: string; updatedAt: string }) => {
    setSessionId(saved.id)
    setSessions(prev => {
      const existing = prev.findIndex(s => s.id === saved.id)
      const messageCount = messages.filter(m => m.id !== 'welcome').length
      const entry: SessionSummary = { id: saved.id, title: saved.title, messageCount, updatedAt: saved.updatedAt }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = entry
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      }
      return [entry, ...prev]
    })
  }, [messages])

  const handleExport = useCallback(() => {
    const exportable = messages.filter(m => m.id !== 'welcome')
    if (exportable.length === 0) return
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const transcript = exportable
      .map(m => `${m.role === 'user' ? 'You' : tool?.title}: ${m.content}`)
      .join('\n\n')
    const lines = [
      `Research Hub — ${tool?.title}`,
      `Exported: ${date}`,
      '-'.repeat(40),
      '',
      transcript,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-hub-${tool?.slug}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [messages, tool])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading || !tool) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.filter(m => m.id !== 'welcome').concat(userMsg)
      const res = await fetch('/api/research-hub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: tool.systemPrompt,
          ...(sessionId ? { sessionId } : {}),
        }),
      })

      if (!res.ok) throw new Error('Chat request failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev =>
          prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev =>
        prev.map(m => m.id === assistantMsg.id ? { ...m, content: `_Error: ${msg}_` } : m)
      )
    } finally {
      setLoading(false)
    }
  }, [messages, loading, tool, currentUser.email])

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const handleMic = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording((finalText: string) => {
        if (finalText.trim()) sendMessage(finalText)
      })
    }
  }

  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔬</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tool not found</h1>
        <p className="text-gray-500 mb-6">This Research Hub tool doesn't exist yet.</p>
        <Link
          href="/research-hub"
          className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002580] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Research Hub
        </Link>
      </div>
    )
  }

  const showStarterQuestions = messages.length <= 1 && !loading
  const hasExportableMessages = messages.filter(m => m.id !== 'welcome').length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div
        className="flex-shrink-0 border-b border-white/20 bg-[#0033A0]"
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Hide sessions' : 'Show sessions'}
            className="flex-shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors hidden sm:block"
          >
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
          <Link
            href="/research-hub"
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            <ArrowLeft className="size-4" />
            <FlaskConical className="size-3.5" />
            <span className="hidden sm:inline">Research Hub</span>
          </Link>
          <span className="text-white/30 text-xs">·</span>
          <div className="size-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bot className="size-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm">Sandy</div>
            <div className="text-white/70 text-xs truncate">Research Assistant · {tool.title}</div>
          </div>
          {hasExportableMessages && (
            <button
              type="button"
              onClick={handleNewSession}
              title="New session"
              className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
          <DocumentUploadButton
            sessionId={sessionId}
            userEmail={currentUser.email}
            onUploaded={() => {/* chunk count shown via toast in component */}}
          />
          <SaveSessionButton
            messages={messages.filter(m => m.id !== 'welcome')}
            sessionId={sessionId}
            onSaved={handleSessionSaved}
            userEmail={currentUser.email}
          />
          {hasExportableMessages && (
            <button
              type="button"
              onClick={handleExport}
              title="Export conversation"
              className="flex-shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Download className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main content area with optional sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sessions sidebar */}
        {sidebarOpen && (
          <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white hidden sm:block">
            <SessionSidebar
              sessions={sessions}
              activeSessionId={sessionId}
              onSelect={loadSession}
              onDelete={deleteSession}
              onNew={handleNewSession}
              loading={loadingSessions}
            />
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.role === 'user' ? 'bg-gray-200' : 'bg-[#0033A0]'
              }`}
            >
              {msg.role === 'user'
                ? <User className="size-4 text-gray-600" />
                : <Bot className="size-4 text-white" />
              }
            </div>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-[#0033A0] text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
              }`}
            >
              {msg.content === '' && msg.role === 'assistant' ? (
                <div className="flex items-center gap-1.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              ) : msg.role === 'assistant' ? (
                <DynamicMarkdown
                  components={{
                    p:          ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong:     ({ children }) => <strong className="font-bold">{children}</strong>,
                    em:         ({ children }) => <em className="italic">{children}</em>,
                    ul:         ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                    ol:         ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                    li:         ({ children }) => <li>{children}</li>,
                    h1:         ({ children }) => <h1 className="font-bold text-base mt-2 mb-1">{children}</h1>,
                    h2:         ({ children }) => <h2 className="font-bold text-sm mt-2 mb-1">{children}</h2>,
                    h3:         ({ children }) => <h3 className="font-semibold text-sm mt-1.5 mb-0.5">{children}</h3>,
                    code:       ({ children }) => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600">{children}</blockquote>,
                    a:          ({ href, children }) => <a href={href} className="text-[#0033A0] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                  }}
                >
                  {msg.content}
                </DynamicMarkdown>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {showStarterQuestions && (
          <div className="flex flex-wrap gap-2 ml-11">
            {tool.starterQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-left text-xs bg-white border border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0] text-gray-600 rounded-xl px-3 py-2 transition-all shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Privacy note */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-1.5">
        <span className="text-[10px] text-gray-400">🔒 UKY Protected Environment · Data is not used to train external models · Powered by Claude Sonnet</span>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
        {messages.length <= 1 && (
          <p className="mb-2 text-[11px] text-gray-400 px-1">
            💡 Tip: You can paste a draft, abstract, or methodology section directly into the box below.
          </p>
        )}
        {isRecording && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="size-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500 font-medium">{interimTranscript || 'Listening...'}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={isRecording ? interimTranscript || input : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or paste your draft here..."
            disabled={loading || isRecording}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '42px', maxHeight: '200px' }}
          />
          {micSupported && (
            <button
              type="button"
              onClick={handleMic}
              disabled={loading}
              className={`size-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="size-10 bg-[#0033A0] hover:bg-[#002580] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>

        </div>{/* end chat area */}
      </div>{/* end main content */}
    </div>
  )
}
