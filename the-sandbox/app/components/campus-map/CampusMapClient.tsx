'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import MapControls from './MapControls'
import CampusLeafletMap from './CampusLeafletMap'
import BuildingSidebar from './BuildingSidebar'
import ScheduleOverlay from './ScheduleOverlay'
import WeatherLegend from './WeatherLegend'
import type { MapBuilding, MapEvent, MyBuilding, ScheduleTransition } from './campus-map-utils'
import type { CampusBuildingType } from '../../generated/prisma'
import type { WeatherBuildingData, WeatherMapData } from '../../lib/weather-map/types'
import { apiFetch } from '../../lib/api-client'

export default function CampusMapClient() {
  const { currentUser } = useAuth()

  const [buildings, setBuildings] = useState<MapBuilding[]>([])
  const [events, setEvents] = useState<MapEvent[]>([])
  const [myBuildings, setMyBuildings] = useState<MyBuilding[]>([])
  const [schedule, setSchedule] = useState<MyBuilding[]>([])
  const [transitions, setTransitions] = useState<ScheduleTransition[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<MapBuilding | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<CampusBuildingType>>(new Set())
  const [showEvents, setShowEvents] = useState(false)
  const [showMyBuildings, setShowMyBuildings] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showWeather, setShowWeather] = useState(false)
  const [weatherBuildings, setWeatherBuildings] = useState<WeatherBuildingData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [flyTarget, setFlyTarget] = useState<MapBuilding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers = { 'x-demo-user-email': currentUser.email }

    Promise.all([
      fetch('/api/campus-map/buildings', { headers }).then((r) => r.json()),
      fetch('/api/campus-map/events', { headers }).then((r) => r.json()),
      fetch('/api/campus-map/my-buildings', { headers }).then((r) => r.json()),
    ])
      .then(([bData, eData, mData]) => {
        setBuildings(bData.buildings ?? [])
        setEvents(eData.events ?? [])
        setMyBuildings(mData.myBuildings ?? [])
        setSchedule(mData.schedule ?? [])
        setTransitions(mData.transitions ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser.email])

  useEffect(() => {
    if (!showWeather || weatherBuildings.length > 0) return
    const controller = new AbortController()
    apiFetch<WeatherMapData>(currentUser.email, '/api/weather-map', { signal: controller.signal })
      .then((data) => setWeatherBuildings(data.buildings ?? []))
      .catch((err) => { if (err.name !== 'AbortError') setWeatherBuildings([]) })
    return () => controller.abort()
  }, [showWeather, currentUser.email, weatherBuildings.length])

  const filteredBuildings = activeFilters.size === 0
    ? buildings
    : buildings.filter((b) => activeFilters.has(b.type))

  const handleToggleFilter = useCallback((type: CampusBuildingType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const handleClearFilters = useCallback(() => {
    setActiveFilters(new Set())
    setShowEvents(false)
    setShowMyBuildings(false)
    setShowSchedule(false)
    setShowWeather(false)
  }, [])

  const handleSelectBuilding = useCallback((b: MapBuilding) => {
    setSelectedBuilding(b)
    setFlyTarget(b)
  }, [])

  const myBuildingSlugs = myBuildings.map((b) => b.slug)

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] animate-pulse bg-gray-50 flex items-center justify-center rounded-2xl">
        <p className="text-gray-400">Loading campus map...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      {/* Header — clean, no counts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-[#0033A0]/10">
          <MapPin className="size-5 text-[#0033A0]" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Campus Map</h1>
      </div>

      {/* Controls */}
      <MapControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilters={activeFilters}
        onToggleFilter={handleToggleFilter}
        onClearFilters={handleClearFilters}
        showEvents={showEvents}
        onToggleEvents={() => setShowEvents((v) => !v)}
        showMyBuildings={showMyBuildings}
        onToggleMyBuildings={() => setShowMyBuildings((v) => !v)}
        showSchedule={showSchedule}
        onToggleSchedule={() => setShowSchedule((v) => !v)}
        showWeather={showWeather}
        onToggleWeather={() => setShowWeather((v) => !v)}
        buildings={buildings}
        onSelectBuilding={handleSelectBuilding}
        hasMyBuildings={myBuildings.length > 0}
        hasSchedule={schedule.length > 0}
      />

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ height: 'calc(100vh - 14rem)' }}>
        <div className={`${selectedBuilding ? 'lg:col-span-8' : 'lg:col-span-12'} h-full min-h-[400px] relative`}>
          <CampusLeafletMap
            buildings={filteredBuildings}
            events={events}
            myBuildingSlugs={myBuildingSlugs}
            showEvents={showEvents}
            showMyBuildings={showMyBuildings}
            showSchedule={showSchedule}
            schedule={schedule}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={handleSelectBuilding}
            flyTo={flyTarget}
            showWeather={showWeather}
            weatherBuildings={weatherBuildings}
          />
          {showWeather && (
            <div className="absolute bottom-3 left-3 z-[1000]">
              <WeatherLegend />
            </div>
          )}
        </div>

        {selectedBuilding && (
          <div className="lg:col-span-4 h-full max-h-[calc(100vh-14rem)] overflow-hidden">
            <BuildingSidebar
              building={selectedBuilding}
              events={events}
              onClose={() => setSelectedBuilding(null)}
              showWeather={showWeather}
              weatherData={showWeather ? weatherBuildings.find((w) => w.name === selectedBuilding.name) ?? null : null}
            />
          </div>
        )}
      </div>

      {/* Schedule Panel */}
      {showSchedule && schedule.length > 0 && (
        <ScheduleOverlay schedule={schedule} transitions={transitions} />
      )}
    </div>
  )
}
