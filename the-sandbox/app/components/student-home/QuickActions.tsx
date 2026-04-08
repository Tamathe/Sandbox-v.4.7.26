'use client'

import Link from 'next/link'
import { BookOpen, Sparkles, GraduationCap, Users, Target, Compass, Calendar, Briefcase, MapPin } from 'lucide-react'
import type { QuickAction } from '../../lib/student-home-data'

const ICONS: Record<QuickAction['iconName'], typeof BookOpen> = {
  'book-open': BookOpen,
  sparkles: Sparkles,
  'graduation-cap': GraduationCap,
  users: Users,
  target: Target,
  compass: Compass,
  calendar: Calendar,
  briefcase: Briefcase,
  'map-pin': MapPin,
}

export default function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {actions.map((action) => {
        const Icon = ICONS[action.iconName]
        return (
          <Link
            key={action.id}
            href={action.href}
            className="flex items-center gap-2 rounded-xl border border-gray-100 shadow-sm bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:border-[#0033A0]/40 hover:text-[#0033A0] hover:shadow-md transition-all flex-shrink-0 group"
          >
            <Icon className="size-4 text-gray-400 group-hover:text-[#0033A0] transition-colors" />
            <span>{action.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
