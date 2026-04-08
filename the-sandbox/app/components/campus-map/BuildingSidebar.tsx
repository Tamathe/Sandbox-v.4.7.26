'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Clock, Navigation, Building2, Users, Accessibility, ChevronDown, MessageSquareText, ThumbsUp } from 'lucide-react'
import { BUILDING_TYPE_COLORS, BUILDING_TYPE_LABELS, AMENITY_LABELS } from './campus-map-utils'
import type { MapBuilding, MapEvent } from './campus-map-utils'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import WeatherBuildingSidebar from './WeatherBuildingSidebar'
import type { WeatherBuildingData } from '../../lib/weather-map/types'

interface BuildingSidebarProps {
  building: MapBuilding | null
  events: MapEvent[]
  onClose: () => void
  showWeather?: boolean
  weatherData?: WeatherBuildingData | null
}

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function CollapsibleSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon className="size-3.5 text-gray-400" />
          {title}
        </span>
        <ChevronDown className={`size-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 pb-2.5">{children}</div>}
    </div>
  )
}

interface CampusTip {
  id: string
  tipType: string
  content: string
  upvoteCount: number
  user?: { id: string; name: string; avatarUrl: string | null }
}

const TIP_TYPE_EMOJI: Record<string, string> = {
  STUDY_SPOT: '📖',
  FOOD_TIP: '🍕',
  PARKING: '🅿️',
  ACCESSIBILITY: '♿',
  GENERAL: '💡',
}

export default function BuildingSidebar({ building, events, onClose, showWeather, weatherData }: BuildingSidebarProps) {
  const { currentUser } = useAuth()
  const [tips, setTips] = useState<CampusTip[]>([])

  useEffect(() => {
    if (!building) return
    const controller = new AbortController()
    apiFetch<CampusTip[]>(currentUser.email, `/api/contribute/campus-tips?buildingId=${building.id}`, { signal: controller.signal })
      .then(setTips)
      .catch(() => {})
    return () => controller.abort()
  }, [building?.id, currentUser.email]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTipUpvote = async (tipId: string) => {
    try {
      await apiFetch(currentUser.email, `/api/contribute/campus-tips/${tipId}/upvote`, { method: 'POST' })
      if (building) {
        const updated = await apiFetch<CampusTip[]>(currentUser.email, `/api/contribute/campus-tips?buildingId=${building.id}`)
        setTips(updated)
      }
    } catch { /* ignore */ }
  }

  if (!building) return null

  const color = BUILDING_TYPE_COLORS[building.type]
  const typeLabel = BUILDING_TYPE_LABELS[building.type]

  const nearbyEvents = events.filter(
    (e) => e.location && (
      e.location.toLowerCase().includes(building.name.toLowerCase()) ||
      (building.shortName && e.location.toLowerCase().includes(building.shortName.toLowerCase()))
    )
  )

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <h2 className="font-extrabold text-lg text-gray-900 leading-tight">{building.name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {typeLabel}
            </span>
            {building.floors && (
              <span className="text-[11px] text-gray-400 font-medium">
                {building.floors} {building.floors === 1 ? 'floor' : 'floors'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors ml-2 shrink-0"
          aria-label="Close"
        >
          <X className="size-5 text-gray-400" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Description */}
        {building.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{building.description}</p>
        )}

        {/* Weather profile section */}
        {showWeather && weatherData && (
          <div className="border border-orange-200 rounded-xl p-3 bg-orange-50/30">
            <WeatherBuildingSidebar weatherData={weatherData} />
          </div>
        )}

        {/* Address & Hours — inline, no heavy labels */}
        {(building.address || building.hours) && (
          <div className="space-y-1.5">
            {building.address && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span>{building.address}</span>
              </div>
            )}
            {building.hours && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Clock className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span>{building.hours}</span>
              </div>
            )}
          </div>
        )}

        {/* Amenities */}
        {building.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {building.amenities.map((a) => (
              <span
                key={a}
                className="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-500 font-medium"
              >
                {AMENITY_LABELS[a] ?? a}
              </span>
            ))}
          </div>
        )}

        {/* Collapsible: Departments */}
        {building.departments.length > 0 && (
          <CollapsibleSection icon={Users} title="Departments">
            <ul className="space-y-1">
              {building.departments.map((d) => (
                <li key={d} className="text-sm text-gray-600 flex items-start gap-1.5">
                  <span className="text-gray-300 mt-1">&#8226;</span>
                  {d}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Collapsible: Building Details (floors) */}
        {building.floors && building.floors > 1 && (
          <CollapsibleSection icon={Building2} title="Building Details">
            <div className="text-sm text-gray-600 space-y-1">
              <p>{building.floors} floors</p>
            </div>
          </CollapsibleSection>
        )}

        {/* Collapsible: Accessibility */}
        {building.accessibilityNotes && (
          <CollapsibleSection icon={Accessibility} title="Accessibility">
            <p className="text-sm text-gray-600 leading-relaxed">{building.accessibilityNotes}</p>
          </CollapsibleSection>
        )}

        {/* Student Tips */}
        {tips.length > 0 && (
          <CollapsibleSection icon={MessageSquareText} title={`Student Tips (${tips.length})`}>
            <div className="space-y-2">
              {tips.slice(0, 5).map((tip) => (
                <div key={tip.id} className="flex items-start gap-2">
                  <button
                    onClick={() => handleTipUpvote(tip.id)}
                    className="flex flex-col items-center gap-0.5 pt-0.5 min-w-[28px] shrink-0"
                  >
                    <ThumbsUp className="size-3 text-gray-400 hover:text-[#0033A0] transition-colors" />
                    <span className="text-[10px] font-semibold text-gray-400">{tip.upvoteCount}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 leading-snug">
                      <span className="mr-1">{TIP_TYPE_EMOJI[tip.tipType] ?? '💡'}</span>
                      {tip.content}
                    </p>
                    {tip.user && <p className="text-[10px] text-gray-400 mt-0.5">{tip.user.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Get Directions */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${building.latitude},${building.longitude}&travelmode=walking`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002878] transition-colors"
        >
          <Navigation className="size-4" />
          Get Directions
        </a>

        {/* Nearby Events */}
        {nearbyEvents.length > 0 && (
          <div className="pt-1">
            <p className="text-xs font-semibold text-gray-400 mb-1.5">Upcoming here</p>
            <div className="space-y-1.5">
              {nearbyEvents.slice(0, 4).map((e) => (
                <div key={e.id} className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{e.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatEventDate(e.startsOn)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
