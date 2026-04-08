'use client'

import { X, ArrowRight, AlertTriangle } from 'lucide-react'
import CreditTransferMap from './CreditTransferMap'
import RequirementComparison from './RequirementComparison'
import TimelineComparison from './TimelineComparison'
import SemesterRoadmap from './SemesterRoadmap'

interface TransferEntry {
  courseCode: string
  courseName: string
  credits: number
  grade: string
  currentCategory: string
  targetCategory: string | null
  transfers: boolean
}

interface TransferMap {
  entries: TransferEntry[]
  creditsTransfer: number
  creditsLost: number
  creditsNeeded: number
  targetTotalCredits: number
}

interface TimelineEstimate {
  program: string
  programName: string
  creditsCompleted: number
  creditsRemaining: number
  estimatedSemesters: number
  estimatedGraduation: string
  bottleneck: string | null
}

interface Timeline {
  current: TimelineEstimate
  target: TimelineEstimate
  deltaSemesters: number
  deltaCredits: number
  recommendation: string
}

interface AuditResult {
  overallStatus: string
  percentComplete: number
  totalCreditsCompleted: number
  totalCreditsRequired: number
  requirementResults: Array<{
    requirementId?: string
    requirementName: string
    category: string
    status: 'SATISFIED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'DEFICIENT'
    creditsRequired: number
    creditsCompleted: number
    creditsInProgress: number
    satisfyingCourses: string[]
    missingSuggestions: string[]
  }>
}

interface WhatIfPanelProps {
  targetAudit: AuditResult
  transferMap: TransferMap
  timeline: Timeline
  targetProgram: { code: string; name: string; college: string }
  onClose: () => void
  onCreatePlan: () => void
  onBookAdvisor: () => void
}

export default function WhatIfPanel({
  targetAudit,
  transferMap,
  timeline,
  targetProgram,
  onClose,
  onCreatePlan,
  onBookAdvisor,
}: WhatIfPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">
            What If: {targetProgram.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{targetProgram.college}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="size-5 text-gray-400" />
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Complete',
            value: `${targetAudit.percentComplete}%`,
            sub: `${targetAudit.totalCreditsCompleted}/${targetAudit.totalCreditsRequired} cr`,
          },
          {
            label: 'Transfer',
            value: `${transferMap.creditsTransfer}`,
            sub: 'credits carry over',
          },
          {
            label: 'Needed',
            value: `${transferMap.creditsNeeded}`,
            sub: 'new credits',
          },
          {
            label: 'Timeline',
            value: `${timeline.deltaSemesters > 0 ? '+' : ''}${timeline.deltaSemesters}`,
            sub: `semester${Math.abs(timeline.deltaSemesters) !== 1 ? 's' : ''}`,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-gray-200 p-3 text-center"
          >
            <p className="text-2xl font-extrabold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mt-1">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200
                      rounded-xl px-4 py-3">
        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          This is an estimate based on your academic record. Your college advisor has the
          final say on credit transfer and graduation requirements.
        </p>
      </div>

      {/* Timeline Comparison */}
      <TimelineComparison
        current={timeline.current}
        target={timeline.target}
        deltaSemesters={timeline.deltaSemesters}
        deltaCredits={timeline.deltaCredits}
        recommendation={timeline.recommendation}
      />

      {/* Credit Transfer Map */}
      <CreditTransferMap
        entries={transferMap.entries}
        creditsTransfer={transferMap.creditsTransfer}
        creditsLost={transferMap.creditsLost}
      />

      {/* Requirement Comparison */}
      <RequirementComparison
        requirements={targetAudit.requirementResults}
        programName={targetProgram.name}
      />

      {/* Semester Roadmap (expandable) */}
      <SemesterRoadmap
        timeline={timeline.target}
        requirements={targetAudit.requirementResults}
        transferCourses={transferMap.entries.filter((e) => e.transfers).map((e) => e.courseCode)}
      />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCreatePlan}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0033A0]
                     hover:bg-[#002580] text-white font-semibold text-sm
                     rounded-xl py-3 px-4 transition-colors"
        >
          Create {targetProgram.code} Degree Plan
          <ArrowRight className="size-4" />
        </button>
        <button
          onClick={onBookAdvisor}
          className="flex-1 flex items-center justify-center gap-2 bg-white
                     border-2 border-gray-200 hover:border-[#0033A0] text-gray-700
                     hover:text-[#0033A0] font-semibold text-sm rounded-xl py-3 px-4
                     transition-colors"
        >
          Book Advisor Appointment
        </button>
      </div>
    </div>
  )
}
