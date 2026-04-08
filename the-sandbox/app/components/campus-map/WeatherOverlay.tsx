'use client'

import { CircleMarker, Tooltip } from 'react-leaflet'
import type { WeatherBuildingData } from '../../lib/weather-map/types'
import { getWeatherColor, getWeatherLabel, getMarkerRadius, formatHour } from '../../lib/weather-map/weather-utils'

interface WeatherOverlayProps {
  buildings: WeatherBuildingData[]
  selectedBuildingId: string | null
  onSelectBuilding: (id: string) => void
}

export default function WeatherOverlay({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
}: WeatherOverlayProps) {
  return (
    <>
      {buildings.map((b) => {
        const color = getWeatherColor(b.weatherScore)
        const radius = getMarkerRadius(b.weeklyStudents)
        const isSelected = selectedBuildingId === b.id

        return (
          <CircleMarker
            key={`weather-${b.id}`}
            center={[b.lat, b.lng]}
            radius={isSelected ? radius + 4 : radius}
            pathOptions={{
              color: isSelected ? '#0033A0' : color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => onSelectBuilding(b.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]}>
              <div className="text-xs">
                <p className="font-semibold">{b.name}</p>
                <p className="text-gray-500">
                  {getWeatherLabel(b.weatherScore)} · {b.weeklyStudents} students/wk
                </p>
                {b.peakHours.length > 0 && (
                  <p className="text-gray-400">
                    Peak: {b.peakHours.slice(0, 2).map(formatHour).join(', ')}
                  </p>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </>
  )
}
