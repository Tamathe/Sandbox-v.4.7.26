'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react'
import type { AgentSSEEvent, ApprovalDecision } from '../../lib/agent/agent-types'
import ToolCallCard from './ToolCallCard'
import ApprovalCard from './ApprovalCard'
import WorkflowProgress, { type AgentWorkflowStep } from './WorkflowProgress'
import ChipBar from '../ChipBar'

// ---------------------------------------------------------------------------
// Render event types parsed by useAgentStream into distinct visual components
// inside the Sandy chat panel.
// ---------------------------------------------------------------------------

interface AgentMessageRendererProps {
  events: AgentSSEEvent[]
  isStreaming?: boolean
  onApprovalDecision: (approvalId: string, decision: ApprovalDecision, editedArgs?: Record<string, unknown>) => void
  onSuggestionClick?: (suggestion: string) => void
}

/**
 * Renders the full sequence of agent SSE events as visual chat blocks:
 *  - thinking   → "Sandy is thinking..." indicator
 *  - tool_call  → ToolCallCard (spinner while running, checkmark when done)
 *  - tool_result → updates the corresponding ToolCallCard
 *  - approval_request  → ApprovalCard with Approve/Edit/Reject
 *  - approval_resolved → marks the approval as resolved
 *  - text       → normal chat bubble with streaming effect
 *  - error      → red error banner
 */
