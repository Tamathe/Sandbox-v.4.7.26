'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { ChevronRight, ChevronDown, MapPin, Utensils, Newspaper } from 'lucide-react'
import type { CampusLifeItem } from '../../lib/student-home-data'

interface CampusSummaryRowProps {
  campusLifeItems: CampusLifeItem[]
  diningOpen: number
  uknowCount: number
  children: ReactNode // expanded content (the 3 original sections)
}

const STORAGE_KEY = 'uky-campus-collapsed'

export default function CampusSummaryRow({ campusLifeItems, diningOpen, uknowCount, children }: CampusSummaryRowProps) {
  const [collapsed, setCollapsed] = useState(true)

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'false') setCollapsed(false)
  }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const eventsToday = campusLifeItems.length
  const Chevron = collapsed ? ChevronRight : ChevronDown

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors text-left"
      >
        <Chevron className="size-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-700">Campus & News</span>
        <span className="text-xs text-gray-400 mx-1">&middot;</span>

        <span className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="size-3" />
          {eventsToday} event{eventsToday !== 1 ? 's' : ''} today
        </span>
        <span className="text-xs text-gray-300">&middot;</span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Utensils className="size-3" />
          Dining: {diningOpen} open
        </span>
        <span className="text-xs text-gray-300">&middot;</span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Newspaper className="size-3" />
          {uknowCount} new article{uknowCount !== 1 ? 's' : ''}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-6">
          {children}
        </div>
      )}
    </div>
  )
}
