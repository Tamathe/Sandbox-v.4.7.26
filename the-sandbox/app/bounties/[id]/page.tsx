'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Sparkles,
  Copy,
  ExternalLink,
  MessageSquareText,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuth } from '../../lib/auth-context'

type Bounty = {
  id: string
  title: string
  description: string
  category: string
  difficulty: string | null
  estimatedHours: number | null
  rewardSand: number
  status: 'OPEN' | 'CLAIMED' | 'FULFILLED' | 'CLOSED'
  createdAt: string
  claimedAt: string | null
  fulfilledToolId: string | null
  postedBy: { id: string; name: string; department: string | null; college: string | null; role: string }
  claimedBy: { id: string; name: string; department: string | null } | null
  reviews: {
    id: string
    promptUsed: string | null
    content: string
    createdAt: string
    reviewer: { id: string; name: string; department: string | null; role: string }
  }[]
  _count?: { reviews: number }
}

type ToolOption = {
  id: string
  name: string
  published: boolean
}

const STATUS_STYLES = {
  OPEN: 'bg-green-100 text-green-700',
  CLAIMED: 'bg-yellow-100 text-yellow-700',
  FULFILLED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-100 text-gray-500',
}

const STATUS_ICONS = {
  OPEN: Trophy,
  CLAIMED: Clock,
  FULFILLED: CheckCircle,
  CLOSED: XCircle,
}

const REVIEW_PROMPTS = [
  'What feels most promising about this bounty idea for learners in this category?',
  'Where might students get confused, disengage, or need more scaffolding?',
  'What one change would make this idea more classroom-ready before it is built?',
]

