'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Columns2, X } from 'lucide-react'
import type { CourseMapComparison } from './types'

export function CourseMapCompareView({
  comparison,
  onClose,
}: {
  comparison: CourseMapComparison
  onClose: () => void
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const statusColor: Record<string, string> = {
    added: 'border-emerald-300 bg-emerald-50',
    removed: 'border-red-300 bg-red-50',
    modified: 'border-amber-300 bg-amber-50',
    unchanged: 'border-gray-200 bg-white',
  }

  const statusLabel: Record<string, string> = {
    added: 'Only in right',
    removed: 'Only in left',
    modified: 'Different',
    unchanged: 'Same',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-gray-900">Side-by-Side Comparison</h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <X className="size-3.5" />
          Close
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
          <p className="text-sm font-bold text-[#0033A0]">{comparison.courseA.courseCode}</p>
          <p className="text-xs text-gray-500 truncate">{comparison.courseA.title}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
          <p className="text-sm font-bold text-[#0033A0]">{comparison.courseB.courseCode}</p>
          <p className="text-xs text-gray-500 truncate">{comparison.courseB.title}</p>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {comparison.weeks.map((cw, i) => {
          const isExpanded = expandedIdx === i

          return (
            <div key={i} className={`rounded-2xl border-2 ${statusColor[cw.status]}`}>
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="size-4 shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-gray-400" />
                )}
                <span className="rounded-full bg-[#0033A0] px-2.5 py-0.5 text-xs font-bold text-white">
                  Week {(cw.weekA ?? cw.weekB)!.weekNumber}
                </span>
                <div className="flex flex-1 items-center gap-2 text-sm">
                  <span className="flex-1 truncate font-medium text-gray-700">
                    {cw.weekA?.title ?? '—'}
                  </span>
                  <Columns2 className="size-3.5 shrink-0 text-gray-300" />
                  <span className="flex-1 truncate font-medium text-gray-700">
                    {cw.weekB?.title ?? '—'}
                  </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  cw.status === 'added' ? 'bg-emerald-100 text-emerald-700'
                  : cw.status === 'removed' ? 'bg-red-100 text-red-700'
                  : cw.status === 'modified' ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                  {statusLabel[cw.status]}
                </span>
              </button>

              {isExpanded && (
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 px-4 py-4">
                  {/* Left column */}
                  <div className="space-y-2">
                    {cw.weekA ? (
                      <>
                        {cw.weekA.topic && <p className="text-xs text-gray-500">{cw.weekA.topic}</p>}
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Objectives ({cw.weekA.objectives.length})</span>
                          <ul className="mt-1 space-y-0.5">{cw.weekA.objectives.map((o, j) => <li key={j} className="text-xs text-gray-600">• {o.title}</li>)}</ul>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Materials ({cw.weekA.materials.length})</span>
                          <ul className="mt-1 space-y-0.5">{cw.weekA.materials.map((m, j) => <li key={j} className="text-xs text-gray-600">• {m.title}</li>)}</ul>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Assignments ({cw.weekA.assignments.length})</span>
                          <ul className="mt-1 space-y-0.5">{cw.weekA.assignments.map((a, j) => <li key={j} className="text-xs text-gray-600">• {a.title}</li>)}</ul>
                        </div>
                      </>
                    ) : (
                      <p className="py-4 text-center text-xs text-gray-400 italic">No week</p>
                    )}
                  </div>
                  {/* Right column */}
                  <div className="space-y-2">
                    {cw.weekB ? (
                      <>
                        {cw.weekB.topic && <p className="text-xs text-gray-500">{cw.weekB.topic}</p>}
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Objectives ({cw.weekB.objectives.length})</span>
                          <ul className="mt-1 space-y-0.5">{cw.weekB.objectives.map((o, j) => <li key={j} className="text-xs text-gray-600">• {o.title}</li>)}</ul>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Materials ({cw.weekB.materials.length})</span>
                          <ul className="mt-1 space-y-0.5">{cw.weekB.materials.map((m, j) => <li key={j} className="text-xs text-gray-600">• {m.title}</li>)}</ul>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Assignments ({cw.weekB.assignments.length})</span>
                          <ul className="mt-1 space-y-0.5">{cw.weekB.assignments.map((a, j) => <li key={j} className="text-xs text-gray-600">• {a.title}</li>)}</ul>
                        </div>
                      </>
                    ) : (
                      <p className="py-4 text-center text-xs text-gray-400 italic">No week</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
