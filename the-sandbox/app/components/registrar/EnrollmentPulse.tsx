'use client'

import { useState, useMemo } from 'react'
import { BarChart3, ChevronDown, ChevronRight, Users, AlertTriangle } from 'lucide-react'
import type { EnrollmentPulseData, DepartmentEnrollment } from '../../lib/registrar/enrollment-pulse'

interface EnrollmentPulseProps {
  data: EnrollmentPulseData | null
  loading: boolean
}

function capacityColor(pct: number): string {
  if (pct > 80) return '#ef4444'  // red-500
  if (pct >= 60) return '#f59e0b' // amber-500
  return '#22c55e'                // green-500
}

function rowBg(pct: number): string {
  if (pct > 90) return 'bg-red-50'
  if (pct > 75) return 'bg-amber-50'
  return ''
}

export default function EnrollmentPulse({ data, loading }: EnrollmentPulseProps) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null)
  const [showAllDepts, setShowAllDepts] = useState(false)

  const sortedDepts = useMemo(() => {
    if (!data) return []
    return [...data.departments].sort((a, b) => b.capacityPercent - a.capacityPercent)
  }, [data])

  const maxWaitlist = useMemo(() => {
    if (!data) return 1
    return Math.max(1, ...data.departments.map(d => d.waitlistedStudents))
  }, [data])

  if (loading) {
    return (
      <div className="border-2 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-6 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="border-2 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-xl bg-[#0033A0]/10 flex items-center justify-center">
          <BarChart3 className="size-5 text-[#0033A0]" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">
          Enrollment Pulse — {data.term} Registration
        </h2>
      </div>

      {/* Department Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left py-3 px-3 font-semibold text-gray-500 w-8" />
              <th className="text-left py-3 px-3 font-semibold text-gray-500">Department</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-500">Sections</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-500">Full</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-500">Waitlisted</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-500">Open Seats</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-500 w-40">Capacity</th>
            </tr>
          </thead>
          <tbody>
            {(showAllDepts ? sortedDepts : sortedDepts.slice(0, 4)).map((dept) => (
              <DepartmentRow
                key={dept.department}
                dept={dept}
                maxWaitlist={maxWaitlist}
                expanded={expandedDept === dept.department}
                onToggle={() =>
                  setExpandedDept(expandedDept === dept.department ? null : dept.department)
                }
              />
            ))}
            {sortedDepts.length > 4 && (
              <tr>
                <td colSpan={7}>
                  <button
                    onClick={() => setShowAllDepts(!showAllDepts)}
                    className="w-full py-2.5 text-sm font-medium text-[#0033A0] hover:bg-blue-50 transition-colors"
                  >
                    {showAllDepts ? 'Show fewer' : `Show all ${sortedDepts.length} departments`}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Capacity Utilization"
          value={`${data.summary.totalCapacityPercent}%`}
          color={capacityColor(data.summary.totalCapacityPercent)}
        />
        <KpiCard
          label="Total Waitlisted"
          value={data.summary.totalWaitlisted.toLocaleString()}
          icon={<Users className="size-4 text-amber-500" />}
        />
        <KpiCard
          label="Sections at 100%"
          value={data.summary.sectionsAtCapacity.toLocaleString()}
          icon={<AlertTriangle className="size-4 text-red-500" />}
        />
      </div>
    </div>
  )
}

// ── Department Row ───────────────────────────────────────────────────────────

function DepartmentRow({
  dept,
  maxWaitlist,
  expanded,
  onToggle,
}: {
  dept: DepartmentEnrollment
  maxWaitlist: number
  expanded: boolean
  onToggle: () => void
}) {
  const [showAllSections, setShowAllSections] = useState(false)
  const waitlistWidth = Math.max(4, (dept.waitlistedStudents / maxWaitlist) * 100)

  return (
    <>
      <tr
        className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${rowBg(dept.capacityPercent)}`}
        onClick={onToggle}
      >
        <td className="py-3 px-3">
          {expanded
            ? <ChevronDown className="size-4 text-gray-400" />
            : <ChevronRight className="size-4 text-gray-400" />
          }
        </td>
        <td className="py-3 px-3 font-medium text-gray-900">{dept.department}</td>
        <td className="py-3 px-3 text-right text-gray-700">{dept.totalSections}</td>
        <td className="py-3 px-3 text-right text-gray-700">{dept.fullSections}</td>
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-700">{dept.waitlistedStudents}</span>
            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${waitlistWidth}%` }}
              />
            </div>
          </div>
        </td>
        <td className="py-3 px-3 text-right text-gray-700">{dept.openSeats}</td>
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="font-medium" style={{ color: capacityColor(dept.capacityPercent) }}>
              {dept.capacityPercent}%
            </span>
            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${dept.capacityPercent}%`,
                  backgroundColor: capacityColor(dept.capacityPercent),
                }}
              />
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded sub-table */}
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-gray-50/80 px-8 py-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-400">Course</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-400">Name</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-400">Section</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-400">Enrolled</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-400">Capacity</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-400">Waitlist</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-400">Instructor</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllSections ? dept.sections : dept.sections.slice(0, 4)).map((sec, i) => {
                    const secPct = sec.capacity > 0
                      ? Math.round((sec.enrolled / sec.capacity) * 100)
                      : 0
                    return (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 px-2 font-mono text-gray-700">{sec.courseCode}</td>
                        <td className="py-2 px-2 text-gray-600">{sec.courseName}</td>
                        <td className="py-2 px-2 text-center text-gray-500">{sec.section}</td>
                        <td className="py-2 px-2 text-right">
                          <span style={{ color: capacityColor(secPct) }} className="font-medium">
                            {sec.enrolled}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-gray-600">{sec.capacity}</td>
                        <td className="py-2 px-2 text-right">
                          {sec.waitlist > 0
                            ? <span className="text-amber-600 font-medium">{sec.waitlist}</span>
                            : <span className="text-gray-300">0</span>
                          }
                        </td>
                        <td className="py-2 px-2 text-gray-600">{sec.instructor}</td>
                      </tr>
                    )
                  })}
                  {dept.sections.length > 4 && (
                    <tr>
                      <td colSpan={7}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAllSections(!showAllSections) }}
                          className="w-full py-2 text-xs font-medium text-[#0033A0] hover:bg-blue-50 transition-colors"
                        >
                          {showAllSections ? 'Show fewer' : `Show all ${dept.sections.length} sections`}
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div
        className="text-2xl font-extrabold"
        style={{ color: color || '#111827' }}
      >
        {value}
      </div>
    </div>
  )
}
