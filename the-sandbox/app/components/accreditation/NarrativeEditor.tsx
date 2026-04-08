'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Check, RotateCcw, Send } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

interface NarrativeEditorProps {
  standardId: string
  standardNumber: string
  standardTitle: string
}

export default function NarrativeEditor({ standardId, standardNumber, standardTitle }: NarrativeEditorProps) {
  const { currentUser } = useAuth()
  const [narrative, setNarrative] = useState<{
    id: string
    status: string
    draftContent: string | null
    finalContent: string | null
    version: number
    confidenceScore: number | null
    reviewComments: string | null
    versionHistory: { version: number; author: string; timestamp: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reviewAction, setReviewAction] = useState<string | null>(null)
  const [comments, setComments] = useState('')

  const load = () => {
    if (!currentUser) return
    setLoading(true)
    apiFetch<{ narrative: typeof narrative }>(currentUser.email, `/api/accreditation/narrative/${standardId}`)
      .then(d => setNarrative(d.narrative))
      .finally(() => setLoading(false))
  }

  useEffect(load, [standardId, currentUser])

  const handleGenerate = async () => {
    if (!currentUser) return
    setGenerating(true)
    try {
      await apiFetch(currentUser.email, `/api/accreditation/narrative/${standardId}/generate`, { method: 'POST' })
      load()
    } finally {
      setGenerating(false)
    }
  }

  const handleReview = async (action: 'approve' | 'request_revision' | 'finalize') => {
    if (!currentUser) return
    setReviewAction(action)
    try {
      await apiFetch(currentUser.email, `/api/accreditation/narrative/${standardId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ action, comments: comments || undefined }),
      })
      setComments('')
      load()
    } finally {
      setReviewAction(null)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-48 bg-gray-100 rounded-2xl" />
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900">
            {standardNumber}: {standardTitle}
          </h3>
          {narrative && (
            <div className="flex items-center gap-2 mt-1">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                v{narrative.version} — {narrative.status.replace('_', ' ')}
              </span>
              {narrative.confidenceScore !== null && (
                <span className="text-xs text-gray-400">
                  AI confidence: {Math.round(narrative.confidenceScore * 100)}%
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#002880] disabled:opacity-50"
        >
          {generating ? <RotateCcw className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
          {generating ? 'Generating...' : narrative ? 'Regenerate' : 'Generate Draft'}
        </button>
      </div>

      {narrative?.draftContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Draft content */}
          <div className="p-5">
            <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">AI Draft</h4>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {narrative.draftContent}
            </div>
          </div>

          {/* Review panel */}
          <div className="p-5 space-y-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Review</h4>

            {narrative.reviewComments && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-medium text-amber-800">Previous Review Comments:</p>
                <p className="text-xs text-amber-700 mt-1">{narrative.reviewComments}</p>
              </div>
            )}

            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={4}
              placeholder="Add review comments..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="flex flex-wrap gap-2">
              {narrative.status !== 'APPROVED' && narrative.status !== 'FINAL' && (
                <button
                  onClick={() => handleReview('approve')}
                  disabled={reviewAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="size-3" />
                  {reviewAction === 'approve' ? 'Approving...' : 'Approve'}
                </button>
              )}
              {narrative.status !== 'FINAL' && (
                <button
                  onClick={() => handleReview('request_revision')}
                  disabled={reviewAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                >
                  <RotateCcw className="size-3" />
                  Request Revision
                </button>
              )}
              {narrative.status === 'APPROVED' && (
                <button
                  onClick={() => handleReview('finalize')}
                  disabled={reviewAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#002880] disabled:opacity-50"
                >
                  <Send className="size-3" />
                  {reviewAction === 'finalize' ? 'Finalizing...' : 'Finalize'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <Sparkles className="size-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No narrative generated yet. Click &quot;Generate Draft&quot; to create one.</p>
        </div>
      )}
    </div>
  )
}
