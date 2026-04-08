'use client'

import { Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import type { StudyAllocation } from '../../lib/student-home-data'

const PRIORITY_STYLES: Record<StudyAllocation['priority'], { bar: string; badge: string; badgeBg: string }> = {
  critical: { bar: 'bg-red-500', badge: 'text-red-700', badgeBg: 'bg-red-50' },
  high:     { bar: 'bg-amber-500', badge: 'text-amber-700', badgeBg: 'bg-amber-50' },
  medium:   { bar: 'bg-blue-400', badge: 'text-blue-700', badgeBg: 'bg-blue-50' },
  low:      { bar: 'bg-gray-300', badge: 'text-gray-600', badgeBg: 'bg-gray-50' },
}

export default function StudyAllocator({ plan }: { plan: StudyAllocation[] }) {
  if (plan.length === 0) return null

  const totalHours = plan.reduce((sum, p) => sum + p.hoursRecommended, 0)
  const maxHours = Math.max(...plan.map(p => p.hoursRecommended))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[#0033A0]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">This Week&apos;s Study Plan</h3>
        </div>
        <span className="text-xs font-bold text-[#0033A0]">{totalHours}h total</span>
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {plan.map((item) => {
            const style = PRIORITY_STYLES[item.priority]
            const barWidth = (item.hoursRecommended / maxHours) * 100

            return (
              <div key={item.courseCode} className="px-4 py-3 flex items-center gap-3">
                {/* Course info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">{item.courseCode}</span>
                    {item.priority === 'critical' && (
                      <AlertTriangle className="size-3 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.reason}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.nextDeadline}</p>
                </div>

                {/* Hours bar + number */}
                <div className="w-32 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.badgeBg} ${style.badge}`}>
                      {item.priority}
                    </span>
                    <span className="text-sm font-extrabold text-gray-900">{item.hoursRecommended}h</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${style.bar} transition-all`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">
            Based on deadline proximity, grade weight, and your current standing
          </p>
          <button
            type="button"
            className="text-xs font-semibold text-[#0033A0] hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Ask Sandy to adjust <ArrowRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
