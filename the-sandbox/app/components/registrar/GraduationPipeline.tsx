'use client'

import { useState } from 'react'
import { GraduationCap, ArrowRight, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react'
import { useStudent360 } from './Student360Context'
import type { GraduationPipelineData, PipelineStudent } from '../../lib/registrar/graduation-pipeline'

interface GraduationPipelineProps {
  data: GraduationPipelineData | null
  loading: boolean
}

const STAGE_COLORS: Record<string, { bg: string; text: string; ring: string; bar: string }> = {
  applied:          { bg: 'bg-gray-50',   text: 'text-gray-700',   ring: 'ring-gray-400',   bar: 'bg-gray-400' },
  audit_running:    { bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-400',   bar: 'bg-blue-500' },
  requirements_met: { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-400',  bar: 'bg-amber-500' },
  holds_check:      { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-400', bar: 'bg-orange-500' },
  dean_review:      { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-400', bar: 'bg-purple-500' },
  cleared:          { bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-400',  bar: 'bg-green-500' },
}

const STAGE_LABEL: Record<string, string> = {
  applied: 'Applied',
  audit_running: 'Audit Running',
  requirements_met: 'Req. Met',
  holds_check: 'Holds Check',
  dean_review: 'Dean Review',
  cleared: 'Cleared',
}

export function GraduationPipeline({ data, loading }: GraduationPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { openStudent360 } = useStudent360()

  if (loading || !data) {
    return (
      <div className="border-2 rounded-2xl bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="size-6 text-[#0033A0]" />
          <h2 className="text-xl font-extrabold text-gray-900">Spring 2026 Graduation Clearance</h2>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Clock className="size-6 animate-spin" />
            <p className="text-sm">Loading pipeline data…</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredStudents: PipelineStudent[] = selectedStage
    ? data.students.filter((s) => s.stage === selectedStage)
    : data.students

  return (
    <div className="border-2 rounded-2xl bg-white p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="size-6 text-[#0033A0]" />
        <h2 className="text-xl font-extrabold text-gray-900">{data.term} Graduation Clearance</h2>
        <span className="ml-auto text-sm text-gray-500">
          {data.students.length} total applicant{data.students.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Pipeline stages */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {data.stages.map((stage, idx) => {
          const colors = STAGE_COLORS[stage.key] ?? STAGE_COLORS.applied
          const isSelected = selectedStage === stage.key
          return (
            <div key={stage.key} className="flex items-center gap-2">
              <button
                onClick={() => setSelectedStage(isSelected ? null : stage.key)}
                className={`rounded-xl p-3 text-center cursor-pointer transition-all hover:shadow-md min-w-[100px] ${colors.bg} ${
                  isSelected ? `ring-2 ${colors.ring} shadow-md` : ''
                }`}
              >
                <div className={`text-2xl font-bold ${colors.text}`}>{stage.count}</div>
                <div className="text-xs text-gray-600 font-medium mt-1">
                  {STAGE_LABEL[stage.key] ?? stage.label}
                </div>
              </button>
              {idx < data.stages.length - 1 && (
                <ArrowRight className="size-4 text-gray-300 shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          {data.alerts.map((alert, idx) => {
            const alertStyles = {
              warning: 'bg-amber-50 border-amber-200 text-amber-800',
              success: 'bg-green-50 border-green-200 text-green-800',
              info: 'bg-blue-50 border-blue-200 text-blue-800',
            }
            const alertIconMap: Record<string, typeof AlertTriangle> = {
              warning: AlertTriangle,
              success: CheckCircle,
              info: Info,
            }
            const AlertIcon = alertIconMap[alert.type] ?? Info

            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${alertStyles[alert.type] ?? 'bg-gray-50 border-gray-200 text-gray-800'}`}
              >
                <AlertIcon className="size-4 shrink-0" />
                {alert.message}
              </div>
            )
          })}
        </div>
      )}

      {/* Student list */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Student</th>
              <th className="pb-2 font-medium">Program</th>
              <th className="pb-2 font-medium">Stage</th>
              <th className="pb-2 font-medium w-36">Progress</th>
              <th className="pb-2 font-medium text-right">Days</th>
            </tr>
          </thead>
          <tbody>
            {(showAll ? filteredStudents : filteredStudents.slice(0, 4)).map((student) => {
              const colors = STAGE_COLORS[student.stage] ?? STAGE_COLORS.applied
              return (
                <tr key={student.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3">
                    <button
                      onClick={() => openStudent360(student.id)}
                      className="text-[#0033A0] hover:underline font-medium text-left"
                    >
                      {student.name}
                    </button>
                    <div className="text-xs text-gray-400">{student.email}</div>
                  </td>
                  <td className="py-3 text-gray-600">{student.program}</td>
                  <td className="py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {STAGE_LABEL[student.stage] ?? student.stage}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${colors.bar}`}
                          style={{ width: `${Math.min(student.percentComplete, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">
                        {Math.round(student.percentComplete)}%
                      </span>
                    </div>
                    {student.blockers.length > 0 && (
                      <div className="mt-1">
                        {student.blockers.map((b, i) => (
                          <span
                            key={i}
                            className="inline-block text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mr-1"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-right text-gray-500">
                    {student.daysInStage}d
                  </td>
                </tr>
              )
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No students in this stage
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filteredStudents.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2.5 text-sm font-medium text-[#0033A0] hover:bg-blue-50 transition-colors border-t border-gray-100"
          >
            {showAll ? 'Show fewer' : `Show all ${filteredStudents.length} students`}
          </button>
        )}
      </div>
    </div>
  )
}
