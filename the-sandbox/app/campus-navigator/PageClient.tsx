'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CampusNavigatorRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/university-systems?tab=planning')
  }, [router])
  return null
}
