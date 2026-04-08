'use client'

import { useState } from 'react'
import { AlertTriangle, TrendingUp, Bot, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { CrisisIntelligenceBrief } from '../../../lib/crisis-comms/reputation-pulse/types'

const THREAT_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MODERATE: 'bg-amber-100 text-amber-800 border-amber-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
}

const POSTURE_COLORS: Record<string, string> = {
  engage: 'bg-blue-100 text-blue-800',
  monitor: 'bg-amber-100 text-amber-800',
  ignore: 'bg-gray-100 text-gray-800',
  escalate: 'bg-red-100 text-red-800',
}

function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) return null

  const radius = size / 2 - 8
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.filter(s => s.value > 0).map((seg, i) => {
          const pct = seg.value / total
          const dashLength = pct * circumference
          const currentOffset = offset
          offset += dashLength
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-currentOffset}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{total}</span>
      </div>
    </div>
  )
}

function Legend({ items }: { items: { label: string; count: number; pct: number; color: string }[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <div className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-gray-700">{item.label}</span>
          <span className="ml-auto font-medium text-gray-900">{item.count}</span>
          <span className="text-gray-400 text-xs">({item.pct}%)</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  brief: CrisisIntelligenceBrief
}

export default function CrisisBriefPanel({ brief }: Props) {
  const [expandedThemes, setExpandedThemes] = useState(true)
  const [expandedActions, setExpandedActions] = useState(true)

  const sentimentSegments = [
    { label: 'Positive', value: brief.sentimentDistribution.positive.count, color: '#22c55e' },
    { label: 'Neutral', value: brief.sentimentDistribution.neutral.count, color: '#94a3b8' },
    { label: 'Negative', value: brief.sentimentDistribution.negative.count, color: '#ef4444' },
  ]

  const negativeTotal = brief.aiAuthorshipBreakdown.likelyHuman.count
    + brief.aiAuthorshipBreakdown.inconclusive.count
    + brief.aiAuthorshipBreakdown.likelyAI.count

  const aiSegments = [
    { label: 'Likely Human', value: brief.aiAuthorshipBreakdown.likelyHuman.count, color: '#22c55e' },
    { label: 'Inconclusive', value: brief.aiAuthorshipBreakdown.inconclusive.count, color: '#f59e0b' },
    { label: 'Likely AI', value: brief.aiAuthorshipBreakdown.likelyAI.count, color: '#ef4444' },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* Threat level banner */}
      <div className={`rounded-2xl border-2 p-5 ${THREAT_COLORS[brief.threatLevel]}`}>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="size-5" />
          <span className="text-lg font-extrabold">{brief.threatLevel} Threat Level</span>
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${POSTURE_COLORS[brief.responsePosture]}`}>
            {brief.responsePosture.toUpperCase()}
          </span>
        </div>
        <p className="text-sm">{brief.threatRationale}</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">{brief.postCount}</p>
          <p className="text-xs text-gray-500">Posts Analyzed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">{brief.timelineWindow}</p>
          <p className="text-xs text-gray-500">Timeline</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900 capitalize">{brief.confidence}</p>
          <p className="text-xs text-gray-500">Confidence</p>
        </div>
      </div>

      {/* Sentiment + AI breakdown side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="size-4 text-[#0033A0]" />
            <h3 className="font-bold text-gray-900">Sentiment</h3>
          </div>
          <div className="flex items-center gap-4">
            <DonutChart segments={sentimentSegments} size={100} />
            <Legend items={sentimentSegments.map((s) => ({
              label: s.label,
              count: s.value,
              pct: brief.postCount > 0 ? Math.round((s.value / brief.postCount) * 100) : 0,
              color: s.color,
            }))} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="size-4 text-[#0033A0]" />
            <h3 className="font-bold text-gray-900">AI Authorship</h3>
            <span className="text-xs text-gray-400">(negative posts only)</span>
          </div>
          <div className="flex items-center gap-4">
            <DonutChart segments={aiSegments} size={100} />
            <Legend items={aiSegments.map((s) => ({
              label: s.label,
              count: s.value,
              pct: negativeTotal > 0 ? Math.round((s.value / negativeTotal) * 100) : 0,
              color: s.color,
            }))} />
          </div>
          <p className="mt-3 text-xs text-gray-400 italic">
            AI detection is probabilistic, not definitive. Scores reflect linguistic pattern analysis on negative posts only.
          </p>
        </div>
      </div>

      {/* Theme Clusters */}
      {brief.themes && brief.themes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <button
            type="button"
            onClick={() => setExpandedThemes(!expandedThemes)}
            className="flex items-center gap-2 w-full text-left"
          >
            <MessageCircle className="size-4 text-[#0033A0]" />
            <h3 className="font-bold text-gray-900">Theme Clusters</h3>
            <span className="text-xs text-gray-400 ml-1">{brief.themes.length} themes</span>
            {expandedThemes ? <ChevronUp className="size-4 text-gray-400 ml-auto" /> : <ChevronDown className="size-4 text-gray-400 ml-auto" />}
          </button>
          {expandedThemes && (
            <div className="mt-3 space-y-2">
              {brief.themes.map((theme) => (
                <div key={theme.themeId} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{theme.label}</span>
                    <span className="text-xs text-gray-500">{theme.postIds.length} posts</span>
                    <div className="ml-auto flex items-center gap-1.5 text-xs">
                      {theme.sentimentBreakdown.positive > 0 && (
                        <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">+{theme.sentimentBreakdown.positive}</span>
                      )}
                      {theme.sentimentBreakdown.negative > 0 && (
                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded">-{theme.sentimentBreakdown.negative}</span>
                      )}
                      {theme.sentimentBreakdown.neutral > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{theme.sentimentBreakdown.neutral}</span>
                      )}
                    </div>
                  </div>
                  {theme.sampleQuotes.map((q, i) => (
                    <p key={i} className="text-xs text-gray-500 italic">&ldquo;{q}&rdquo;</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggested Actions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <button
          type="button"
          onClick={() => setExpandedActions(!expandedActions)}
          className="flex items-center gap-2 w-full text-left"
        >
          <TrendingUp className="size-4 text-[#0033A0]" />
          <h3 className="font-bold text-gray-900">Recommended Actions</h3>
          {expandedActions ? <ChevronUp className="size-4 text-gray-400 ml-auto" /> : <ChevronDown className="size-4 text-gray-400 ml-auto" />}
        </button>
        {expandedActions && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${POSTURE_COLORS[brief.responsePosture]}`}>
                {brief.responsePosture.charAt(0).toUpperCase() + brief.responsePosture.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-700">{brief.responseRationale}</p>
            <ul className="space-y-1.5">
              {brief.suggestedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-[#0033A0] font-bold mt-0.5">&bull;</span>
                  {action}
                </li>
              ))}
            </ul>
            {brief.evidenceGaps.length > 0 && (
              <div className="mt-3 bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">Evidence Gaps</p>
                <ul className="space-y-1">
                  {brief.evidenceGaps.map((gap, i) => (
                    <li key={i} className="text-xs text-amber-700">&bull; {gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <p className="text-xs text-gray-400 text-center px-4">
        This analysis is a decision-support tool for communications professionals. It is not forensic evidence and should not be used as the sole basis for public accusations of bot activity or manipulation.
      </p>
    </div>
  )
}
