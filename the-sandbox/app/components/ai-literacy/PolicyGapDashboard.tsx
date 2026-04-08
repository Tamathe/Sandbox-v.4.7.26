'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface GapItem {
  courseId: string
  courseCode: string
  title: string
  instructorName: string
  hasAIPolicy: boolean
}

interface GapData {
  items: GapItem[]
  total: number
  withPolicy: number
  coverage: number
}

export default function PolicyGapDashboard() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<GapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/policy?view=gap', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) setData(await res.json())
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [currentUser.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
        <p className="text-sm text-gray-600">No courses found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coverage summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-2xl shadow-sm text-center">
          <p className="text-2xl font-extrabold text-gray-900">{data.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Courses</p>
        </div>
        <div className="p-4 bg-white border rounded-2xl shadow-sm text-center">
          <p className="text-2xl font-extrabold text-green-600">{data.withPolicy}</p>
          <p className="text-xs text-gray-500 mt-1">With AI Policy</p>
        </div>
        <div className="p-4 bg-white border rounded-2xl shadow-sm text-center">
          <p className={`text-2xl font-extrabold ${data.coverage >= 80 ? 'text-green-600' : data.coverage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {data.coverage}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Coverage</p>
        </div>
      </div>

      {/* Coverage bar */}
      <div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${data.coverage >= 80 ? 'bg-green-500' : data.coverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${data.coverage}%` }}
          />
        </div>
      </div>

      {/* Course list */}
      <div className="space-y-2">
        {data.items.map(item => (
          <div key={item.courseId} className="flex items-center justify-between p-3 bg-white border rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              {item.hasAIPolicy ? (
                <CheckCircle className="size-4 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-amber-500 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-900">{item.courseCode}</span>
                <span className="text-gray-400 mx-1.5">—</span>
                <span className="text-sm text-gray-600 truncate">{item.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentUser.role === 'ADMIN' && (
                <span className="text-xs text-gray-400">{item.instructorName}</span>
              )}
              {item.hasAIPolicy ? (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <FileText className="size-3" /> Policy
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  No policy
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
