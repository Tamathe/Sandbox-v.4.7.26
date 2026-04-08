'use client'

import DynamicMarkdown from '../DynamicMarkdown'
import { ChevronRight, Rocket, ExternalLink, FileText, Brain, X } from 'lucide-react'
import AssistantActionRenderer from '../assistant/AssistantActionRenderer'
import MessageActions from '../sandy/MessageActions'
import type { MessageActionsContext } from '../sandy/MessageActions'
import type { Message, Action, PrereqMarker } from './concierge-utils'
import type { AssistantAction } from '../assistant/AssistantActionRenderer'
import type { SandyTrustPanelData } from '../../lib/provenance-types'
import TrustPanel from '../TrustPanel'

interface SandyMessageProps {
  msg: Message
  trustPanel: SandyTrustPanelData | null
  actions: Action[]
  prereqMarkers: PrereqMarker[]
  assistantActions: AssistantAction[]
  isProactive: boolean
  loading?: boolean
  userEmail?: string
  messageActionsContext?: MessageActionsContext
  pinnedMessageId?: string | null
  onPin?: (content: string, messageId: string) => void
  onAction: (action: Action) => void
  onPrereqClick: (marker: PrereqMarker) => void
  onDismissProactive: () => void
  onAssistantAction: (actionType: string, payload: unknown) => void
}

export default function SandyMessage({
  msg,
  trustPanel,
  actions,
  prereqMarkers,
  assistantActions,
  isProactive,
  loading,
  userEmail,
  messageActionsContext,
  pinnedMessageId,
  onPin,
  onAction,
  onPrereqClick,
  onDismissProactive,
  onAssistantAction,
}: SandyMessageProps) {
  return (
    <div className={`group flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
      {msg.role === 'assistant' && (
        <div className="size-7 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
          S
        </div>
      )}
      <div className={`max-w-[87%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          msg.role === 'user'
            ? 'bg-[#0033A0] text-white rounded-tr-sm'
            : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
        }`}>
          {msg.content === '' && msg.role === 'assistant' ? (
            <div className="flex items-center gap-1.5 py-0.5">
              {[0, 150, 300].map(delay => (
                <span key={delay} className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          ) : msg.role === 'assistant' ? (
            <DynamicMarkdown
              components={{
                p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em:     ({ children }) => <em className="italic">{children}</em>,
                ul:     ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
                ol:     ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
                li:     ({ children }) => <li>{children}</li>,
                code:   ({ children }) => <code className="bg-gray-200 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                a: ({ href, children }) => {
                  if (href?.startsWith('material:')) {
                    const materialId = href.slice('material:'.length)
                    return (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-material', { detail: { materialId } }))}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-[#0033A0] hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="size-3 flex-shrink-0" />
                        {children}
                      </button>
                    )
                  }
                  return <a href={href} target="_blank" rel="noreferrer" className="text-[#0033A0] underline underline-offset-2">{children}</a>
                },
              }}
            >{msg.content}</DynamicMarkdown>
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>

        {msg.role === 'assistant' && msg.content !== '' && !loading && (
          <MessageActions
            content={msg.content}
            messageId={msg.id}
            context={messageActionsContext}
            onPin={onPin}
            isPinned={pinnedMessageId === msg.id}
          />
        )}

        {msg.role === 'assistant' && trustPanel && (
          <TrustPanel data={trustPanel} />
        )}

        {actions.length > 0 && (
          <div className="space-y-1.5 w-full">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onAction(action)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  action.type === 'launch'
                    ? 'bg-[#0033A0] text-white hover:bg-[#002580]'
                    : 'bg-white border border-[#0033A0] text-[#0033A0] hover:bg-blue-50'
                }`}
              >
                {action.type === 'launch'
                  ? <Rocket className="size-3.5 flex-shrink-0" />
                  : <ExternalLink className="size-3.5 flex-shrink-0" />
                }
                <span className="flex-1 text-left">{action.label}</span>
                <ChevronRight className="size-3 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        {prereqMarkers.length > 0 && (
          <div className="space-y-1.5 w-full">
            {prereqMarkers.map((pm, idx) => (
              <button
                key={`prereq-${idx}`}
                onClick={() => onPrereqClick(pm)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#0033A0] text-[#0033A0] hover:bg-blue-50 transition-all"
              >
                <Brain className="size-3.5 shrink-0" />
                <span className="flex-1 text-left capitalize">Trace prerequisites for {pm.concept.replace(/-/g, ' ')}</span>
                <ChevronRight className="size-3 shrink-0" />
              </button>
            ))}
          </div>
        )}
        {assistantActions.length > 0 && (
          <div className="w-full">
            {assistantActions.map((aAction, idx) => (
              <AssistantActionRenderer
                key={`assistant-${idx}`}
                action={aAction}
                userEmail={userEmail}
                onAction={onAssistantAction}
              />
            ))}
          </div>
        )}
        {isProactive && (
          <button
            onClick={onDismissProactive}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="size-3" />
            Don&apos;t show again
          </button>
        )}
      </div>
    </div>
  )
}
