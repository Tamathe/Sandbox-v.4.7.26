'use client'

import Link from 'next/link'
import {
  Shield, MessageSquare, Users, CheckSquare,
  ClipboardList, FileText, DoorOpen, Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ToolkitItem {
  label: string
  route: string
  icon: LucideIcon
  description: string
  color: string
}

const STAFF_TOOLKIT: ToolkitItem[] = [
  { label: 'Policy Navigator', route: '/staff/policies', icon: Shield, description: 'Browse & search UK policies', color: 'bg-blue-100 text-blue-600' },
  { label: 'Communications', route: '/staff/communications', icon: MessageSquare, description: 'Draft announcements & emails', color: 'bg-indigo-100 text-indigo-600' },
  { label: 'Committees', route: '/staff/committees', icon: Users, description: 'Meeting minutes & agendas', color: 'bg-violet-100 text-violet-600' },
  { label: 'Action Center', route: '/staff/actions', icon: CheckSquare, description: 'Tasks, approvals & queue', color: 'bg-amber-100 text-amber-600' },
  { label: 'Surveys', route: '/staff/survey-intelligence', icon: ClipboardList, description: 'Survey analysis & insights', color: 'bg-emerald-100 text-emerald-600' },
  { label: 'Documents', route: '/documents', icon: FileText, description: 'Templates & shared docs', color: 'bg-gray-100 text-gray-600' },
  { label: 'Room Reservation', route: '/rooms', icon: DoorOpen, description: 'Book campus rooms', color: 'bg-cyan-100 text-cyan-600' },
  { label: 'Campus Services', route: '/university-systems', icon: Building2, description: 'Guidance, planning & integrations', color: 'bg-rose-100 text-rose-600' },
]

export default function StaffToolkit() {
  return (
    <section>
      <h2 className="text-lg font-extrabold text-gray-900 mb-4">Your Toolkit</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAFF_TOOLKIT.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.route}
              href={tool.route}
              className="border rounded-2xl shadow-sm bg-white p-4 flex flex-col gap-2 hover:shadow-md hover:border-[#0033A0]/20 transition-all"
            >
              <div className={`size-10 rounded-xl ${tool.color} flex items-center justify-center`}>
                <Icon className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{tool.label}</div>
                <div className="text-xs text-gray-500 leading-snug line-clamp-2">{tool.description}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
