'use client'

import { Search } from 'lucide-react'

type FilterKey = 'has-assignments' | 'has-objectives' | 'no-assignments' | 'has-dates' | 'no-dates'

interface WeekSearchFilterProps {
  weekSearchTerm: string
  weekFilters: Set<FilterKey>
  onSearchChange: (term: string) => void
  onFiltersChange: (filters: Set<FilterKey>) => void
}

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: 'has-assignments', label: 'Has Assignments' },
  { key: 'has-objectives', label: 'Has Objectives' },
  { key: 'no-assignments', label: 'No Assignments' },
  { key: 'has-dates', label: 'Has Dates' },
  { key: 'no-dates', label: 'No Dates' },
]

export function WeekSearchFilter({ weekSearchTerm, weekFilters, onSearchChange, onFiltersChange }: WeekSearchFilterProps) {
  const hasActiveFilter = weekSearchTerm.trim() !== '' || weekFilters.size > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={weekSearchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search weeks…"
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => { onSearchChange(''); onFiltersChange(new Set()) }}
            className="text-xs font-medium text-[#0033A0] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_PILLS.map((pill) => {
          const active = weekFilters.has(pill.key)
          return (
            <button
              key={pill.key}
              type="button"
              onClick={() => {
                const next = new Set(weekFilters)
                if (next.has(pill.key)) next.delete(pill.key)
                else next.add(pill.key)
                onFiltersChange(next)
              }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#0033A0] text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {pill.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
