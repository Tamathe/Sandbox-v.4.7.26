'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import DynamicMarkdown from './DynamicMarkdown'
import { Send, Loader2, Bot, RotateCcw } from 'lucide-react'
import ChipBar from './ChipBar'
import StepIndicator from './StepIndicator'
import MessageActions from './sandy/MessageActions'
import PinnedMessage from './sandy/PinnedMessage'

export type { ChatMessage } from '../lib/types'
import type { ChatMessage } from '../lib/types'

interface SandyInterviewPanelProps {
  messages: ChatMessage[]
  chips: string[]
  isSandyTyping: boolean
  stepCount: number
  currentStep: number
  onSendMessage: (text: string) => void
  onChipSelect: (chip: string) => void
  placeholder?: string
  disabled?: boolean
  onStartOver?: () => void
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
}

export default function SandyInterviewPanel({
  messages,
  chips,
  isSandyTyping,
  stepCount,
  currentStep,
  onSendMessage,
  onChipSelect,
  placeholder = 'Type your response...',
  disabled,
  onStartOver,
}: SandyInterviewPanelProps) {
  const [input, setInput] = useState('')
  const [pinnedMessage, setPinnedMessage] = useState<{ content: string; messageId: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSandyTyping])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    onSendMessage(text)
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [input, disabled, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-expand
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Step indicator */}
      <div className="border-b border-gray-100 py-2 px-4 flex items-center justify-between">
        <StepIndicator stepCount={stepCount} currentStep={currentStep} />
        {onStartOver && messages.length > 0 && (
          <button
            type="button"
            onClick={onStartOver}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0033A0] transition-colors"
            title="Start over"
          >
            <RotateCcw className="size-3" />
            <span className="hidden sm:inline">Start Over</span>
          </button>
        )}
      </div>

      {/* Pinned message */}
      {pinnedMessage && (
        <PinnedMessage content={pinnedMessage.content} onUnpin={() => setPinnedMessage(null)} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSandyTyping={isSandyTyping}
            onPin={(content, id) => setPinnedMessage(pinnedMessage?.messageId === id ? null : { content, messageId: id })}
            isPinned={pinnedMessage?.messageId === msg.id}
          />
        ))}

        {isSandyTyping && (
          <div className="flex items-start gap-2.5">
            <SandyAvatar />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chips */}
      {chips.length > 0 && !isSandyTyping && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          <ChipBar chips={chips} onSelect={onChipSelect} disabled={disabled} />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="flex items-center justify-center size-9 rounded-xl bg-[#0033A0] text-white hover:bg-[#002580] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {disabled && isSandyTyping ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function SandyAvatar() {
  return (
    <div className="flex items-center justify-center size-7 rounded-full bg-[#0033A0] shrink-0 mt-0.5">
      <Bot className="size-3.5 text-white" />
    </div>
  )
}

function MessageBubble({ message, isSandyTyping, onPin, isPinned }: {
  message: ChatMessage
  isSandyTyping: boolean
  onPin: (content: string, messageId: string) => void
  isPinned: boolean
}) {
  const isUser = message.role === 'user'

  // Strip hidden markers from display
  const displayContent = message.content
    .replace(/<!--CHIPS:\[.*?\]-->/g, '')
    .replace(/<!--PHASE:[\w-]+-->/g, '')
    .replace(/<!--SCORE:\w+:\d+-->/g, '')
    .replace(/<!--COACH:[^>]*-->/g, '')
    .replace(/<!--INJECT:[^>]*-->/g, '')
    .replace(/<!--DRAFT:[\s\S]*?-->/g, '')
    .replace(/<!--STARTERS:\[.*?\]-->/g, '')
    .replace(/<!--REVIEW:\{[\s\S]*?\}-->/g, '')
    .trim()

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-[#0033A0] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
          <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-2.5">
      <SandyAvatar />
      <div className="flex flex-col">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
          <div className="text-sm text-gray-800 prose prose-sm max-w-none">
            <DynamicMarkdown components={mdComponents}>{displayContent}</DynamicMarkdown>
          </div>
        </div>
        {displayContent && !isSandyTyping && (
          <MessageActions
            content={displayContent}
            messageId={message.id}
            onPin={onPin}
            isPinned={isPinned}
          />
        )}
      </div>
    </div>
  )
}
