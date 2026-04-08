'use client'

import { Flame, GraduationCap, TrendingUp, TrendingDown, Minus, Utensils } from 'lucide-react'
import type { PulseData } from '../../lib/student-home-data'

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp className="size-3 text-emerald-500" />
  if (trend === 'down') return <TrendingDown className="size-3 text-red-500" />
  return <Minus className="size-3 text-gray-400" />
}

export default function PulseBar({ pulse }: { pulse: PulseData }) {
  const metrics = [
    {
      label: 'GPA',
      value: pulse.gpa.current.toFixed(2),
      sub: `Semester ${pulse.gpa.semester.toFixed(2)}`,
      icon: <GraduationCap className="size-4 text-[#0033A0]" />,
      extra: <TrendIcon trend={pulse.gpa.trend} />,
    },
    {
      label: 'Degree',
      value: `${pulse.degree.percent}%`,
      sub: `${pulse.degree.completed}/${pulse.degree.total} credits`,
      icon: <div className="size-4 relative flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="size-4 text-[#0033A0]">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.15} />
          <circle
            cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeDasharray={`${pulse.degree.percent * 0.628} 100`}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
          />
        </svg>
      </div>,
      extra: <span className="text-xs font-semibold text-gray-400">{pulse.degree.standing}</span>,
    },
    {
      label: 'Meals',
      value: `${pulse.mealPlan.remaining}`,
      sub: `of ${pulse.mealPlan.total} · Resets ${pulse.mealPlan.resetsDay}`,
      icon: <Utensils className="size-4 text-amber-500" />,
      extra: pulse.mealPlan.remaining <= 3
        ? <span className="text-xs font-semibold text-amber-600">Low</span>
        : null,
    },
    ...(pulse.studyStreak ? [{
      label: 'Study Streak',
      value: `${pulse.studyStreak.current} day${pulse.studyStreak.current !== 1 ? 's' : ''}`,
      sub: `Best: ${pulse.studyStreak.longest} · ${pulse.studyStreak.sessions} sessions`,
      icon: <Flame className="size-4 text-orange-500" />,
      extra: pulse.studyStreak.current >= 3
        ? <span className="text-xs font-semibold text-orange-500">🔥</span>
        : null,
    }] : []),
  ]

  return (
    <div className={`grid gap-2.5 ${metrics.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            {m.icon}
            {m.extra}
          </div>
          <div className="text-lg font-bold text-gray-900 leading-tight">{m.value}</div>
          <div className="text-xs text-gray-400 leading-tight mt-0.5 truncate">{m.sub}</div>
        </div>
      ))}
    </div>
  )
}
