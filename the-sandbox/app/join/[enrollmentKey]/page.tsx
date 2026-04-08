'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

export default function JoinCoursePage() {
  const router = useRouter()
  const params = useParams<{ enrollmentKey: string }>()
  const { currentUser } = useAuth()

  useEffect(() => {
    const key = params.enrollmentKey
    if (!key) return

    fetch(`/api/courses/join/${key}`, {
      headers: { 'x-demo-user-email': currentUser.email },
      redirect: 'follow',
    })
      .then(async (res) => {
        if (res.ok || res.redirected) {
          // Extract courseId from the redirect URL if possible, else go home
          const url = res.url
          const match = url.match(/\/courses\/([^/]+)/)
          if (match) {
            router.push(`/courses/${match[1]}`)
          } else {
            router.push('/')
          }
        } else {
          router.push('/?join-error=1')
        }
      })
      .catch(() => router.push('/?join-error=1'))
  }, [params.enrollmentKey, currentUser.email, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="size-8 animate-spin text-[#0033A0] mx-auto" />
        <p className="text-sm text-gray-600">Joining course...</p>
      </div>
    </div>
  )
}
