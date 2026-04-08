'use client'

import { useEffect, useState } from 'react'
import { FileText, Wrench, BookOpen } from 'lucide-react'

interface EngagementSnapshotProps {
  courseId: string
  userEmail: string
  materialsCount: number
  linkedToolsCount: number
}

export default function EngagementSnapshot({
  courseId,
  userEmail,
  materialsCount,
  linkedToolsCount,
}: EngagementSnapshotProps) {
  const [submissionCount, setSubmissionCount] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/courses/${courseId}/submissions?limit=0`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { total?: number; submissions?: unknown[] }) => {
        setSubmissionCount(data.total ?? data.submissions?.length ?? 0)
      })
      .catch(() => setSubmissionCount(0))
    return () => controller.abort()
  }, [courseId, userEmail])

  const cards = [
    { label: 'Materials', value: materialsCount, icon: BookOpen },
    { label: 'Tools Linked', value: linkedToolsCount, icon: Wrench },
    { label: 'Submissions', value: submissionCount, icon: FileText },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="flex flex-col items-center rounded-xl bg-gray-50 px-3 py-3">
          <card.icon className="size-4 text-gray-400 mb-1" />
          <span className="text-lg font-bold text-gray-800 tabular-nums">
            {card.value === null ? '...' : card.value}
          </span>
          <span className="text-xs text-gray-500">{card.label}</span>
        </div>
      ))}
    </div>
  )
}
