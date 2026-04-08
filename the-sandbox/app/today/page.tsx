'use client'

// ─── /today → Redirect to Homepage ──────────────────────────
// Sandy's morning briefing is now the faculty homepage experience.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TodayPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-gray-400">Redirecting to your homepage...</p>
    </div>
  )
}
