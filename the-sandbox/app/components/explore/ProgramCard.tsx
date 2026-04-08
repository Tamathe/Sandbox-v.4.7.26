'use client'

import { GraduationCap, ArrowRight } from 'lucide-react'

export interface ProgramCardData {
  id: string
  code: string
  name: string
  college: string
  department: string
  totalCredits: number
  requirementCount: number
}

interface ProgramCardProps {
  program: ProgramCardData
  isCurrent: boolean
  onExplore: (code: string) => void
}

export default function ProgramCard({ program, isCurrent, onExplore }: ProgramCardProps) {
  return (
    <button
      onClick={() => onExplore(program.code)}
      className="bg-white rounded-2xl border-2 border-gray-200 hover:shadow-md
                 hover:-translate-y-0.5 transition-all p-5 cursor-pointer group
                 text-left w-full"
    >
      <div className="flex items-start justify-between">
        <div className="size-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
          <GraduationCap className="size-5 text-[#0033A0]" />
        </div>
        {isCurrent && (
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700
                         border border-emerald-200 rounded-full px-2.5 py-0.5">
            Your Program
          </span>
        )}
      </div>
      <h3 className="text-base font-extrabold text-gray-900 mt-3
                     group-hover:text-[#0033A0] transition-colors">
        {program.name}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        {program.college} &middot; {program.department}
      </p>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        <span>{program.totalCredits} credits</span>
        <span>{program.requirementCount} requirement areas</span>
      </div>
      <span className="mt-3 text-sm font-semibold text-[#0033A0] flex items-center gap-1
                       opacity-0 group-hover:opacity-100 transition-opacity">
        Explore <ArrowRight className="size-4" />
      </span>
    </button>
  )
}
