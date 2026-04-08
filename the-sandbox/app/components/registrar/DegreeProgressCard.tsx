'use client'

import { CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { HumanEscalationFooter } from './HumanEscalationFooter'
import { RequirementBreakdown } from './RequirementBreakdown'
import { AuditSourcesCitation } from './AuditSourcesCitation'
import type { RequirementAuditResult, AuditSource } from '../../lib/registrar/types'

interface DegreeAuditData {
  id: string
  overallStatus: string
  percentComplete: number
  totalCreditsCompleted: number
  totalCreditsRequired: number
  requirementResults: RequirementAuditResult[]
  recommendedActions: string[]
  citedSources: AuditSource[]
  humanReviewRequired: boolean
  staffOverride?: string | null
  auditedAt: string
  program?: { code: string; name: string } | null
}

interface DegreeProgressCardProps {
  audit: DegreeAuditData | null
  loading?: boolean
  humanNote?: string | null
}

const STATUS_CONFIG = {
  ON_TRACK: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    label: 'On Track',
  },
  ACTION_NEEDED: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    label: 'Action Needed',
  },
  REVIEW_REQUIRED: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    label: 'Under Review',
  },
}

export function DegreeProgressCard({ audit, loading, humanNote }: DegreeProgressCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Running degree audit…</p>
        </div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
        <p className="text-sm text-gray-500 text-center">
          Degree audit not available. Contact the Registrar&apos;s Office.
        </p>
        <HumanEscalationFooter />
      </div>
    )
  }

  const statusKey = audit.overallStatus as keyof typeof STATUS_CONFIG
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.REVIEW_REQUIRED
  const Icon = config.icon

  const requirementResults = Array.isArray(audit.requirementResults) ? audit.requirementResults : []
  const citedSources = Array.isArray(audit.citedSources) ? audit.citedSources : []
  const recommendedActions = Array.isArray(audit.recommendedActions) ? audit.recommendedActions : []

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b ${config.bg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`size-5 ${config.color}`} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {audit.program?.name ?? 'Degree Audit'}
            </p>
            <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
          </div>
        </div>

        {humanNote && (
          <p className="mt-2 text-xs text-blue-700 bg-white/60 rounded px-2 py-1">{humanNote}</p>
        )}

        {audit.staffOverride && (
          <p className="mt-2 text-xs text-purple-700 bg-white/60 rounded px-2 py-1">
            Staff note: {audit.staffOverride}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Overall Progress</span>
          <span className="text-sm font-bold text-gray-800">{audit.percentComplete}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-[#0033A0] transition-all"
            style={{ width: `${Math.min(audit.percentComplete, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {audit.totalCreditsCompleted} of {audit.totalCreditsRequired} credits completed
        </p>
      </div>

      {/* Requirements */}
      {requirementResults.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Requirements</h3>
          <RequirementBreakdown requirements={requirementResults} />
        </div>
      )}

      {/* Next Steps */}
      {recommendedActions.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recommended Next Steps</h3>
          <ul className="space-y-1.5">
            {recommendedActions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#0033A0] font-bold flex-shrink-0">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      <div className="p-4">
        {citedSources.length > 0 && <AuditSourcesCitation sources={citedSources} />}
        <p className="text-xs text-gray-400 mt-2">
          Last audited: {new Date(audit.auditedAt).toLocaleDateString()}
        </p>
        <HumanEscalationFooter />
      </div>
    </div>
  )
}