export default function BountyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUser } = useAuth()
  const [bounty, setBounty] = useState<Bounty | null>(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [error, setError] = useState('')
  const [availableTools, setAvailableTools] = useState<ToolOption[]>([])
  const [selectedToolId, setSelectedToolId] = useState('')
  const [copiedPrompt, setCopiedPrompt] = useState('')
  const [selectedReviewPrompt, setSelectedReviewPrompt] = useState(REVIEW_PROMPTS[0])
  const [reviewContent, setReviewContent] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/bounties/${id}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((d) => {
        setBounty(d.bounty)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, currentUser.email])

  useEffect(() => {
    if (currentUser.role === 'STUDENT') return

    fetch('/api/tools?creator=me&published=all&limit=50', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) =>
        setAvailableTools(
          (data.tools ?? []).map((tool: ToolOption) => ({
            id: tool.id,
            name: tool.name,
            published: tool.published,
          }))
        )
      )
      .catch(() => {})
  }, [currentUser.email, currentUser.role])

  const doAction = async (action: string) => {
    setActioning(true)
    setError('')

    try {
      const res = await fetch(`/api/bounties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ action, toolId: selectedToolId || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Action failed')
        return
      }
      setBounty(data.bounty)
    } catch {
      setError('Something went wrong.')
    } finally {
      setActioning(false)
    }
  }

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(prompt)
      setTimeout(() => setCopiedPrompt(''), 1800)
    } catch {}
  }

  const submitReview = async () => {
    if (!reviewContent.trim()) return

    setReviewSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/bounties/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          promptUsed: selectedReviewPrompt || null,
          content: reviewContent.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save review')
        return
      }

      setBounty((prev) =>
        prev
          ? {
              ...prev,
              reviews: [data.review, ...prev.reviews],
              _count: { reviews: (prev._count?.reviews ?? prev.reviews.length) + 1 },
            }
          : prev
      )
      setReviewContent('')
    } catch {
      setError('Failed to save review')
    } finally {
      setReviewSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-24 mb-8" />
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    )
  }

  if (!bounty) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Bounty not found.</p>
        <Link href="/bounties" className="text-[#0033A0] font-medium hover:underline mt-4 inline-block">
          Back to bounties
        </Link>
      </div>
    )
  }

  const StatusIcon = STATUS_ICONS[bounty.status]
  const isPostedByMe =
    bounty.postedBy.id === currentUser.id || bounty.postedBy.id === `user-${currentUser.role.toLowerCase()}`
  const isClaimedByMe =
    bounty.claimedBy?.id === currentUser.id || (bounty.status === 'CLAIMED' && currentUser.email === 'james.rivera@uky.edu')
  const canClaim = bounty.status === 'OPEN' && !isPostedByMe && currentUser.role !== 'STUDENT'
  const canUnclaim = bounty.status === 'CLAIMED' && (isClaimedByMe || currentUser.role === 'ADMIN')
  const canFulfill = bounty.status === 'CLAIMED' && (isClaimedByMe || currentUser.role === 'ADMIN')
  const canClose =
    (isPostedByMe || currentUser.role === 'ADMIN') &&
    bounty.status !== 'CLOSED' &&
    bounty.status !== 'FULFILLED'
  const builderPrompt = encodeURIComponent(
    `Build a ${bounty.category} tool for this bounty.\n\nTitle: ${bounty.title}\nCategory: ${bounty.category}\nDifficulty: ${bounty.difficulty || 'Not specified'}\nEstimated hours: ${bounty.estimatedHours || 'Not specified'}\n\nDescription:\n${bounty.description}\n\nPlease turn this into a classroom-ready first draft and identify what should be refined before publishing.`
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/bounties" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#0033A0] mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to bounties
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[bounty.status]}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {bounty.status}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">{bounty.category}</span>
              {bounty.difficulty && (
                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{bounty.difficulty}</span>
              )}
              <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">
                {bounty.rewardSand} Sand
              </span>
            </div>
            {bounty.estimatedHours && (
              <span className="text-sm text-gray-400 flex items-center gap-1 flex-shrink-0">
                <Clock className="w-4 h-4" />
                ~{bounty.estimatedHours}h to build
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{bounty.title}</h1>
        </div>

        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{bounty.description}</p>
        </div>

        <div className="p-6 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Posted by</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0033A0] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {bounty.postedBy.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{bounty.postedBy.name}</p>
                {bounty.postedBy.department && <p className="text-xs text-gray-500">{bounty.postedBy.department}</p>}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Posted</p>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(bounty.createdAt), 'MMM d, yyyy')}</span>
              <span className="text-gray-400">-</span>
              <span className="text-gray-400">{formatDistanceToNow(new Date(bounty.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          {bounty.claimedBy && (
            <div>
              <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-1.5">Claimed by</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {bounty.claimedBy.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{bounty.claimedBy.name}</p>
                  {bounty.claimedBy.department && <p className="text-xs text-gray-500">{bounty.claimedBy.department}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}

          {bounty.status === 'FULFILLED' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-800 text-sm">Bounty fulfilled!</p>
                <p className="text-blue-600 text-xs mt-0.5">
                  This tool has been built and submitted. The reward has been paid.
                </p>
              </div>
            </div>
          )}

          {bounty.status === 'OPEN' && currentUser.role === 'STUDENT' && (
            <p className="text-gray-500 text-sm text-center py-2">Only educators can claim bounties.</p>
          )}

          <div className="flex flex-wrap gap-3">
            {canClaim && (
              <button
                onClick={() => doAction('claim')}
                disabled={actioning}
                className="flex items-center gap-2 bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors disabled:opacity-60"
              >
                <Trophy className="w-4 h-4 text-yellow-300" />
                {actioning ? 'Claiming...' : 'Claim This Bounty'}
              </button>
            )}
            {canUnclaim && (
              <button
                onClick={() => doAction('unclaim')}
                disabled={actioning}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {actioning ? 'Releasing...' : 'Release Claim'}
              </button>
            )}
            {canFulfill && (
              <button
                onClick={() => doAction('fulfill')}
                disabled={actioning}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4" />
                {actioning ? 'Marking...' : 'Mark as Fulfilled'}
              </button>
            )}
            {canClose && (
              <button
                onClick={() => doAction('close')}
                disabled={actioning}
                className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {actioning ? 'Closing...' : 'Close Bounty'}
              </button>
            )}
          </div>

          {(currentUser.role !== 'STUDENT' || bounty.fulfilledToolId) && (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">Build from this bounty</h3>
                    <p className="text-xs text-blue-700 mt-1">
                      Launch the builder with the bounty context already drafted into the prompt.
                    </p>
                  </div>
                  <Link
                    href={`/builder?prompt=${builderPrompt}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Open in Builder
                  </Link>
                </div>

                {canFulfill && availableTools.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-3">
                    <select
                      value={selectedToolId}
                      onChange={(e) => setSelectedToolId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-blue-200 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] bg-white"
                    >
                      <option value="">Attach a tool when fulfilling (optional)</option>
                      {availableTools.map((tool) => (
                        <option key={tool.id} value={tool.id}>
                          {tool.name} {tool.published ? '(Published)' : '(Draft)'}
                        </option>
                      ))}
                    </select>
                    {selectedToolId && (
                      <Link
                        href={`/tools/${selectedToolId}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-semibold text-[#0033A0] hover:bg-white transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Preview linked tool
                      </Link>
                    )}
                  </div>
                )}

                {bounty.fulfilledToolId && (
                  <div className="mt-3">
                    <Link href={`/tools/${bounty.fulfilledToolId}`} className="text-sm font-semibold text-[#0033A0] hover:underline">
                      Open the tool attached to this fulfilled bounty
                    </Link>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">AI review playbook</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Use these open-ended prompts when you review a concept, prototype, or fulfillment submission.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1">
                    {bounty._count?.reviews ?? bounty.reviews.length} saved
                  </div>
                </div>

                <div className="space-y-2">
                  {REVIEW_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setSelectedReviewPrompt(prompt)
                        copyPrompt(prompt)
                      }}
                      className={`w-full flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors ${
                        selectedReviewPrompt === prompt
                          ? 'border-[#0033A0]/50 ring-1 ring-[#0033A0]/20'
                          : 'border-gray-200 hover:border-[#0033A0]/30'
                      }`}
                    >
                      <Copy className="w-4 h-4 text-[#0033A0] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{prompt}</span>
                    </button>
                  ))}
                </div>

                {copiedPrompt && <div className="mt-3 text-xs font-medium text-green-700">Review prompt copied.</div>}

                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquareText className="w-4 h-4 text-[#0033A0]" />
                    <h4 className="text-sm font-semibold text-gray-900">Save a guided review</h4>
                  </div>

                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Prompt focus
                  </label>
                  <select
                    value={selectedReviewPrompt}
                    onChange={(e) => setSelectedReviewPrompt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] bg-white"
                  >
                    {REVIEW_PROMPTS.map((prompt) => (
                      <option key={prompt} value={prompt}>
                        {prompt}
                      </option>
                    ))}
                  </select>

                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-1.5">
                    Review notes
                  </label>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    rows={5}
                    placeholder="Capture what seems strong, what needs revision, and what should be tested before someone builds or publishes this."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-none"
                  />

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      Reviews are saved to the bounty so collaborators can build on earlier thinking.
                    </p>
                    <button
                      type="button"
                      onClick={submitReview}
                      disabled={reviewSaving || !reviewContent.trim()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <MessageSquareText className="w-4 h-4" />
                      {reviewSaving ? 'Saving review...' : 'Save review'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Review trail</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Saved feedback stays attached to the bounty so the next collaborator can refine instead of restarting.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                    {bounty.reviews.length} entries
                  </div>
                </div>

                {bounty.reviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-gray-700">No saved reviews yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Add the first guided review to leave useful context for the next builder or reviewer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bounty.reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">{review.reviewer.name}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                {review.reviewer.role}
                              </span>
                              {review.reviewer.department && (
                                <span className="text-xs text-gray-500">{review.reviewer.department}</span>
                              )}
                            </div>
                            {review.promptUsed && (
                              <p className="text-xs font-medium text-[#0033A0] mt-2">{review.promptUsed}</p>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3">
                          {review.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
