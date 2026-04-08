'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { FileText, ChevronRight, Calendar, Plus, Loader2 } from 'lucide-react'

interface DebriefSummary {
  id: string
  title: string | null
  lectureDate: string
  status: string
  publishedAt: string | null
  conceptCount: number
}

export default function LectureDebriefSection({ courseId }: { courseId: string }) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [debriefs, setDebriefs] = useState<DebriefSummary[]>([])
  const [loading, setLoading] = useState(true)

  const isEducator = currentUser?.role === 'EDUCATOR' || currentUser?.role === 'ADMIN'

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    fetch(`/api/lecture-debrief?courseId=${courseId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => setDebriefs(data.debriefs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [courseId, currentUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (debriefs.length === 0 && !isEducator) return null

  return (
    <div className="space-y-2">
      {debriefs.slice(0, 3).map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => router.push(`/lecture-debrief/${d.id}`)}
          className="w-full text-left p-3 rounded-2xl border-2 border-gray-200 hover:border-[#0033A0] bg-white transition-colors cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="size-4 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#0033A0] truncate">
                {d.title || 'Lecture Debrief'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="size-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {new Date(d.lectureDate).toLocaleDateString()}
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{d.conceptCount} concepts</span>
              </div>
            </div>
          </div>
          <ChevronRight className="size-4 text-gray-300 group-hover:text-[#0033A0] shrink-0" />
        </button>
      ))}

      {debriefs.length > 3 && (
        <button
          type="button"
          onClick={() => router.push(`/lecture-debrief?courseId=${courseId}`)}
          className="text-xs text-[#0033A0] font-medium hover:underline cursor-pointer"
        >
          View all {debriefs.length} debriefs
        </button>
      )}

      {isEducator && (
        <button
          type="button"
          onClick={() => router.push(`/lecture-debrief?courseId=${courseId}`)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#0033A0] text-sm font-semibold text-gray-500 hover:text-[#0033A0] transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          New Debrief
        </button>
      )}
    </div>
  )
}
