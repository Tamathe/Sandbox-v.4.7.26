'use client'

import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'

type ConfidenceWarningProps = {
  score: number
}

export default function ConfidenceWarning({ score }: ConfidenceWarningProps) {
  const config =
    score >= 90
      ? {
          icon: ShieldCheck,
          className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
          message: 'High confidence match - review recommended before approving',
        }
      : score >= 70
        ? {
            icon: ShieldAlert,
            className: 'border-amber-200 bg-amber-50 text-amber-900',
            message: 'Moderate match - subject matter expert review required',
          }
        : {
            icon: AlertTriangle,
            className: 'border-red-200 bg-red-50 text-red-900',
            message: 'Low confidence - likely not equivalent',
          }

  const Icon = config.icon

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${config.className}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>{config.message}</p>
      </div>
    </div>
  )
}