export default function AgentMessageRenderer({ events, isStreaming, onApprovalDecision, onSuggestionClick }: AgentMessageRendererProps) {
  // Derive state from the flat event list
  const blocks = buildBlocks(events)

  // Extract follow-up suggestions from final text
  const suggestions = extractSuggestions(blocks)
  const isDone = events.some(e => e.type === 'done')

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'thinking':
            return <ThinkingIndicator key={i} />
          case 'text':
            return <StreamingTextBlock key={i} content={block.content} animate={!isDone} />
          case 'tool':
            return (
              <ToolCallCard
                key={block.id}
                toolName={block.toolName}
                args={block.args}
                result={block.result}
                status={block.status}
                error={block.error}
                staggerIndex={block.staggerIndex}
              />
            )
          case 'approval':
            return (
              <ApprovalCard
                key={block.id}
                approvalId={block.id}
                toolName={block.toolName}
                description={block.description}
                preview={block.preview}
                resolved={block.resolved}
                resolvedDecision={block.decision}
                onDecision={onApprovalDecision}
              />
            )
          case 'workflow':
            return <WorkflowProgress key={i} title={block.title} steps={block.steps} />
          case 'error':
            return <ErrorBlock key={i} message={block.message} />
          default:
            return null
        }
      })}

      {/* Follow-up suggestion chips after workflow completes */}
      {isDone && suggestions.length > 0 && onSuggestionClick && (
        <div className="pt-1">
          <ChipBar chips={suggestions} onSelect={onSuggestionClick} />
        </div>
      )}

      {/* Streaming indicator when no other content is showing yet */}
      {isStreaming && blocks.length === 0 && <ThinkingIndicator />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Thinking indicator (pulsing, not collapsible)
// ---------------------------------------------------------------------------

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
      <Loader2 className="size-3.5 text-[#0033A0] animate-spin flex-shrink-0" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 animate-pulse">
        Sandy is thinking...
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Streaming text block — text appears token-by-token
// ---------------------------------------------------------------------------

function StreamingTextBlock({ content, animate }: { content: string; animate: boolean }) {
  const [displayedLength, setDisplayedLength] = useState(animate ? 0 : content.length)
  const prevContentRef = useRef(content)

  useEffect(() => {
    if (!animate) {
      setDisplayedLength(content.length)
      return
    }

    // If content grew, animate from where we left off
    const prevLen = prevContentRef.current.length
    prevContentRef.current = content

    if (content.length <= displayedLength) return

    const startFrom = Math.max(displayedLength, prevLen)
    let current = startFrom

    const interval = setInterval(() => {
      current = Math.min(current + 3, content.length) // 3 chars at a time for speed
      setDisplayedLength(current)
      if (current >= content.length) clearInterval(interval)
    }, 15) // ~200 chars/second

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, animate])

  const displayed = content.slice(0, displayedLength)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{displayed}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error block
// ---------------------------------------------------------------------------

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
      <AlertTriangle className="size-4 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Block builder — derive renderable blocks from flat event list
// ---------------------------------------------------------------------------

type Block =
  | { type: 'thinking'; content: string }
  | { type: 'text'; content: string }
  | { type: 'tool'; id: string; toolName: string; args: Record<string, unknown>; result: Record<string, unknown> | null; status: 'running' | 'completed' | 'error'; error?: string; staggerIndex: number }
  | { type: 'approval'; id: string; toolName: string; description: string; preview: Record<string, unknown>; resolved: boolean; decision?: ApprovalDecision }
  | { type: 'workflow'; title: string; steps: AgentWorkflowStep[] }
  | { type: 'error'; message: string }

function buildBlocks(events: AgentSSEEvent[]): Block[] {
  const blocks: Block[] = []
  // Track tool calls by id for result pairing
  const toolMap = new Map<string, Block & { type: 'tool' }>()
  // Track approvals by id for resolution pairing
  const approvalMap = new Map<string, Block & { type: 'approval' }>()
  // Accumulate sequential text events into one block
  let pendingText = ''
  let toolStaggerCounter = 0
  let hasThinking = false

  const flushText = () => {
    if (pendingText) {
      blocks.push({ type: 'text', content: pendingText.trim() })
      pendingText = ''
    }
  }

  for (const event of events) {
    switch (event.type) {
      case 'thinking': {
        if (!hasThinking) {
          flushText()
          blocks.push({ type: 'thinking', content: event.content })
          hasThinking = true
        }
        break
      }
      case 'text': {
        // Remove the thinking indicator once we have real text
        const thinkingIdx = blocks.findIndex(b => b.type === 'thinking')
        if (thinkingIdx >= 0) blocks.splice(thinkingIdx, 1)

        pendingText += event.content
        break
      }
      case 'tool_call': {
        flushText()
        // Remove thinking indicator when tools start
        const thinkingIdx = blocks.findIndex(b => b.type === 'thinking')
        if (thinkingIdx >= 0) blocks.splice(thinkingIdx, 1)

        const toolBlock: Block & { type: 'tool' } = {
          type: 'tool',
          id: event.id,
          toolName: event.tool,
          args: event.args,
          result: null,
          status: 'running',
          staggerIndex: toolStaggerCounter++,
        }
        blocks.push(toolBlock)
        toolMap.set(event.id, toolBlock)
        break
      }
      case 'tool_result': {
        const existing = toolMap.get(event.id)
        if (existing) {
          existing.result = event.result
          existing.status = event.error ? 'error' : 'completed'
          existing.error = event.error
        }
        break
      }
      case 'approval_request': {
        flushText()
        const approvalBlock: Block & { type: 'approval' } = {
          type: 'approval',
          id: event.id,
          toolName: event.tool,
          description: event.description,
          preview: event.preview,
          resolved: false,
        }
        blocks.push(approvalBlock)
        approvalMap.set(event.id, approvalBlock)
        break
      }
      case 'approval_resolved': {
        const existing = approvalMap.get(event.id)
        if (existing) {
          existing.resolved = true
          existing.decision = event.decision
        }
        break
      }
      case 'error': {
        flushText()
        blocks.push({ type: 'error', message: event.message })
        break
      }
      case 'done':
        break
    }
  }

  flushText()

  // Build workflow progress if there are 2+ tool calls
  const toolBlocks = blocks.filter((b): b is Block & { type: 'tool' } => b.type === 'tool')
  if (toolBlocks.length >= 2) {
    const steps: AgentWorkflowStep[] = toolBlocks.map(t => ({
      id: t.id,
      label: t.toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      status: t.status === 'running' ? 'running' : t.status === 'error' ? 'error' : t.status === 'completed' ? 'completed' : 'pending',
      summary: t.result ? summarizeResult(t.result) : undefined,
    }))
    // Insert workflow progress block before the first tool block
    const firstToolIdx = blocks.findIndex(b => b.type === 'tool')
    if (firstToolIdx >= 0) {
      blocks.splice(firstToolIdx, 0, { type: 'workflow', title: 'Workflow Progress', steps })
    }
  }

  return blocks
}

function summarizeResult(result: Record<string, unknown>): string | undefined {
  // Try to extract a short summary from common result shapes
  if (typeof result.summary === 'string') return result.summary
  if (typeof result.count === 'number') return `${result.count} items`
  if (typeof result.eventCount === 'number') return `${result.eventCount} events`
  if (typeof result.taskCount === 'number') return `${result.taskCount} tasks`
  if (typeof result.totalUnread === 'number') return `${result.totalUnread} unread`
  if (typeof result.studentCount === 'number') return `${result.studentCount} students`
  if (typeof result.materialCount === 'number') return `${result.materialCount} materials`
  if (typeof result.status === 'string') return result.status
  return undefined
}

/**
 * Extract follow-up suggestions from the last text block.
 * Looks for patterns like:
 *   - "Want me to ..."
 *   - "Should I ..."
 *   - "Would you like me to ..."
 */
function extractSuggestions(blocks: Block[]): string[] {
  const textBlocks = blocks.filter((b): b is Block & { type: 'text' } => b.type === 'text')
  if (textBlocks.length === 0) return []

  const lastText = textBlocks[textBlocks.length - 1].content
  const suggestions: string[] = []

  // Match bullet points or sentences starting with suggestion patterns
  const patterns = [
    /[•\-*]\s*[""]?(.+?)[""]?\s*$/gm,
    /(?:Want me to|Should I|Would you like me to|I can also)\s+(.+?)(?:\?|$)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(lastText)) !== null) {
      const suggestion = match[1]?.trim()
      if (suggestion && suggestion.length > 10 && suggestion.length < 80) {
        // Clean up and create a chip-friendly version
        const cleaned = suggestion.replace(/^[""]|[""]$/g, '').replace(/\?$/, '')
        if (cleaned) suggestions.push(cleaned)
      }
    }
  }

  // Deduplicate and limit to 3
  return [...new Set(suggestions)].slice(0, 3)
}
