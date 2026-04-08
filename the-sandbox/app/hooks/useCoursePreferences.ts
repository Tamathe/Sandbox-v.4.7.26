import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api-client'

interface CoursePreferences {
  courseColors: Record<string, string>
  courseOrder: string[]
  pinnedCourseIds: string[]
}

const EMPTY: CoursePreferences = { courseColors: {}, courseOrder: [], pinnedCourseIds: [] }

/**
 * Fetches the user's course display preferences (colors, ordering, pinning).
 * Returns stable defaults while loading so consumers can render immediately.
 */
export function useCoursePreferences(email: string): CoursePreferences & { loading: boolean } {
  const [prefs, setPrefs] = useState<CoursePreferences>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<{ preferences: { courseColors: unknown; courseOrder: unknown; pinnedCourseIds: unknown } }>(
      email,
      '/api/sandy/preferences',
      { signal: controller.signal },
    )
      .then(res => {
        const p = res.preferences
        setPrefs({
          courseColors: (p.courseColors ?? {}) as Record<string, string>,
          courseOrder: (p.courseOrder ?? []) as string[],
          pinnedCourseIds: (p.pinnedCourseIds ?? []) as string[],
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [email])

  return { ...prefs, loading }
}

/**
 * Sort items by pinned-first, then custom order, then original order.
 * Works with any item shape — just provide an ID extractor.
 */
export function applyCourseOrder<T>(
  items: T[],
  getId: (item: T) => string,
  courseOrder: string[],
  pinnedCourseIds: string[],
): T[] {
  const pinSet = new Set(pinnedCourseIds)
  const orderMap = new Map(courseOrder.map((id, i) => [id, i]))

  const pinned: T[] = []
  const ordered: T[] = []
  const rest: T[] = []

  for (const item of items) {
    const id = getId(item)
    if (pinSet.has(id)) {
      pinned.push(item)
    } else if (orderMap.has(id)) {
      ordered.push(item)
    } else {
      rest.push(item)
    }
  }

  // Preserve pin order from pinnedCourseIds array
  pinned.sort((a, b) => pinnedCourseIds.indexOf(getId(a)) - pinnedCourseIds.indexOf(getId(b)))
  // Preserve custom order from courseOrder array
  ordered.sort((a, b) => (orderMap.get(getId(a)) ?? 0) - (orderMap.get(getId(b)) ?? 0))

  return [...pinned, ...ordered, ...rest]
}
