'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { BUILDING_TYPE_COLORS, BUILDING_TYPE_LABELS } from './campus-map-utils'
import type { MapBuilding } from './campus-map-utils'
import type { CampusBuildingType } from '../../generated/prisma'

// Top 5 types shown inline; rest hidden behind "More"
const PRIMARY_TYPES: CampusBuildingType[] = ['ACADEMIC', 'DINING', 'LIBRARY', 'RECREATION', 'HEALTH']
const SECONDARY_TYPES: CampusBuildingType[] = ['RESIDENCE', 'STUDENT_SERVICES', 'PARKING', 'ADMINISTRATION', 'ATHLETICS']

interface MapControlsProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  activeFilters: Set<CampusBuildingType>
  onToggleFilter: (type: CampusBuildingType) => void
  onClearFilters: () => void
  showEvents: boolean
  onToggleEvents: () => void
  showMyBuildings: boolean
  onToggleMyBuildings: () => void
  showSchedule: boolean
  onToggleSchedule: () => void
  showWeather: boolean
  onToggleWeather: () => void
  buildings: MapBuilding[]
  onSelectBuilding: (b: MapBuilding) => void
  hasMyBuildings: boolean
  hasSchedule: boolean
}

export default function MapControls({
  searchQuery,
  onSearchChange,
  activeFilters,
  onToggleFilter,
  onClearFilters,
  showEvents,
  onToggleEvents,
  showMyBuildings,
  onToggleMyBuildings,
  showSchedule,
  onToggleSchedule,
  showWeather,
  onToggleWeather,
  buildings,
  onSelectBuilding,
  hasMyBuildings,
  hasSchedule,
}: MapControlsProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Search suggestions
  const suggestions = searchQuery.length >= 2
    ? buildings.filter((b) => {
        const q = searchQuery.toLowerCase()
        return (
          b.name.toLowerCase().includes(q) ||
          (b.shortName?.toLowerCase().includes(q) ?? false)
        )
      }).slice(0, 5)
    : []

  useEffect(() => {
    setShowDropdown(suggestions.length > 0 && searchQuery.length >= 2)
  }, [suggestions.length, searchQuery.length])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          inputRef.current && !inputRef.current.contains(target)) {
        setShowDropdown(false)
      }
      if (moreRef.current && !moreRef.current.contains(target)) {
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const hasActiveFilters = activeFilters.size > 0 || showEvents || showMyBuildings || showSchedule || showWeather
  const secondaryActive = SECONDARY_TYPES.some((t) => activeFilters.has(t))

  function renderPill(type: CampusBuildingType) {
    const active = activeFilters.has(type)
    const color = BUILDING_TYPE_COLORS[type]
    return (
      <button
        key={type}
        onClick={() => onToggleFilter(type)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
          active
            ? 'text-white border-transparent shadow-sm'
            : 'text-gray-600 border-gray-200 bg-white hover:border-gray-300'
        }`}
        style={active ? { backgroundColor: color, borderColor: color } : undefined}
      >
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: active ? '#fff' : color }}
        />
        {BUILDING_TYPE_LABELS[type]}
      </button>
    )
  }

  return (
    <div className="space-y-2.5">
      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Find a building..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]/20 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => { onSearchChange(''); setShowDropdown(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100"
            >
              <X className="size-4 text-gray-400" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            {suggestions.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  onSelectBuilding(b)
                  onSearchChange('')
                  setShowDropdown(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: BUILDING_TYPE_COLORS[b.type] }}
                />
                <span className="text-sm text-gray-800 truncate">{b.name}</span>
                {b.shortName && (
                  <span className="text-xs text-gray-400 font-mono ml-auto">{b.shortName}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {/* Primary type pills */}
        {PRIMARY_TYPES.map(renderPill)}

        {/* More dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setShowMore((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              secondaryActive
                ? 'bg-gray-800 text-white border-gray-800'
                : 'text-gray-500 border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            More
            <ChevronDown className={`size-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
          {showMore && (
            <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[160px]">
              {SECONDARY_TYPES.map((type) => {
                const active = activeFilters.has(type)
                const color = BUILDING_TYPE_COLORS[type]
                return (
                  <button
                    key={type}
                    onClick={() => onToggleFilter(type)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {BUILDING_TYPE_LABELS[type]}
                    {active && <span className="ml-auto text-[10px] text-gray-400">on</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <span className="w-px h-5 bg-gray-200 shrink-0" />

        {/* Toggle: Learning Weather */}
        <button
          onClick={onToggleWeather}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
            showWeather
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'text-gray-600 border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className={`size-2 rounded-full ${showWeather ? 'bg-orange-500' : 'bg-orange-300'}`} />
          Learning Weather
        </button>

        {/* Toggle: Events */}
        <button
          onClick={onToggleEvents}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
            showEvents
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'text-gray-600 border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className={`size-2 rounded-full ${showEvents ? 'bg-red-500' : 'bg-red-300'}`} />
          Events
        </button>

        {/* Toggle: My Buildings — only show if user has enrolled courses */}
        {hasMyBuildings && (
          <button
            onClick={onToggleMyBuildings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              showMyBuildings
                ? 'bg-blue-50 text-[#0033A0] border-blue-200'
                : 'text-gray-600 border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className={`size-2 rounded-full ${showMyBuildings ? 'bg-[#0033A0]' : 'bg-blue-300'}`} />
            My Classes
          </button>
        )}

        {/* Toggle: My Schedule — shows route + walking times */}
        {hasSchedule && (
          <button
            onClick={onToggleSchedule}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              showSchedule
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'text-gray-600 border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className={`size-2 rounded-full ${showSchedule ? 'bg-indigo-600' : 'bg-indigo-300'}`} />
            My Schedule
          </button>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <>
            <span className="w-px h-5 bg-gray-200 shrink-0" />
            <button
              onClick={onClearFilters}
              className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap transition-colors"
            >
              Clear all
            </button>
          </>
        )}
      </div>
    </div>
  )
}
