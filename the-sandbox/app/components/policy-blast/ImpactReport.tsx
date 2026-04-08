'use client'

import { useState } from 'react'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import ImpactSummaryCards from './ImpactSummaryCards'
import ImpactList from './ImpactList'
import type { PolicyImpactReportFull } from '../../lib/policy-blast/types'

interface ImpactReportProps {
  report: PolicyImpactReportFull
  onBack: () => void
  onResolved?: (report: PolicyImpactReportFull) => void
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  significant: 'bg-amber-100 text-amber-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  informational: 'bg-blue-100 text-blue-800',
}

export default function ImpactReport({ report, onBack, onResolved }: ImpactReportProps) {
  const { currentUser } = useAuth()
  const [resolving, setResolving] = useState(false)

  async function handleResolve() {
    if (!currentUser?.email) return
    setResolving(true)
    try {
      const updated = await apiFetch<PolicyImpactReportFull>(
        currentUser.email,
        `/api/policy-blast/reports/${report.id}/resolve`,
        { method: 'POST' },
      )
      onResolved?.(updated)
    } catch {
      // Error handled by apiFetch
    } finally {
      setResolving(false)
    }
  }

  const dateStr = new Date(report.generatedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="size-4" />
            Back to reports
          </button>
          <h2 className="text-xl font-extrabold text-gray-900">
            {report.policy.title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {report.policy.policyNumber} &middot; {report.policy.category} &middot; {dateStr}
          </p>
          <p className="text-sm text-gray-600 mt-1">{report.changeDescription}</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${severityColors[report.severity] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {report.severity}
            </span>
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${report.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
            >
              {report.status}
            </span>
          </div>
        </div>
        {report.status !== 'resolved' && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#0033A0] text-white hover:bg-[#002880] disabled:opacity-50"
          >
            <CheckCircle className="size-4" />
            {resolving ? 'Resolving...' : 'Mark Resolved'}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <ImpactSummaryCards
        affectedCourses={report.affectedCourses}
        affectedFaculty={report.affectedFaculty}
        affectedStudents={report.affectedStudents}
        conflictingAIPolicies={report.conflictingAIPolicies}
        triggeredCompliance={report.triggeredCompliance}
        activePetitions={report.activePetitions}
      />

      {/* Impact List */}
      <ImpactList impacts={report.impacts} />

      {/* Suggested Actions */}
      {report.suggestedActions.length > 0 && (
        <div className="border rounded-2xl shadow-sm bg-white p-5">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide mb-3">
            Suggested Actions
          </h3>
          <ul className="space-y-2">
            {report.suggestedActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="inline-block size-5 rounded-full bg-[#0033A0]/10 text-[#0033A0] text-xs font-bold flex-shrink-0 flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
