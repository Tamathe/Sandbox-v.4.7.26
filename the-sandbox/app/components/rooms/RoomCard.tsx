'use client'

import { MapPin, Users, Monitor, Video, Mic, Presentation } from 'lucide-react'

interface Room {
  id: string
  name: string
  building: string
  buildingCode: string
  floor: number
  capacity: number
  amenities: string[]
}

interface RoomSlot {
  startTime: string
  endTime: string
  available: boolean
}

const AMENITY_ICONS: Record<string, typeof Monitor> = {
  projector: Presentation,
  'video-conf': Video,
  microphone: Mic,
  'av-system': Monitor,
}

interface RoomCardProps {
  room: Room
  availableSlots: RoomSlot[]
  onBook: (roomId: string, slot: RoomSlot) => void
}

export default function RoomCard({ room, availableSlots, onBook }: RoomCardProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">{room.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="size-3.5 text-gray-400" />
            <span className="text-sm text-gray-500">{room.building}, Floor {room.floor}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1">
          <Users className="size-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{room.capacity}</span>
        </div>
      </div>

      {/* Amenities */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {room.amenities.map(a => {
          const Icon = AMENITY_ICONS[a]
          return (
            <span key={a} className="inline-flex items-center gap-1 text-xs font-medium bg-[#0033A0]/5 text-[#0033A0] px-2 py-0.5 rounded-full">
              {Icon && <Icon className="size-3" />}
              {a.replace(/-/g, ' ')}
            </span>
          )
        })}
      </div>

      {/* Available time slots */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">{availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''} available</p>
        <div className="flex flex-wrap gap-1.5">
          {availableSlots.slice(0, 6).map(slot => (
            <button
              key={`${slot.startTime}-${slot.endTime}`}
              type="button"
              onClick={() => onBook(room.id, slot)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
            >
              {slot.startTime}–{slot.endTime}
            </button>
          ))}
          {availableSlots.length > 6 && (
            <span className="text-xs text-gray-400 py-1.5">+{availableSlots.length - 6} more</span>
          )}
        </div>
      </div>
    </div>
  )
}
