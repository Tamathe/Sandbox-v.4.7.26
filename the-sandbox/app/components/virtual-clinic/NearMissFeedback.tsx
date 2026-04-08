'use client'

import { Target, CheckCircle2, ArrowUpDown, XCircle, HelpCircle } from 'lucide-react'
import type { NearMissAnalysis } from '../../lib/virtual-clinic/types'

const STATUS_CONFIG = {
  correct: { icon: CheckCircle2, label: 'Correct', className: 'bg-emerald-50 border-emerald-200', iconClass: 'text-emerald-500' },
  'present-but-misranked': { icon: ArrowUpDown, label: 'Misranked', className: 'bg-amber-50 border-amber-200', iconClass: 'text-amber-500' },
  missing: { icon: XCircle, label: 'Missing', className: 'bg-red-50 border-red-200', iconClass: 'text-red-500' },
  extraneous: { icon: HelpCircle, label: 'Extra', className: 'bg-blue-50 border-blue-200', iconClass: 'text-blue-500' },
}

export default function NearMissFeedback({ data }: { data: NearMissAnalysis }) {
  if (data.entries.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Differential Deep Dive</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        How each diagnosis in your differential compares to the expected list.
      </p>

      <div className="space-y-3">
        {data.entries.map((entry, i) => {
          const config = STATUS_CONFIG[entry.status]
          const Icon = config.icon

          return (
            <div key={i} className={`border rounded-xl p-4 ${config.className}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`size-4 ${config.iconClass}`} />
                <span className="text-sm font-semibold text-gray-900">{entry.diagnosis}</span>
                <span className={`ml-auto px-2 py-0.5 text-xs font-semibold rounded-full ${config.className} border`}>
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-gray-700 mb-2">{entry.explanation}</p>
              <div className="flex items-start gap-1.5 bg-white/60 rounded-lg px-3 py-2">
                <span className="text-xs font-semibold text-[#0033A0] shrink-0">Teaching Point:</span>
                <p className="text-xs text-gray-700">{entry.teachingPoint}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
