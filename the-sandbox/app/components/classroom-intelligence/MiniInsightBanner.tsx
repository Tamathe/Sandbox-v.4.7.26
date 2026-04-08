'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

export default function MiniInsightBanner() {
  const { currentUser } = useAuth()
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!currentUser?.email) return
    try {
      const res = await apiFetch<{ total: number }>(
        currentUser.email,
        '/api/classroom-intelligence/insights?viewed=false&limit=1',
      )
      setCount(res.total ?? 0)
    } catch {
      // silent
    }
  }, [currentUser?.email])

  useEffect(() => { fetchCount() }, [fetchCount])

  if (count === 0) return null

  return (
    <Link
      href="/analytics/teaching"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
    >
      <Lightbulb className="size-3.5 text-[#0033A0]" />
      <span className="text-xs font-semibold text-gray-700">
        {count} new teaching insight{count !== 1 ? 's' : ''}
      </span>
    </Link>
  )
}
