'use client'

import { Eye } from 'lucide-react'
import TrajectoryBadge from './TrajectoryBadge'
import SeverityBadge from './SeverityBadge'

interface Props {
  student: {
    userId: string
    user: { id: string; name: string; email: string; avatarUrl?: string | null }
    score: number
    trajectory: string
    daysSinceActive: number
    loginScore?: number | null
    assignmentScore?: number | null
    gradeTrendScore?: number | null
  }
  onView: (userId: string) => void
}

function getSeverity(score: number) {
  if (score < 15) return 'CRITICAL'
  if (score < 30) return 'URGENT'
  if (score < 50) return 'CONCERN'
  if (score < 70) return 'WATCH'
  return 'HEALTHY'
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-700 bg-emerald-50'
  if (score >= 50) return 'text-yellow-700 bg-yellow-50'
  if (score >= 30) return 'text-orange-700 bg-orange-50'
  return 'text-red-700 bg-red-50'
}

export default function StudentRiskRow({ student, onView }: Props) {
  const severity = getSeverity(student.score)

  return (
    <tr className="hover:bg-gray-50 border-b last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
            {student.user.name?.charAt(0) ?? '?'}
          </div>
          <div>
            <p className="text-sm font-medium">{student.user.name}</p>
            <p className="text-xs text-gray-400">{student.user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-sm font-bold ${scoreColor(student.score)}`}>
          {student.score}
        </span>
      </td>
      <td className="px-4 py-3">
        <TrajectoryBadge trajectory={student.trajectory} />
      </td>
      <td className="px-4 py-3">
        {severity !== 'HEALTHY' && <SeverityBadge severity={severity} />}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {student.daysSinceActive === 0 ? 'Today' : `${student.daysSinceActive}d ago`}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onView(student.userId)}
          className="p-1.5 text-gray-400 hover:text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Eye className="size-4" />
        </button>
      </td>
    </tr>
  )
}
