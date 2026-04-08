'use client'

import { useState, useEffect } from 'react'
import { X, FileText, AlertTriangle, Sparkles } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import EvidenceTable from './EvidenceTable'
import GapList from './GapList'

interface StandardDetailPanelProps {
  standardId: string
  onClose: () => void
}

export default function StandardDetailPanel({ standardId, onClose }: StandardDetailPanelProps) {
  const { currentUser } = useAuth()
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'evidence' | 'gaps' | 'narrative'>('evidence')

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    apiFetch<Record<string, unknown>>(currentUser.email, `/api/accreditation/standards/${standardId}`)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [standardId, currentUser])

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (!detail) return null

  const d = detail as {
    standardNumber: string
    standardTitle: string
    evidenceCount: number
    evidenceQuality: string
    qualityScore: number
    gapCount: number
    criticalGaps: number
    narrativeStatus: string
  }

  const tabs = [
    { key: 'evidence' as const, label: 'Evidence', icon: FileText, count: d.evidenceCount },
    { key: 'gaps' as const, label: 'Gaps', icon: AlertTriangle, count: d.gapCount },
    { key: 'narrative' as const, label: 'Narrative', icon: Sparkles },
  ]

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">
            Standard {d.standardNumber}
          </h2>
          <p className="text-sm text-gray-500">{d.standardTitle}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="size-4 inline mr-1.5" />
            {tab.label}
            {'count' in tab && typeof tab.count === 'number' && (
              <span className="ml-1 text-xs text-gray-400">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'evidence' && (
          <EvidenceTable standardId={standardId} />
        )}
        {activeTab === 'gaps' && (
          <GapList standardId={standardId} />
        )}
        {activeTab === 'narrative' && (
          <NarrativePreview standardId={standardId} />
        )}
      </div>
    </div>
  )
}

function NarrativePreview({ standardId }: { standardId: string }) {
  const { currentUser } = useAuth()
  const [narrative, setNarrative] = useState<{ status: string; draftContent: string | null; confidenceScore: number | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    apiFetch<{ narrative: typeof narrative }>(currentUser.email, `/api/accreditation/narrative/${standardId}`)
      .then(d => setNarrative(d.narrative))
      .finally(() => setLoading(false))
  }, [standardId, currentUser])

  const handleGenerate = async () => {
    if (!currentUser) return
    setGenerating(true)
    try {
      await apiFetch(currentUser.email, `/api/accreditation/narrative/${standardId}/generate`, { method: 'POST' })
      const data = await apiFetch<{ narrative: typeof narrative }>(currentUser.email, `/api/accreditation/narrative/${standardId}`)
      setNarrative(data.narrative)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl" />

  if (!narrative) {
    return (
      <div className="text-center py-8">
        <Sparkles className="size-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-4">No narrative generated yet</p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-medium text-white hover:bg-[#002880] disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate AI Draft'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          {narrative.status.replace('_', ' ')}
        </span>
        {narrative.confidenceScore !== null && (
          <span className="text-xs text-gray-400">
            Confidence: {Math.round(narrative.confidenceScore * 100)}%
          </span>
        )}
      </div>
      {narrative.draftContent && (
        <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-xl p-4">
          {narrative.draftContent}
        </div>
      )}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
      >
        {generating ? 'Regenerating...' : 'Regenerate'}
      </button>
    </div>
  )
}
