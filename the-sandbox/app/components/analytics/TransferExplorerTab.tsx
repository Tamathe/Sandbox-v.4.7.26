'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth-context'

type TransferRow = {
  concept: string
  sourceCourseCode: string
  sourceCourseName: string
  studentCount: number
  avgScore: number
}

type Props = {
  courseId: string | null
}

function SectionEmpty({ label }: { label: string }) {
  return (
    <p className="text-sm text-gray-400 italic py-4">
      No {label} data yet — accumulates as students use tools across courses.
    </p>
  )
}

function TransferTable({ rows }: { rows: TransferRow[] }) {
  const [showAll, setShowAll] = useState(false)
  if (rows.length === 0) return null
  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="pb-2 font-semibold">Concept</th>
            <th className="pb-2 font-semibold">From Course</th>
            <th className="pb-2 font-semibold text-right">Students</th>
            <th className="pb-2 font-semibold text-right">Avg Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {(showAll ? rows : rows.slice(0, 4)).map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="py-2.5 font-medium text-gray-800">{row.concept}</td>
              <td className="py-2.5 text-gray-600">
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-1">
                  {row.sourceCourseCode}
                </span>
                <span className="text-gray-400">{row.sourceCourseName}</span>
              </td>
              <td className="py-2.5 text-right text-gray-700">{row.studentCount}</td>
              <td className="py-2.5 text-right text-gray-700">{Math.round(row.avgScore * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!showAll && rows.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
        >
          Show all {rows.length} rows
        </button>
      )}
    </>
  )
}

export default function TransferExplorerTab({ courseId }: Props) {
  const { currentUser } = useAuth()
  const [carryingOver, setCarryingOver] = useState<TransferRow[]>([])
  const [needsReinforcement, setNeedsReinforcement] = useState<TransferRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!courseId) return
    setLoading(true)
    setError(false)
    fetch(`/api/analytics/transfer-explorer?courseId=${courseId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { carryingOver?: TransferRow[]; needsReinforcement?: TransferRow[] }) => {
        setCarryingOver(data.carryingOver ?? [])
        setNeedsReinforcement(data.needsReinforcement ?? [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [courseId, currentUser.email])

  if (!courseId) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center text-gray-500">
        Select a course to view transfer data.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        Loading transfer data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500">
        Failed to load transfer data.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Carrying Over */}
      <div className="bg-white rounded-2xl border-2 border-green-200 p-6">
        <h3 className="font-bold text-green-800 mb-1">Carrying Over</h3>
        <p className="text-xs text-green-600 mb-4">
          Students bringing strong prior knowledge into this course (avg score ≥ 60%)
        </p>
        {carryingOver.length === 0 ? (
          <SectionEmpty label="carrying-over" />
        ) : (
          <TransferTable rows={carryingOver} />
        )}
      </div>

      {/* Needs Reinforcement */}
      <div className="bg-white rounded-2xl border-2 border-amber-200 p-6">
        <h3 className="font-bold text-amber-800 mb-1">Needs Reinforcement</h3>
        <p className="text-xs text-amber-600 mb-4">
          Concepts students encountered before but are struggling to apply here (avg score &lt; 60%)
        </p>
        {needsReinforcement.length === 0 ? (
          <SectionEmpty label="reinforcement" />
        ) : (
          <TransferTable rows={needsReinforcement} />
        )}
      </div>
    </div>
  )
}
