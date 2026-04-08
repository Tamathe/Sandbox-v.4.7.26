'use client'

import { useState } from 'react'
import { GraduationCap, CheckCircle2, CircleDot, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import type { LearningObjectiveAlignment } from '../../lib/virtual-clinic/types'

const STATUS_CONFIG = {
  met: { icon: CheckCircle2, label: 'Met', className: 'bg-emerald-50 border-emerald-200', iconClass: 'text-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-700' },
  partially_met: { icon: CircleDot, label: 'Partial', className: 'bg-amber-50 border-amber-200', iconClass: 'text-amber-500', badgeClass: 'bg-amber-100 text-amber-700' },
  not_demonstrated: { icon: Circle, label: 'Not Shown', className: 'bg-red-50 border-red-200', iconClass: 'text-red-400', badgeClass: 'bg-red-100 text-red-700' },
}

export default function LearningObjectiveCard({ data }: { data: LearningObjectiveAlignment }) {
  const [expanded, setExpanded] = useState(false)

  if (data.results.length === 0) return null

  const partialCount = data.results.filter((r) => r.status === 'partially_met').length
  const notMetCount = data.results.filter((r) => r.status === 'not_demonstrated').length

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Learning Objectives</h3>
        <span className="ml-auto text-xs text-gray-500">
          {data.metCount}/{data.totalCount} met
        </span>
      </div>

      {/* Summary bar */}
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mt-3 mb-4">
        {data.metCount > 0 && (
          <div className="bg-emerald-500 transition-all" style={{ width: `${(data.metCount / data.totalCount) * 100}%` }} />
        )}
        {partialCount > 0 && (
          <div className="bg-amber-400 transition-all" style={{ width: `${(partialCount / data.totalCount) * 100}%` }} />
        )}
        {notMetCount > 0 && (
          <div className="bg-red-300 transition-all" style={{ width: `${(notMetCount / data.totalCount) * 100}%` }} />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-emerald-500" /> Met ({data.metCount})</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-amber-400" /> Partial ({partialCount})</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-red-300" /> Not shown ({notMetCount})</span>
      </div>

      {/* Expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:text-[#002580] transition-colors"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2.5">
          {data.results.map((result, i) => {
            const config = STATUS_CONFIG[result.status]
            const Icon = config.icon
            return (
              <div key={i} className={`border rounded-xl p-3 ${config.className}`}>
                <div className="flex items-start gap-2">
                  <Icon className={`size-4 shrink-0 mt-0.5 ${config.iconClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-800">{result.objective}</span>
                      <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${config.badgeClass}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{result.evidence}</p>
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
