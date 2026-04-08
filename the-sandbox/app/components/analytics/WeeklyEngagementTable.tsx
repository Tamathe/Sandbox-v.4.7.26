'use client'

import { useState } from 'react'
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type WeekPoint = {
  weekLabel: string
  sessions: number
  avgScore: number | null
}

type StudentRow = {
  studentId: string
  studentName: string
  email: string
  weeks: WeekPoint[]
  totalSessions: number
  trend: 'up' | 'down' | 'flat'
}

type Props = {
  courseId: string
  userEmail: string
}

/** Score → background color class */
function scoreColor(avgScore: number | null): string {
  if (avgScore === null) return 'bg-gray-300'
  if (avgScore >= 0.7) return 'bg-green-500'
  if (avgScore >= 0.4) return 'bg-amber-400'
  return 'bg-red-500'
}

/** Session count → diameter in px (clamped 6–18) */
function dotSize(sessions: number, maxSessions: number): number {
  if (maxSessions === 0 || sessions === 0) return 6
  return Math.round(6 + (sessions / maxSessions) * 12)
}

function Sparkline({ weeks }: { weeks: WeekPoint[] }) {
  const max = Math.max(...weeks.map(w => w.sessions), 1)
  return (
    <div className="flex items-center gap-1.5">
      {weeks.map((w, i) => {
        const size = dotSize(w.sessions, max)
        const color = scoreColor(w.avgScore)
        const isEmpty = w.sessions === 0
        return (
          <div
            key={i}
            title={`${w.weekLabel}: ${w.sessions} session${w.sessions !== 1 ? 's' : ''}${w.avgScore !== null ? `, score ${Math.round(w.avgScore * 100)}%` : ''}`}
            style={{ width: size, height: size }}
            className={`rounded-full flex-shrink-0 transition-all ${
              isEmpty ? 'bg-gray-200' : color
            }`}
          />
        )
      })}
    </div>
  )
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp className="size-4 text-green-500" />
  if (trend === 'down') return <TrendingDown className="size-4 text-red-500" />
  return <Minus className="size-4 text-gray-400" />
}

export default function WeeklyEngagementTable({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ students: StudentRow[] }>(
    `/api/analytics/faculty/weekly-engagement?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )
  const [showAll, setShowAll] = useState(false)

  const students = data?.students ?? null

  // Build week header labels from first student (all students share same labels)
  const weekLabels = students?.[0]?.weeks.map(w => w.weekLabel) ?? []

  return (
    <ChartPanel
      title="Weekly Engagement"
      subtitle={students != null ? `${students.length} student${students.length !== 1 ? 's' : ''}` : undefined}
      icon={Activity}
      loading={loading}
      error={error}
      errorMessage="Failed to load engagement data."
      isEmpty={students != null && students.length === 0}
      emptyMessage="No enrolled students found."
    >
      {students && students.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Student
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span className="sr-only">6-week sparkline</span>
                  <span className="flex items-center gap-1.5 justify-center text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                    {weekLabels.map((lbl, i) => (
                      <span key={i} className="w-[18px] text-center leading-none">{lbl.split(' ')[1]}</span>
                    ))}
                  </span>
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="text-center py-2 pl-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(showAll ? students : students.slice(0, 4)).map(s => (
                <tr key={s.studentId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 pr-4 max-w-[140px]">
                    <p className="font-medium text-gray-900 truncate">{s.studentName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{s.email}</p>
                  </td>
                  <td className="py-2.5 px-3">
                    <Sparkline weeks={s.weeks} />
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums font-medium">
                    {s.totalSessions}
                  </td>
                  <td className="py-2.5 pl-3 flex justify-center items-center">
                    <TrendIcon trend={s.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!showAll && students.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              Show all {students.length} students
            </button>
          )}

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 flex-wrap text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-green-500" /> Score ≥ 70%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-amber-400" /> Score 40–69%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-red-500" /> Score &lt; 40%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-gray-300" /> No score
            </span>
            <span className="ml-auto italic">Circle size = session count</span>
          </div>
        </div>
      )}
    </ChartPanel>
  )
}
