'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import { BarChart3, X } from 'lucide-react'

const AnalyticsSummaryChart = dynamic(
  () => import('./AnalyticsSummaryChart').then(m => m.AnalyticsSummaryChart),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-xl bg-gray-100" /> }
)
import type { CourseMapWeek, CourseMapRubricResult } from './types'
import { BLOOM_LEVELS, BLOOM_LABELS, BLOOM_COLORS, MATERIAL_TYPE_LABELS, ASSIGNMENT_TYPE_LABELS } from './types'

interface AnalyticsSummaryProps {
  weeks: CourseMapWeek[]
  assignmentRubrics: Map<string, CourseMapRubricResult>
  onClose: () => void
}

export const AnalyticsSummary = memo(function AnalyticsSummary({ weeks, assignmentRubrics, onClose }: AnalyticsSummaryProps) {
  const totalObjectives = weeks.reduce((s, w) => s + w.objectives.length, 0)
  const totalAssignments = weeks.reduce((s, w) => s + w.assignments.length, 0)
  const totalMaterials = weeks.reduce((s, w) => s + w.materials.length, 0)
  const totalPoints = weeks.reduce((s, w) => s + w.assignments.reduce((as, a) => as + (a.pointsPossible ?? 0), 0), 0)

  // Bloom distribution
  const bloomCounts: Record<string, number> = {}
  let taggedCount = 0
  for (const w of weeks) {
    for (const o of w.objectives) {
      if (o.bloomLevel) {
        taggedCount++
        bloomCounts[o.bloomLevel] = (bloomCounts[o.bloomLevel] ?? 0) + 1
      }
    }
  }

  // Assignment type breakdown
  const typeCounts: Record<string, number> = {}
  for (const w of weeks) {
    for (const a of w.assignments) {
      const label = ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type
      typeCounts[label] = (typeCounts[label] ?? 0) + 1
    }
  }

  // Material type breakdown
  const matCounts: Record<string, number> = {}
  for (const w of weeks) {
    for (const m of w.materials) {
      const label = MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType
      matCounts[label] = (matCounts[label] ?? 0) + 1
    }
  }

  // Points per week for bar chart
  const pointsPerWeek = weeks.map((w) => ({
    name: `W${w.weekNumber}`,
    points: w.assignments.reduce((s, a) => s + (a.pointsPossible ?? 0), 0),
    assignments: w.assignments.length,
    objectives: w.objectives.length,
  }))

  // Coverage metrics
  const weeksWithDates = weeks.filter((w) => w.startDate).length
  const weeksWithAssignments = weeks.filter((w) => w.assignments.length > 0).length
  const rubricCount = assignmentRubrics.size

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <BarChart3 className="size-4 text-[#0033A0]" />
          Course Map Analytics
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 hover:bg-gray-100"
        >
          <X className="size-4 text-gray-400" />
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: 'Weeks', value: weeks.length, color: 'text-[#0033A0]' },
          { label: 'Objectives', value: totalObjectives, color: 'text-emerald-600' },
          { label: 'Assignments', value: totalAssignments, color: 'text-amber-600' },
          { label: 'Materials', value: totalMaterials, color: 'text-purple-600' },
          { label: 'Total Points', value: totalPoints, color: 'text-blue-600' },
          { label: 'Rubrics', value: rubricCount, color: 'text-emerald-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-center">
            <p className={`text-lg font-extrabold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Points distribution bar chart */}
        {totalPoints > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Points by Week</p>
            <div className="h-32">
              <AnalyticsSummaryChart data={pointsPerWeek} />
            </div>
          </div>
        )}

        {/* Bloom distribution */}
        {taggedCount > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              Bloom&apos;s Distribution ({taggedCount}/{totalObjectives})
            </p>
            <div className="space-y-1.5">
              {BLOOM_LEVELS.map((bl) => {
                const c = bloomCounts[bl] ?? 0
                if (c === 0) return null
                const pct = Math.round((c / taggedCount) * 100)
                return (
                  <div key={bl} className="flex items-center gap-2">
                    <span className={`w-20 text-right text-xs font-medium ${BLOOM_COLORS[bl].split(' ')[1]}`}>
                      {BLOOM_LABELS[bl]}
                    </span>
                    <div className="flex-1 rounded-full bg-gray-200 h-2">
                      <div
                        className={`h-2 rounded-full ${BLOOM_COLORS[bl].split(' ')[0]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-gray-500">{c}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Assignment type breakdown */}
        {totalAssignments > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Assignment Types</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <span key={type} className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Material type breakdown */}
        {totalMaterials > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Material Types</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(matCounts).map(([type, count]) => (
                <span key={type} className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Coverage metrics */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span>{weeksWithDates}/{weeks.length} weeks have dates</span>
        <span className="text-gray-300">|</span>
        <span>{weeksWithAssignments}/{weeks.length} weeks have assignments</span>
        <span className="text-gray-300">|</span>
        <span>Avg {totalAssignments > 0 ? Math.round(totalPoints / totalAssignments) : 0} pts/assignment</span>
        <span className="text-gray-300">|</span>
        <span>Avg {(totalObjectives / (weeks.length || 1)).toFixed(1)} objectives/week</span>
      </div>
    </div>
  )
})
