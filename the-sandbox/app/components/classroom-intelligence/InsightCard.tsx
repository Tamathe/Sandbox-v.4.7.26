'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageCircle,
  TrendingUp,
  Zap,
  Activity,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { InsightCardData, InsightType } from '../../lib/classroom-intelligence/types'

const TYPE_ICONS: Record<InsightType, React.ElementType> = {
  CONCEPT_STRUGGLE: AlertTriangle,
  MISCONCEPTION: Brain,
  ENGAGEMENT_DROP: Activity,
  INTERVENTION_RESULT: TrendingUp,
  STUDENT_FEEDBACK: MessageCircle,
  CROSS_SECTION: BarChart3,
  WEEKLY_PULSE: Zap,
}

const URGENCY_BADGE: Record<string, string> = {
  immediate: 'bg-red-100 text-red-700',
  this_week: 'bg-amber-100 text-amber-700',
  informational: 'bg-blue-100 text-blue-700',
}

interface InsightCardProps {
  card: InsightCardData & {
    id: string
    viewed: boolean
    course?: { title: string }
  }
  onRespond: (id: string) => void
}

export default function InsightCard({ card, onRespond }: InsightCardProps) {
  const { currentUser } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [viewed, setViewed] = useState(card.viewed)

  const Icon = TYPE_ICONS[card.type] ?? AlertTriangle

  async function markRead() {
    if (!currentUser?.email || viewed) return
    try {
      await apiFetch(currentUser.email, `/api/classroom-intelligence/insights/${card.id}/view`, {
        method: 'POST',
      })
      setViewed(true)
    } catch {
      // silent
    }
  }

  return (
    <div
      className={`bg-white border rounded-2xl shadow-sm transition-shadow ${
        !viewed ? 'border-[#0033A0]/30 ring-1 ring-[#0033A0]/10' : ''
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className="shrink-0 p-2 rounded-xl bg-gray-100">
          <Icon className="size-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-sm text-gray-900 truncate">{card.title}</h3>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${URGENCY_BADGE[card.urgency]}`}>
              {card.urgency.replace('_', ' ')}
            </span>
            {!viewed && (
              <span className="size-2 rounded-full bg-[#0033A0] shrink-0" />
            )}
          </div>
          {card.course && (
            <p className="text-xs text-gray-500 mt-0.5">{card.course.title}</p>
          )}
        </div>
        <span className="shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-3">
          <p className="text-sm text-gray-700">{card.body}</p>

          {/* Suggested Actions */}
          {card.suggestedActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Suggested Actions
              </p>
              <ul className="space-y-2">
                {card.suggestedActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="shrink-0 text-[10px] font-bold uppercase bg-[#0033A0]/10 text-[#0033A0] px-1.5 py-0.5 rounded-full">
                      {a.approach.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-gray-600">{a.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onRespond(card.id)}
              className="px-3 py-1.5 rounded-lg bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#0033A0]/90 transition-colors"
            >
              Take Action
            </button>
            {!viewed && (
              <button
                onClick={markRead}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Eye className="size-4" />
                Mark as Read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
