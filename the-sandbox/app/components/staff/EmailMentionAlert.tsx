'use client'

import { useState, useEffect } from 'react'
import { AtSign, AlertCircle, HelpCircle, Award, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import type { MentionType, EmailMention, MentionSummary } from '../../lib/assistant/email-mention-service'

const MENTION_ICONS: Record<MentionType, typeof AlertCircle> = {
  ACTION_REQUESTED: AlertCircle,
  QUESTION: HelpCircle,
  RECOGNITION: Award,
  FYI_MENTION: AtSign,
}

const MENTION_COLORS: Record<MentionType, string> = {
  ACTION_REQUESTED: 'text-red-600 bg-red-50 border-red-200',
  QUESTION: 'text-amber-600 bg-amber-50 border-amber-200',
  RECOGNITION: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  FYI_MENTION: 'text-gray-500 bg-gray-50 border-gray-200',
}

const MENTION_LABELS: Record<MentionType, string> = {
  ACTION_REQUESTED: 'Action needed',
  QUESTION: 'Question for you',
  RECOGNITION: 'Recognition',
  FYI_MENTION: 'Mentioned',
}

export default function EmailMentionAlert() {
  const { currentUser } = useAuth()
  const [summary, setSummary] = useState<MentionSummary | null>(null)
  const [mentions, setMentions] = useState<EmailMention[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    fetch('/api/assistant/email/mentions', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then(data => {
        setSummary(data.summary)
        setMentions(data.mentions ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser])

  if (loading || !summary || summary.total === 0) return null

  const actionCount = summary.actionRequired + summary.questions

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="mention-details"
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <AtSign className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Name Mentions</h2>
          {actionCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
              {actionCount}
            </span>
          )}
          <span className="text-sm text-gray-500">
            {summary.total} mention{summary.total !== 1 ? 's' : ''} this week
          </span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
      </button>

      {/* Summary strip */}
      {!expanded && actionCount > 0 && (
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-red-600">{summary.actionRequired} action{summary.actionRequired !== 1 ? 's' : ''} needed</span>
            {summary.questions > 0 && <>, <span className="font-semibold text-amber-600">{summary.questions} question{summary.questions !== 1 ? 's' : ''}</span></>}
            {summary.recognitions > 0 && <>, <span className="text-emerald-600">{summary.recognitions} recognition{summary.recognitions !== 1 ? 's' : ''}</span></>}
          </p>
        </div>
      )}

      {/* Expanded list */}
      {expanded && (
        <div id="mention-details" className="px-5 pb-4 space-y-2">
          {mentions.map((mention) => {
            const Icon = MENTION_ICONS[mention.mentionType]
            const colorClass = MENTION_COLORS[mention.mentionType]
            return (
              <div key={mention.emailId} className={`rounded-xl border p-3 ${colorClass}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className="size-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {MENTION_LABELS[mention.mentionType]}
                      </span>
                      <span className="text-xs opacity-70">
                        from {mention.from}
                      </span>
                    </div>
                    <p className="text-sm font-semibold mt-0.5 truncate">{mention.subject}</p>
                    <p className="text-xs mt-1 opacity-80 line-clamp-2">&ldquo;{mention.excerpt}&rdquo;</p>
                    {mention.suggestedAction && (
                      <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline">
                        <ExternalLink className="size-3" /> {mention.suggestedAction}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
