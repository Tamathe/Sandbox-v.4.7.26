'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowRight,
  Clock3,
  MessageCircle,
  Shield,
  TrendingDown,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'
import { prefetchBriefing } from '../../lib/faculty/student-briefing-cache'
import { useAuth } from '../../lib/auth-context'
import StudentBriefingCard from './StudentBriefingCard'

interface OfficeHoursCardProps {
  officeHours: FacultyHomepageV2Data['officeHours']
  flaggedStudents: FacultyHomepageV2Data['flaggedStudents']
  onSendNudge?: (student: { name: string; flag: string; course: string; detail: string }) => void
}

const flagConfig = {
  grade_drop: {
    icon: TrendingDown,
    iconClass: 'text-red-600',
    label: 'Grade drop',
  },
  inactive: {
    icon: Clock3,
    iconClass: 'text-amber-600',
    label: 'Inactive',
  },
  accommodation: {
    icon: Shield,
    iconClass: 'text-blue-600',
    label: 'Accommodation',
  },
  attendance: {
    icon: UserX,
    iconClass: 'text-orange-600',
    label: 'Attendance',
  },
} satisfies Record<
  FacultyHomepageV2Data['flaggedStudents'][number]['flag'],
  {
    icon: typeof TrendingDown
    iconClass: string
    label: string
  }
>

function formatTodaySlot(todaySlot: FacultyHomepageV2Data['officeHours']['todaySlot']) {
  if (!todaySlot) return 'No office hours scheduled'

  const start = format(new Date(todaySlot.start), 'h:mm a')
  const end = format(new Date(todaySlot.end), 'h:mm a')
  return `${start}-${end}`
}

export default function OfficeHoursCard({ officeHours, flaggedStudents, onSendNudge }: OfficeHoursCardProps) {
  const { currentUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const timeLabel = formatTodaySlot(officeHours.todaySlot)
  const flaggedForOH = officeHours.flaggedForOfficeHours ?? []

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0]">
            <Clock3 className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Office Hours Today</h3>
            <p className="text-sm text-gray-500">{timeLabel}</p>
          </div>
        </div>
      </div>

      {/* Queue section — real-time, student-initiated */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <UserCheck className="size-4 text-[#0033A0]" />
          <p className="text-sm font-semibold text-gray-900">
            Queue: <span className="text-[#0033A0]">{officeHours.queueCount}</span> student{officeHours.queueCount === 1 ? '' : 's'} checked in
          </p>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Top topic:{' '}
          <span className="font-medium text-gray-900">
            {officeHours.topTheme ?? 'Questions are still clustering'}
          </span>
        </p>
      </div>

      {/* Flagged section — unified list of all students needing attention */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-gray-400" />
            <h4 className="text-sm font-bold text-gray-900">Need attention</h4>
          </div>
          {(flaggedStudents.length + flaggedForOH.length) > 0 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
              {flaggedStudents.length + flaggedForOH.length}
            </span>
          )}
        </div>

        {flaggedStudents.length > 0 || flaggedForOH.length > 0 ? (
          <div className="mt-3 space-y-2">
            {/* General flagged students */}
            {flaggedStudents.map((student) => {
              const config = flagConfig[student.flag]
              const Icon = config.icon

              return (
                <div key={student.id} className="space-y-2">
                  <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <Icon className={`size-3.5 shrink-0 ${config.iconClass}`} />
                    <div className="min-w-0 flex-1 text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(selectedStudentId === student.id ? null : student.id)}
                        onMouseEnter={() => prefetchBriefing(student.id, student.name, currentUser.email)}
                        className="font-semibold text-gray-900 hover:text-[#0033A0] hover:underline cursor-pointer"
                      >
                        {student.name}
                      </button>
                      <span className="text-gray-400"> — </span>
                      <span className="text-gray-600">{student.detail}</span>
                      <span className="text-gray-400"> · </span>
                      <span className="font-medium text-gray-700">{student.course}</span>
                    </div>
                    {onSendNudge && (
                      <button
                        type="button"
                        onClick={() => onSendNudge({ name: student.name, flag: student.flag, course: student.course, detail: student.detail })}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[#0033A0]/20 bg-[#0033A0]/5 px-2 py-0.5 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-[#0033A0] hover:text-white"
                      >
                        <MessageCircle className="size-3" />
                        Nudge
                      </button>
                    )}
                  </div>
                  {selectedStudentId === student.id && (
                    <StudentBriefingCard
                      studentId={student.id}
                      studentName={student.name}
                      onSendNudge={onSendNudge ? (name) => {
                        onSendNudge({ name, flag: student.flag, course: student.course, detail: student.detail })
                      } : undefined}
                    />
                  )}
                </div>
              )
            })}

            {/* Office-hours-specific flags (merged into same list) */}
            {flaggedForOH.map((student) => (
              <div key={student.name} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <Clock3 className="size-3.5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-gray-900">{student.name}</span>
                  <span className="text-gray-400"> — </span>
                  <span className="text-gray-600">{student.reason}</span>
                  <span className="text-gray-400"> · </span>
                  <span className="font-medium text-gray-700">{student.course}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
            No flagged students right now.
          </p>
        )}
      </div>

      <Link
        href="/office-hours/faculty"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#00277A]"
      >
        Open office hours
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
