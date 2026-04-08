'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import type { AuditStep } from '../../lib/registrar/types'

interface AuditStepsAccordionProps {
  steps: AuditStep[]
}

const OUTCOME_CONFIG = {
  PASS: { icon: CheckCircle, color: 'text-green-600' },
  WARN: { icon: AlertTriangle, color: 'text-amber-600' },
  FAIL: { icon: XCircle, color: 'text-red-600' },
  INFO: { icon: Info, color: 'text-blue-500' },
}

export function AuditStepsAccordion({ steps }: AuditStepsAccordionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span>Reasoning Chain ({steps.length} steps)</span>
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {steps.map((step) => {
            const config = OUTCOME_CONFIG[step.outcome]
            const Icon = config.icon
            return (
              <div key={step.step} className="px-4 py-3 flex gap-3">
                <Icon className={`size-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                <div>
                  <p className="text-sm text-gray-800">{step.description}</p>
                  {step.detail && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
