'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, X, ChevronDown, ChevronUp, GraduationCap, DollarSign, BookOpen, Briefcase, Heart, CalendarClock, Zap, Mail } from 'lucide-react'
import type { SandyInsight, StakeItem, TimePhase } from '../../lib/student-home-data'
import { INSIGHT_PRIORITY } from '../../lib/student-home-data'

const CATEGORY_ICONS: Record<SandyInsight['category'], typeof GraduationCap> = {
  academic: GraduationCap,
  financial: DollarSign,
  study: BookOpen,
  career: Briefcase,
  wellness: Heart,
  'study-action': Zap,
  'email-action': Mail,
}

const CATEGORY_COLORS: Record<SandyInsight['category'], string> = {
  academic: 'text-[#0033A0]',
  financial: 'text-amber-600',
  study: 'text-emerald-600',
  career: 'text-purple-600',
  wellness: 'text-pink-600',
  'study-action': 'text-orange-600',
  'email-action': 'text-[#0033A0]',
}

const CATEGORY_DOT_COLORS: Record<SandyInsight['category'], string> = {
  academic: 'bg-[#0033A0]',
  financial: 'bg-amber-500',
  study: 'bg-emerald-500',
  career: 'bg-purple-500',
  wellness: 'bg-pink-500',
  'study-action': 'bg-orange-500',
  'email-action': 'bg-[#0033A0]',
}

const URGENCY_DOT: Record<StakeItem['urgency'], string> = {
  overdue: 'bg-red-500',
  today: 'bg-red-400',
  'this-week': 'bg-amber-400',
  'next-week': 'bg-blue-400',
  later: 'bg-gray-300',
}

const URGENCY_LABEL: Record<StakeItem['urgency'], string> = {
  overdue: 'Overdue',
  today: 'Today',
  'this-week': 'This week',
  'next-week': 'Next week',
  later: '',
}

