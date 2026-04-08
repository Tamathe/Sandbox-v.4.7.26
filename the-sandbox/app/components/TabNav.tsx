import type { LucideIcon } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  icon?: LucideIcon
  badge?: number | string
}

interface TabNavProps {
  tabs: readonly Tab[] | Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  className?: string
}

/**
 * Underline-style tab navigation — canonical pattern per PLATFORM-CONSISTENCY-MANIFEST.md.
 * Active: border-b-2 border-[#0033A0] text-[#0033A0]. Inactive: text-gray-500.
 */
export default function TabNav({ tabs, activeTab, onTabChange, className = '' }: TabNavProps) {
  return (
    <div className={`flex gap-1 border-b border-gray-200 overflow-x-auto ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-[#0033A0] text-[#0033A0]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {Icon && <Icon className="size-4" />}
            {tab.label}
            {tab.badge != null && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
