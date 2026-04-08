'use client'

import { useState, useMemo } from 'react'
import { Bot, ArrowUp, ArrowDown, Minus, Users, Award, AlertTriangle, XCircle } from 'lucide-react'
import SegmentedControl from '../SegmentedControl'
import { useStudent360 } from './Student360Context'
import type { AcademicStandingData, StandingStudent } from '../../lib/registrar/academic-standing'

// ── Props ────────────────────────────────────────────────────────────────────

interface AcademicStandingProcessorProps {
  data: AcademicStandingData | null
  loading: boolean
}

// ── Standing helpers ─────────────────────────────────────────────────────────

const STANDING_LABELS: Record<string, string> = {
  DEANS_LIST: "Dean's List",
  GOOD: 'Good Standing',
  PROBATION: 'Probation',
  SUSPENSION: 'Suspension',
  DISMISSED: 'Dismissed',
}

const STANDING_BADGE: Record<string, string> = {
  DEANS_LIST: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  PROBATION: 'bg-amber-100 text-amber-800',
  SUSPENSION: 'bg-red-100 text-red-800',
  DISMISSED: 'bg-red-200 text-red-900',
}

const STANDING_CARD_BORDER: Record<string, string> = {
  DEANS_LIST: 'border-green-300',
  GOOD: 'border-blue-300',
  PROBATION: 'border-amber-300',
  SUSPENSION: 'border-red-300',
  DISMISSED: 'border-red-400',
}

const STANDING_ICON: Record<string, React.ReactNode> = {
  DEANS_LIST: <Award className="size-4 text-green-600" />,
  GOOD: <Users className="size-4 text-blue-600" />,
  PROBATION: <AlertTriangle className="size-4 text-amber-600" />,
  SUSPENSION: <XCircle className="size-4 text-red-600" />,
  DISMISSED: <XCircle className="size-4 text-red-800" />,
}

// ── Filter tabs ──────────────────────────────────────────────────────────────

type FilterKey = 'ALL' | 'CHANGED' | 'DEANS_LIST' | 'PROBATION' | 'SUSPENSION'

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CHANGED', label: 'Changed Only' },
  { key: 'DEANS_LIST', label: "Dean's List" },
  { key: 'PROBATION', label: 'Probation' },
  { key: 'SUSPENSION', label: 'Suspension' },
]

function filterStudents(students: StandingStudent[], filter: FilterKey): StandingStudent[] {
  switch (filter) {
    case 'CHANGED':
      return students.filter(s => s.changed)
    case 'DEANS_LIST':
      return students.filter(s => s.newStanding === 'DEANS_LIST')
    case 'PROBATION':
      return students.filter(s => s.newStanding === 'PROBATION')
    case 'SUSPENSION':
      return students.filter(s => s.newStanding === 'SUSPENSION' || s.newStanding === 'DISMISSED')
    default:
      return students
  }
}

// ── GPA color ────────────────────────────────────────────────────────────────

function gpaColor(gpa: number): string {
  if (gpa >= 3.6) return 'text-green-700 font-semibold'
  if (gpa >= 2.0) return 'text-blue-700'
  if (gpa >= 1.5) return 'text-amber-700'
  return 'text-red-700 font-semibold'
}

// ── Standing order for determining improvement vs decline ────────────────────

const STANDING_RANK: Record<string, number> = {
  DISMISSED: 0,
  SUSPENSION: 1,
  PROBATION: 2,
  GOOD: 3,
  DEANS_LIST: 4,
}

