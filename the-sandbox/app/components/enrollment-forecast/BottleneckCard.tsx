'use client'

import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { EnrollmentForecastRecord } from '../../lib/enrollment-forecast/types'

interface BottleneckCardProps {
  forecast: EnrollmentForecastRecord
  onViewRooms?: (courseCode: string) => void
}

export default function BottleneckCard({ forecast, onViewRooms }: BottleneckCardProps) {
  const isBottleneck = forecast.riskLevel === 'bottleneck'
  const isOverCapacity = forecast.riskLevel === 'over-capacity'

  const TrendIcon =
    forecast.historicalTrend === 'growing'
      ? TrendingUp
      : forecast.historicalTrend === 'declining'
        ? TrendingDown
        : Minus

  return (
    <div className="border rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {(isBottleneck || isOverCapacity) && (
            <AlertTriangle
              className={`size-5 ${isBottleneck ? 'text-red-500' : 'text-amber-500'}`}
            />
          )}
          <h3 className="font-extrabold text-lg">{forecast.courseCode}</h3>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            isBottleneck
              ? 'bg-red-100 text-red-700'
              : isOverCapacity
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
          }`}
        >
          {forecast.riskLevel.replace('-', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
        <div>
          <p className="text-gray-500">Predicted</p>
          <p className="font-bold text-lg">{forecast.predictedEnrollment}</p>
        </div>
        <div>
          <p className="text-gray-500">Capacity</p>
          <p className="font-bold text-lg">{forecast.currentCapacity}</p>
        </div>
        <div>
          <p className="text-gray-500">Gap</p>
          <p
            className={`font-bold text-lg ${
              forecast.capacityGap > 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {forecast.capacityGap > 0 ? '+' : ''}
            {forecast.capacityGap}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span>Degree demand: {forecast.degreeAuditDemand}</span>
        <span className="flex items-center gap-1">
          <TrendIcon className="size-3" />
          {forecast.historicalTrend} trend
        </span>
        {forecast.waitlistHistory > 0 && <span>{forecast.waitlistHistory} avg waitlist</span>}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          Recommend: {forecast.predictedSections} sections · Confidence:{' '}
          {Math.round(forecast.confidenceLevel * 100)}%
        </span>
        {onViewRooms && (
          <button
            onClick={() => onViewRooms(forecast.courseCode)}
            className="text-[#0033A0] hover:underline font-medium"
          >
            View rooms →
          </button>
        )}
      </div>
    </div>
  )
}
