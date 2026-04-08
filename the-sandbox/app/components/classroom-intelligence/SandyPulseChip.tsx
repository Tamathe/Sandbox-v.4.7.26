'use client'

import { Activity } from 'lucide-react'

interface SandyPulseChipProps {
  courseId: string
  courseTitle: string
}

export default function SandyPulseChip({ courseId, courseTitle }: SandyPulseChipProps) {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent('sandy-prefill', {
            detail: {
              message: `How are students doing in ${courseTitle}? Show me the latest classroom intelligence pulse for course ${courseId}.`,
              autoSend: true,
            },
          }),
        )
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#0033A0] text-[#0033A0] text-xs font-semibold hover:bg-[#0033A0]/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
    >
      <Activity className="size-3" />
      How are students doing in {courseTitle}?
    </button>
  )
}
