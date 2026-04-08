'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { StakeItem } from '../../lib/student-home-data'

const URGENCY_STYLES: Record<StakeItem['urgency'], { border: string; badge: string; badgeText: string }> = {
  overdue:     { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', badgeText: 'Overdue' },
  today:       { border: 'border-l-red-400', badge: 'bg-red-50 text-red-600', badgeText: 'Due today' },
  'this-week': { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700', badgeText: 'This week' },
  'next-week': { border: 'border-l-blue-300', badge: 'bg-blue-50 text-blue-600', badgeText: 'Next week' },
  later:       { border: 'border-l-gray-200', badge: 'bg-gray-50 text-gray-500', badgeText: '' },
}

function GradeWeightRing({ weight }: { weight: number }) {
  const circumference = 2 * Math.PI * 14
  const filled = (weight / 100) * circumference

  return (
    <div className="relative size-11 flex-shrink-0">
      <svg viewBox="0 0 32 32" className="size-11">
        <circle cx="16" cy="16" r="14" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
        <circle
          cx="16" cy="16" r="14" fill="none" stroke="#0033A0" strokeWidth="2.5"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 16 16)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#0033A0]">
        {weight}%
      </span>
    </div>
  )
}

export default function StakesBoard({ stakes }: { stakes: StakeItem[] }) {
  if (stakes.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What&apos;s at Stake</h3>
        <Link href="/courses" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
          All courses <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {stakes.map((stake) => {
          const style = URGENCY_STYLES[stake.urgency]

          return (
            <Link
              key={stake.id}
              href="/courses"
              className={`flex items-center gap-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm border-l-4 ${style.border} px-4 py-3 hover:shadow-md transition-all`}
            >
              <GradeWeightRing weight={stake.gradeWeight} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-tight">{stake.title}</p>
                <p className="text-xs text-gray-500 mt-1">{stake.courseCode}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{stake.dueLabel}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {stake.daysLeft === 0 ? 'Today' :
                   stake.daysLeft === 1 ? 'Tomorrow' :
                   `${stake.daysLeft} days`}
                </p>
                {style.badgeText && (
                  <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded-full mt-1 ${style.badge}`}>
                    {style.badgeText}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
