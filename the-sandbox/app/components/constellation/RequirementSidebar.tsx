'use client'

import { useState } from 'react'
import { CheckCircle, Circle, ChevronDown, ChevronUp, ListChecks } from 'lucide-react'
import type { RequirementStatus } from '../../lib/constellation-service'

interface RequirementSidebarProps {
  requirements: RequirementStatus[]
  percentComplete: number | null
}

export default function RequirementSidebar({
  requirements,
  percentComplete,
}: RequirementSidebarProps) {
  const [open, setOpen] = useState(true)

  if (requirements.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-center">
        <ListChecks className="size-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No requirements data available</p>
      </div>
    )
  }

  // Group by category
  const grouped = requirements.reduce<Record<string, RequirementStatus[]>>(
    (acc, req) => {
      const key = req.category
      if (!acc[key]) acc[key] = []
      acc[key].push(req)
      return acc
    },
    {},
  )

  const pct = percentComplete != null ? Math.round(percentComplete) : null

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold text-gray-900">
            Degree Requirements
          </h3>
          {pct != null && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
              {pct}%
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-gray-400" />
        ) : (
          <ChevronDown className="size-4 text-gray-400" />
        )}
      </button>

      {/* Overall progress bar */}
      {pct != null && (
        <div className="px-4 pb-2">
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Categories */}
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {Object.entries(grouped).map(([category, reqs]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {category}
              </p>
              <div className="space-y-2">
                {reqs.map((req) => {
                  const reqPct =
                    req.creditsRequired > 0
                      ? Math.round(
                          (req.creditsCompleted / req.creditsRequired) * 100,
                        )
                      : 0
                  return (
                    <div key={`${category}-${req.name}`} className="flex items-start gap-2">
                      {req.satisfied ? (
                        <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="size-4 text-gray-300 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">
                            {req.name}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {req.creditsCompleted}/{req.creditsRequired}
                          </span>
                        </div>
                        <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-1 rounded-full transition-all ${
                              req.satisfied ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(reqPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
