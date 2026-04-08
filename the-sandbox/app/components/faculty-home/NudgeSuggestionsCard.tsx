'use client'

import { useState, useEffect } from 'react'
import {
  Bot,
  Megaphone,
  MessageCircle,
  X,
  Send,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface NudgeSuggestion {
  courseId: string
  courseCode: string
  type: string
  audience: string
  suggestedTitle: string
  suggestedBody: string
  reason: string
  targetStudentIds?: string[]
}

interface NudgeSuggestionsCardProps {
  onCompose: (prefill: {
    courseId: string
    type: string
    audience: string
    body: string
    title?: string
    targetStudentIds?: string[]
    lockCourse: boolean
  }) => void
}

export default function NudgeSuggestionsCard({ onCompose }: NudgeSuggestionsCardProps) {
  const { currentUser } = useAuth()
  const [suggestions, setSuggestions] = useState<NudgeSuggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.email) return
    fetch('/api/course-posts/suggestions', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : { suggestions: [] })
      .then(data => setSuggestions(data.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser?.email])

  const visible = suggestions.filter((_, i) => !dismissed.has(i))

  if (loading || visible.length === 0) return null

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-bold text-gray-900">Sandy suggests</h3>
      </div>

      <div className="space-y-2">
        {visible.slice(0, 3).map((s, rawIdx) => {
          const idx = suggestions.indexOf(s)
          const Icon = s.type === 'NUDGE' ? MessageCircle : Megaphone

          return (
            <div key={idx} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-[#0033A0]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{s.courseCode}:</span>{' '}
                  {s.reason}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onCompose({
                    courseId: s.courseId,
                    type: s.type,
                    audience: s.audience,
                    body: s.suggestedBody,
                    title: s.suggestedTitle || undefined,
                    targetStudentIds: s.targetStudentIds,
                    lockCourse: true,
                  })}
                  className="rounded-lg bg-[#0033A0] p-1.5 text-white transition-colors hover:bg-[#00277A]"
                  title="Open composer"
                >
                  <Send className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(prev => new Set(prev).add(idx))}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                  title="Dismiss"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
