'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { EnrollmentForecastRecord } from '../../lib/enrollment-forecast/types'

interface DemandChartProps {
  forecasts: EnrollmentForecastRecord[]
  title?: string
}

export default function DemandChart({ forecasts, title = 'Enrollment Demand vs Capacity' }: DemandChartProps) {
  const chartData = forecasts
    .slice(0, 15) // Show top 15 courses
    .map((f) => ({
      course: f.courseCode,
      predicted: f.predictedEnrollment,
      capacity: f.currentCapacity,
      gap: f.capacityGap,
    }))

  if (chartData.length === 0) {
    return (
      <div className="border rounded-2xl shadow-sm p-5">
        <p className="text-gray-500 text-sm">No forecast data available for chart.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-2xl shadow-sm p-5">
      <h3 className="font-extrabold text-lg mb-4">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="course"
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#000" />
            <Bar dataKey="predicted" fill="#0033A0" name="Predicted" radius={[4, 4, 0, 0]} />
            <Bar dataKey="capacity" fill="#93c5fd" name="Current Capacity" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
