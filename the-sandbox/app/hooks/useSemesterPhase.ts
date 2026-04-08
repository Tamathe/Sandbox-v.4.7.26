'use client'

import { useEffect, useState } from 'react'

export type SemesterPhase = 'setup' | 'active' | 'late'

interface CourseMapWeek {
  weekNumber: number
  title: string
  startDate: string | null
  endDate: string | null
}

interface UseSemesterPhaseOptions {
  courseId: string
  userEmail: string
  materialsCount: number
  hasCourseMap: boolean
}

export function useSemesterPhase({
  courseId,
  userEmail,
  materialsCount,
  hasCourseMap,
}: UseSemesterPhaseOptions): SemesterPhase {
  const [weeks, setWeeks] = useState<CourseMapWeek[]>([])

  useEffect(() => {
    if (!hasCourseMap) return
    const controller = new AbortController()
    fetch(`/api/courses/${courseId}/course-map`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { courseMap?: { weeks?: CourseMapWeek[] } }) => {
        if (data.courseMap?.weeks) setWeeks(data.courseMap.weeks)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [courseId, userEmail, hasCourseMap])

  // Phase detection logic
  if (!hasCourseMap || materialsCount < 3) return 'setup'

  const now = new Date()
  const datedWeeks = weeks.filter((w) => w.startDate && w.endDate)
  if (datedWeeks.length === 0) return 'active'

  const allStartDates = datedWeeks.map((w) => new Date(w.startDate!).getTime())
  const allEndDates = datedWeeks.map((w) => new Date(w.endDate!).getTime())
  const semesterStart = Math.min(...allStartDates)
  const semesterEnd = Math.max(...allEndDates)
  const totalDuration = semesterEnd - semesterStart
  if (totalDuration <= 0) return 'active'

  const elapsed = now.getTime() - semesterStart
  const progress = elapsed / totalDuration

  if (progress < 0) return 'setup'
  if (progress >= 0.75) return 'late'
  return 'active'
}
