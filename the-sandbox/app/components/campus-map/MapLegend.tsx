'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ALL_BUILDING_TYPES, BUILDING_TYPE_COLORS, BUILDING_TYPE_LABELS } from './campus-map-utils'

export default function MapLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-3 right-3 z-[1000]">
      {open ? (
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg border p-3 min-w-[150px]">
          <button
            onClick={() => setOpen(false)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-2 hover:text-gray-700 transition-colors"
          >
            Legend <ChevronDown className="size-3" />
          </button>
          <div className="space-y-1.5">
            {ALL_BUILDING_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: BUILDING_TYPE_COLORS[type] }}
                />
                <span className="text-xs text-gray-600">{BUILDING_TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-white/95 backdrop-blur rounded-xl shadow-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1"
        >
          Legend <ChevronUp className="size-3" />
        </button>
      )}
    </div>
  )
}
