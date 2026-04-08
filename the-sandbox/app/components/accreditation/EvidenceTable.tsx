'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Upload } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

const qualityColors: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  WEAK: 'bg-orange-100 text-orange-800',
  MISSING: 'bg-red-100 text-red-800',
}

interface Evidence {
  id: string
  title: string
  description: string
  evidenceType: string
  sourceType: string
  quality: string
  qualityScore: number | null
  isApproved: boolean
  semesterCode: string | null
  sourceCount: number
  createdAt: string
  standard?: { standardNumber: string; standardTitle: string }
}

interface EvidenceTableProps {
  standardId?: string
}

export default function EvidenceTable({ standardId }: EvidenceTableProps) {
  const { currentUser } = useAuth()
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    const params = new URLSearchParams()
    if (standardId) params.set('standardId', standardId)

    apiFetch<{ evidence: Evidence[] }>(currentUser.email, `/api/accreditation/evidence?${params}`)
      .then(d => setEvidence(d.evidence ?? []))
      .finally(() => setLoading(false))
  }, [standardId, currentUser])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (evidence.length === 0) {
    return (
      <div className="text-center py-8">
        <Upload className="size-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No evidence collected yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {evidence.map(e => (
        <div key={e.id} className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{e.title}</h4>
                {e.isApproved && <CheckCircle className="size-4 text-green-500 shrink-0" />}
              </div>
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">{e.description}</p>
            </div>
            <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${qualityColors[e.quality] ?? 'bg-gray-100 text-gray-600'}`}>
              {e.quality}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {e.semesterCode ?? 'N/A'}
            </span>
            <span>{e.sourceType === 'auto_harvest' ? 'Auto-harvested' : 'Manual'}</span>
            <span>{e.sourceCount} source{e.sourceCount > 1 ? 's' : ''}</span>
            {e.standard && !standardId && (
              <span className="font-medium text-gray-500">{e.standard.standardNumber}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
