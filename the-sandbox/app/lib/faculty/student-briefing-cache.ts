// Simple in-memory cache for StudentBriefing data.
// Prevents duplicate fetches when the same student is expanded in
// OfficeHoursCard, RecommendationTable, or hovered for prefetch.

import type { StudentBriefing } from './homepage-types'

const cache = new Map<string, { data: StudentBriefing; ts: number }>()
const inflight = new Map<string, Promise<StudentBriefing | null>>()

const TTL = 5 * 60 * 1000 // 5 minutes

function cacheKey(studentId: string, studentName: string) {
  return `${studentId}::${studentName}`
}

export function getCachedBriefing(studentId: string, studentName: string): StudentBriefing | null {
  const entry = cache.get(cacheKey(studentId, studentName))
  if (entry && Date.now() - entry.ts < TTL) return entry.data
  return null
}

export function fetchBriefing(
  studentId: string,
  studentName: string,
  userEmail: string,
): Promise<StudentBriefing | null> {
  const key = cacheKey(studentId, studentName)

  // Return cached if fresh
  const cached = getCachedBriefing(studentId, studentName)
  if (cached) return Promise.resolve(cached)

  // Deduplicate in-flight requests
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = fetch(
    `/api/faculty/student-briefing?studentId=${studentId}&studentName=${encodeURIComponent(studentName)}`,
    { headers: { 'x-demo-user-email': userEmail } },
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((data: StudentBriefing | null) => {
      if (data) cache.set(key, { data, ts: Date.now() })
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

export function invalidateBriefing(studentId: string, studentName: string) {
  cache.delete(cacheKey(studentId, studentName))
}

/** Prefetch on hover — fire-and-forget, populates cache for instant expand */
export function prefetchBriefing(studentId: string, studentName: string, userEmail: string) {
  fetchBriefing(studentId, studentName, userEmail)
}
