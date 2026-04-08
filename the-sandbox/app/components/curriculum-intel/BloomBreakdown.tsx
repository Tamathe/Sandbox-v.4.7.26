'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from '../DynamicChart'
import type { BloomLevel } from '../../lib/curriculum-intel/types'
import { BLOOM_LEVELS, BLOOM_COLORS } from '../../lib/curriculum-intel/types'

interface DepartmentBloomData {
  department: string
  counts: Record<BloomLevel, number>
  total: number
}

interface BloomBreakdownProps {
  data: DepartmentBloomData[]
}

export default function BloomBreakdown({ data }: BloomBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="border rounded-2xl shadow-sm bg-white p-8 text-center text-gray-400">
        No Bloom taxonomy data available yet.
      </div>
    )
  }

  // Transform for recharts
  const chartData = data.map(d => ({
    department: d.department.length > 15 ? d.department.slice(0, 15) + '...' : d.department,
    ...d.counts,
  }))

  return (
    <div className="border rounded-2xl shadow-sm bg-white">
      <div className="p-4 border-b">
        <h2 className="text-lg font-extrabold text-gray-900">
          Department Bloom Breakdown
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Distribution of Bloom taxonomy levels across departments
        </p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {BLOOM_LEVELS.map(bl => (
              <Bar
                key={bl}
                dataKey={bl}
                stackId="bloom"
                fill={BLOOM_COLORS[bl]}
                name={bl.charAt(0).toUpperCase() + bl.slice(1)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
