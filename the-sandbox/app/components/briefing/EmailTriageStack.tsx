'use client'

// ─── Email Triage Stack ──────────────────────────────────────
// Sandy's AI-powered email triage: one card at a time, swipe through.
// Each card shows Sandy's summary, quick replies, and action buttons.
// Progress bar + celebration when inbox zero is reached.

import { useState, useCallback } from 'react'
import {
  Archive, Reply, Star, SkipForward, Sparkles,
  Mail, AlertCircle, Clock, MessageSquare, Newspaper,
  ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react'
import { CappedList } from '../CappedList'
// Auth headers are handled by the parent page via onDraftReply callback

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
  triage?: EmailTriage
  urgencyScore?: number | null
  urgencyBucket?: string | null
}

interface EmailTriageStackProps {
  emails: Email[]
  onDraftReply?: (emailId: string, instruction?: string) => void
}

export default function EmailTriageStack({ emails, onDraftReply }: EmailTriageStackProps) {
  const unread = emails.filter(e => !e.isRead)
  const totalUnread = unread.length

  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | 'up'>('right')
  const [showAll, setShowAll] = useState(false)

  // Sort by urgency score (respond-today first)
  const sorted = [...unread].sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0))
  const remaining = sorted.filter(e => !processedIds.has(e.id))
  const currentEmail = remaining[0]
  const processedCount = totalUnread - remaining.length

  const animateOut = useCallback((emailId: string, direction: 'left' | 'right' | 'up') => {
    setAnimationDirection(direction)
    setAnimatingId(emailId)
    setTimeout(() => {
      setProcessedIds(prev => new Set(prev).add(emailId))
      setAnimatingId(null)
    }, 300)
  }, [])

  const handleArchive = useCallback((email: Email) => {
    animateOut(email.id, 'left')
  }, [animateOut])

  const handleReply = useCallback((email: Email, instruction?: string) => {
    animateOut(email.id, 'right')
    onDraftReply?.(email.id, instruction)
  }, [animateOut, onDraftReply])

  const handleStar = useCallback((email: Email) => {
    animateOut(email.id, 'up')
  }, [animateOut])

  const handleSkip = useCallback((email: Email) => {
    animateOut(email.id, 'right')
  }, [animateOut])

  // All caught up state
  if (totalUnread === 0) {
    return (
      <div className="border-2 rounded-2xl p-8 bg-white text-center">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 mb-4">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">Inbox Zero</h2>
        <p className="text-gray-500 text-sm mt-1">No unread emails. You&apos;re ahead of the game.</p>
      </div>
    )
  }

  // Completed all triage
  if (remaining.length === 0) {
    return (
      <div className="border-2 rounded-2xl overflow-hidden bg-white">
        {/* Progress bar — full */}
        <div className="h-1.5 bg-emerald-500 w-full" />

        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 mb-4">
            <Sparkles className="size-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">All caught up!</h2>
          <p className="text-gray-500 text-sm mt-1">
            You processed {totalUnread} email{totalUnread !== 1 ? 's' : ''} in record time.
          </p>
          <button
            onClick={() => setProcessedIds(new Set())}
            className="mt-4 text-sm text-[#0033A0] hover:underline"
          >
            Review again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 rounded-2xl overflow-hidden bg-white">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-[#0033A0] transition-all duration-500"
          style={{ width: `${(processedCount / totalUnread) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-[#0033A0]" />
          <span className="text-sm font-bold text-gray-900">Email Triage</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {processedCount} of {totalUnread} processed
          </span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-[#0033A0] hover:underline flex items-center gap-0.5"
          >
            {showAll ? <><ChevronUp className="size-3" /> Cards</> : <><ChevronDown className="size-3" /> List</>}
          </button>
        </div>
      </div>

      {/* Card view (default) */}
      {!showAll && currentEmail && (
        <TriageCard
          email={currentEmail}
          isAnimating={animatingId === currentEmail.id}
          animationDirection={animationDirection}
          onArchive={() => handleArchive(currentEmail)}
          onReply={(instruction) => handleReply(currentEmail, instruction)}
          onStar={() => handleStar(currentEmail)}
          onSkip={() => handleSkip(currentEmail)}
          remaining={remaining.length}
        />
      )}

      {/* List view (toggle) */}
      {showAll && (
        <CappedList
          items={remaining}
          cap={4}
          noun="emails"
          className="divide-y divide-gray-100"
          renderItem={(email) => (
            <TriageListRow
              key={email.id}
              email={email}
              onArchive={() => handleArchive(email)}
              onReply={() => handleReply(email)}
              onSkip={() => handleSkip(email)}
            />
          )}
        />
      )}
    </div>
  )
}

// ─── Single Triage Card ─────────────────────────────────────

function TriageCard({ email, isAnimating, animationDirection, onArchive, onReply, onStar, onSkip, remaining }: {
  email: Email
  isAnimating: boolean
  animationDirection: 'left' | 'right' | 'up'
  onArchive: () => void
  onReply: (instruction?: string) => void
  onStar: () => void
  onSkip: () => void
  remaining: number
}) {
  const [expanded, setExpanded] = useState(false)
  const triage = email.triage
  const receivedAt = new Date(email.receivedAt)
  const hoursAgo = Math.round((Date.now() - receivedAt.getTime()) / 3_600_000)
  const timeStr = hoursAgo < 1 ? 'just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`

  const animClass = isAnimating
    ? animationDirection === 'left' ? 'translate-x-[-120%] opacity-0'
      : animationDirection === 'right' ? 'translate-x-[120%] opacity-0'
      : 'translate-y-[-120%] opacity-0'
    : 'translate-x-0 opacity-100'

  return (
    <div className={`transition-all duration-300 ${animClass}`}>
      <div className="p-5">
        {/* Bucket + From + Time */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <BucketBadge bucket={triage?.bucket ?? bucketFromCategory(email.category)} />
          <CategoryBadge category={email.category} />
          <span className="text-sm font-medium text-gray-700">{email.fromName}</span>
          <span className="text-xs text-gray-400 ml-auto">{timeStr}</span>
        </div>

        {/* Subject */}
        <h3 className="font-bold text-gray-900 text-base">{email.subject}</h3>

        {/* Sandy's summary */}
        {triage?.summary && (
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="size-4 text-[#0033A0] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-800">{triage.summary}</p>
                {triage.question && (
                  <p className="text-sm text-[#0033A0] font-medium mt-2 flex items-start gap-1.5">
                    <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
                    {triage.question}
                  </p>
                )}
                {triage.deadline && (
                  <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
                    <Clock className="size-3" />
                    Deadline: {triage.deadline}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expandable full body */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-600 mt-2 flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {expanded ? 'Hide full email' : 'Show full email'}
        </button>
        {expanded && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-100">
            {email.body}
          </div>
        )}

        {/* Quick replies */}
        {triage?.quickReplies && triage.quickReplies.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Quick reply:</p>
            <div className="flex flex-wrap gap-2">
              {triage.quickReplies.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => onReply(reply)}
                  className="text-xs px-3 py-1.5 bg-white border border-[#0033A0] text-[#0033A0] rounded-full hover:bg-[#0033A0] hover:text-white transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <ActionButton icon={<Archive className="size-4" />} label="Archive" onClick={onArchive} variant="default" />
          <ActionButton icon={<Reply className="size-4" />} label="Reply" onClick={() => onReply()} variant="primary" />
          <ActionButton icon={<Star className="size-4" />} label="Flag" onClick={onStar} variant="default" />
          <ActionButton icon={<SkipForward className="size-4" />} label="Skip" onClick={onSkip} variant="ghost" />
          <span className="ml-auto text-xs text-gray-400">{remaining} remaining</span>
        </div>
      </div>
    </div>
  )
}

// ─── List Row (compact view) ────────────────────────────────

function TriageListRow({ email, onArchive, onReply, onSkip }: {
  email: Email
  onArchive: () => void
  onReply: () => void
  onSkip: () => void
}) {
  const triage = email.triage

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
      <BucketBadge bucket={triage?.bucket ?? bucketFromCategory(email.category)} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 truncate">{email.fromName}</span>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{email.subject}</p>
        {triage?.summary && (
          <p className="text-xs text-gray-500 truncate">{triage.summary}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onArchive} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Archive">
          <Archive className="size-3.5" />
        </button>
        <button onClick={onReply} className="p-1.5 text-[#0033A0] hover:bg-blue-50 rounded-lg" title="Reply">
          <Reply className="size-3.5" />
        </button>
        <button onClick={onSkip} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Skip">
          <SkipForward className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────

function BucketBadge({ bucket, size = 'md' }: { bucket: string; size?: 'sm' | 'md' }) {
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    decision: { label: 'Needs Decision', color: 'bg-red-100 text-red-800', icon: <AlertCircle className={size === 'sm' ? 'size-3' : 'size-3.5'} /> },
    waiting: { label: 'Waiting on You', color: 'bg-amber-100 text-amber-800', icon: <Clock className={size === 'sm' ? 'size-3' : 'size-3.5'} /> },
    fyi: { label: 'FYI', color: 'bg-blue-100 text-blue-700', icon: <Mail className={size === 'sm' ? 'size-3' : 'size-3.5'} /> },
    noise: { label: 'Noise', color: 'bg-gray-100 text-gray-600', icon: <Newspaper className={size === 'sm' ? 'size-3' : 'size-3.5'} /> },
  }

  const c = config[bucket] ?? config.fyi
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full ${c.color} ${sizeClass}`}>
      {c.icon} {c.label}
    </span>
  )
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null
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

function ActionButton({ icon, label, onClick, variant }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant: 'primary' | 'default' | 'ghost'
}) {
  const variantClass = {
    primary: 'bg-[#0033A0] text-white hover:bg-[#002680]',
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ghost: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${variantClass[variant]}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function bucketFromCategory(category: string | null): string {
  switch (category) {
    case 'urgent': return 'decision'
    case 'student': return 'waiting'
    case 'admin': case 'department': return 'fyi'
    case 'newsletter': return 'noise'
    case 'external': return 'waiting'
    default: return 'fyi'
  }
}
