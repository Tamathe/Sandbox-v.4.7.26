'use client'

import dynamic from 'next/dynamic'
import { BarChart2 } from 'lucide-react'

interface CourseEngagement {
  id: string
  name: string
  totalStudents: number
  weeks: Array<{ weekOf: string; engagement: number }>
}

interface Props {
  courses: CourseEngagement[]
  loading: boolean
}

const EngagementTrendChart = dynamic(
  () => import('./EngagementTrendChart').then(m => m.EngagementTrendChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-xl bg-gray-100" /> }
)

export default function EngagementTrendCard({ courses, loading }: Props) {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="size-5 text-indigo-600" />
        <h2 className="font-extrabold text-gray-900 text-sm">Engagement Trends</h2>
        <span className="text-[10px] text-gray-400 ml-auto">8 weeks</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse">
              <div className="size-32 bg-gray-200 rounded mb-2" />
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <BarChart2 className="size-8 mb-2 opacity-50" />
          <p className="text-sm">No engagement data yet</p>
        </div>
      ) : (
        <EngagementTrendChart courses={courses} />
      )}
    </div>
  )
}
