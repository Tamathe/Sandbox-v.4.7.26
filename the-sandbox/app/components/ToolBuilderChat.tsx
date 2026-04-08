'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, User, Loader2, Mic, MicOff, Sparkles, CheckCircle, ChevronRight } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ToolSpec {
  name: string
  shortDescription: string
  fullDescription: string
  category: string
  toolType: 'CHATBOT' | 'EXTERNAL'
  systemPrompt: string
  welcomeMessage: string
  starterQuestions: string[]
  learningObjectives: string[]
  difficultyLevel: string
  intendedAudience: string
  ready: boolean
}

const EMPTY_SPEC: ToolSpec = {
  name: '', shortDescription: '', fullDescription: '', category: '',
  toolType: 'CHATBOT', systemPrompt: '', welcomeMessage: '',
  starterQuestions: [], learningObjectives: [], difficultyLevel: 'Introductory',
  intendedAudience: '', ready: false,
}

const SPEC_REGEX = /<!--SPEC:([\s\S]*?)-->/

function extractSpec(text: string): { clean: string; spec: ToolSpec | null } {
  const match = text.match(SPEC_REGEX)
  if (!match) return { clean: text, spec: null }
  try {
    const spec = JSON.parse(match[1]) as ToolSpec
    const clean = text.replace(SPEC_REGEX, '').trim()
    return { clean, spec }
  } catch {
    return { clean: text.replace(SPEC_REGEX, '').trim(), spec: null }
  }
}

interface ToolBuilderChatProps {
  onConfirm: (spec: ToolSpec) => void
}

export default function ToolBuilderChat({ onConfirm }: ToolBuilderChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [spec, setSpec] = useState<ToolSpec>(EMPTY_SPEC)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialSentRef = useRef(false)
  const { isRecording, interimTranscript, isSupported: micSupported, startRecording, stopRecording } =
    useSpeechRecognition()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Kick off the conversation automatically — ref guard prevents React 18 Strict Mode double-fire
  useEffect(() => {
    if (initialSentRef.current) return
    initialSentRef.current = true
    sendMessage('Hello, I want to build a new educational tool.')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

      setMessages(prev => [...prev, userMsg, assistantMsg])
      setInput('')
      setIsLoading(true)

      try {
        const history = [...messages, userMsg]
        const res = await fetch('/api/build-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map(m => ({ role: m.role, content: m.content })),
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Builder request failed')
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value)
          const { clean } = extractSpec(fullText)
          setMessages(prev =>
            prev.map(m => m.id === assistantMsg.id ? { ...m, content: clean } : m)
          )
        }

        const { clean, spec: newSpec } = extractSpec(fullText)
        setMessages(prev =>
          prev.map(m => m.id === assistantMsg.id ? { ...m, content: clean } : m)
        )
        if (newSpec) setSpec(newSpec)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        setMessages(prev =>
          prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Error: ${msg}` } : m)
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading]
  )

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const specFields = [
    { key: 'name', label: 'Tool Name' },
    { key: 'shortDescription', label: 'Tagline' },
    { key: 'category', label: 'Category' },
    { key: 'toolType', label: 'Type' },
    { key: 'difficultyLevel', label: 'Difficulty' },
    { key: 'intendedAudience', label: 'Audience' },
  ] as const

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 h-[680px]">
      {/* Chat */}
      <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0033A0] text-white flex-shrink-0">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Tool Builder</div>
            <div className="text-xs text-blue-200">Describe what you want — I&apos;ll build the spec</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.filter(m => !(m.role === 'user' && m.content === 'Hello, I want to build a new educational tool.')).map(m => (
            <div key={m.id} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                m.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-[#0033A0] text-white'
              }`}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#0033A0] text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                {m.content === '' && m.role === 'assistant' ? (
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                ) : m.role === 'assistant' ? (
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
                  >{m.content}</ReactMarkdown>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 p-3">
          {isRecording && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-500 font-medium">{interimTranscript || 'Listening...'}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={isRecording ? interimTranscript || input : input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              disabled={isLoading || isRecording}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 max-h-24 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            {micSupported && (
              <button
                type="button"
                onClick={() => isRecording ? stopRecording() : startRecording(text => { setInput(text); setTimeout(() => sendMessage(text), 100) })}
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
              className="w-10 h-10 bg-[#0033A0] text-white rounded-xl flex items-center justify-center hover:bg-[#002580] transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>

      {/* Live spec preview */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#0033A0]" />
            <h3 className="font-semibold text-gray-900 text-sm">Building your tool...</h3>
          </div>

          <div className="space-y-3">
            {specFields.map(({ key, label }) => {
              const val = spec[key]
              const filled = Boolean(val && String(val).trim())
              return (
                <div key={key}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {filled
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    }
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                  </div>
                  <div className={`ml-5 text-sm rounded-lg px-3 py-2 ${
                    filled ? 'bg-blue-50 text-gray-800 font-medium' : 'bg-gray-50 text-gray-300 italic'
                  }`}>
                    {filled ? String(val) : 'Waiting...'}
                  </div>
                </div>
              )
            })}

            {spec.systemPrompt && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System Prompt</span>
                </div>
                <div className="ml-5 text-xs bg-blue-50 text-gray-700 rounded-lg px-3 py-2 max-h-32 overflow-y-auto leading-relaxed">
                  {spec.systemPrompt}
                </div>
              </div>
            )}

            {spec.learningObjectives.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Learning Objectives</span>
                </div>
                <ul className="ml-5 space-y-1">
                  {spec.learningObjectives.map((obj, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {spec.ready && (
          <button
            onClick={() => onConfirm(spec)}
            className="w-full bg-[#0033A0] text-white py-3 rounded-xl font-semibold hover:bg-[#002580] transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Create This Tool
          </button>
        )}
        {!spec.ready && (
          <div className="text-center text-xs text-gray-400 py-2">
            Keep chatting — your tool spec is building in real time
          </div>
        )}
      </div>
    </div>
  )
}
