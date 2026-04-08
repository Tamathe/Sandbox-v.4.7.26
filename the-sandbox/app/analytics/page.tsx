'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth-context'

export default function AnalyticsPage() {
  const router = useRouter()
  const { currentUser } = useAuth()

  useEffect(() => {
    if (currentUser.role === 'STUDENT') {
      router.replace('/analytics/student')
    } else {
      router.replace('/analytics/faculty')
    }
  }, [router, currentUser.role])

  return null
}
