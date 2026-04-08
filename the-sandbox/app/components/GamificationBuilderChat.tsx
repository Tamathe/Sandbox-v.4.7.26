'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, User, Loader2, Zap, CheckCircle, ChevronRight, Trophy, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface GamificationSpec {
  xpPerMessage: number
  xpPerSession: number
  xpHighGrade: number
  questsEnabled: boolean
  quests: { title: string; description: string; xpReward: number }[]
  customBadgeIcon: string
  customBadgeName: string
  customBadgeDescription: string
  notes: string
  ready: boolean
}

const EMPTY_SPEC: GamificationSpec = {
  xpPerMessage: 2, xpPerSession: 10, xpHighGrade: 25,
  questsEnabled: false, quests: [],
  customBadgeIcon: '', customBadgeName: '', customBadgeDescription: '',
  notes: '', ready: false,
}

const SPEC_REGEX = /<!--GAMIFICATION_SPEC:([\s\S]*?)-->/

function extractSpec(text: string): { clean: string; spec: GamificationSpec | null } {
  const match = text.match(SPEC_REGEX)
  if (!match) return { clean: text, spec: null }
  try {
    const spec = JSON.parse(match[1]) as GamificationSpec
    return { clean: text.replace(SPEC_REGEX, '').trim(), spec }
  } catch {
    return { clean: text.replace(SPEC_REGEX, '').trim(), spec: null }
  }
}

interface GamificationBuilderChatProps {
  toolId: string
  toolName: string
  onSave: (spec: GamificationSpec) => void
  onSkip: () => void
}

export default function GamificationBuilderChat({ toolId, toolName, onSave, onSkip }: GamificationBuilderChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [spec, setSpec] = useState<GamificationSpec>(EMPTY_SPEC)
  const [saving, setSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    sendMessage(`I just published a tool called "${toolName}". Help me design gamification for it.`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content.trim() }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = [...messages, userMsg]
      const res = await fetch('/api/build-gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error('Gamification builder request failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value)
        const { clean } = extractSpec(fullText)
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: clean } : m))
      }

      const { clean, spec: newSpec } = extractSpec(fullText)
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: clean } : m))
      if (newSpec) setSpec(newSpec)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Error: ${msg}` } : m))
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, toolName])

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const email = document.cookie.match(/demo-user=([^;]+)/)?.[1] ?? ''
      const res = await fetch(`/api/gamification-config/${toolId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': email || 'james.rivera@uky.edu',
        },
        body: JSON.stringify({
          xpPerMessage: spec.xpPerMessage,
          xpPerSession: spec.xpPerSession,
          xpHighGrade: spec.xpHighGrade,
          questsEnabled: spec.questsEnabled,
          quests: spec.quests,
          badgesJson: spec.customBadgeName ? JSON.stringify([{
            name: spec.customBadgeName,
            icon: spec.customBadgeIcon,
            description: spec.customBadgeDescription,
          }]) : null,
        }),
      })
      if (res.ok) onSave(spec)
    } finally {
      setSaving(false)
    }
  }

  const initMsg = `I just published a tool called "${toolName}". Help me design gamification for it.`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 h-[640px]">
      {/* Chat */}
      <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0033A0] to-purple-700 text-white flex-shrink-0">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">Gamification Agent</div>
            <div className="text-xs text-blue-200">Design XP, quests &amp; badges for your tool</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages
            .filter(m => !(m.role === 'user' && m.content === initMsg))
            .map(m => (
            <div key={m.id} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                m.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-gradient-to-br from-[#0033A0] to-purple-700 text-white'
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
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your learning goals..."
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 max-h-24 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
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

      {/* Live config preview */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Gamification Config</h3>
          </div>

          {/* XP Settings */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">XP Rewards</div>
            <div className="space-y-2">
              {[
                { label: 'Per message', value: spec.xpPerMessage, suffix: 'XP' },
                { label: 'Per session', value: spec.xpPerSession, suffix: 'XP' },
                { label: 'High grade bonus', value: spec.xpHighGrade, suffix: 'XP' },
              ].map(({ label, value, suffix }) => (
                <div key={label} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">{label}</span>
                  <span className="text-sm font-bold text-purple-700">+{value} {suffix}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quests */}
          {spec.quests.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quests ({spec.quests.length})</span>
              </div>
              <ul className="space-y-1.5">
                {spec.quests.map((q, i) => (
                  <li key={i} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-800">{q.title}</span>
                      <span className="ml-auto text-xs font-bold text-amber-600">+{q.xpReward}</span>
                    </div>
                    {q.description && (
                      <p className="text-xs text-gray-500 mt-0.5 ml-4">{q.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Custom badge */}
          {spec.customBadgeName && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Custom Badge</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-3">
                <span className="text-2xl">{spec.customBadgeIcon || '🏅'}</span>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{spec.customBadgeName}</div>
                  <div className="text-xs text-gray-500">{spec.customBadgeDescription}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {spec.ready && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#0033A0] to-purple-700 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Gamification Config'}
            </button>
          )}
          <button
            onClick={onSkip}
            className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Skip for now — use defaults
          </button>
        </div>
      </div>
    </div>
  )
}
