'use client'

import { BookOpen } from 'lucide-react'
import type { IllnessScriptComparison as IllnessScriptData } from '../../lib/virtual-clinic/types'

const ALIGNMENT_STYLES = {
  match: 'bg-emerald-50 border-emerald-200',
  partial: 'bg-amber-50 border-amber-200',
  gap: 'bg-red-50 border-red-200',
}

const ALIGNMENT_LABELS = {
  match: { text: 'Match', className: 'bg-emerald-100 text-emerald-700' },
  partial: { text: 'Partial', className: 'bg-amber-100 text-amber-700' },
  gap: { text: 'Gap', className: 'bg-red-100 text-red-700' },
}

export default function IllnessScriptComparison({ data }: { data: IllnessScriptData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Illness Script Comparison</h3>
        <span className="ml-auto text-xs text-gray-500">
          Alignment: {data.overallAlignment}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        How your clinical reasoning compares to the expert model (Bowen, 2006).
      </p>

      <div className="space-y-3">
        {data.rows.map((row) => (
          <div key={row.element} className={`border rounded-xl p-4 ${ALIGNMENT_STYLES[row.alignment]}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">{row.element}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ALIGNMENT_LABELS[row.alignment].className}`}>
                {ALIGNMENT_LABELS[row.alignment].text}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Your Reasoning</div>
                <p className="text-xs text-gray-700">{row.studentModel}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Expert Model</div>
                <p className="text-xs text-gray-700">{row.expertModel}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
