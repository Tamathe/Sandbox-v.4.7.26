// ─── useBriefing ────────────────────────────────────────────
// Shared hook for fetching the daily briefing (email, calendar, tasks).
// Used by all role-specific homepages for consistent briefing widgets.

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import type { BriefingData } from '../components/faculty-home/briefing-utils'

interface UseBriefingReturn {
  briefing: BriefingData | null
  loading: boolean
}

export function useBriefing(): UseBriefingReturn {
  const { currentUser } = useAuth()
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.email) return
    const controller = new AbortController()

    fetch('/api/briefing', {
      headers: { 'x-demo-user-email': currentUser.email },
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBriefing(data) })
      .catch(err => { if (err.name !== 'AbortError') console.error('[briefing]', err) })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [currentUser?.email])

  return { briefing, loading }
}
