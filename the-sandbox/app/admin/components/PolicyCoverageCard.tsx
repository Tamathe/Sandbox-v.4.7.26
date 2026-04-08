'use client'

import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'

interface PolicyCoverageData {
  totalCourses: number
  coursesWithPolicies: number
  coursesComplete: number
  coursesWeightsOk: number
  platformAckRate: number
  coursesNeedingAttention: { courseCode: string; title: string; missingCategories: string[] }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  late: 'Late Policy',
  attendance: 'Attendance',
  grading: 'Grading',
  academic_integrity: 'Academic Integrity',
}

const CATEGORY_CHIP_COLORS: Record<string, string> = {
  late: 'bg-amber-100 text-amber-700',
  attendance: 'bg-blue-100 text-blue-700',
  grading: 'bg-green-100 text-green-700',
  academic_integrity: 'bg-red-100 text-red-700',
}

export default function PolicyCoverageCard({ userEmail }: { userEmail: string }) {
  const [data, setData] = useState<PolicyCoverageData | null>(null)

  useEffect(() => {
    fetch('/api/admin/policy-coverage', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
  }, [userEmail])

  if (!data) return null

  const pct = (n: number) => data.totalCourses > 0 ? Math.round((n / data.totalCourses) * 100) : 0

  const statBoxes = [
    { label: 'Total Courses', value: data.totalCourses, sub: '' },
    { label: 'Have Policies', value: data.coursesWithPolicies, sub: `${pct(data.coursesWithPolicies)}%` },
    { label: 'Complete', value: data.coursesComplete, sub: `${pct(data.coursesComplete)}%` },
    { label: 'Weights OK', value: data.coursesWeightsOk, sub: `${pct(data.coursesWeightsOk)}%` },
  ]

  const showRows = data.coursesNeedingAttention.slice(0, 10)
  const moreCount = data.coursesNeedingAttention.length - showRows.length

  return (
    <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
      <div className="mb-5 flex items-center gap-2">
        <Shield className="size-5 text-[#0033A0]" />
        <h2 className="text-base font-extrabold text-gray-900">Policy Coverage</h2>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        {statBoxes.map(s => (
          <div key={s.label} className="border-2 rounded-2xl bg-white p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            {s.sub && <p className="text-xs font-semibold text-[#0033A0]">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Platform ack rate */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Platform-wide Acknowledgment Rate</span>
          <span className="font-bold text-gray-900">{data.platformAckRate}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0033A0] rounded-full transition-all"
            style={{ width: `${data.platformAckRate}%` }}
          />
        </div>
      </div>

      {/* Courses needing attention */}
      {showRows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Courses Needing Attention</h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Course</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Title</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Missing</th>
                </tr>
              </thead>
              <tbody>
                {showRows.map(c => (
                  <tr key={c.courseCode} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{c.courseCode}</td>
                    <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">{c.title}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.missingCategories.map(cat => (
                          <span
                            key={cat}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_CHIP_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {CATEGORY_LABELS[cat] ?? cat}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {moreCount > 0 && (
            <p className="text-xs text-gray-400 mt-2">and {moreCount} more...</p>
          )}
        </div>
      )}
    </section>
  )
}
