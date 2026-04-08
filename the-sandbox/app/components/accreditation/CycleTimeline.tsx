'use client'

import { Calendar, Flag, FileText, Users, CheckCircle } from 'lucide-react'

interface CycleTimelineProps {
  phase: string
  cycleStartDate: string
  cycleEndDate: string
  siteVisitDate: string | null
  selfStudyDue: string | null
}

const phases = [
  { key: 'MAINTENANCE', label: 'Maintenance', icon: Calendar },
  { key: 'PREPARATION', label: 'Preparation', icon: FileText },
  { key: 'SELF_STUDY', label: 'Self-Study', icon: FileText },
  { key: 'SITE_VISIT', label: 'Site Visit', icon: Users },
  { key: 'RESPONSE', label: 'Response', icon: Flag },
  { key: 'COMPLETE', label: 'Complete', icon: CheckCircle },
]

export default function CycleTimeline({ phase, cycleStartDate, cycleEndDate, siteVisitDate, selfStudyDue }: CycleTimelineProps) {
  const currentIdx = phases.findIndex(p => p.key === phase)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {phases.map((p, idx) => {
          const isActive = idx === currentIdx
          const isPast = idx < currentIdx
          const Icon = p.icon

          return (
            <div key={p.key} className="flex flex-col items-center flex-1">
              <div className={`size-8 rounded-full flex items-center justify-center ${
                isActive ? 'bg-[#0033A0] text-white' :
                isPast ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                <Icon className="size-4" />
              </div>
              <span className={`mt-1.5 text-xs ${isActive ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                {p.label}
              </span>
              {idx < phases.length - 1 && (
                <div className="hidden sm:block absolute h-0.5 bg-gray-200 w-full" style={{ top: '16px' }} />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
        <span>Start: {new Date(cycleStartDate).toLocaleDateString()}</span>
        {selfStudyDue && (
          <span>Self-Study Due: {new Date(selfStudyDue).toLocaleDateString()}</span>
        )}
        {siteVisitDate && (
          <span>Site Visit: {new Date(siteVisitDate).toLocaleDateString()}</span>
        )}
        <span>End: {new Date(cycleEndDate).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
