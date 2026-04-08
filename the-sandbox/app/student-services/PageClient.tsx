'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function StudentServicesRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/university-systems?tab=guidance')
  }, [router])
  return null
}
