'use client'

import { CheckCircle, ShieldAlert, AlertTriangle } from 'lucide-react'
import type { ValidationReport } from './types'

export default function ValidationBanner({ validation }: { validation: ValidationReport }) {
  if (validation.status === 'PASS' && validation.warnings.length === 0) {
    return (
      <div role="status" className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-800">
        <CheckCircle className="size-4 shrink-0" aria-hidden="true" />
        All validation checks passed.
      </div>
    )
  }

  const isBLOCK = validation.status === 'BLOCK'
  const bg = isBLOCK ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
  const text = isBLOCK ? 'text-red-800' : 'text-amber-800'
  const Icon = isBLOCK ? ShieldAlert : AlertTriangle
  const items = [...validation.errors, ...validation.warnings]

  return (
    <div className={`${bg} border rounded-xl px-4 py-3 ${text} text-sm`}>
      <div className="flex items-center gap-2 font-semibold mb-1">
        <Icon className="size-4 shrink-0" />
        {isBLOCK ? 'Validation blocked — issues must be resolved' : 'Validation passed with warnings'}
      </div>
      <ul className="list-disc list-inside space-y-0.5 ml-1">
        {items.map((item, i) => (
          <li key={i}>
            <span className="font-medium">{item.rule}</span>: {item.message}
            {item.nodeLabel && <span className="text-xs ml-1">({item.nodeLabel})</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
