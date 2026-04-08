'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AppsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/hub/browse?type=portfolio')
  }, [router])
  return null
}
