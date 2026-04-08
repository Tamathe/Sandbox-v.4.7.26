'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import type { ReadabilityResult } from '../../lib/accessibility/types'

// ── Grade colors ─────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<string, { bg: string; text: string; bar: string }> = {
  A: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  B: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  C: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  D: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  F: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
}

// ── Compact badge (for material lists) ───────────────────────────────────────

export function ReadabilityBadge({ grade, score }: { grade: string; score: number }) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES.C
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}
      title={`Readability: Grade ${grade} (${Math.round(score * 100)}%)`}
    >
      <BookOpen className="size-3" />
      {grade}
    </span>
  )
}

// ── Full meter (for editors / detail views) ──────────────────────────────────

interface ReadabilityMeterProps {
  result: ReadabilityResult | null
  loading?: boolean
  onSimplify?: () => void
  simplifying?: boolean
  compact?: boolean
}

export default function ReadabilityMeter({
  result,
  loading,
  onSimplify,
  simplifying,
  compact,
}: ReadabilityMeterProps) {
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <Loader2 className="size-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Analyzing readability...</span>
      </div>
    )
  }

  if (!result) return null

  const style = GRADE_STYLES[result.overallGrade] ?? GRADE_STYLES.C
  const barWidth = Math.round(result.overallScore * 100)

  if (compact) {
    return (
      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${style.bg}`}>
        <BookOpen className={`size-4 ${style.text}`} />
        <span className={`text-sm font-semibold ${style.text}`}>
          Grade {Math.round(result.fleschKincaid)} ({result.overallGrade})
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
          <div className={`h-full rounded-full ${style.bar} transition-all`} style={{ width: `${barWidth}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border ${style.bg}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <BookOpen className={`size-4 ${style.text}`} />
          <div className="text-left">
            <span className={`text-sm font-semibold ${style.text}`}>
              Readability: Grade {Math.round(result.fleschKincaid)}
            </span>
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${style.text}`}>
              {result.overallGrade}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {result.longSentences.length > 0 && `${result.longSentences.length} long sentences`}
            {result.longSentences.length > 0 && result.jargonTerms.length > 0 && ' · '}
            {result.jargonTerms.length > 0 && `${result.jargonTerms.length} jargon terms`}
          </span>
          {expanded ? (
            <ChevronDown className="size-4 text-gray-400" />
          ) : (
            <ChevronRight className="size-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1.5 rounded-full bg-white/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${style.bar} transition-all duration-300`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Summary */}
      <p className="mx-4 mb-3 text-xs text-gray-600">{result.summary}</p>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-200/50 px-4 py-3 space-y-3">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-xl bg-white/60 p-2 text-center">
              <div className="font-bold text-gray-900">{result.wordCount}</div>
              <div className="text-gray-500">Words</div>
            </div>
            <div className="rounded-xl bg-white/60 p-2 text-center">
              <div className="font-bold text-gray-900">{result.avgSentenceLength}</div>
              <div className="text-gray-500">Words/sentence</div>
            </div>
            <div className="rounded-xl bg-white/60 p-2 text-center">
              <div className="font-bold text-gray-900">{result.fleschReadingEase}</div>
              <div className="text-gray-500">Ease score</div>
            </div>
            <div className="rounded-xl bg-white/60 p-2 text-center">
              <div className="font-bold text-gray-900">{Math.round(result.passiveVoicePercent)}%</div>
              <div className="text-gray-500">Passive voice</div>
            </div>
          </div>

          {/* Jargon terms */}
          {result.jargonTerms.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-700">Jargon detected</h4>
              <div className="flex flex-wrap gap-1.5">
                {result.jargonTerms.slice(0, 8).map((j) => (
                  <span
                    key={j.term}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800"
                    title={`Replace "${j.term}" with "${j.suggestion}"`}
                  >
                    {j.term} → {j.suggestion}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Long sentences */}
          {result.longSentences.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-700">
                Long sentences ({result.longSentences.length})
              </h4>
              <ul className="space-y-1">
                {result.longSentences.slice(0, 3).map((s, i) => (
                  <li key={i} className="rounded-xl bg-white/60 px-3 py-2 text-xs text-gray-600">
                    <span className="font-semibold text-orange-600">{s.wordCount} words:</span>{' '}
                    {s.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Simplify CTA */}
          {onSimplify && (result.overallGrade === 'C' || result.overallGrade === 'D' || result.overallGrade === 'F') && (
            <button
              type="button"
              onClick={onSimplify}
              disabled={simplifying}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
            >
              {simplifying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Simplify with AI
            </button>
          )}
        </div>
      )}
    </div>
  )
}
