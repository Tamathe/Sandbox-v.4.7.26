'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function StudioRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/build')
  }, [router])
  return null
}
