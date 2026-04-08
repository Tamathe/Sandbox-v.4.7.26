'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { HelpCircle, ChevronRight, Loader2, Plus, MessageCircle } from 'lucide-react'

export default function OfficeHoursSection({ courseId }: { courseId: string }) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const isEducator = currentUser?.role === 'EDUCATOR' || currentUser?.role === 'ADMIN'

  const [queueCount, setQueueCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)

    if (isEducator) {
      fetch(`/api/office-hours/queue?courseId=${courseId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
        .then((r) => r.json())
        .then((data) => {
          setQueueCount(data.stats?.queueSize ?? 0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      fetch(`/api/office-hours?courseId=${courseId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
        .then((r) => r.json())
        .then((data) => {
          const pending = (data.questions || []).filter(
            (q: Record<string, unknown>) => !q.resolvedAt
          )
          setStudentCount(pending.length)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [courseId, currentUser, isEducator])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {isEducator ? (
        <button
          type="button"
          onClick={() => router.push(`/office-hours/faculty?courseId=${courseId}`)}
          className="w-full text-left p-3 rounded-2xl border-2 border-gray-200 hover:border-[#0033A0] bg-white transition-colors cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="size-4 text-gray-400 group-hover:text-[#0033A0]" />
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#0033A0]">
                Office Hours Queue
              </p>
              <p className="text-xs text-gray-500">
                {queueCount > 0
                  ? `${queueCount} question${queueCount !== 1 ? 's' : ''} waiting`
                  : 'All caught up'}
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-gray-300 group-hover:text-[#0033A0]" />
        </button>
      ) : (
        <>
          {studentCount > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/office-hours?courseId=${courseId}`)}
              className="w-full text-left p-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-[#0033A0] transition-colors cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="size-4 text-blue-500" />
                <p className="text-sm font-semibold text-blue-800">
                  {studentCount} pending question{studentCount !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronRight className="size-4 text-blue-300" />
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/office-hours?courseId=${courseId}`)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#0033A0] text-sm font-semibold text-gray-500 hover:text-[#0033A0] transition-colors cursor-pointer"
          >
            <Plus className="size-4" />
            Ask a Question
          </button>
        </>
      )}
    </div>
  )
}
