'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

export default function CrisisAlertButton() {
  const { currentUser } = useAuth()
  const [activeCount, setActiveCount] = useState(0)

  const canSee = currentUser.role === 'ADMIN' || currentUser.role === 'STAFF'

  useEffect(() => {
    if (!canSee) return

    let cancelled = false

    const fetchCount = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/crisis-comms/command-center/active-count', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          if (typeof data.count === 'number') setActiveCount(data.count)
        }
      } catch {}
    }

    void fetchCount()
    const interval = window.setInterval(fetchCount, 60_000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void fetchCount()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [canSee, currentUser.email])

  if (!canSee) return null

  return (
    <Link
      href="/crisis-comms/command-center"
      title="Crisis Command Center"
      className={`relative inline-flex items-center justify-center size-9 rounded-lg transition-colors ${
        activeCount > 0
          ? 'text-red-600 hover:bg-red-50 animate-pulse'
          : 'text-red-400 hover:text-red-600 hover:bg-red-50'
      }`}
    >
      <ShieldAlert className="size-[18px]" />
      {activeCount > 0 && (
        <>
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 py-px text-[9px] font-bold text-white leading-none">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
          <span className="absolute inset-0 rounded-lg ring-2 ring-red-400/50 animate-ping pointer-events-none" />
        </>
      )}
    </Link>
  )
}
