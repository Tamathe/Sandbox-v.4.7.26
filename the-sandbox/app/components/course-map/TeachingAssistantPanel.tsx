'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Send,
  Bot,
  Sparkles,
  GitFork,
  FileText,
  Loader2,
  User,
  RotateCcw,
} from 'lucide-react'
import {
  getContextSummary,
  getNodeContext,
  askAssistant,
  suggestNodeImprovements,
  generateContentSummary,
  answerStructureQuestion,
  type AssistantMessage,
  type NodeContext,
} from '../../lib/course-map/teaching-assistant-service'

// ── Props ────────────────────────────────────────────────────────────────────

interface GraphMap {
  id: string
  nodes: { id: string; label: string; nodeType: string; courseUnitId: string | null }[]
  edges: { fromNodeId: string; toNodeId: string; edgeType: string }[]
  units: {
    id: string
    label: string
    description: string | null
    modules: { label: string; lessons: { label: string }[] }[]
  }[]
}

interface TeachingAssistantPanelProps {
  graphMap: GraphMap
  selectedNodeId: string | null
  userEmail: string
  onClose: () => void
}

// ── Simple markdown rendering ────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n/g, '<br />')
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TeachingAssistantPanel({
  graphMap,
  selectedNodeId,
  userEmail,
  onClose,
}: TeachingAssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI teaching assistant for this course map. Ask me anything about your course structure, or use the quick actions below.",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const contextSummary = getContextSummary(graphMap)
  const selectedNodeContext: NodeContext | null = selectedNodeId
    ? getNodeContext(selectedNodeId, graphMap)
    : null

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}`, role, content, timestamp: Date.now() },
    ])
  }, [])

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    addMessage('user', q)
    setLoading(true)
    try {
      const answer = await askAssistant(q, contextSummary, userEmail)
      addMessage('assistant', answer)
    } catch {
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [input, loading, contextSummary, userEmail, addMessage])

  const handleQuickAction = useCallback(async (action: 'summarize' | 'structure' | 'improve-node') => {
    if (loading) return
    setLoading(true)
    try {
      let answer: string
      if (action === 'summarize') {
        addMessage('user', 'Summarize this course')
        answer = await generateContentSummary(contextSummary, userEmail)
      } else if (action === 'structure') {
        addMessage('user', 'Check course structure')
        answer = await answerStructureQuestion(
          'Analyze the structure of this course map. Are there any missing prerequisites, orphaned nodes, or structural issues?',
          contextSummary,
          userEmail,
        )
      } else {
        if (!selectedNodeContext) {
          addMessage('assistant', 'Please select a node first to get improvement suggestions.')
          setLoading(false)
          return
        }
        addMessage('user', `Improve node: "${selectedNodeContext.label}"`)
        answer = await suggestNodeImprovements(selectedNodeContext, contextSummary, userEmail)
      }
      addMessage('assistant', answer)
    } catch {
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [loading, contextSummary, userEmail, selectedNodeContext, addMessage])

  return (
    <div className="fixed right-0 top-0 z-[70] flex h-full w-96 flex-col border-l-2 border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-[#0033A0] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-white/20">
            <Bot className="size-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sandy</h3>
            <p className="text-[10px] leading-tight text-white/70">Teaching Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button
              onClick={() => setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: "Hi! I'm your AI teaching assistant for this course map. Ask me anything about your course structure, or use the quick actions below.",
                timestamp: Date.now(),
              }])}
              className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              title="New conversation"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Selected node context */}
      {selectedNodeContext && (
        <div className="border-b border-gray-100 bg-blue-50/50 px-4 py-2">
          <p className="text-xs font-semibold text-[#0033A0]">Selected Node</p>
          <p className="text-sm font-medium text-gray-800 truncate">{selectedNodeContext.label}</p>
          <p className="text-xs text-gray-500">
            {selectedNodeContext.modules.length} modules · {selectedNodeContext.incomingEdges.length} in · {selectedNodeContext.outgoingEdges.length} out
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'user' ? 'bg-[#0033A0]' : 'bg-[#0033A0]'
              }`}>
                {msg.role === 'user'
                  ? <User className="size-3.5 text-white" />
                  : <Bot className="size-3.5 text-white" />
                }
              </div>
              <div className={`rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-white border border-gray-100 text-gray-800'
              }`}>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0033A0]">
                <Bot className="size-3.5 text-white" />
              </div>
              <div className="rounded-xl bg-white border border-gray-100 px-3 py-2 text-sm text-gray-500">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="border-t border-gray-100 px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleQuickAction('summarize')}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileText className="size-3" />
            Summarize Course
          </button>
          <button
            onClick={() => handleQuickAction('structure')}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <GitFork className="size-3" />
            Check Structure
          </button>
          {selectedNodeContext && (
            <button
              onClick={() => handleQuickAction('improve-node')}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#0033A0] hover:bg-blue-100 disabled:opacity-50"
            >
              <Sparkles className="size-3" />
              Improve This Node
            </button>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            placeholder="Ask about your course..."
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex size-9 items-center justify-center rounded-lg bg-[#0033A0] text-white hover:bg-[#002580] disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
