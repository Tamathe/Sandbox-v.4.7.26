'use client'

import { CircleMarker, Popup } from 'react-leaflet'
import type { MapEvent } from './campus-map-utils'

interface EventMarkerProps {
  event: MapEvent
}

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function EventMarker({ event }: EventMarkerProps) {
  if (event.latitude == null || event.longitude == null) return null

  return (
    <CircleMarker
      center={[event.latitude, event.longitude]}
      radius={6}
      pathOptions={{
        color: '#DC2626',
        fillColor: '#FCA5A5',
        fillOpacity: 0.9,
        weight: 2,
      }}
    >
      <Popup>
        <div className="min-w-[200px]">
          <p className="font-bold text-sm text-gray-900">{event.name}</p>
          <p className="text-xs text-gray-500">
            {formatEventDate(event.startsOn)} – {formatEventDate(event.endsOn)}
          </p>
          {event.location && (
            <p className="text-xs text-gray-400 mt-0.5">at {event.location}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            Hosted by: {event.organizationName}
          </p>
        </div>
      </Popup>
    </CircleMarker>
  )
}
