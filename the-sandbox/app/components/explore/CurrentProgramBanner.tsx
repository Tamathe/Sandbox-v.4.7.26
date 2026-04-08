'use client'

import { GraduationCap } from 'lucide-react'

interface CurrentProgramBannerProps {
  programName: string | null
  college: string | null
  percentComplete?: number
}

export default function CurrentProgramBanner({
  programName,
  college,
  percentComplete,
}: CurrentProgramBannerProps) {
  if (!programName) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
        <GraduationCap className="size-5 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800">No major declared yet</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Explore programs below to find the right fit for you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0033A0]/5 border border-[#0033A0]/10 rounded-xl px-5 py-4
                    flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
          <GraduationCap className="size-5 text-[#0033A0]" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Your Current Program</p>
          <p className="text-sm text-gray-600">
            {programName}
            {college && <span className="text-gray-400"> &middot; {college}</span>}
          </p>
        </div>
      </div>
      {percentComplete !== undefined && (
        <div className="text-right hidden sm:block">
          <p className="text-2xl font-extrabold text-[#0033A0]">{percentComplete}%</p>
          <p className="text-xs text-gray-400">complete</p>
        </div>
      )}
    </div>
  )
}
