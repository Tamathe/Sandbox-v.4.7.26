'use client'

import { Calendar, ListChecks, Vote, Sparkles, Mic } from 'lucide-react'
import type { ReactNode } from 'react'

export type CommitteeTab = 'meetings' | 'actions' | 'decisions' | 'generate' | 'live-meeting'

interface CommitteeDetailLayoutProps {
  activeTab: CommitteeTab
  onTabChange: (tab: CommitteeTab) => void
  children: ReactNode
  isInMeeting?: boolean
}

const BASE_TABS: { key: CommitteeTab; label: string; icon: typeof Calendar }[] = [
  { key: 'meetings', label: 'Meetings', icon: Calendar },
  { key: 'actions', label: 'Action Items', icon: ListChecks },
  { key: 'decisions', label: 'Decisions', icon: Vote },
]

export default function CommitteeDetailLayout({
  activeTab,
  onTabChange,
  children,
  isInMeeting,
}: CommitteeDetailLayoutProps) {
  const tabs = [
    ...BASE_TABS,
    isInMeeting
      ? { key: 'live-meeting' as CommitteeTab, label: 'Live Meeting', icon: Mic }
      : { key: 'generate' as CommitteeTab, label: 'Generate Minutes', icon: Sparkles },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Committee tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? tab.key === 'live-meeting'
                      ? 'border-red-500 text-red-600'
                      : 'border-[#0033A0] text-[#0033A0]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
                {tab.key === 'live-meeting' && (
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-red-500" />
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>{children}</div>
    </div>
  )
}
