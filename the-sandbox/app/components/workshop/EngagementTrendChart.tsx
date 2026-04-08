'use client'

import React from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from '../DynamicChart'

interface CourseEngagement {
  id: string
  name: string
  totalStudents: number
  weeks: Array<{ weekOf: string; engagement: number }>
}

function formatWeekLabel(weekOf: string) {
  const d = new Date(weekOf + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function EngagementTrendChartInner({ courses }: { courses: CourseEngagement[] }) {
  return (
    <div className="space-y-4">
      {courses.map(course => {
        const data = [...course.weeks].reverse()
        return (
          <div key={course.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">
                {course.name}
              </span>
              <span className="text-[10px] text-gray-400">
                {course.totalStudents} students
              </span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id={`grad-${course.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0033A0" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0033A0" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="weekOf"
                    tickFormatter={formatWeekLabel}
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatWeekLabel(String(label))}
                    formatter={(value) => [`${value}%`, 'Engagement']}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="#0033A0"
                    strokeWidth={2}
                    fill={`url(#grad-${course.id})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const EngagementTrendChart = React.memo(EngagementTrendChartInner)
