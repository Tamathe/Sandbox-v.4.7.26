'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MyAppsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/build?tab=drafts')
  }, [router])
  return null
}
