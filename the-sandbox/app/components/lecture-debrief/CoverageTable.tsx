'use client'

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

interface ObjectiveCoverage {
  objectiveId: string
  objectiveTitle: string
  bloomLevel: string
  coverageDepth: 'introduced' | 'practiced' | 'reinforced' | 'not_covered'
}

interface ObjectiveGap {
  objectiveId: string
  objectiveTitle: string
  suggestion: string
}

const DEPTH_STYLES = {
  reinforced: { label: 'Reinforced', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  practiced: { label: 'Practiced', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
  introduced: { label: 'Introduced', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  not_covered: { label: 'Not Covered', icon: XCircle, color: 'text-gray-400 bg-gray-50' },
}

export default function CoverageTable({
  covered,
  gaps,
}: {
  covered: ObjectiveCoverage[]
  gaps: ObjectiveGap[]
}) {
  if (covered.length === 0 && gaps.length === 0) {
    return <p className="text-sm text-gray-500">No syllabus mapping data available.</p>
  }

  return (
    <div className="space-y-4">
      {covered.length > 0 && (
        <div className="rounded-2xl border-2 border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-bold text-gray-700">Objective</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700 w-24">Bloom</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700 w-36">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {covered.map((oc) => {
                const style = DEPTH_STYLES[oc.coverageDepth] || DEPTH_STYLES.not_covered
                const Icon = style.icon
                return (
                  <tr key={oc.objectiveId} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-gray-800">{oc.objectiveTitle}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#0033A0] font-medium">
                        {oc.bloomLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${style.color}`}>
                        <Icon className="size-3.5" />
                        {style.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {gaps.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-2">Uncovered Objectives</h4>
          <div className="space-y-2">
            {gaps.map((gap) => (
              <div
                key={gap.objectiveId}
                className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm"
              >
                <p className="font-semibold text-amber-800">{gap.objectiveTitle}</p>
                <p className="text-amber-700 mt-1">{gap.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
