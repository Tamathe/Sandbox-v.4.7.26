'use client'

import Link from 'next/link'
import { Send, Users, BookOpen, Bot, FileText } from 'lucide-react'

const QUICK_ACTIONS = [
  {
    href: '/documents',
    label: 'Documents',
    description: 'Upload & manage files',
    icon: FileText,
    color: 'bg-sky-50 text-sky-700',
  },
  {
    href: '/staff/communications',
    label: 'Draft Communication',
    description: 'Draft with Sandy',
    icon: Send,
    color: 'bg-blue-50 text-[#0033A0]',
  },
  {
    href: '/staff/committees',
    label: 'Committees',
    description: 'Meetings & minutes',
    icon: Users,
    color: 'bg-purple-50 text-purple-700',
  },
  {
    href: '/staff/policies',
    label: 'Policy Navigator',
    description: 'Search & ask Sandy',
    icon: BookOpen,
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    href: '#ask-sandy',
    label: 'Ask Sandy',
    description: 'Anything, anytime',
    icon: Bot,
    color: 'bg-amber-50 text-amber-700',
    sandy: true,
  },
]

export default function QuickActionsBar() {
  const handleSandyClick = () => {
    window.dispatchEvent(
      new CustomEvent('sandy-open-with-context', {
        detail: { message: '' },
      }),
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {QUICK_ACTIONS.map((action) =>
        action.sandy ? (
          <button
            key={action.label}
            onClick={handleSandyClick}
            className="border-2 border-gray-200 rounded-xl p-3 hover:border-[#0033A0]/30 hover:shadow-sm transition-all text-left group"
          >
            <div className={`size-8 rounded-lg ${action.color} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
              <action.icon className="size-4" />
            </div>
            <div className="text-sm font-bold text-gray-900">{action.label}</div>
            <div className="text-xs text-gray-500">{action.description}</div>
          </button>
        ) : (
          <Link
            key={action.label}
            href={action.href}
            className="border-2 border-gray-200 rounded-xl p-3 hover:border-[#0033A0]/30 hover:shadow-sm transition-all group"
          >
            <div className={`size-8 rounded-lg ${action.color} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
              <action.icon className="size-4" />
            </div>
            <div className="text-sm font-bold text-gray-900">{action.label}</div>
            <div className="text-xs text-gray-500">{action.description}</div>
          </Link>
        ),
      )}
    </div>
  )
}
