'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import { getPageStarters, readCourseContext } from '../components/concierge/concierge-utils'

/**
 * Fetches dynamic AI-generated page suggestions from Sandy (Haiku).
 * Falls back to static `getPageStarters()` instantly while the async
 * call is in flight, or if it fails / takes too long.
 */
export function usePageSuggestions(): string[] {
  const pathname = usePathname()
  const { currentUser } = useAuth()
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastPathRef = useRef<string>('')

  useEffect(() => {
    // Reset dynamic suggestions on page change
    if (pathname !== lastPathRef.current) {
      setDynamicSuggestions(null)
      lastPathRef.current = pathname
    }

    if (!currentUser?.email) return

    // Abort any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const courseContext = readCourseContext()
    const params = new URLSearchParams({ page: pathname })
    if (courseContext?.courseCode) params.set('courseCode', courseContext.courseCode)
    if (courseContext?.title) params.set('courseTitle', courseContext.title)

    // 2s timeout — if Haiku doesn't respond, keep static suggestions
    const timeout = setTimeout(() => controller.abort(), 2000)

    fetch(`/api/sandy/suggestions?${params.toString()}`, {
      headers: { 'x-demo-user-email': currentUser.email },
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error('fetch failed')
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data.suggestions) && data.suggestions.length === 4) {
          setDynamicSuggestions(data.suggestions)
        }
      })
      .catch(() => {
        // Silently keep static fallback — this is non-critical
      })
      .finally(() => {
        clearTimeout(timeout)
      })

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [pathname, currentUser?.email])

  // Return dynamic suggestions if available, otherwise static fallback
  return dynamicSuggestions ?? getPageStarters(pathname, currentUser?.role)
}
