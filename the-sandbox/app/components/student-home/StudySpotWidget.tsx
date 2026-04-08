'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { StudyRecommendation } from '../../lib/weather-map/types'
import { getWeatherEmoji, getWeatherLabel, formatHour } from '../../lib/weather-map/weather-utils'

export default function StudySpotWidget() {
  const { currentUser } = useAuth()
  const [recs, setRecs] = useState<StudyRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<StudyRecommendation[]>(
      currentUser.email,
      '/api/weather-map/recommendations',
      { signal: controller.signal },
    )
      .then(setRecs)
      .catch((err) => {
        if (err.name !== 'AbortError') setRecs([])
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser.email])

  if (loading || recs.length === 0) return null

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-[#0033A0]/10">
            <MapPin className="size-4 text-[#0033A0]" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-900">Study Spots for You</h3>
        </div>
        <Link
          href="/campus-map"
          className="text-xs text-[#0033A0] font-semibold hover:underline flex items-center gap-0.5"
        >
          View on map
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        {recs.slice(0, 3).map((rec, i) => (
          <div
            key={rec.buildingId}
            className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl"
          >
            <span className="text-sm font-semibold text-gray-400 mt-0.5 w-4 shrink-0">
              {i + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {rec.buildingName}
                </span>
                <span className="text-xs shrink-0">
                  {getWeatherEmoji(rec.weatherScore)} {getWeatherLabel(rec.weatherScore)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
              {rec.peakHours.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Peak: {rec.peakHours.slice(0, 2).map(formatHour).join('–')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-gray-400 leading-tight">
        Estimated from session patterns — not real-time occupancy data
      </p>
    </div>
  )
}
