'use client'

import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import StudentRiskRow from './StudentRiskRow'

interface Student {
  userId: string
  user: { id: string; name: string; email: string; avatarUrl?: string | null }
  score: number
  trajectory: string
  daysSinceActive: number
  loginScore?: number | null
  assignmentScore?: number | null
  gradeTrendScore?: number | null
}

interface Props {
  students: Student[]
  onViewStudent: (userId: string) => void
}

type SortKey = 'score' | 'name' | 'trajectory' | 'daysSinceActive'

export default function StudentRiskTable({ students, onViewStudent }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortAsc, setSortAsc] = useState(true)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sorted = [...students].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'score': cmp = a.score - b.score; break
      case 'name': cmp = (a.user.name ?? '').localeCompare(b.user.name ?? ''); break
      case 'trajectory': cmp = a.trajectory.localeCompare(b.trajectory); break
      case 'daysSinceActive': cmp = a.daysSinceActive - b.daysSinceActive; break
    }
    return sortAsc ? cmp : -cmp
  })

  const headers: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Student' },
    { key: 'score', label: 'Score' },
    { key: 'trajectory', label: 'Trajectory' },
  ]

  return (
    <div className="border rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            {headers.map(h => (
              <th
                key={h.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort(h.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {h.label}
                  <ArrowUpDown className="size-3" />
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Severity</th>
            <th
              className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
              onClick={() => toggleSort('daysSinceActive')}
            >
              <span className="inline-flex items-center gap-1">
                Last Active
                <ArrowUpDown className="size-3" />
              </span>
            </th>
            <th className="px-4 py-3 w-12" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(s => (
            <StudentRiskRow key={s.userId} student={s} onView={onViewStudent} />
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                No student scores computed yet. Scores are updated nightly.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
