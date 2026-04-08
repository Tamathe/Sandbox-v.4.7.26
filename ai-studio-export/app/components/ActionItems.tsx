'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

type QuestItem = {
  id: string
  title: string
  description: string
  progress: number
  targetValue: number
  completedAt: string | null
}

type QuestResponse = {
  daily?: QuestItem[]
  weekly?: QuestItem[]
}

type ActionItem = {
  id: string
  label: string
  description: string
  href?: string
  progress: number
  targetValue: number
  completed: boolean
}

const ACTION_LABELS: Record<string, { label: string; href?: string }> = {
  'Daily Explorer': {
    label: 'Complete a tool session',
    href: '/tools',
  },
  'Comment Contributor': {
    label: 'Leave feedback on a tool',
    href: '/tools',
  },
  'Weekly Achiever': {
    label: 'Complete 5 learning sessions this week',
    href: '/library',
  },
  'High Scorer': {
    label: 'Score above 90% on 3 tools',
    href: '/library',
  },
  'Course Learner': {
    label: 'Finish 3 course-assigned tools',
    href: '/courses',
  },
}

export default function ActionItems() {
  const { currentUser } = useAuth()
  const [quests, setQuests] = useState<QuestResponse>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/quests', {
          headers: {
            'x-demo-user-email': currentUser.email,
          },
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setQuests(data)
        }
      } catch {
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [currentUser.email])

  const items = useMemo<ActionItem[]>(() => {
    const combined = [...(quests.daily ?? []), ...(quests.weekly ?? [])]

    return combined
      .map((quest) => {
        const override = ACTION_LABELS[quest.title]
        const completed = quest.completedAt !== null || quest.progress >= quest.targetValue

        return {
          id: quest.id,
          label: override?.label ?? quest.title,
          description: quest.description,
          href: override?.href,
          progress: quest.progress,
          targetValue: quest.targetValue,
          completed,
        }
      })
      .sort((a, b) => Number(a.completed) - Number(b.completed))
      .slice(0, 5)
  }, [quests])

  const completedCount = items.filter((item) => item.completed).length
  const heading = completedCount === 0 ? 'Getting Started' : 'Recommended'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="font-bold text-gray-900 text-sm">{heading}</div>
        <p className="mt-1 text-xs text-gray-500">
          Clear next steps based on your recent learning activity.
        </p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading action items...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            No recommendations yet. Start a session and your next steps will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const content = (
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 transition-colors hover:border-gray-300">
                  <div className="mt-0.5 flex-shrink-0">
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.label}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {item.description}
                    </div>
                    {item.targetValue > 1 && !item.completed ? (
                      <div className="mt-1 text-[11px] font-medium text-gray-400">
                        {item.progress} of {item.targetValue} complete
                      </div>
                    ) : null}
                  </div>
                  {!item.completed && item.href ? (
                    <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[#0033A0]">
                      Open <ArrowRight className="h-3 w-3" />
                    </div>
                  ) : null}
                </div>
              )

              if (!item.completed && item.href) {
                return (
                  <Link key={item.id} href={item.href}>
                    {content}
                  </Link>
                )
              }

              return <div key={item.id}>{content}</div>
            })}
          </div>
        )}
      </div>
    </div>
  )
}
