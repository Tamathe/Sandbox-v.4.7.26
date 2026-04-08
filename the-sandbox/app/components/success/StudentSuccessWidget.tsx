'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import TrajectoryBadge from './TrajectoryBadge'

interface Score {
  score: number
  trajectory: string
  inflectionDetected: boolean
}

function ringColor(score: number) {
  if (score >= 70) return 'text-emerald-500'
  if (score >= 50) return 'text-yellow-500'
  if (score >= 30) return 'text-orange-500'
  return 'text-red-500'
}

export default function StudentSuccessWidget() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/success/score')
      .then(r => r.json())
      .then(data => { setScores(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || scores.length === 0) return null

  const worst = scores[0]

  return (
    <div className="border rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`relative size-14 ${ringColor(worst.score)}`}>
          <svg className="size-14 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${worst.score}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
            {worst.score}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-gray-400" />
            <span className="text-sm font-semibold">Success Score</span>
          </div>
          <TrajectoryBadge trajectory={worst.trajectory} />
        </div>
      </div>
    </div>
  )
}
