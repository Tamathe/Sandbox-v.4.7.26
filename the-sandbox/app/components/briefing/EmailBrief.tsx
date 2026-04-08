'use client'

// ─── Email Brief ──────────────────────────────────────────────
// Primary inbox card on the faculty homepage (2/3 width).
// Shows emails with sender, subject, AI triage summary, and time.
// Fills the grid height naturally alongside Calendar + Tasks.

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mail, AlertCircle, Clock, Newspaper,
  MessageSquare, Sparkles, Reply, Archive,
  FileText, Zap, AlarmClock, Bookmark,
} from 'lucide-react'
import { CappedList } from '../CappedList'

interface EmailTriage {
  emailId: string
  summary: string
  bucket: 'decision' | 'waiting' | 'fyi' | 'noise'
  quickReplies: string[]
  question: string | null
  deadline: string | null
}

interface Email {
  id: string
  fromAddress: string
  fromName: string
  subject: string
  body: string
  snippet: string | null
  category: string | null
  isRead: boolean
  receivedAt: string | Date
  threadId?: string | null
  triage?: EmailTriage
  urgencyScore?: number | null
  urgencyBucket?: string | null
  urgencyReasons?: string[]
}

interface EmailBriefProps {
  emails: Email[]
  focusedEmailId?: string | null
}

