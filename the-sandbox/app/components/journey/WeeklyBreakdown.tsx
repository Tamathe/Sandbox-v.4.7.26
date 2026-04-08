'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, MessageSquare, GraduationCap, Brain } from 'lucide-react'
import type { JourneySnapshot } from '../../generated/prisma'

interface WeeklyBreakdownProps {
  snapshots: JourneySnapshot[]
}

function formatWeek(weekOf: string | Date): string {
  const d = new Date(weekOf)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function WeeklyBreakdown({ snapshots }: WeeklyBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const reversed = [...snapshots].reverse()

  if (reversed.length === 0) {
    return null
  }

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-6">
      <h2 className="text-lg font-extrabold text-gray-900 mb-4">Weekly Breakdown</h2>
      <div className="space-y-1">
        {reversed.map(s => {
          const key = s.id
          const isOpen = expanded === key
          return (
            <div key={key} className="border rounded-lg">
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
                  <span className="text-sm font-medium text-gray-900">Week of {formatWeek(s.weekOf)}</span>
                  <span className="text-xs text-gray-400 capitalize">{s.trajectoryLabel}</span>
                </div>
                <span className="text-xs font-medium text-[#0033A0]">{Math.round(s.engagementScore * 100)}%</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBlock icon={BookOpen} label="Study" value={`${s.studySessions} sessions`} sub={`${s.avgSessionMinutes.toFixed(0)} min avg`} />
                  <StatBlock icon={MessageSquare} label="Social" value={`${s.messagesSent} messages`} sub={`${s.liveRoomsJoined} live rooms`} />
                  <StatBlock icon={GraduationCap} label="Academic" value={`${s.activeCoursesCount} courses`} sub={s.avgGrade !== null ? `${(s.avgGrade * 100).toFixed(0)}% avg` : 'No grades'} />
                  <StatBlock icon={Brain} label="Mastery" value={`${s.conceptsGained} concepts`} sub={`${s.flashcardsReviewed} cards reviewed`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatBlock({ icon: Icon, label, value, sub }: { icon: typeof BookOpen; label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="size-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