function ChangeArrow({ student }: { student: StandingStudent }) {
  if (!student.changed) {
    return <Minus className="size-4 text-gray-300" />
  }
  const prevRank = STANDING_RANK[student.previousStanding] ?? 3
  const newRank = STANDING_RANK[student.newStanding] ?? 3
  if (newRank > prevRank) {
    return <ArrowUp className="size-4 text-green-600" />
  }
  return <ArrowDown className="size-4 text-red-600" />
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AcademicStandingProcessor({ data, loading }: AcademicStandingProcessorProps) {
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [showAll, setShowAll] = useState(false)
  const { openStudent360 } = useStudent360()

  const filteredStudents = useMemo(() => {
    if (!data) return []
    return filterStudents(data.students, filter)
  }, [data, filter])

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Summary skeleton */}
        <div className="border-2 rounded-2xl p-6 bg-[#0033A0]/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-6 w-80 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        </div>
        {/* Breakdown skeleton */}
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border-2 rounded-2xl p-4">
              <div className="h-8 w-12 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="border-2 rounded-2xl p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary } = data

  return (
    <div className="space-y-6">
      {/* ── Summary banner ───────────────────────────────────────────────────── */}
      <div className="border-2 rounded-2xl p-6 bg-[#0033A0]/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-xl bg-[#0033A0] flex items-center justify-center">
            <Bot className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              Standing Review — {summary.term}
            </h2>
            <p className="text-sm text-gray-500">
              {summary.totalReviewed} students reviewed · {summary.totalChanged} standing changes
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{summary.sandySummary}</p>
      </div>

      {/* ── Standing breakdown cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summary.breakdown.map(b => (
          <div
            key={b.standing}
            className={`border-2 rounded-2xl p-4 ${STANDING_CARD_BORDER[b.standing] ?? 'border-gray-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {STANDING_ICON[b.standing]}
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {STANDING_LABELS[b.standing] ?? b.standing}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{b.count}</p>
            {b.changed > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {b.changed} changed
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────────────── */}
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={FILTER_TABS.map(t => ({ value: t.key, label: t.label }))}
        className="w-fit"
      />

      {/* ── Student table ────────────────────────────────────────────────────── */}
      <div className="border-2 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Name</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-500">Program</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-500">Term GPA</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-500">Cum. GPA</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-500">Credits</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-500">Previous</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-500">New Standing</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-500 w-12">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 text-sm">
                    No students match the current filter.
                  </td>
                </tr>
              )}
              {(showAll ? filteredStudents : filteredStudents.slice(0, 4)).map(student => (
                <tr
                  key={student.id}
                  className={`hover:bg-gray-50 transition-colors ${student.changed ? 'bg-amber-50/30' : ''}`}
                >
                  {/* Name — clickable for Student 360 */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openStudent360(student.id)}
                      className="text-[#0033A0] hover:underline font-medium text-left"
                    >
                      {student.name}
                    </button>
                  </td>

                  {/* Program */}
                  <td className="py-3 px-3 text-gray-600">{student.program}</td>

                  {/* Term GPA */}
                  <td className={`py-3 px-3 text-right tabular-nums ${gpaColor(student.termGPA)}`}>
                    {student.termGPA.toFixed(2)}
                  </td>

                  {/* Cumulative GPA */}
                  <td className="py-3 px-3 text-right tabular-nums text-gray-700">
                    {student.cumulativeGPA.toFixed(2)}
                  </td>

                  {/* Credits */}
                  <td className="py-3 px-3 text-right tabular-nums text-gray-600">
                    {student.termCredits}
                  </td>

                  {/* Previous standing badge */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STANDING_BADGE[student.previousStanding] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STANDING_LABELS[student.previousStanding] ?? student.previousStanding}
                    </span>
                  </td>

                  {/* New standing badge */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STANDING_BADGE[student.newStanding] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STANDING_LABELS[student.newStanding] ?? student.newStanding}
                    </span>
                  </td>

                  {/* Change indicator */}
                  <td className="py-3 px-3 text-center">
                    <ChangeArrow student={student} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expand / Table footer */}
        <div className="border-t-2 border-gray-100 bg-gray-50/50 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Showing {showAll ? filteredStudents.length : Math.min(4, filteredStudents.length)} of {filteredStudents.length} students
          </span>
          {filteredStudents.length > 4 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-medium text-[#0033A0] hover:underline"
            >
              {showAll ? 'Show fewer' : `Show all ${filteredStudents.length}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