export default function EmailBrief({ emails, focusedEmailId }: EmailBriefProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const emailRefs = useRef<Map<string, HTMLElement>>(new Map())

  const setEmailRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) emailRefs.current.set(id, el)
    else emailRefs.current.delete(id)
  }, [])

  // When focusedEmailId changes from AttentionBar, expand + scroll to it
  useEffect(() => {
    if (!focusedEmailId) return
    setExpandedId(focusedEmailId)
    // Small delay to let the expansion render before scrolling
    requestAnimationFrame(() => {
      const el = emailRefs.current.get(focusedEmailId)
      if (el && scrollContainerRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [focusedEmailId])

  if (emails.length === 0) {
    return (
      <div className="border-2 rounded-2xl p-6 bg-white h-full flex flex-col items-center justify-center">
        <Mail className="size-8 text-gray-300 mb-3" />
        <h2 className="text-lg font-extrabold text-gray-900">Inbox Zero</h2>
        <p className="text-gray-500 text-sm mt-1">Nothing waiting for you.</p>
      </div>
    )
  }

  // Sort: unread first, then by urgency score (highest first), then by recency
  const sorted = [...emails].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
    const aScore = a.urgencyScore ?? 0
    const bScore = b.urgencyScore ?? 0
    if (aScore !== bScore) return bScore - aScore
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  })

  const unreadCount = emails.filter(e => !e.isRead).length

  return (
    <div className="border-2 rounded-2xl bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-extrabold text-gray-900">Inbox</h2>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-[#0033A0] text-white px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{emails.length} total</span>
      </div>

      {/* Sandy insight banner */}
      {unreadCount > 0 && (
        <SandyEmailBanner unreadCount={unreadCount} emails={sorted} />
      )}

      {/* Email list — fills remaining height */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        <CappedList
          items={sorted}
          cap={4}
          noun="emails"
          className="space-y-0.5"
          renderItem={(email) => (
            <EmailRow
              key={email.id}
              email={email}
              isExpanded={expandedId === email.id}
              onToggle={() => setExpandedId(expandedId === email.id ? null : email.id)}
              ref={(el: HTMLElement | null) => setEmailRef(email.id, el)}
            />
          )}
        />
      </div>
    </div>
  )
}

// ─── Single Email Row ──────────────────────────────────────────

function EmailRow({ email, isExpanded, onToggle, ref }: {
  email: Email
  isExpanded: boolean
  onToggle: () => void
  ref?: React.Ref<HTMLButtonElement>
}) {
  const receivedAt = new Date(email.receivedAt)
  const hoursAgo = Math.round((Date.now() - receivedAt.getTime()) / 3_600_000)
  const timeStr = hoursAgo < 1 ? 'just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`
  const triage = email.triage
  const bucket = email.urgencyBucket ?? 'when-free'

  function askSandyToDraft(e: Email, instruction?: string) {
    const from = e.fromName || e.fromAddress.split('@')[0]
    let msg = `Draft a reply to ${from}'s email about "${e.subject}"`
    if (instruction) msg += ` — tone: ${instruction}`
    window.dispatchEvent(new CustomEvent('sandy-prefill', {
      detail: { message: msg, autoSend: true },
    }))
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      className={`w-full text-left rounded-xl px-3.5 py-2.5 transition-colors ${
        isExpanded
          ? 'bg-blue-50 ring-1 ring-[#0033A0]/20'
          : email.isRead
            ? 'hover:bg-gray-50'
            : 'bg-slate-50 hover:bg-slate-100'
      }`}
    >
      {/* Header row: urgency dot + sender + urgency badge + category + time */}
      <div className="flex items-center gap-2">
        <UrgencyDot bucket={bucket} />
        <span className={`text-sm ${!email.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
          {email.fromName}
        </span>
        <UrgencyBadge bucket={bucket} emailId={email.id} />
        {email.category && <CategoryBadge category={email.category} />}
        <span className="text-xs text-gray-400 ml-auto shrink-0">{timeStr}</span>
      </div>

      {/* Subject line — full width, no truncation needed at 2/3 page */}
      <p className={`text-sm mt-1 ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {email.subject}
      </p>

      {/* Triage summary (collapsed) */}
      {!isExpanded && triage?.summary && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
          {triage.summary}
        </p>
      )}
      {!isExpanded && !triage?.summary && email.snippet && (
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
          {email.snippet}
        </p>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-2.5" onClick={e => e.stopPropagation()}>
          {/* AI triage summary */}
          {triage?.summary && (
            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="size-3.5 text-[#0033A0] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">{triage.summary}</p>
                  {triage.question && (
                    <p className="text-sm text-[#0033A0] font-medium mt-2 flex items-start gap-1.5">
                      <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
                      {triage.question}
                    </p>
                  )}
                  {triage.deadline && (
                    <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
                      <Clock className="size-3" /> Deadline: {triage.deadline}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Thread summary (fetched on demand) */}
          {email.threadId && <ThreadSummaryCard threadId={email.threadId} />}

          {/* Full email body */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-600 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
            {email.body}
          </div>

          {/* Actions — talk to Sandy */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => askSandyToDraft(email)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0033A0] text-white text-xs font-semibold hover:bg-[#002880] transition-colors"
            >
              <Reply className="size-3.5" />
              Ask Sandy to draft a reply
            </button>
            {triage?.quickReplies && triage.quickReplies.length > 0 && (
              <>
                {triage.quickReplies.slice(0, 2).map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => askSandyToDraft(email, reply)}
                    className="text-xs px-3 py-1.5 bg-white border border-[#0033A0]/20 text-[#0033A0] rounded-full font-medium hover:bg-blue-50 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Quick reply templates */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: 'Grant extension', prompt: `Reply to ${email.fromName}'s email granting a short extension on the assignment. Be warm but set a firm new deadline.` },
              { label: 'Deny w/ alternative', prompt: `Reply to ${email.fromName}'s email. Politely decline the request but suggest an alternative — like office hours or a different accommodation.` },
              { label: 'Office hours invite', prompt: `Reply to ${email.fromName}'s email inviting them to come by office hours to discuss further. Keep it encouraging.` },
              { label: 'Acknowledge', prompt: `Reply to ${email.fromName}'s email with a brief acknowledgment — confirm receipt and set expectations for a follow-up.` },
            ].map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('sandy-prefill', {
                    detail: { message: tpl.prompt, autoSend: true },
                  }))
                }}
                className="text-[11px] px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 rounded-full font-medium hover:bg-gray-100 hover:border-gray-300 transition-colors"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* Snooze / Bookmark */}
          <SnoozeBar emailId={email.id} />
        </div>
      )}
    </button>
  )
}

// ─── Sub-components ────────────────────────────────────────────

function UrgencyDot({ bucket }: { bucket: string }) {
  const colors: Record<string, string> = {
    'respond-today': 'bg-red-500',
    'this-week': 'bg-amber-500',
    'when-free': 'bg-blue-400',
    'archive': 'bg-gray-300',
  }
  return <span className={`size-2 rounded-full shrink-0 ${colors[bucket] ?? 'bg-gray-300'}`} />
}

function UrgencyBadge({ bucket, emailId }: { bucket: string; emailId?: string }) {
  const allBuckets = ['respond-today', 'this-week', 'when-free', 'archive'] as const
  const config: Record<string, { label: string; cls: string }> = {
    'respond-today': { label: 'Respond Today', cls: 'bg-red-100 text-red-700' },
    'this-week': { label: 'This Week', cls: 'bg-amber-100 text-amber-700' },
    'when-free': { label: 'When Free', cls: 'bg-blue-100 text-blue-700' },
    'archive': { label: 'Archive', cls: 'bg-gray-100 text-gray-500' },
  }
  const c = config[bucket]
  if (!c) return null
  if (bucket === 'when-free' || bucket === 'archive') return null

  function handleReclassify(e: React.MouseEvent) {
    e.stopPropagation()
    if (!emailId) return
    const currentIdx = allBuckets.indexOf(bucket as typeof allBuckets[number])
    const nextBucket = allBuckets[(currentIdx + 1) % allBuckets.length]
    // Fire reclassification event for parent/service to handle
    window.dispatchEvent(new CustomEvent('uky-email-reclassify', {
      detail: { emailId, fromBucket: bucket, toBucket: nextBucket },
    }))
    // Persist the correction as a learned rule
    fetch('/api/assistant/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'urgency_override', emailId, fromBucket: bucket, toBucket: nextBucket }),
    }).catch(() => {})
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${c.cls} group/badge relative cursor-default`}>
      {c.label}
      <button
        type="button"
        onClick={handleReclassify}
        className="ml-1 hidden text-[9px] opacity-60 hover:opacity-100 group-hover/badge:inline"
        title="Reclassify urgency"
      >
        ✕
      </button>
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    urgent: 'bg-red-600 text-white',
    student: 'bg-blue-100 text-blue-700',
    admin: 'bg-slate-100 text-slate-700',
    department: 'bg-purple-100 text-purple-700',
    external: 'bg-green-100 text-green-700',
    newsletter: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[category] ?? 'bg-gray-100 text-gray-600'}`}>
      {category}
    </span>
  )
}

// ─── Thread Summary Card ────────────────────────────────────
// Fetches + displays an AI summary for threaded emails.

interface ThreadSummaryData {
  summary: string
  keyDecisions: string[]
  needsResponse: boolean
  messageCount: number
}

function ThreadSummaryCard({ threadId }: { threadId: string }) {
  const [data, setData] = useState<ThreadSummaryData | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  // Auto-fetch on mount — no button click needed
  useEffect(() => {
    setStatus('loading')
    fetch(`/api/assistant/email/thread/${threadId}/summary`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => { setData(json.summary); setStatus('idle') })
      .catch(() => setStatus('error'))
  }, [threadId])

  if (status === 'loading') {
    return (
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-violet-500 animate-pulse shrink-0" />
        <span className="text-xs text-violet-600">Sandy is summarizing this thread...</span>
      </div>
    )
  }

  if (status === 'error' || !data) return null

  return (
    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
      <div className="flex items-start gap-2">
        <FileText className="size-3.5 text-violet-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1">
            Thread Summary ({data.messageCount} messages)
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{data.summary}</p>
          {data.keyDecisions.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {data.keyDecisions.map((d, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-violet-400 mt-0.5">•</span> {d}
                </li>
              ))}
            </ul>
          )}
          {data.needsResponse && (
            <p className="text-xs text-amber-700 font-medium mt-2 flex items-center gap-1">
              <Zap className="size-3" /> Action needed — last message awaits your response
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sandy Email Banner ────────────────────────────────────────
// Shows a brief Sandy insight at the top of the inbox on the faculty homepage.

function SandyEmailBanner({ unreadCount, emails }: { unreadCount: number; emails: Email[] }) {
  const urgent = emails.filter(e => !e.isRead && e.category === 'urgent')
  const decisions = emails.filter(e => !e.isRead && (e.triage?.bucket === 'decision' || e.category === 'urgent'))

  const insight = urgent.length > 0
    ? `${urgent.length} urgent email${urgent.length !== 1 ? 's' : ''} — ${urgent[0].fromName} re: "${urgent[0].subject}"`
    : decisions.length > 0
    ? `${decisions.length} email${decisions.length !== 1 ? 's' : ''} need${decisions.length === 1 ? 's' : ''} a decision`
    : `${unreadCount} unread — want help triaging?`

  function askSandyToDraft() {
    window.dispatchEvent(new CustomEvent('sandy-prefill', {
      detail: { message: 'Draft replies to my urgent emails', autoSend: true },
    }))
  }

  return (
    <div className="mx-3 mb-2 px-3 py-2 bg-blue-50 border border-[#0033A0]/10 rounded-xl flex items-center gap-2">
      <Sparkles className="size-4 text-[#0033A0] shrink-0" />
      <span className="text-xs text-gray-700 flex-1">
        <span className="font-semibold text-[#0033A0]">Sandy says:</span> {insight}
      </span>
      <button
        type="button"
        onClick={askSandyToDraft}
        className="text-[10px] font-semibold text-[#0033A0] hover:underline shrink-0"
      >
        Let Sandy draft responses
      </button>
    </div>
  )
}

// ─── Snooze Bar ─────────────────────────────────────────────────
// "Remind me later" / bookmark controls for email triage.

function SnoozeBar({ emailId }: { emailId: string }) {
  const [snoozed, setSnoozed] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(false)

  const snoozeOptions = [
    { label: '1 hour', minutes: 60 },
    { label: 'This afternoon', minutes: (() => { const h = new Date().getHours(); return Math.max((16 - h) * 60, 60) })() },
    { label: 'Tomorrow', minutes: 24 * 60 },
  ]

  function handleSnooze(minutes: number, label: string) {
    setSnoozed(label)
    // Fire event for parent/service to handle re-surfacing
    window.dispatchEvent(new CustomEvent('uky-email-snooze', {
      detail: { emailId, snoozeMinutes: minutes, label },
    }))
  }

  function handleBookmark() {
    setBookmarked(!bookmarked)
    window.dispatchEvent(new CustomEvent('uky-email-bookmark', {
      detail: { emailId, bookmarked: !bookmarked },
    }))
  }

  if (snoozed) {
    return (
      <div className="flex items-center gap-2 pt-1.5">
        <AlarmClock className="size-3.5 text-amber-500" />
        <span className="text-xs text-amber-600 font-medium">Snoozed — {snoozed}</span>
        <button
          type="button"
          onClick={() => setSnoozed(null)}
          className="text-[11px] text-gray-400 hover:text-gray-600 ml-1"
        >
          Undo
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 pt-1.5">
      <AlarmClock className="size-3 text-gray-400 shrink-0" />
      {snoozeOptions.map(opt => (
        <button
          key={opt.label}
          type="button"
          onClick={() => handleSnooze(opt.minutes, opt.label)}
          className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 font-medium hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-colors"
        >
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        onClick={handleBookmark}
        className={`ml-auto p-1 rounded-lg transition-colors ${bookmarked ? 'text-[#0033A0] bg-blue-50' : 'text-gray-400 hover:text-[#0033A0] hover:bg-blue-50'}`}
        title={bookmarked ? 'Remove bookmark' : 'Bookmark for later'}
      >
        <Bookmark className={`size-3.5 ${bookmarked ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}
