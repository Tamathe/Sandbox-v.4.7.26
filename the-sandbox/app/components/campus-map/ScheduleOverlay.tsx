'use client'

import { Clock, AlertTriangle, Footprints } from 'lucide-react'
import type { MyBuilding, ScheduleTransition } from './campus-map-utils'

interface ScheduleOverlayProps {
  schedule: MyBuilding[]
  transitions: ScheduleTransition[]
}

export default function ScheduleOverlay({ schedule, transitions }: ScheduleOverlayProps) {
  const hasWarning = transitions.some((t) => t.warning)

  return (
    <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-indigo-600" />
        <h3 className="text-sm font-extrabold text-gray-900">Today&apos;s Schedule</h3>
        {hasWarning && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-600">
            <AlertTriangle className="size-3.5" />
            Tight transition
          </span>
        )}
      </div>

      <div className="space-y-1">
        {schedule.map((s, i) => (
          <div key={`${s.courseCode}-${i}`}>
            {/* Class entry */}
            <div className="flex items-center gap-3 py-1.5">
              <span className="flex items-center justify-center size-6 rounded-full bg-[#0033A0] text-white text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {s.courseCode}{s.courseTitle ? ` — ${s.courseTitle}` : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {s.name} {s.dayOfWeek && s.startTime && s.endTime ? `· ${s.dayOfWeek} ${s.startTime}–${s.endTime}` : ''}
                </p>
              </div>
            </div>

            {/* Walking transition to next class */}
            {i < transitions.length && (
              <div className={`flex items-center gap-2 ml-3 pl-3 border-l-2 py-1 ${
                transitions[i].warning ? 'border-amber-400' : 'border-gray-200'
              }`}>
                <Footprints className={`size-3.5 ${transitions[i].warning ? 'text-amber-500' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium ${
                  transitions[i].warning ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {transitions[i].walkingMinutes} min walk ({transitions[i].distanceMiles} mi)
                  {transitions[i].warning && ' — allow extra time'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