export default function SandyBriefing({ insights, stakes, onFlashcardReview, phase = 'morning' }: { insights: SandyInsight[]; stakes?: StakeItem[]; onFlashcardReview?: () => void; phase?: TimePhase }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [insightsExpanded, setInsightsExpanded] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)

  // Phase-aware insight sorting
  const priority = INSIGHT_PRIORITY[phase]
  const sorted = [...insights].sort((a, b) => {
    const ai = priority.indexOf(a.category)
    const bi = priority.indexOf(b.category)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const visible = sorted.filter(i => !dismissed.has(i.id))

  // Morning: collapse to top 3 unless expanded
  const displayInsights = phase === 'morning' && !insightsExpanded && visible.length > 3
    ? visible.slice(0, 3)
    : visible
  const hasHiddenInsights = phase === 'morning' && !insightsExpanded && visible.length > 3

  const hasStakes = stakes && stakes.length > 0

  if (visible.length === 0 && !hasStakes) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="size-6 rounded-lg bg-[#0033A0] flex items-center justify-center">
          <Sparkles className="size-3.5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Sandy&apos;s Briefing</h3>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* ── Coming Up: Assignment due dates ── */}
        {hasStakes && (
          <div className="border-b border-gray-100">
            <div className="flex items-center gap-2 px-3.5 py-2.5">
              <CalendarClock className="size-3.5 text-[#0033A0] flex-shrink-0" />
              <p className="text-xs font-bold text-[#0033A0] uppercase tracking-wider">Coming Up</p>
            </div>
            <div className="px-3.5 pb-3 space-y-1.5">
              {stakes!.map((stake) => {
                const urgencyLabel = URGENCY_LABEL[stake.urgency]
                return (
                  <div key={stake.id} className="flex items-center gap-2.5 group">
                    <div className={`size-1.5 rounded-full flex-shrink-0 ${URGENCY_DOT[stake.urgency]}`} />
                    <p className="text-sm text-gray-900 flex-1 min-w-0 truncate">
                      <span className="font-semibold">{stake.title}</span>
                      <span className="text-gray-400 mx-1.5">&middot;</span>
                      <span className="text-gray-500">{stake.courseCode}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {urgencyLabel && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          stake.urgency === 'overdue' ? 'bg-red-50 text-red-600' :
                          stake.urgency === 'today' ? 'bg-red-50 text-red-500' :
                          stake.urgency === 'this-week' ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {urgencyLabel}
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-500 tabular-nums w-12 text-right">{stake.dueLabel}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Sandy's insights toggle ── */}
        {visible.length > 0 && (
          <button
            type="button"
            onClick={() => setInsightsOpen(prev => !prev)}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-gray-50/50 transition-colors border-b border-gray-50"
          >
            <Sparkles className="size-3.5 text-[#0033A0] flex-shrink-0" />
            <span className="text-xs font-bold text-[#0033A0] uppercase tracking-wider flex-1 text-left">
              Insights ({visible.length})
            </span>
            {insightsOpen
              ? <ChevronUp className="size-3.5 text-gray-400" />
              : <ChevronDown className="size-3.5 text-gray-400" />
            }
          </button>
        )}

        {/* ── Sandy's insights ── */}
        {insightsOpen && displayInsights.map((insight, idx) => {
          const CategoryIcon = CATEGORY_ICONS[insight.category]
          const isExpanded = expandedId === insight.id
          const isTopInsight = idx === 0

          return (
            <div
              key={insight.id}
              className={`${idx < displayInsights.length - 1 ? 'border-b border-gray-50' : ''} ${isTopInsight ? 'bg-blue-50/40 border-l-2 border-l-[#0033A0]' : ''}`}
            >
              {/* Compact headline row */}
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                onClick={() => setExpandedId(isExpanded ? null : insight.id)}
              >
                <div className={`size-2 rounded-full flex-shrink-0 ${CATEGORY_DOT_COLORS[insight.category]}`} />
                <CategoryIcon className={`size-3.5 flex-shrink-0 ${CATEGORY_COLORS[insight.category]}`} />
                <p className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate leading-tight">
                  {insight.title}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDismissed(prev => new Set([...prev, insight.id]))
                    }}
                    className="size-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200"
                    aria-label="Dismiss"
                  >
                    <X className="size-3 text-gray-400" />
                  </button>
                  {isExpanded
                    ? <ChevronUp className="size-3.5 text-gray-300" />
                    : <ChevronDown className="size-3.5 text-gray-300" />
                  }
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3.5 pb-3 pt-0 ml-[38px]">
                  <p className="text-xs text-gray-500 leading-relaxed">{insight.body}</p>
                  {insight.action && (
                    insight.actionType === 'flashcard-review' && onFlashcardReview ? (
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          type="button"
                          onClick={onFlashcardReview}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:text-blue-700 transition-colors"
                        >
                          {insight.action.label} <ArrowRight className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('sandy-prefill', {
                              detail: { message: 'Review my due flashcards and help me study the ones I\'m weakest on.', autoSend: true }
                            }))
                          }}
                          className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          or review with Sandy
                        </button>
                      </div>
                    ) : insight.actionType === 'sandy-message' ? (
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('sandy-prefill', {
                            detail: { message: insight.action!.href, autoSend: true }
                          }))
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:text-blue-700 mt-1.5 transition-colors"
                      >
                        {insight.action.label} <ArrowRight className="size-3" />
                      </button>
                    ) : (
                      <Link
                        href={insight.action.href}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:text-blue-700 mt-1.5 transition-colors"
                      >
                        {insight.action.label} <ArrowRight className="size-3" />
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Morning collapse: show all toggle */}
        {insightsOpen && hasHiddenInsights && (
          <button
            type="button"
            onClick={() => setInsightsExpanded(true)}
            className="w-full px-3.5 py-2 text-xs font-semibold text-[#0033A0] hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            Show all {visible.length} insights
          </button>
        )}
      </div>
    </div>
  )
}
