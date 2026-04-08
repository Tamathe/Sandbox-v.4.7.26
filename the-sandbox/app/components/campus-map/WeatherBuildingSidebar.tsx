'use client'

import { Thermometer, TrendingUp, TrendingDown, Minus, BookOpen, Users, Clock, Utensils, Volume2, VolumeX, Volume1 } from 'lucide-react'
import type { WeatherBuildingData } from '../../lib/weather-map/types'
import { getWeatherColor, getWeatherLabel, getWeatherEmoji, formatHour } from '../../lib/weather-map/weather-utils'

interface WeatherBuildingSidebarProps {
  weatherData: WeatherBuildingData | null
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'heating') return <TrendingUp className="size-3.5 text-red-500" />
  if (trend === 'cooling') return <TrendingDown className="size-3.5 text-blue-500" />
  return <Minus className="size-3.5 text-gray-400" />
}

function NoiseIcon({ level }: { level: string | null }) {
  if (level === 'quiet') return <VolumeX className="size-3.5 text-green-500" />
  if (level === 'loud') return <Volume2 className="size-3.5 text-red-500" />
  return <Volume1 className="size-3.5 text-yellow-600" />
}

export default function WeatherBuildingSidebar({ weatherData }: WeatherBuildingSidebarProps) {
  if (!weatherData) return null

  const label = getWeatherLabel(weatherData.weatherScore)
  const color = getWeatherColor(weatherData.weatherScore)
  const emoji = getWeatherEmoji(weatherData.weatherScore)

  return (
    <div className="space-y-3">
      {/* Weather badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="size-4" style={{ color }} />
          <span className="text-sm font-semibold" style={{ color }}>
            {emoji} {label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <TrendIcon trend={weatherData.weatherTrend} />
          <span className="capitalize">{weatherData.weatherTrend}</span>
        </div>
      </div>

      {/* This Week stats */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">This Week</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-3 text-gray-400" />
            <span className="text-xs text-gray-700">{weatherData.weeklySessions} sessions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3 text-gray-400" />
            <span className="text-xs text-gray-700">{weatherData.weeklyStudents} students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 text-gray-400" />
            <span className="text-xs text-gray-700">Avg {Math.round(weatherData.avgMinutes)} min</span>
          </div>
          {weatherData.peakHours.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="size-3 text-gray-400" />
              <span className="text-xs text-gray-700">
                Peak {weatherData.peakHours.slice(0, 2).map(formatHour).join('–')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Top Courses */}
      {weatherData.topCourses.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 mb-1">Top Courses</p>
          <p className="text-xs text-gray-600">{weatherData.topCourses.join(', ')}</p>
        </div>
      )}

      {/* Top Study Modes */}
      {weatherData.topModes.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 mb-1">Top Modes</p>
          <div className="flex flex-wrap gap-1">
            {weatherData.topModes.map((m) => (
              <span key={m} className="px-2 py-0.5 rounded-full bg-blue-50 text-[11px] text-[#0033A0] font-medium capitalize">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Avg Score */}
      {weatherData.avgSessionScore != null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Avg Score</span>
          <span className="text-xs font-semibold text-gray-700">{Math.round(weatherData.avgSessionScore)}%</span>
        </div>
      )}

      {/* Environment */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <NoiseIcon level={weatherData.noiseLevel} />
          <span className="text-[11px] text-gray-500 capitalize">{weatherData.noiseLevel ?? 'Unknown'}</span>
        </div>
        {weatherData.hasStudySpaces && (
          <span className="text-[11px] text-gray-500">📚 Study spaces</span>
        )}
        {weatherData.hasFood && (
          <div className="flex items-center gap-1">
            <Utensils className="size-3 text-gray-400" />
            <span className="text-[11px] text-gray-500">Food nearby</span>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-gray-400 leading-tight border-t border-gray-100 pt-2">
        ⚠ Estimated from session patterns — not real-time occupancy data
      </p>
    </div>
  )
}
