'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../lib/auth-context'

interface AnalyticsSubNavProps {
  role: string
}

const TABS = [
  { href: '/analytics/faculty', label: 'Faculty Analytics', roles: ['EDUCATOR', 'ADMIN'] },
  { href: '/analytics/faculty-intelligence', label: 'Faculty Intelligence', roles: ['EDUCATOR', 'ADMIN'] },
  { href: '/analytics/teaching', label: 'Teaching Intelligence', roles: ['EDUCATOR', 'ADMIN'] },
  { href: '/analytics/ab-outcomes', label: 'A/B Outcomes', roles: ['ADMIN'] },
  { href: '/analytics/learning-science', label: 'Learning Science', roles: ['ADMIN'] },
]

// During evaluator mode, hide deep-dive tabs that could confuse a Provost
const EVALUATOR_HIDDEN = ['/analytics/ab-outcomes', '/analytics/learning-science']

export default function AnalyticsSubNav({ role }: AnalyticsSubNavProps) {
  const pathname = usePathname()
  const { evaluatorMode } = useAuth()
  const visibleTabs = TABS.filter((tab) =>
    tab.roles.includes(role) && !(evaluatorMode && EVALUATOR_HIDDEN.includes(tab.href))
  )

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-0 overflow-x-auto" role="tablist">
          {visibleTabs.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={isActive}
                className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-[#0033A0] text-[#0033A0]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
