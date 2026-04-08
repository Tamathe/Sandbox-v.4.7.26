'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Business } from '../../lib/philanthropy/types'

interface BusinessMapProps {
  businesses: Business[]
  selectedNames: Set<string>
  onSelectBusiness: (biz: Business) => void
}

const LIKELINESS_COLORS: Record<string, string> = {
  High: '#16a34a',   // green-600
  Medium: '#d97706', // amber-600
  Low: '#dc2626',    // red-600
}

function FitBounds({ businesses }: { businesses: Business[] }) {
  const map = useMap()

  useEffect(() => {
    if (businesses.length === 0) return
    const bounds = businesses.map(
      (b) => [b.latitude, b.longitude] as [number, number],
    )
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [businesses, map])

  return null
}

export default function BusinessMap({
  businesses,
  selectedNames,
  onSelectBusiness,
}: BusinessMapProps) {
  if (businesses.length === 0) return null

  const center: [number, number] = [
    businesses[0].latitude,
    businesses[0].longitude,
  ]

  return (
    <div className="h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds businesses={businesses} />
        {businesses.map((biz, idx) => {
          const isSelected = selectedNames.has(biz.name)
          const color = LIKELINESS_COLORS[biz.likeliness] || LIKELINESS_COLORS.Medium

          return (
            <CircleMarker
              key={biz.name}
              center={[biz.latitude, biz.longitude]}
              radius={isSelected ? 10 : 7}
              pathOptions={{
                fillColor: color,
                color: isSelected ? '#0033A0' : '#ffffff',
                weight: isSelected ? 3 : 2,
                fillOpacity: 0.85,
              }}
              eventHandlers={{
                click: () => onSelectBusiness(biz),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs font-medium">
                  <span className="font-bold">{idx + 1}.</span> {biz.name}
                  <br />
                  <span className="text-gray-500">{biz.type}</span>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
