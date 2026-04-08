'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Utensils, ArrowRight } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface DiningLocationData {
  id: string
  name: string
  building: string
  type: string
  mealPlanAccepted: boolean
}

interface DiningStatusItem {
  location: DiningLocationData
  isOpenNow: boolean
  currentMeal: string | null
  closesAt: string | null
  nextOpens: string | null
}

export default function DiningWidget() {
  const { currentUser } = useAuth()
  const [statuses, setStatuses] = useState<DiningStatusItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.email) return
    fetch('/api/dining', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setStatuses(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentUser?.email])

  if (loading) {
    return (
      <div className="border rounded-2xl shadow-sm bg-white p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-100 rounded mb-3" />
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-10 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (statuses.length === 0) return null

  const displayed = statuses.slice(0, 4)

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Utensils className="size-4 text-[#0033A0]" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dining Now</h3>
        </div>
        <Link
          href="/campus-life"
          className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
        >
          See all <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {displayed.map(status => (
          <div
            key={status.location.id}
            className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span
              className={`size-2 rounded-full flex-shrink-0 ${
                status.isOpenNow ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {status.location.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {status.isOpenNow ? (
                  <>
                    <span className="text-emerald-600 font-medium">Open</span>
                    {status.currentMeal && <> · {status.currentMeal}</>}
                    {status.closesAt && <> until {status.closesAt}</>}
                  </>
                ) : (
                  <>
                    <span className="text-gray-400">Closed</span>
                    {status.nextOpens && <> · Opens {status.nextOpens}</>}
                  </>
                )}
              </p>
            </div>
            {status.location.mealPlanAccepted && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0033A0] flex-shrink-0">
                Meal Plan
              </span>
            )}
          </div>
        ))}
      </div>

      {statuses.length > 4 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          +{statuses.length - 4} more locations
        </p>
      )}
    </div>
  )
}
