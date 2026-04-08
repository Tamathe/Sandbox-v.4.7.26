'use client'

import { CircleMarker, Tooltip } from 'react-leaflet'
import { BUILDING_TYPE_COLORS } from './campus-map-utils'
import type { MapBuilding } from './campus-map-utils'

interface BuildingMarkerProps {
  building: MapBuilding
  isMyBuilding: boolean
  isSelected: boolean
  onSelect: (b: MapBuilding) => void
}

export default function BuildingMarker({ building, isMyBuilding, isSelected, onSelect }: BuildingMarkerProps) {
  const color = BUILDING_TYPE_COLORS[building.type]

  return (
    <CircleMarker
      center={[building.latitude, building.longitude]}
      radius={isSelected ? 11 : isMyBuilding ? 9 : 7}
      pathOptions={{
        color: isSelected ? '#0033A0' : isMyBuilding ? '#0033A0' : color,
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.8,
        weight: isSelected ? 3 : isMyBuilding ? 3 : 1.5,
      }}
      eventHandlers={{
        click: () => onSelect(building),
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        <span className="text-xs font-medium">{building.shortName ?? building.name}</span>
      </Tooltip>
    </CircleMarker>
  )
}
