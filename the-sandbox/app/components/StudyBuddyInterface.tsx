'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send, Bot, User, Loader2, BookOpen, Brain, Layers,
  Upload, FileText, X, Mic, MicOff, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

type Mode = 'tutor' | 'quiz' | 'flashcards'

interface Doc {
  id: string
  filename: string
  wordCount: number
  source: 'course' | 'student'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface StudyBuddyInterfaceProps {
  toolId: string
  toolName: string
  welcomeMessage?: string | null
  starterQuestions?: string[]
  userEmail: string
}

const MODES: { id: Mode; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'tutor', label: 'Tutor', icon: <BookOpen className="w-4 h-4" />, description: 'Ask questions, get explanations' },
  { id: 'quiz', label: 'Quiz Me', icon: <Brain className="w-4 h-4" />, description: 'Test your knowledge' },
  { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" />, description: 'Practice key concepts' },
]

export default function StudyBuddyInterface({
  toolId,
  toolName,
  welcomeMessage,
  starterQuestions = [],
  userEmail,
}: StudyBuddyInterfaceProps) {
  const [mode, setMode] = useState<Mode>('tutor')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [docs, setDocs] = useState<Doc[]>([])
  const [docsOpen, setDocsOpen] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isRecording, interimTranscript, isSupported, startRecording, stopRecording } = useSpeechRecognition()

  // Create a tool session on mount for tracking
  useEffect(() => {
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
      body: JSON.stringify({ toolId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.sessionId) setSessionId(data.sessionId) })
      .catch(() => {})
  }, [toolId, userEmail])

  // Load course-level docs
  useEffect(() => {
    async function loadDocs() {
      try {
        const url = `/api/study/${toolId}/documents${sessionId ? `?sessionId=${sessionId}` : ''}`
        const res = await fetch(url, { headers: { 'x-demo-user-email': userEmail } })
        if (!res.ok) return
        const data: { id: string; filename: string; wordCount: number; toolId: string | null }[] = await res.json()
        setDocs(data.map(d => ({ ...d, source: d.toolId ? 'course' : 'student' })))
      } catch { /* non-critical */ }
    }
    loadDocs()
  }, [toolId, sessionId, userEmail])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript)
  }, [interimTranscript])

  // Reset chat when mode changes
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setMessages([])
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = [...messages, userMsg]
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          toolId,
          messages: history.map(m => ({ role: m.role, content: m.content })),
          sessionId,
          mode,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to connect' }))
        throw new Error(err.error || 'Failed to connect')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value)
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m))
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, toolId, sessionId, userEmail, mode])

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (sessionId) formData.append('sessionId', sessionId)

      const res = await fetch(`/api/study/${toolId}/upload`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const doc = await res.json()
      setDocs(prev => [...prev, { id: doc.id, filename: doc.filename, wordCount: doc.wordCount, source: 'student' }])
      // Reset chat so the new doc gets picked up
      setMessages([])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async (docId: string) => {
    try {
      await fetch(`/api/study/${toolId}/upload?docId=${docId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      setDocs(prev => prev.filter(d => d.id !== docId))
      setMessages([])
    } catch { /* non-critical */ }
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

  const defaultWelcome = welcomeMessage || `Welcome to ${toolName}! I'm your AI study partner. Choose a mode above and let's get started — or upload your course materials to get the most out of our session.`

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
      {/* Mode selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === m.id
                  ? 'bg-[#0033A0] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1.5 ml-1">
          {MODES.find(m => m.id === mode)?.description}
        </p>
      </div>

      {/* Documents panel */}
      <div className="bg-white border-b border-gray-200">
        <button
          onClick={() => setDocsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span>Knowledge Base</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {docs.length} doc{docs.length !== 1 ? 's' : ''}
            </span>
          </div>
          {docsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {docsOpen && (
          <div className="px-4 pb-3 space-y-1.5">
            {docs.length === 0 && (
              <p className="text-xs text-gray-400 italic py-1">No documents loaded yet. Upload your notes or syllabus below.</p>
            )}
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 font-medium truncate">{doc.filename}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{doc.wordCount.toLocaleString()} words</span>
                  {doc.source === 'course' && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">course</span>
                  )}
                </div>
                {doc.source === 'student' && (
                  <button onClick={() => removeDoc(doc.id)} className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Upload button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-xs text-[#0033A0] font-medium hover:text-purple-700 disabled:opacity-50 mt-1"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Uploading...' : 'Upload your notes (PDF or text)'}
              </button>
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0033A0] to-purple-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 max-w-[85%]">
                <p className="text-gray-800 text-sm leading-relaxed">{defaultWelcome}</p>
              </div>
            </div>

            {/* Starter questions */}
            {starterQuestions.length > 0 && (
              <div className="ml-11 flex flex-wrap gap-2">
                {starterQuestions.map((q, i) => (
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

            {/* Mode-specific prompts */}
            {mode === 'quiz' && (
              <div className="ml-11">
                <button
                  onClick={() => sendMessage('Give me a quiz question from the course materials.')}
                  className="text-xs bg-[#0033A0] text-white rounded-xl px-4 py-2 font-medium hover:bg-[#002580] transition-colors shadow-sm"
                >
                  Start quiz →
                </button>
              </div>
            )}
            {mode === 'flashcards' && (
              <div className="ml-11">
                <button
                  onClick={() => sendMessage('Give me the first flashcard.')}
                  className="text-xs bg-[#0033A0] text-white rounded-xl px-4 py-2 font-medium hover:bg-[#002580] transition-colors shadow-sm"
                >
                  Start flashcards →
                </button>
              </div>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === 'user' ? 'bg-gray-200' : 'bg-gradient-to-br from-[#0033A0] to-purple-700'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-gray-600" />
                : <Bot className="w-4 h-4 text-white" />
              }
            </div>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user'
                ? 'bg-[#0033A0] text-white rounded-tr-sm'
                : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
            }`}>
              {msg.content === '' && msg.role === 'assistant' ? (
                <div className="flex items-center gap-1.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
        {isRecording && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500 font-medium">{interimTranscript || 'Listening...'}</span>
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          className="flex items-end gap-2"
        >
          <textarea
            value={isRecording ? interimTranscript || input : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder={isRecording ? 'Listening...' : 'Ask a question...'}
            disabled={isLoading || isRecording}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 overflow-hidden"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          {isSupported && (
            <button
              type="button"
              onClick={handleMic}
              disabled={isLoading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 bg-gradient-to-br from-[#0033A0] to-purple-700 text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
