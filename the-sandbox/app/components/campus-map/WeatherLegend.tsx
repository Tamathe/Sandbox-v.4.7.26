'use client'

import { Thermometer } from 'lucide-react'
import { WEATHER_LEGEND_ITEMS } from '../../lib/weather-map/weather-utils'

export default function WeatherLegend() {
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Thermometer className="size-3.5 text-gray-500" />
        <span className="text-xs font-semibold text-gray-700">Learning Weather</span>
      </div>
      <div className="flex items-center gap-2">
        {WEATHER_LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-gray-400 leading-tight">
        Estimated from session patterns — not real-time occupancy data
      </p>
    </div>
  )
}
