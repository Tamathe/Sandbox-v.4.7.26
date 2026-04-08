'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import BottleneckCard from './BottleneckCard'
import RoomRecommendationList from './RoomRecommendationList'
import DemandChart from './DemandChart'
import type { EnrollmentForecastRecord, RoomRecommendation } from '../../lib/enrollment-forecast/types'

const TERMS = ['Fall 2026', 'Spring 2027', 'Fall 2027']

interface TermForecastResponse {
  term: string
  total: number
  bottlenecks: EnrollmentForecastRecord[]
  overCapacity: EnrollmentForecastRecord[]
  underEnrolled: EnrollmentForecastRecord[]
  normal: EnrollmentForecastRecord[]
}

interface RoomResponse {
  courseCode: string
  term: string
  predictedEnrollment: number
  predictedSections: number
  recommendations: RoomRecommendation[]
}

export default function ForecastDashboard() {
  const { currentUser } = useAuth()
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0])
  const [data, setData] = useState<TermForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [roomData, setRoomData] = useState<RoomResponse | null>(null)
  const [roomLoading, setRoomLoading] = useState(false)

  const fetchForecasts = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<TermForecastResponse>(
        currentUser.email,
        `/api/enrollment-forecast/term/${encodeURIComponent(selectedTerm)}`
      )
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forecasts')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, selectedTerm])

  useEffect(() => {
    const controller = new AbortController()
    fetchForecasts()
    return () => controller.abort()
  }, [fetchForecasts])

  const handleViewRooms = async (courseCode: string) => {
    if (!currentUser?.email) return
    setSelectedCourse(courseCode)
    setRoomLoading(true)
    try {
      const result = await apiFetch<RoomResponse>(
        currentUser.email,
        `/api/enrollment-forecast/room-recommendations/${encodeURIComponent(courseCode)}?term=${encodeURIComponent(selectedTerm)}`
      )
      setRoomData(result)
    } catch {
      setRoomData(null)
    } finally {
      setRoomLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-4 border-[#0033A0] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-2xl shadow-sm p-5 bg-red-50 text-red-700">
        <p className="font-semibold">Error loading forecasts</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchForecasts}
          className="mt-3 text-sm text-[#0033A0] hover:underline font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  const allForecasts = [
    ...(data?.bottlenecks ?? []),
    ...(data?.overCapacity ?? []),
    ...(data?.underEnrolled ?? []),
    ...(data?.normal ?? []),
  ]

  return (
    <div className="space-y-6">
      {/* Term selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Term:</label>
        <select
          value={selectedTerm}
          onChange={(e) => {
            setSelectedTerm(e.target.value)
            setSelectedCourse(null)
            setRoomData(null)
          }}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          {TERMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          {data?.total ?? 0} courses forecasted
        </span>
      </div>

      {/* Bottleneck section */}
      {(data?.bottlenecks?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-extrabold text-xl mb-3 text-red-700">
            Bottlenecks ({data!.bottlenecks.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data!.bottlenecks.map((f) => (
              <BottleneckCard
                key={f.id}
                forecast={f}
                onViewRooms={handleViewRooms}
              />
            ))}
          </div>
        </section>
      )}

      {/* Over-capacity section */}
      {(data?.overCapacity?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-extrabold text-xl mb-3 text-amber-700">
            Over Capacity ({data!.overCapacity.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data!.overCapacity.map((f) => (
              <BottleneckCard
                key={f.id}
                forecast={f}
                onViewRooms={handleViewRooms}
              />
            ))}
          </div>
        </section>
      )}

      {/* Room recommendations panel */}
      {selectedCourse && (
        <section>
          {roomLoading ? (
            <div className="border rounded-2xl shadow-sm p-5 flex items-center justify-center">
              <div className="size-6 border-3 border-[#0033A0] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : roomData ? (
            <RoomRecommendationList
              courseCode={selectedCourse}
              recommendations={roomData.recommendations}
              onClose={() => {
                setSelectedCourse(null)
                setRoomData(null)
              }}
            />
          ) : null}
        </section>
      )}

      {/* Under-enrolled section */}
      {(data?.underEnrolled?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-extrabold text-xl mb-3 text-blue-700">
            Under-Enrolled ({data!.underEnrolled.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data!.underEnrolled.map((f) => (
              <BottleneckCard key={f.id} forecast={f} />
            ))}
          </div>
        </section>
      )}

      {/* Demand chart */}
      {allForecasts.length > 0 && (
        <DemandChart
          forecasts={allForecasts}
          title={`Enrollment Demand vs Capacity — ${selectedTerm}`}
        />
      )}

      {/* Empty state */}
      {data?.total === 0 && (
        <div className="border rounded-2xl shadow-sm p-10 text-center text-gray-500">
          <p className="text-lg font-semibold mb-2">No forecasts computed yet</p>
          <p className="text-sm">
            Run the enrollment forecast cron job to generate predictions for {selectedTerm}.
          </p>
        </div>
      )}
    </div>
  )
}
