'use client'

import { Building, Users } from 'lucide-react'
import type { RoomRecommendation } from '../../lib/enrollment-forecast/types'

interface RoomRecommendationListProps {
  courseCode: string
  recommendations: RoomRecommendation[]
  onClose?: () => void
}

export default function RoomRecommendationList({
  courseCode,
  recommendations,
  onClose,
}: RoomRecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="border rounded-2xl shadow-sm p-5">
        <p className="text-gray-500 text-sm">No room recommendations available for {courseCode}.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-lg">Room Recommendations — {courseCode}</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">
            Close
          </button>
        )}
      </div>

      <div className="space-y-3">
        {recommendations.map((room, i) => (
          <div
            key={room.roomId}
            className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#0033A0]/10 text-[#0033A0] font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Building className="size-4 text-gray-400" />
                <span className="font-semibold text-sm">
                  {room.buildingName} — {room.roomName}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{room.reason}</p>
            </div>
            <div className="text-right text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="size-3" />
                <span>{room.capacity}</span>
              </div>
              <p className="text-xs text-gray-400">
                {Math.round(room.utilizationRate * 100)}% util
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
