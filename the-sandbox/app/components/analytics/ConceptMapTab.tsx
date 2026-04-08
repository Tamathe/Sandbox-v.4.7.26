'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth-context'

type ConceptMastery = {
  id: string
  concept: string
  effectiveMastery: number
  masteryLevel: number
  encounterCount: number
  isStale: boolean
  firstCourse: { id: string; courseCode: string; title: string } | null
}

type GroupedMasteries = {
  groupName: string
  masteries: ConceptMastery[]
}

function pillColor(m: ConceptMastery): string {
  if (m.isStale) return 'bg-gray-100 text-gray-500 border border-gray-200'
  if (m.effectiveMastery >= 0.7) return 'bg-green-100 text-green-700 border border-green-200'
  if (m.effectiveMastery >= 0.4) return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  return 'bg-red-100 text-red-700 border border-red-200'
}

function pillLabel(m: ConceptMastery): string {
  const pct = Math.round(m.effectiveMastery * 100)
  const stale = m.isStale ? ' (fading)' : ''
  return `${m.concept} · ${pct}% · ${m.encounterCount}×${stale}`
}

export default function ConceptMapTab() {
  const { currentUser } = useAuth()
  const [groups, setGroups] = useState<GroupedMasteries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/analytics/concept-mastery', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { masteries?: ConceptMastery[] }) => {
        const masteries = data.masteries ?? []

        // Group by firstCourse.title (ungrouped → "General")
        const groupMap = new Map<string, ConceptMastery[]>()
        for (const m of masteries) {
          const key = m.firstCourse?.title ?? 'General'
          const existing = groupMap.get(key) ?? []
          groupMap.set(key, [...existing, m])
        }

        // Sort within each group: strong → struggling → fading
        const sorted: GroupedMasteries[] = [...groupMap.entries()].map(([groupName, items]) => ({
          groupName,
          masteries: items.sort((a, b) => {
            const tier = (m: ConceptMastery) =>
              m.isStale ? 2 : m.effectiveMastery >= 0.7 ? 0 : 1
            const tierDiff = tier(a) - tier(b)
            if (tierDiff !== 0) return tierDiff
            return b.effectiveMastery - a.effectiveMastery
          }),
        }))

        setGroups(sorted)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [currentUser.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        Loading concept map…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500">
        Failed to load concept data.
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">No concepts tracked yet</p>
        <p className="text-sm">Concept mastery builds up as you complete tool sessions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(showAll ? groups : groups.slice(0, 4)).map((group) => (
        <div key={group.groupName} className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">{group.groupName}</h3>
          <div className="flex flex-wrap gap-2">
            {group.masteries.map((m) => (
              <span
                key={m.id}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${pillColor(m)} ${m.isStale ? 'opacity-60' : ''}`}
                title={`Raw mastery: ${Math.round(m.masteryLevel * 100)}% · Encounters: ${m.encounterCount}`}
              >
                {pillLabel(m)}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-green-400 inline-block" /> Strong (≥70%)
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-yellow-400 inline-block" /> Developing (40–69%)
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400 inline-block" /> Struggling (&lt;40%)
            </span>
          </div>
        </div>
      ))}
      {!showAll && groups.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
        >
          Show all {groups.length} groups
        </button>
      )}
    </div>
  )
}
