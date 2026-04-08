'use client'

import { CheckCircle, Clock, Circle, AlertCircle } from 'lucide-react'
import type { RequirementAuditResult } from '../../lib/registrar/types'

interface RequirementBreakdownProps {
  requirements: RequirementAuditResult[]
}

const STATUS_CONFIG = {
  SATISFIED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Satisfied' },
  IN_PROGRESS: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'In Progress' },
  NOT_STARTED: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Not Started' },
  DEFICIENT: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Deficient' },
}

const CATEGORY_ORDER = ['CORE', 'MAJOR', 'GEN_ED', 'ELECTIVE', 'CAPSTONE', 'MINOR', 'TRANSFER_ACCEPTED']

export function RequirementBreakdown({ requirements }: RequirementBreakdownProps) {
  const grouped = CATEGORY_ORDER.reduce<Record<string, RequirementAuditResult[]>>((acc, cat) => {
    const items = requirements.filter((r) => r.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  // Any categories not in ORDER
  requirements.forEach((r) => {
    if (!CATEGORY_ORDER.includes(r.category) && !grouped[r.category]) {
      grouped[r.category] = requirements.filter((req) => req.category === r.category)
    }
  })

  const categoryLabel = (cat: string) =>
    cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, reqs]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {categoryLabel(category)}
          </h4>
          <div className="space-y-2">
            {reqs.map((req) => {
              const config = STATUS_CONFIG[req.status]
              const Icon = config.icon
              return (
                <div key={req.requirementId} className={`p-3 rounded-lg border ${config.bg}`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`size-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{req.requirementName}</p>
                        <span className={`text-xs font-medium flex-shrink-0 ${config.color}`}>
                          {req.creditsCompleted}/{req.creditsRequired} cr
                        </span>
                      </div>
                      {req.creditsInProgress > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          +{req.creditsInProgress} credits in progress
                        </p>
                      )}
                      {req.missingSuggestions.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {req.missingSuggestions.slice(0, 3).map((s) => (
                            <p key={s} className="text-xs text-gray-500">• {s}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
