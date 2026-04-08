'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

interface Gap {
  id: string
  title: string
  description: string
  severity: string
  missingEvidenceTypes: string[]
  affectedPrograms: string[]
  estimatedEffort: string | null
  suggestedActions: { action: string; responsible: string; deadline: string | null }[]
  remediationStatus: string
  assignedTo: string | null
  standard?: { standardNumber: string; standardTitle: string }
}

const severityColors: Record<string, string> = {
  critical: 'border-red-300 bg-red-50',
  major: 'border-orange-300 bg-orange-50',
  minor: 'border-yellow-300 bg-yellow-50',
  informational: 'border-blue-300 bg-blue-50',
}

const severityBadge: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  major: 'bg-orange-100 text-orange-800',
  minor: 'bg-yellow-100 text-yellow-800',
  informational: 'bg-blue-100 text-blue-800',
}

interface GapListProps {
  standardId?: string
  severity?: string
}

export default function GapList({ standardId, severity }: GapListProps) {
  const { currentUser } = useAuth()
  const [gaps, setGaps] = useState<Gap[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return
    const params = new URLSearchParams()
    if (severity) params.set('severity', severity)

    apiFetch<{ gaps: Gap[] }>(currentUser.email, `/api/accreditation/gaps?${params}`)
      .then(d => {
        const all = d.gaps ?? []
        setGaps(standardId ? all.filter((g: Gap) => g.standard?.standardNumber) : all)
      })
      .finally(() => setLoading(false))
  }, [standardId, severity, currentUser])

  const handleStatusChange = async (gapId: string, status: string) => {
    if (!currentUser) return
    await apiFetch(currentUser.email, `/api/accreditation/gaps/${gapId}`, {
      method: 'PUT',
      body: JSON.stringify({ remediationStatus: status }),
    })
    setGaps(prev => prev.map(g => g.id === gapId ? { ...g, remediationStatus: status } : g))
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />)}
      </div>
    )
  }

  if (gaps.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="size-8 text-green-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No open gaps</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {gaps.map(gap => (
        <div key={gap.id} className={`border rounded-xl p-4 ${severityColors[gap.severity] ?? 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              <h4 className="text-sm font-semibold text-gray-900">{gap.title}</h4>
            </div>
            <button
              onClick={() => setExpandedId(expandedId === gap.id ? null : gap.id)}
              className="rounded p-1 hover:bg-white/50"
            >
              {expandedId === gap.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge[gap.severity] ?? ''}`}>
              {gap.severity}
            </span>
            {gap.estimatedEffort && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Clock className="size-3" /> {gap.estimatedEffort}
              </span>
            )}
            <span className="text-xs text-gray-400">{gap.remediationStatus}</span>
          </div>

          {expandedId === gap.id && (
            <div className="mt-3 space-y-3 border-t border-gray-200/50 pt-3">
              <p className="text-xs text-gray-600">{gap.description}</p>
              {gap.suggestedActions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Suggested Actions:</p>
                  <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                    {gap.suggestedActions.map((a, i) => (
                      <li key={i}>{a.action}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                {gap.remediationStatus === 'open' && (
                  <button
                    onClick={() => handleStatusChange(gap.id, 'in_progress')}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Start Working
                  </button>
                )}
                {gap.remediationStatus === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(gap.id, 'resolved')}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Mark Resolved
                  </button>
                )}
                {gap.remediationStatus !== 'accepted_risk' && (
                  <button
                    onClick={() => handleStatusChange(gap.id, 'accepted_risk')}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    Accept Risk
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
