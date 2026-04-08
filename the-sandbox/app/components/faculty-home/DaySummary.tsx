'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, BarChart3, ChevronDown, ChevronUp, Moon } from 'lucide-react'
import type { DaySummary as DaySummaryData } from '../../lib/faculty/day-lifecycle-service'

const DISMISS_KEY = 'uky-day-summary-dismissed'

function getDismissDate(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DISMISS_KEY)
}

export default function DaySummary({
  data,
  onPrepWithSandy,
}: {
  data: DaySummaryData
  onPrepWithSandy: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Reset daily — only dismiss for today
  useEffect(() => {
    const dismissDate = getDismissDate()
    const today = new Date().toDateString()
    if (dismissDate === today) setDismissed(true)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toDateString())
    setDismissed(true)
  }

  if (dismissed) return null
  if (data.completed.length === 0 && data.carryOver.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-extrabold text-gray-900">Today&apos;s Wrap-Up</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            Hide
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 py-4 space-y-4">
          {/* Completed + Carry Over columns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Completed */}
            {data.completed.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-green-500" />
                  <span className="text-xs font-bold uppercase tracking-wide text-green-700">Completed</span>
                </div>
                <div className="space-y-1.5">
                  {data.completed.map((item, i) => (
                    <div key={i} className="text-sm text-gray-700">{item.action}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Carry Over */}
            {data.carryOver.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Carrying Over</span>
                </div>
                <div className="space-y-1.5">
                  {data.carryOver.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          item.urgency === 'red' ? 'bg-red-500' : item.urgency === 'amber' ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                      />
                      {item.item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Teaching Impact */}
          {(data.teachingImpact.studentsActive > 0 || data.teachingImpact.toolSessions > 0) && (
            <div className="border-t border-gray-100 pt-3">
              <div className="mb-2 flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-[#0033A0]" />
                <span className="text-xs font-bold uppercase tracking-wide text-[#0033A0]">Teaching Impact Today</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {data.teachingImpact.studentsActive > 0 && (
                  <div>{data.teachingImpact.studentsActive} students accessed your course materials</div>
                )}
                {data.teachingImpact.toolSessions > 0 && (
                  <div>{data.teachingImpact.toolSessions} tool session{data.teachingImpact.toolSessions > 1 ? 's' : ''} across your courses</div>
                )}
                {data.teachingImpact.riskChanges.map((change, i) => (
                  <div key={i} className={change.direction === 'improved' ? 'text-green-700' : 'text-red-700'}>
                    {change.studentName} moved {change.direction === 'improved' ? 'from "at-risk" to "on track"' : 'to "at-risk"'} ({change.course})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sandy CTA */}
          <button
            type="button"
            onClick={onPrepWithSandy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0]/5 px-4 py-2.5 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-[#0033A0]/10"
          >
            <Moon className="size-4" />
            Prep for tomorrow with Sandy
          </button>
        </div>
      )}
    </div>
  )
}
