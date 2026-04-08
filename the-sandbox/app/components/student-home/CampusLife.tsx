'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Utensils, Trophy, Briefcase, MapPin, ArrowRight, ChevronDown, ChevronUp, X, Radio } from 'lucide-react'
import type { CampusLifeItem } from '../../lib/student-home-data'

const TYPE_ICONS: Record<CampusLifeItem['type'], typeof Calendar> = {
  event: Calendar,
  dining: Utensils,
  athletics: Trophy,
  career: Briefcase,
}

const TABS: Array<{ key: CampusLifeItem['type'] | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'event', label: 'Events' },
  { key: 'dining', label: 'Dining' },
  { key: 'athletics', label: 'Athletics' },
  { key: 'career', label: 'Career' },
]

export default function CampusLife({ items: fallbackItems }: { items: CampusLifeItem[] }) {
  const [activeTab, setActiveTab] = useState<CampusLifeItem['type'] | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [liveItems, setLiveItems] = useState<CampusLifeItem[] | null>(null)
  const [totalUpcoming, setTotalUpcoming] = useState<number | null>(null)
  // Fetch real BBNvolved events
  useEffect(() => {
    fetch('/api/campus/homepage-events')
      .then((r: Response) => r.json())
      .then((data: { synced?: boolean; items?: CampusLifeItem[]; totalUpcoming?: number }) => {
        if (data.synced && data.items && data.items.length > 0) {
          setLiveItems(data.items)
          setTotalUpcoming(data.totalUpcoming ?? null)
        }
      })
      .catch(() => {
        // Fall back to simulated data silently
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isLive = liveItems !== null
  const items = isLive ? liveItems : fallbackItems

  if (items.length === 0) return null

  const filtered = activeTab === 'all' ? items : items.filter(i => i.type === activeTab)

  // Only show tabs that have items
  const typesPresent = new Set(items.map(i => i.type))
  const visibleTabs = TABS.filter(t => t.key === 'all' || typesPresent.has(t.key as CampusLifeItem['type']))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Campus Life</h3>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              <Radio className="size-2.5 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <Link
          href="/campus-life"
          className="text-xs font-semibold text-[#0033A0] hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          {totalUpcoming ? `See all ${totalUpcoming}` : 'See all'} <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Tab strip */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key
          const count = tab.key === 'all' ? items.length : items.filter(i => i.type === tab.key).length
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setExpandedId(null) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0 ${
                isActive
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              <span className={`ml-1 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Event cards */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const Icon = TYPE_ICONS[item.type]
          const isExpanded = expandedId === item.id

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border-2 shadow-sm transition-all cursor-pointer ${
                isExpanded ? 'border-[#0033A0]/30 shadow-md' : 'border-gray-100 hover:border-[#0033A0]/20 hover:shadow-md'
              }`}
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <div className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isExpanded ? 'bg-[#0033A0]/10' : 'bg-gray-50 border border-gray-100'
                  }`}>
                    <Icon className={`size-4 ${isExpanded ? 'text-[#0033A0]' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className={`text-sm font-bold leading-tight flex-1 transition-colors ${
                        isExpanded ? 'text-[#0033A0]' : 'text-gray-900'
                      }`}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-gray-100 text-gray-600'}`}>
                            {item.badge}
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp className="size-3.5 text-gray-300" />
                          : <ChevronDown className="size-3.5 text-gray-300" />
                        }
                      </div>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-1">{item.subtitle}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-0 ml-11 border-t border-gray-50 mt-0 pt-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{item.subtitle}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                    {item.time && (
                      <span className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                        <Calendar className="size-3 text-gray-400" /> {item.time}
                      </span>
                    )}
                    {item.location && (
                      <span className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                        <MapPin className="size-3 text-gray-400" /> {item.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-[#0033A0] hover:text-blue-700 flex items-center gap-1 transition-colors"
                      >
                        Learn more <ArrowRight className="size-3" />
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-gray-300 cursor-not-allowed flex items-center gap-1">
                        Learn more <ArrowRight className="size-3" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(null) }}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                    >
                      <X className="size-3" /> Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No {activeTab} items right now.</p>
      )}

      {/* Live data attribution */}
      {isLive && (
        <p className="text-[10px] text-gray-300 text-center mt-3">
          Live from BBNvolved · Updated daily
        </p>
      )}
    </div>
  )
}
