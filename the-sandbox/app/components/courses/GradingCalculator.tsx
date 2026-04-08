'use client'

import { useState, useMemo, useEffect } from 'react'
import { Calculator, ChevronDown, ChevronRight, Target } from 'lucide-react'

interface GradingWeight {
  id: string
  courseId: string
  category: string
  weight: number
  description: string | null
  source: string
  createdAt: string
}

interface GradeSummaryCategory {
  weightCategory: string
  avgScore: number | null
  assignmentCount: number
}

interface GradingCalculatorProps {
  gradingWeights: GradingWeight[]
  courseId?: string
  userEmail?: string
}

const GRADE_THRESHOLDS = [
  { label: 'A', min: 90 },
  { label: 'B', min: 80 },
  { label: 'C', min: 70 },
  { label: 'D', min: 60 },
] as const

function gradeColor(pct: number) {
  if (pct >= 90) return 'text-green-700 bg-green-50 border-green-200'
  if (pct >= 80) return 'text-blue-700 bg-blue-50 border-blue-200'
  if (pct >= 70) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default function GradingCalculator({ gradingWeights, courseId, userEmail }: GradingCalculatorProps) {
  const [open, setOpen] = useState(false)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [targetGrade, setTargetGrade] = useState<string>('')
  const [autoFilled, setAutoFilled] = useState<Record<string, number>>({})

  // Task 24: Fetch real grades when courseId + userEmail are provided
  useEffect(() => {
    if (!courseId || !userEmail) return

    fetch(`/api/courses/${courseId}/grade-summary`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { categories: GradeSummaryCategory[] } | null) => {
        if (!data?.categories) return
        const newScores: Record<string, string> = {}
        const newAutoFilled: Record<string, number> = {}

        for (const cat of data.categories) {
          if (cat.avgScore == null) continue
          // Match to grading weight by category name
          const match = gradingWeights.find(
            (w) => w.category.toLowerCase() === cat.weightCategory.toLowerCase(),
          )
          if (match) {
            newScores[match.id] = String(cat.avgScore)
            newAutoFilled[match.id] = cat.avgScore
          }
        }

        setScores((prev) => {
          // Only fill scores that haven't been manually set
          const merged = { ...prev }
          for (const [key, val] of Object.entries(newScores)) {
            if (!merged[key] || merged[key] === '') {
              merged[key] = val
            }
          }
          return merged
        })
        setAutoFilled(newAutoFilled)
      })
      .catch(() => {})
  }, [courseId, userEmail, gradingWeights])

  const computation = useMemo(() => {
    const filled: { weight: number; score: number }[] = []
    const unfilled: { weight: number }[] = []

    for (const w of gradingWeights) {
      const raw = scores[w.id]
      const score = raw !== undefined && raw !== '' ? Number(raw) : null
      if (score !== null && !Number.isNaN(score)) {
        filled.push({ weight: w.weight, score: Math.max(0, Math.min(100, score)) })
      } else {
        unfilled.push({ weight: w.weight })
      }
    }

    const filledSum = filled.reduce((s, f) => s + (f.score / 100) * f.weight, 0)
    const unfilledWeightSum = unfilled.reduce((s, u) => s + u.weight, 0)

    const allFilled = unfilled.length === 0

    const projectedMin = filledSum * 100 // remaining at 0
    const projectedMax = (filledSum + unfilledWeightSum) * 100 // remaining at 100

    const projected = allFilled ? filledSum * 100 : null

    return { filled, unfilled, filledSum, unfilledWeightSum, projectedMin, projectedMax, projected, allFilled }
  }, [gradingWeights, scores])

  const neededMessage = useMemo(() => {
    if (!targetGrade || computation.unfilledWeightSum === 0) return null
    const threshold = GRADE_THRESHOLDS.find(g => g.label === targetGrade)
    if (!threshold) return null

    const needed = (threshold.min / 100 - computation.filledSum) / computation.unfilledWeightSum
    const neededPct = Math.round(needed * 100)

    if (neededPct <= 0) return `You've already secured a${targetGrade === 'A' ? 'n' : ''} ${targetGrade}!`
    if (neededPct > 100) return `A${targetGrade === 'A' ? 'n' : ''} ${targetGrade} is not possible with the current scores.`
    return `You need an average of ${neededPct}% on remaining categories to earn a${targetGrade === 'A' ? 'n' : ''} ${targetGrade}.`
  }, [targetGrade, computation])

  return (
    <div className="border-2 rounded-2xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Calculator className="size-4 text-[#0033A0]" />
        <span>Grade Calculator</span>
        {open ? <ChevronDown className="size-4 ml-auto text-gray-400" /> : <ChevronRight className="size-4 ml-auto text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-4">
          {/* Score inputs */}
          <div className="space-y-2">
            {gradingWeights.map((w) => {
              const raw = scores[w.id] ?? ''
              const score = raw !== '' ? Number(raw) : null
              const weighted = score !== null && !Number.isNaN(score)
                ? Math.round((Math.max(0, Math.min(100, score)) / 100) * w.weight * 100 * 10) / 10
                : null
              const isAutoFilled = autoFilled[w.id] != null
              const isOverridden = isAutoFilled && raw !== '' && Number(raw) !== autoFilled[w.id]
              return (
                <div key={w.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 min-w-[120px] truncate">{w.category}</span>
                  <span className="text-xs text-gray-400 w-12 text-right">{Math.round(w.weight * 100)}%</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="Score"
                    value={raw}
                    onChange={(e) => setScores(prev => ({ ...prev, [w.id]: e.target.value }))}
                    className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                  />
                  {weighted !== null && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                      +{weighted}pts
                    </span>
                  )}
                  {isAutoFilled && !isOverridden && (
                    <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                      From gradebook
                    </span>
                  )}
                  {isOverridden && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                      Manual override
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Projected grade */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Projected Final Grade</p>
            {computation.allFilled ? (
              <span className={`inline-flex items-center text-lg font-bold px-3 py-1 rounded-xl border ${gradeColor(computation.projected!)}`}>
                {Math.round(computation.projected!)}%
              </span>
            ) : computation.filled.length > 0 ? (
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-bold px-2 py-0.5 rounded-lg border ${gradeColor(computation.projectedMin)}`}>
                  {Math.round(computation.projectedMin)}%
                </span>
                <span className="text-gray-400">to</span>
                <span className={`font-bold px-2 py-0.5 rounded-lg border ${gradeColor(computation.projectedMax)}`}>
                  {Math.round(computation.projectedMax)}%
                </span>
                <span className="text-xs text-gray-400">(range if remaining categories are 0–100)</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Enter scores above to see your projected grade.</p>
            )}
          </div>

          {/* What do I need? */}
          {computation.unfilled.length > 0 && computation.filled.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="size-4 text-[#0033A0]" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What do I need?</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
                >
                  <option value="">Select target grade</option>
                  {GRADE_THRESHOLDS.map(g => (
                    <option key={g.label} value={g.label}>{g.label} ({g.min}%+)</option>
                  ))}
                </select>
                {neededMessage && (
                  <p className="text-sm text-gray-700">{neededMessage}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
