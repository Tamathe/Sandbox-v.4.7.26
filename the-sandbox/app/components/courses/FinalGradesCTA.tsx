'use client'

import { ClipboardCheck } from 'lucide-react'

interface FinalGradesCTAProps {
  onSwitchTab: (tab: string) => void
}

export default function FinalGradesCTA({ onSwitchTab }: FinalGradesCTAProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="size-6 text-blue-600 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-blue-900">Final Grades</h3>
          <p className="text-xs text-blue-700">Review and finalize grades for this course</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSwitchTab('analytics')}
        className="rounded-lg bg-[#0033A0] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#002878]"
      >
        Open Gradebook
      </button>
    </div>
  )
}
