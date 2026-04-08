'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import BuildingMarker from './BuildingMarker'
import EventMarker from './EventMarker'
import MapLegend from './MapLegend'
import WeatherOverlay from './WeatherOverlay'
import type { MapBuilding, MapEvent, MyBuilding } from './campus-map-utils'
import { UK_CENTER } from './campus-map-utils'
import type { WeatherBuildingData } from '../../lib/weather-map/types'

interface CampusLeafletMapProps {
  buildings: MapBuilding[]
  events: MapEvent[]
  myBuildingSlugs: string[]
  showEvents: boolean
  showMyBuildings: boolean
  showSchedule: boolean
  schedule: MyBuilding[]
  selectedBuilding: MapBuilding | null
  onSelectBuilding: (b: MapBuilding) => void
  flyTo: MapBuilding | null
  showWeather?: boolean
  weatherBuildings?: WeatherBuildingData[]
}

function FlyToHandler({ target }: { target: MapBuilding | null }) {
  const map = useMap()
  const prevTarget = useRef<string | null>(null)

  useEffect(() => {
    if (target && target.id !== prevTarget.current) {
      prevTarget.current = target.id
      map.flyTo([target.latitude, target.longitude], 17, { duration: 0.8 })
    }
  }, [target, map])

  return null
}

export default function CampusLeafletMap({
  buildings,
  events,
  myBuildingSlugs,
  showEvents,
  showMyBuildings,
  showSchedule,
  schedule,
  selectedBuilding,
  onSelectBuilding,
  flyTo,
  showWeather,
  weatherBuildings,
}: CampusLeafletMapProps) {
  const mySet = new Set(myBuildingSlugs)

  // Build polyline coordinates for schedule route
  const scheduleCoords: [number, number][] = schedule.map((s) => [s.latitude, s.longitude])

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={UK_CENTER}
        zoom={16}
        minZoom={14}
        maxZoom={18}
        className="h-full w-full rounded-2xl"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <FlyToHandler target={flyTo} />

        {/* When "My Classes" is on, render non-my buildings as faded, my buildings as prominent */}
        {buildings.map((b) => {
          const isMy = mySet.has(b.slug)
          // When showMyBuildings is active, dim non-enrolled buildings
          if (showMyBuildings && !isMy) {
            return (
              <BuildingMarker
                key={b.id}
                building={b}
                isMyBuilding={false}
                isSelected={selectedBuilding?.id === b.id}
                onSelect={onSelectBuilding}
              />
            )
          }
          return (
            <BuildingMarker
              key={b.id}
              building={b}
              isMyBuilding={showMyBuildings && isMy}
              isSelected={selectedBuilding?.id === b.id}
              onSelect={onSelectBuilding}
            />
          )
        })}

        {showEvents &&
          events.map((e) => <EventMarker key={e.id} event={e} />)}

        {/* Schedule route: dashed line between consecutive classes */}
        {showSchedule && scheduleCoords.length >= 2 && (
          <Polyline
            positions={scheduleCoords}
            pathOptions={{
              color: '#0033A0',
              weight: 3,
              dashArray: '8 6',
              opacity: 0.7,
            }}
          />
        )}

        {/* Schedule numbered markers */}
        {showSchedule &&
          schedule.map((s, i) => (
            <CircleMarker
              key={`sched-${i}`}
              center={[s.latitude, s.longitude]}
              radius={12}
              pathOptions={{
                color: '#0033A0',
                fillColor: '#0033A0',
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={0.95} permanent>
                <span className="text-xs font-bold">
                  {i + 1}. {s.courseCode ?? s.name} {s.startTime ? `(${s.startTime})` : ''}
                </span>
              </Tooltip>
            </CircleMarker>
          ))}

        {/* Weather overlay */}
        {showWeather && weatherBuildings && weatherBuildings.length > 0 && (
          <WeatherOverlay
            buildings={weatherBuildings}
            selectedBuildingId={selectedBuilding?.id ?? null}
            onSelectBuilding={(id) => {
              const b = buildings.find((x) => x.id === id)
              if (b) onSelectBuilding(b)
            }}
          />
        )}
      </MapContainer>
      <MapLegend />
    </div>
  )
}
