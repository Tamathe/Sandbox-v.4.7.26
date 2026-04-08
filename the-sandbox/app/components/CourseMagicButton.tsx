'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

export function CourseMagicButton({
  courseId,
  disabled,
  disabledReason,
}: {
  courseId: string
  disabled?: boolean
  disabledReason?: string
}) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (disabled || loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/generate-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create teaching assistant')
      }

      if (data.toolId) {
        router.push(`/tools/${data.toolId}?courseId=${encodeURIComponent(courseId)}&launch=true`)
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create teaching assistant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      title={disabled ? disabledReason : undefined}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
        disabled
          ? 'cursor-not-allowed bg-emerald-300'
          : 'bg-emerald-600 hover:bg-emerald-700'
      } disabled:opacity-70`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {loading ? 'Creating...' : 'Create AI Teaching Assistant'}
    </button>
  )
}
