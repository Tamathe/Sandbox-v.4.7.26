'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Coins, Loader2, Target, Zap } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

type QuestItem = {
  id: string
  title: string
  description: string
  xpReward: number
  sandReward: number
  progress: number
  targetValue: number
  completedAt: string | null
  rewardClaimed: boolean
}

export default function QuestPanel() {
  const { currentUser } = useAuth()
  const [daily, setDaily] = useState<QuestItem[]>([])
  const [weekly, setWeekly] = useState<QuestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null)

  const loadQuests = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/quests', {
        headers: {
          'x-demo-user-email': currentUser.email,
        },
      })
      if (!response.ok) throw new Error('Failed to load quests')
      const data = await response.json()
      setDaily(data.daily ?? [])
      setWeekly(data.weekly ?? [])
    } catch {
      setDaily([])
      setWeekly([])
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    void loadQuests()
  }, [loadQuests])

  const handleClaim = async (questId: string) => {
    setClaimingQuestId(questId)
    try {
      await fetch(`/api/quests/${questId}/claim`, {
        method: 'POST',
        headers: {
          'x-demo-user-email': currentUser.email,
        },
      })
      await loadQuests()
    } finally {
      setClaimingQuestId(null)
    }
  }

  const sections = [
    { title: 'Daily Quests', items: daily },
    { title: 'Weekly Quests', items: weekly },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Target className="h-4 w-4 text-[#0033A0]" />
        <span className="text-sm font-bold text-gray-900">Platform Quests</span>
      </div>
      <div className="space-y-4 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading quests...
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                {section.title}
              </div>
              <div className="space-y-3">
                {section.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-400">
                    No active {section.title.toLowerCase()} right now.
                  </div>
                ) : (
                  section.items.map((quest) => {
                    const progressPct = Math.min(100, (quest.progress / quest.targetValue) * 100)

                    return (
                      <div key={quest.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{quest.title}</div>
                            <div className="text-xs leading-relaxed text-gray-500">{quest.description}</div>
                          </div>
                          {quest.completedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Done
                            </span>
                          ) : null}
                        </div>
                        <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold">
                          <span className="inline-flex items-center gap-1 text-purple-700">
                            <Zap className="h-3 w-3" />
                            {quest.xpReward} XP
                          </span>
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Coins className="h-3 w-3" />
                            {quest.sandReward} Sand
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-[#0033A0] transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                          <span>
                            {quest.progress}/{quest.targetValue}
                          </span>
                          {quest.completedAt && !quest.rewardClaimed ? (
                            <button
                              type="button"
                              onClick={() => void handleClaim(quest.id)}
                              disabled={claimingQuestId === quest.id}
                              className="rounded-lg bg-[#0033A0] px-2.5 py-1 font-semibold text-white hover:bg-[#002580] disabled:opacity-50"
                            >
                              {claimingQuestId === quest.id ? 'Claiming...' : 'Claim'}
                            </button>
                          ) : quest.rewardClaimed ? (
                            <span className="font-semibold text-green-600">Reward claimed</span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
