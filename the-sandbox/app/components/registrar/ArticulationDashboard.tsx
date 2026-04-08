'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface ArticulationRequest {
  id: string
  externalCourse: string
  externalInstitution: string
  proposedUkEquivalent: string | null
  similarityScore: number
  recommendation: string | null
  status: string
  createdAt: string
  submittedBy: { name: string; email: string } | null
  aiReasoning: string | null
}

interface ArticulationDashboardProps {
  requests: ArticulationRequest[]
  onDecide?: (id: string, decision: 'APPROVED' | 'DENIED' | 'NEEDS_REVIEW') => void
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? 'bg-green-100 text-green-800'
      : score >= 65
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}%
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    DENIED: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: XCircle },
    NEEDS_REVIEW: { label: 'Needs Review', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  }
  const config = configs[status] ?? configs.PENDING
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

export function ArticulationDashboard({ requests, onDecide }: ArticulationDashboardProps) {
  const [selected, setSelected] = useState<ArticulationRequest | null>(null)

  return (
    <div className="flex gap-4 h-full">
      {/* Table */}
      <div className="flex-1 min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">External Course</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">UK Equivalent</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selected?.id === req.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelected(req)}
                >
                  <td className="py-3 px-3">
                    <p className="font-medium text-gray-800 text-xs">{req.submittedBy?.name ?? 'Unknown'}</p>
                    <p className="text-gray-400 text-xs">{req.submittedBy?.email ?? ''}</p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-gray-800 text-xs">{req.externalCourse}</p>
                    <p className="text-gray-400 text-xs">{req.externalInstitution}</p>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-600">{req.proposedUkEquivalent ?? '—'}</td>
                  <td className="py-3 px-3">
                    {req.similarityScore != null && <ScoreBadge score={req.similarityScore} />}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-3">
                    {onDecide && req.status === 'PENDING' && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onDecide(req.id, 'APPROVED')}
                          className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onDecide(req.id, 'DENIED')}
                          className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    No articulation requests match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-white border-2 border-gray-200 rounded-2xl p-4 self-start sticky top-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">Request Detail</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">External Course</p>
              <p className="font-medium text-gray-800">{selected.externalCourse}</p>
              <p className="text-gray-500 text-xs">{selected.externalInstitution}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Proposed UK Equivalent</p>
              <p className="font-medium text-gray-800">{selected.proposedUkEquivalent ?? 'None proposed'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Similarity Score</p>
              {selected.similarityScore != null && <ScoreBadge score={selected.similarityScore} />}
            </div>
            {selected.aiReasoning && (
              <div>
                <p className="text-xs text-gray-500 mb-1">AI Reasoning</p>
                <p className="text-xs text-gray-700 bg-gray-50 rounded p-2 whitespace-pre-wrap">{selected.aiReasoning}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="text-xs text-gray-700">{new Date(selected.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
