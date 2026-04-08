'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'

// Module-level cache — persists across SPA navigations within the same session.
// Prevents 4 separate pages from re-fetching the same standards list.
let cached: Record<string, unknown>[] | null = null
let inflight: Promise<Record<string, unknown>[]> | null = null
const CACHE_TTL = 60_000 // 60 seconds
let cachedAt = 0

export function useAccreditationStandards() {
  const { currentUser } = useAuth()
  const [standards, setStandards] = useState<Record<string, unknown>[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached || Date.now() - cachedAt > CACHE_TTL)

  useEffect(() => {
    if (!currentUser) return

    const fresh = cached && Date.now() - cachedAt <= CACHE_TTL
    if (fresh) {
      setStandards(cached!)
      setLoading(false)
      return
    }

    if (!inflight) {
      inflight = apiFetch<{ standards: Record<string, unknown>[] }>(
        currentUser.email,
        '/api/accreditation/standards',
      )
        .then(d => {
          cached = d.standards ?? []
          cachedAt = Date.now()
          return cached
        })
        .finally(() => {
          inflight = null
        })
    }

    inflight.then(s => {
      setStandards(s)
      setLoading(false)
    })
  }, [currentUser])

  return { standards, loading }
}
