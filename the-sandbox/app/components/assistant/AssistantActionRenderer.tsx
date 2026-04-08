'use client'

import React from 'react'
import { RefreshCw, Video } from 'lucide-react'
import AssistantCalendarView from './AssistantCalendarView'
import AssistantMeetingOptions from './AssistantMeetingOptions'
import AssistantInboxSummary from './AssistantInboxSummary'
import AssistantEmailDraft from './AssistantEmailDraft'
import AssistantTaskList from './AssistantTaskList'
import AssistantRuleChip from './AssistantRuleChip'
import SandyEmailCard from '../concierge/SandyEmailCard'
import SandyComposeCard from '../concierge/SandyComposeCard'

// ─── Types ───────────────────────────────────────────────────

export interface AssistantAction {
  type: string
  [key: string]: unknown
}

interface Props {
  action: AssistantAction
  userEmail?: string
  onAction?: (action: string, payload: unknown) => void
}

// ─── Parser ──────────────────────────────────────────────────

const ASSISTANT_ACTION_REGEX = /<!--ASSISTANT_ACTION:([\s\S]*?)-->/g

export function extractAssistantActions(text: string): {
  clean: string
  actions: AssistantAction[]
} {
  const actions: AssistantAction[] = []
  const clean = text.replace(ASSISTANT_ACTION_REGEX, (_, json) => {
    try {
      actions.push(JSON.parse(json.trim()))
    } catch {
      // Skip malformed actions
    }
    return ''
  })
  return { clean: clean.trim(), actions }
}

// ─── Renderer ────────────────────────────────────────────────

export default function AssistantActionRenderer({ action, userEmail, onAction }: Props) {
  switch (action.type) {
    case 'show-calendar':
      return (
        <AssistantCalendarView
          events={action.events as Array<{ title: string; start: string; end: string; category?: string }>}
          startDate={action.startDate as string}
          endDate={action.endDate as string}
        />
      )

    case 'show-options':
      return (
        <AssistantMeetingOptions
          options={action.options as Array<{ index: number; start: string; end: string; label: string }>}
          onSelect={(opt) => onAction?.('book-meeting', opt)}
        />
      )

    case 'confirm-booking':
      return (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-3 my-2">
          <p className="text-sm font-semibold text-green-800">
            ✓ {action.title as string}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {action.label as string}
          </p>
        </div>
      )

    case 'show-inbox':
      return (
        <AssistantInboxSummary
          summary={action.summary as { total: number; unread: number; categories: Array<{ category: string; count: number; unreadCount: number }>; urgent: Array<{ subject: string; fromName: string }> }}
        />
      )

    case 'show-draft':
      return (
        <AssistantEmailDraft
          draftId={action.draftId as string}
          preview={action.preview as string}
          subject={action.subject as string}
          fromName={action.fromName as string}
          userEmail={userEmail}
          onApprove={() => onAction?.('approve-draft', action.draftId)}
          onDiscard={() => onAction?.('discard-draft', action.draftId)}
        />
      )

    case 'show-tasks':
      return (
        <AssistantTaskList
          tasks={action.tasks as Array<{ id: string; title: string; dueAt?: string; status: string }>}
          onComplete={(id) => onAction?.('complete-task', id)}
        />
      )

    case 'rule-created':
      return (
        <AssistantRuleChip
          ruleId={action.ruleId as string}
          naturalText={action.natural as string}
          isActive={true}
        />
      )

    case 'show-email-card':
      return (
        <SandyEmailCard
          emailId={action.emailId as string}
          from={action.from as string}
          fromAddress={action.fromAddress as string | undefined}
          subject={action.subject as string}
          snippet={action.snippet as string}
          receivedAt={action.receivedAt as string}
          category={action.category as string | undefined}
          isRead={action.isRead as boolean | undefined}
          isStarred={action.isStarred as boolean | undefined}
          variant={(action.variant as 'inbox' | 'draft') ?? 'inbox'}
          draftBody={action.draftBody as string | undefined}
          draftTo={action.draftTo as string | undefined}
          onDraftReply={() => onAction?.('sandy-prefill', `Draft a reply to "${action.subject}" from ${action.from}`)}
          onApprove={action.draftId ? () => onAction?.('approve-draft', action.draftId) : undefined}
          onDiscard={action.draftId ? () => onAction?.('discard-draft', action.draftId) : undefined}
        />
      )

    case 'show-compose-card':
      return (
        <SandyComposeCard
          suggestedRecipient={action.suggestedRecipient as { name: string; email: string; role: string } | undefined}
          suggestedSubject={action.suggestedSubject as string | undefined}
          suggestedTone={action.suggestedTone as 'polished' | 'warm' | 'concise' | undefined}
          knownContacts={(action.knownContacts as Array<{ name: string; email: string; role: string; context: string }>) ?? []}
          onSandyDraft={(to, subject, tone) =>
            onAction?.('sandy-prefill', `Draft a ${tone} email to ${to} about: ${subject}`)
          }
        />
      )

    case 'show-thread-stall':
      return (
        <ThreadStallCard
          suggestion={action.suggestion as string}
          roomType={action.roomType as string}
          topic={action.topic as string}
          participantCount={action.participantCount as number}
          messageCount={action.messageCount as number}
          onCreateRoom={() => onAction?.('sandy-prefill', `Create a ${action.roomType} Commons session about "${action.topic}"`)}
        />
      )

    default:
      return null
  }
}

// ─── Thread Stall Card ──────────────────────────────────────

function ThreadStallCard({ suggestion, roomType, topic, participantCount, messageCount, onCreateRoom }: {
  suggestion: string
  roomType: string
  topic: string
  participantCount: number
  messageCount: number
  onCreateRoom: () => void
}) {
  const roomLabel = roomType === 'CHALLENGE' ? 'Challenge'
    : roomType === 'STUDY' ? 'Study Session'
    : roomType === 'TEACHBACK' ? 'Teach-Back'
    : 'Commons session'

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 my-2">
      <div className="flex items-start gap-2">
        <RefreshCw className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-800">Thread seems stuck</p>
          <p className="text-xs text-amber-700 mt-1">
            {participantCount} people, {messageCount} messages — {suggestion}
          </p>
          <p className="text-xs text-gray-600 mt-1">Topic: {topic}</p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onCreateRoom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0033A0] text-white text-xs font-semibold hover:bg-[#002880] transition-colors"
            >
              <Video className="size-3" />
              Create {roomLabel}
            </button>
            <button
              type="button"
              onClick={() => {/* dismiss — card stays visible but no action */}}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Keep Emailing
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
