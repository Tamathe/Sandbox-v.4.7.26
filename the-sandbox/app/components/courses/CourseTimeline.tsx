// app/components/courses/CourseTimeline.tsx
'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api-client'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'
import TimelineTrack from './TimelineTrack'
import TimelineChip from './TimelineChip'
import TimelineDetailPanel from './TimelineDetailPanel'
import type { CourseTimelineData, TimelineItem } from '../../lib/courses/timeline-service'

interface CourseTimelineProps {
  courseId: string
  userEmail: string
}

export default function CourseTimeline({ courseId, userEmail }: CourseTimelineProps) {
  const [data, setData] = useState<CourseTimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    apiFetch<CourseTimelineData>(userEmail, `/api/courses/${courseId}/timeline`, { signal: controller.signal })
      .then(result => {
        setData(result)
        setLoading(false)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to load timeline')
        setLoading(false)
      })

    return () => controller.abort()
  }, [courseId, userEmail])

  // Don't render if no data to show
  if (!loading && !error && data && data.weeks.length === 0) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20 bg-white border-b border-gray-200">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <ErrorBanner message={error} retry={() => { setError(null); setLoading(true) }} />
  }

  if (!data) return null

  return (
    <>
      {/* Desktop: full track */}
      <div className="hidden sm:block">
        <TimelineTrack
          weeks={data.weeks}
          items={data.items}
          currentWeek={data.currentWeek}
          semesterStart={data.semesterStart}
          semesterEnd={data.semesterEnd}
          onItemSelect={setSelectedItem}
          selectedItemId={selectedItem?.id ?? null}
        />
      </div>

      {/* Mobile: chip */}
      <div className="block sm:hidden px-4 pt-3">
        <TimelineChip
          weeks={data.weeks}
          items={data.items}
          currentWeek={data.currentWeek}
          onItemSelect={setSelectedItem}
        />
      </div>

      {/* Detail panel (shared between desktop and mobile) */}
      <TimelineDetailPanel
        item={selectedItem}
        courseId={courseId}
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}
