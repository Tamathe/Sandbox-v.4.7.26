'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  X,
  Bot,
  Send,
  ChevronRight,
  CheckCircle2,
  XCircle,
  History,
  Loader2,
  Lightbulb,
  LinkIcon,
  LayoutTemplate,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import {
  CourseMapAIAssistant,
  type CommandResult,
  type MapAction,
  type ConnectionSuggestion,
  type LayoutRecommendation,
  type ContextualHelp,
} from '../../lib/course-map/ai-assistant-service'
import type { ChatMessage } from '../../lib/types'

// ── Types ───────────────────────────────────────────────────────────────────

interface MapNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
  archived: boolean
}

interface MapEdge {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
}

interface CourseUnit {
  id: string
  label: string
  position: number
}

interface AIAssistantPanelProps {
  nodes: MapNode[]
  edges: MapEdge[]
  units: CourseUnit[]
  selectedNodeId: string | null
  onClose: () => void
  onApplyActions: (actions: MapAction[]) => void
  onSelectNode?: (nodeId: string) => void
}

type AIChatMessage = ChatMessage & {
  result?: CommandResult
  timestamp: number
}

type TabId = 'chat' | 'connections' | 'layout' | 'help'

// ── Component ───────────────────────────────────────────────────────────────

export default function AIAssistantPanel({
  nodes,
  edges,
  units,
  selectedNodeId,
  onClose,
  onApplyActions,
  onSelectNode,
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [autocomplete, setAutocomplete] = useState<string[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [connectionSuggestions, setConnectionSuggestions] = useState<ConnectionSuggestion[]>([])
  const [layoutRecs, setLayoutRecs] = useState<LayoutRecommendation[]>([])
  const [contextHelp, setContextHelp] = useState<ContextualHelp | null>(null)
  const [processing, setProcessing] = useState(false)

  const assistantRef = useRef(new CourseMapAIAssistant())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update contextual help when selection changes
  useEffect(() => {
    const help = assistantRef.current.getContextualHelp(selectedNodeId, nodes, edges, units)
    setContextHelp(help)
  }, [selectedNodeId, nodes, edges, units])

  // Update autocomplete on input change
  useEffect(() => {
    if (input.length > 0) {
      const suggestions = assistantRef.current.getAutocompleteSuggestions(input, nodes)
      setAutocomplete(suggestions)
      setShowAutocomplete(suggestions.length > 0)
    } else {
      setShowAutocomplete(false)
    }
  }, [input, nodes])

  const handleSendCommand = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return

    setProcessing(true)
    setShowAutocomplete(false)

    const userMessage: AIChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }

    const result = assistantRef.current.processCommand(trimmed, nodes, edges)

    const assistantMessage: AIChatMessage = {
      id: `msg-${Date.now()}-asst`,
      role: 'assistant',
      content: result.preview,
      result,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setCommandHistory((prev) => [trimmed, ...prev.slice(0, 49)])
    setHistoryIndex(-1)
    setInput('')
    setProcessing(false)
  }, [input, nodes, edges])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendCommand()
    } else if (e.key === 'ArrowUp' && !showAutocomplete) {
      e.preventDefault()
      setHistoryIndex((prev) => {
        const next = Math.min(prev + 1, commandHistory.length - 1)
        if (commandHistory[next]) setInput(commandHistory[next])
        return next
      })
    } else if (e.key === 'ArrowDown' && !showAutocomplete) {
      e.preventDefault()
      setHistoryIndex((prev) => {
        const next = prev - 1
        if (next < 0) { setInput(''); return -1 }
        if (commandHistory[next]) setInput(commandHistory[next])
        return next
      })
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
    }
  }, [handleSendCommand, showAutocomplete, commandHistory])

  const handleApply = useCallback((actions: MapAction[]) => {
    onApplyActions(actions)
  }, [onApplyActions])

  const handleSuggestConnections = useCallback(() => {
    const suggestions = assistantRef.current.suggestConnections(nodes, edges)
    setConnectionSuggestions(suggestions)
  }, [nodes, edges])

  const handleRecommendLayout = useCallback(() => {
    const recs = assistantRef.current.recommendLayout(nodes, edges, units)
    setLayoutRecs(recs)
  }, [nodes, edges, units])

  const tabs: { id: TabId; label: string; icon: typeof Bot }[] = [
    { id: 'chat', label: 'Commands', icon: Bot },
    { id: 'connections', label: 'Connections', icon: LinkIcon },
    { id: 'layout', label: 'Layout', icon: LayoutTemplate },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ]

  return (
    <div className="fixed right-4 top-20 z-50 flex w-96 flex-col rounded-2xl border-2 border-[#0033A0]/20 bg-white shadow-xl" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-[#0033A0] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-full bg-white/20 p-1">
            <Bot className="size-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Sandy</h3>
            <p className="text-[10px] text-white/70">Map Designer</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setInput('') }}
              className="rounded-lg p-1 text-white/60 hover:text-white transition-colors"
              title="New conversation"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-white/60 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'connections') handleSuggestConnections()
                if (tab.id === 'layout') handleRecommendLayout()
              }}
              className={`flex flex-1 items-center justify-center gap-1 px-2 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#0033A0] text-[#0033A0]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
        {/* ── Chat Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div className="flex flex-col">
            {/* Messages */}
            <div className="flex-1 space-y-3 p-3" style={{ minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
              {messages.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  <Bot className="mx-auto mb-2 size-8 text-[#0033A0]/30" />
                  <p className="font-semibold">Sandy — Map Designer</p>
                  <p className="mt-1">Try commands like:</p>
                  <div className="mt-2 space-y-1">
                    {['add a quiz after Unit 1', 'connect Lab 1 to Lab 2', 'move Midterm before Spring Break'].map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => { setInput(cmd); inputRef.current?.focus() }}
                        className="block w-full rounded-lg bg-gray-50 px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-blue-50 hover:text-[#0033A0]"
                      >
                        &quot;{cmd}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-[#0033A0] text-white'
                      : 'border border-gray-100 bg-white text-gray-700'
                  }`}>
                    <p>{msg.content}</p>
                    {msg.result && msg.result.actions.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleApply(msg.result!.actions)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600"
                        >
                          <CheckCircle2 className="size-3" />
                          Apply
                        </button>
                        <button className="flex items-center gap-1 rounded-lg bg-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-300">
                          <XCircle className="size-3" />
                          Dismiss
                        </button>
                      </div>
                    )}
                    {msg.result && msg.result.command.confidence > 0 && (
                      <p className="mt-1 text-[10px] opacity-60">
                        Confidence: {Math.round(msg.result.command.confidence * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Command history */}
            {commandHistory.length > 0 && (
              <div className="border-t border-gray-100 px-3 py-1.5">
                <button
                  onClick={() => {
                    const collapsed = document.getElementById('ai-cmd-history')
                    if (collapsed) collapsed.classList.toggle('hidden')
                  }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600"
                >
                  <History className="size-3" />
                  History ({commandHistory.length})
                </button>
                <div id="ai-cmd-history" className="hidden mt-1 max-h-20 space-y-0.5 overflow-y-auto">
                  {commandHistory.slice(0, 10).map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(cmd); inputRef.current?.focus() }}
                      className="block w-full truncate rounded px-2 py-0.5 text-left text-[10px] text-gray-500 hover:bg-gray-50"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="relative border-t border-gray-200 p-3">
              {showAutocomplete && (
                <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-gray-200 bg-white shadow-lg">
                  {autocomplete.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(suggestion.replace('...', ' ')); setShowAutocomplete(false); inputRef.current?.focus() }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-blue-50 hover:text-[#0033A0]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { if (input.length > 0) setShowAutocomplete(true) }}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                  placeholder="Type a command..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                />
                <button
                  onClick={handleSendCommand}
                  disabled={!input.trim() || processing}
                  className="flex items-center justify-center rounded-lg bg-[#0033A0] px-3 py-2 text-white hover:bg-[#002880] disabled:opacity-50"
                >
                  {processing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Connections Tab ───────────────────────────────────────────── */}
        {activeTab === 'connections' && (
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Suggested Connections</p>
              <button
                onClick={handleSuggestConnections}
                className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>

            {connectionSuggestions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <LinkIcon className="mx-auto mb-2 size-6 text-gray-300" />
                <p>No missing connections detected.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {connectionSuggestions.map((s, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                      <span className="truncate">{s.fromLabel}</span>
                      <ChevronRight className="size-3 shrink-0 text-gray-400" />
                      <span className="truncate">{s.toLabel}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">{s.reason}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {s.edgeType} · {Math.round(s.confidence * 100)}%
                      </span>
                      <button
                        onClick={() => handleApply([{
                          type: 'addEdge',
                          payload: { fromNodeId: s.fromNodeId, toNodeId: s.toNodeId, edgeType: s.edgeType },
                        }])}
                        className="rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}

                {connectionSuggestions.length > 1 && (
                  <button
                    onClick={() => {
                      const actions: MapAction[] = connectionSuggestions.map((s) => ({
                        type: 'addEdge' as const,
                        payload: { fromNodeId: s.fromNodeId, toNodeId: s.toNodeId, edgeType: s.edgeType },
                      }))
                      handleApply(actions)
                    }}
                    className="w-full rounded-lg bg-[#0033A0] py-2 text-xs font-semibold text-white hover:bg-[#002880]"
                  >
                    Add All ({connectionSuggestions.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Layout Tab ───────────────────────────────────────────────── */}
        {activeTab === 'layout' && (
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Layout Recommendations</p>
              <button
                onClick={handleRecommendLayout}
                className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>

            {layoutRecs.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <LayoutTemplate className="mx-auto mb-2 size-6 text-gray-300" />
                <p>Layout looks optimal! No repositioning needed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500">
                  {layoutRecs.length} node{layoutRecs.length !== 1 ? 's' : ''} could be repositioned for better flow.
                </p>
                {layoutRecs.slice(0, 10).map((rec, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{rec.label}</p>
                      <p className="text-[10px] text-gray-500">{rec.reason}</p>
                    </div>
                    <button
                      onClick={() => handleApply([{
                        type: 'moveNode',
                        payload: { nodeId: rec.nodeId, xPos: rec.suggestedX, yPos: rec.suggestedY },
                      }])}
                      className="shrink-0 rounded-lg bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-600"
                    >
                      Move
                    </button>
                  </div>
                ))}

                {layoutRecs.length > 1 && (
                  <button
                    onClick={() => {
                      const actions: MapAction[] = layoutRecs.map((rec) => ({
                        type: 'moveNode' as const,
                        payload: { nodeId: rec.nodeId, xPos: rec.suggestedX, yPos: rec.suggestedY },
                      }))
                      handleApply(actions)
                    }}
                    className="w-full rounded-lg bg-[#0033A0] py-2 text-xs font-semibold text-white hover:bg-[#002880]"
                  >
                    Apply All ({layoutRecs.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Help Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'help' && (
          <div className="p-3">
            {contextHelp ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900">{contextHelp.title}</h4>
                  {selectedNodeId && (
                    <p className="text-[10px] text-gray-400">Context for selected node</p>
                  )}
                </div>

                {contextHelp.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {contextHelp.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  {contextHelp.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                      {tip}
                    </div>
                  ))}
                </div>

                {contextHelp.relatedNodes.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold text-gray-500 uppercase">Related Nodes</p>
                    <div className="space-y-1">
                      {contextHelp.relatedNodes.map((rn, i) => (
                        <button
                          key={i}
                          onClick={() => onSelectNode?.(rn.id)}
                          className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-left hover:bg-gray-100"
                        >
                          <span className="text-xs font-semibold text-gray-700">{rn.label}</span>
                          <span className="text-[10px] text-gray-400">{rn.relationship}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">
                Select a node for context-aware help.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
