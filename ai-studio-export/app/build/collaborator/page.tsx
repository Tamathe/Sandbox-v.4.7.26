'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Loader2, MessageSquare, Sparkles, Star, ExternalLink } from 'lucide-react'
import ChatInterface from '../../components/ChatInterface'
import { useAuth } from '../../lib/auth-context'
import { CollabRequest, ToolWithDetails } from '../../lib/types'

type Tab = 'request' | 'review'
type ReviewStage = 'demo' | 'feedback'

type ReviewMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ReviewSummary = {
  clarity: string
  effectiveness: string
  suggestions: string
  overall_impression?: string
}

interface DraftToolOption {
  id: string
  name: string
  toolType: string
}

const REVIEW_SUMMARY_REGEX = /<!--REVIEW_SUMMARY:([\s\S]*?)-->/

function cleanReviewText(text: string) {
  return text.replace(REVIEW_SUMMARY_REGEX, '').trim()
}

function parseReviewSummary(text: string): ReviewSummary | null {
  const match = text.match(REVIEW_SUMMARY_REGEX)
  if (!match) return null

  try {
    return JSON.parse(match[1]) as ReviewSummary
  } catch {
    return null
  }
}

function SandyReviewPanel({
  request,
  transcript,
  currentUserEmail,
  onSubmitted,
}: {
  request: CollabRequest
  transcript: string
  currentUserEmail: string
  onSubmitted: () => void
}) {
  const [messages, setMessages] = useState<ReviewMessage[]>([
    {
      id: 'initial-review-question',
      role: 'assistant',
      content: "What's your first impression of this tool?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedSummary, setParsedSummary] = useState<ReviewSummary | null>(null)
  const [rating, setRating] = useState(4)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const sendAnswer = async (content: string) => {
    if (!content.trim() || loading || parsedSummary) return

    const userMessage: ReviewMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: content.trim(),
    }
    const assistantId = `${Date.now()}-assistant`
    const assistantMessage: ReviewMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
    }

    const history = [...messages, userMessage]
    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          currentPage: '/build/collaborator',
          userEmail: currentUserEmail,
          mode: 'collab_review',
          reviewContext: {
            toolName: request.tool.name,
            toolDescription: request.tool.shortDescription,
          },
        }),
      })

      if (!response.ok) throw new Error('Sandy could not continue the review right now.')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value)
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: cleanReviewText(fullText) || 'Working through your feedback...' }
                : message
            )
          )
        }
      }

      const summary = parseReviewSummary(fullText)
      if (summary) {
        setParsedSummary(summary)
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: 'Thanks. I turned your feedback into a draft summary below for you to review.' }
              : message
          )
        )
      } else {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: cleanReviewText(fullText) || 'Could you say a little more?' }
              : message
          )
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review prompt failed.')
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, content: 'I hit a snag. Please try answering again.' }
            : message
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async () => {
    if (!parsedSummary || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/collab/${request.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUserEmail,
        },
        body: JSON.stringify({
          aiGuidedAnswers: parsedSummary,
          rating,
          transcript,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit review')
      }

      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#0033A0]" />
          <h3 className="text-sm font-semibold text-gray-900">Sandy Guided Review</h3>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Sandy will walk you through a short structured critique, then you can confirm and submit it.
        </p>
        {request.message && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">Requester asked for</p>
            <p className="text-xs text-amber-800 leading-relaxed">{request.message}</p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'rounded-tr-sm bg-[#0033A0] text-white'
                  : 'rounded-tl-sm border border-gray-100 bg-white text-gray-800 shadow-sm'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {parsedSummary && (
          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Draft Summary
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <div className="font-semibold text-gray-900">Clarity</div>
                <div>{parsedSummary.clarity}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Effectiveness</div>
                <div>{parsedSummary.effectiveness}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Suggestions</div>
                <div>{parsedSummary.suggestions}</div>
              </div>
              {parsedSummary.overall_impression && (
                <div>
                  <div className="font-semibold text-gray-900">Overall impression</div>
                  <div>{parsedSummary.overall_impression}</div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold text-gray-900">Overall rating</div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-full p-1.5 transition-colors ${
                      value <= rating ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'
                    }`}
                  >
                    <Star className={`h-5 w-5 ${value <= rating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        {parsedSummary ? (
          <button
            type="button"
            onClick={submitReview}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Submit Review
          </button>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              sendAnswer(input)
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              placeholder="Answer Sandy's question..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CollaboratorPage() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>(currentUser.role === 'STUDENT' ? 'review' : 'request')
  const [drafts, setDrafts] = useState<DraftToolOption[]>([])
  const [myRequests, setMyRequests] = useState<CollabRequest[]>([])
  const [openRequests, setOpenRequests] = useState<CollabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [requestToolId, setRequestToolId] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<CollabRequest | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolWithDetails | null>(null)
  const [reviewStage, setReviewStage] = useState<ReviewStage>('demo')
  const [loadingTool, setLoadingTool] = useState(false)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [demoMessages, setDemoMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [draftRes, myReqRes, openReqRes] = await Promise.all([
        fetch(`/api/tools?published=false&creatorEmail=${encodeURIComponent(currentUser.email)}&sort=updated`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/collab?mine=true', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/collab?status=OPEN', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])

      const [draftData, myReqData, openReqData] = await Promise.all([
        draftRes.json().catch(() => ({})),
        myReqRes.json().catch(() => ({})),
        openReqRes.json().catch(() => ({})),
      ])

      setDrafts((draftData.tools ?? []).map((tool: DraftToolOption) => ({
        id: tool.id,
        name: tool.name,
        toolType: tool.toolType,
      })))
      setMyRequests(myReqData.requests ?? [])
      setOpenRequests(openReqData.requests ?? [])
      setRequestToolId((draftData.tools?.[0]?.id as string | undefined) ?? '')
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === requestToolId) ?? null,
    [drafts, requestToolId]
  )

  const transcript = demoMessages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n')

  const startReview = async (request: CollabRequest) => {
    setSelectedRequest(request)
    setSelectedTool(null)
    setReviewStage('demo')
    setUserMessageCount(0)
    setDemoMessages([])
    setLoadingTool(true)

    try {
      const response = await fetch(`/api/tools/${request.tool.id}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      const tool = await response.json()
      setSelectedTool(tool)
    } catch {
      setSelectedTool(null)
    } finally {
      setLoadingTool(false)
    }
  }

  const submitRequest = async () => {
    if (!requestToolId || !requestMessage.trim()) return

    setSubmittingRequest(true)
    setRequestError('')

    try {
      const response = await fetch('/api/collab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          toolId: requestToolId,
          message: requestMessage,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create collaboration request')
      }

      setRequestMessage('')
      await loadData()
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to create collaboration request')
    } finally {
      setSubmittingRequest(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Collaborator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask peers to review your drafts or step into someone else&apos;s tool and leave guided feedback through Sandy.
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('request')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'request'
              ? 'bg-[#0033A0] text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          Request Review
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('review')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'review'
              ? 'bg-[#0033A0] text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          Review Others
        </button>
      </div>

      {activeTab === 'request' && (
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">Request feedback on a draft</h2>
            <p className="mt-1 text-sm text-gray-500">
              Pick one of your unpublished tools and tell collaborators what kind of feedback you want.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Draft tool</label>
                <select
                  value={requestToolId}
                  onChange={(event) => setRequestToolId(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                >
                  {drafts.length === 0 ? (
                    <option value="">No unpublished tools available</option>
                  ) : (
                    drafts.map((draft) => (
                      <option key={draft.id} value={draft.id}>
                        {draft.name} ({draft.toolType.replaceAll('_', ' ')})
                      </option>
                    ))
                  )}
                </select>
                {selectedDraft && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Reviewing: {selectedDraft.name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">What kind of feedback are you looking for?</label>
                <textarea
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  rows={5}
                  placeholder="Example: I want feedback on whether the tutor feels too leading, and whether the starter prompts are specific enough for first-year law students."
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                />
              </div>

              {requestError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {requestError}
                </div>
              )}

              <button
                type="button"
                onClick={submitRequest}
                disabled={submittingRequest || drafts.length === 0 || !requestToolId || !requestMessage.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
              >
                {submittingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Post Review Request
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">Your review requests</h2>
            <p className="mt-1 text-sm text-gray-500">
              Keep an eye on open requests and how much feedback each draft has already received.
            </p>

            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
                ))
              ) : myRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center text-sm text-gray-500">
                  No review requests yet.
                </div>
              ) : (
                myRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        {request.status}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                        {request.tool.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {request._count.reviews} review{request._count.reviews !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{request.tool.name}</div>
                    <p className="mt-1 text-sm text-gray-500">{request.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">Open collaboration requests</h2>
          <p className="mt-1 text-sm text-gray-500">
            Demo a draft, then let Sandy walk you through a concise, structured review.
          </p>

          <div className="mt-5 space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
              ))
            ) : openRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-12 text-center text-sm text-gray-500">
                No open collaboration requests right now.
              </div>
            ) : (
              openRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-gray-200 px-5 py-5">
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      {request.tool.category}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                      {request.tool.toolType.replaceAll('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {request._count.reviews} review{request._count.reviews !== 1 ? 's' : ''} so far
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-gray-900">{request.tool.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{request.tool.shortDescription}</p>
                      <div className="mt-3 text-xs text-gray-400">
                        Requested by {request.requester.name}
                        {request.requester.department ? ` · ${request.requester.department}` : ''}
                      </div>
                      <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        {request.message}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startReview(request)}
                      className="flex-shrink-0 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                    >
                      Start Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                  {reviewStage === 'demo' ? 'Demo the Draft' : 'Give Feedback'}
                </div>
                <h2 className="text-lg font-bold text-gray-900">{selectedRequest.tool.name}</h2>
                <p className="mt-1 text-sm text-gray-500">{selectedRequest.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingTool ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0033A0]" />
              </div>
            ) : !selectedTool ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
                We could not load this draft for review.
              </div>
            ) : reviewStage === 'demo' ? (
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-hidden p-5">
                  {selectedTool.toolType === 'EXTERNAL' && selectedTool.externalUrl ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <h3 className="text-sm font-semibold text-gray-900">External draft</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        This draft points to an external experience, so there is no inline chat demo. Open it in a new tab, then come back and leave guided feedback.
                      </p>
                      <a
                        href={selectedTool.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open External Draft
                      </a>
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden rounded-2xl">
                      <ChatInterface
                        toolId={selectedTool.id}
                        toolName={selectedTool.name}
                        thumbnailUrl={selectedTool.thumbnailUrl}
                        systemPrompt={selectedTool.systemPrompt}
                        personaName={selectedTool.personaName}
                        personaAvatar={selectedTool.personaAvatar}
                        welcomeMessage={selectedTool.welcomeMessage}
                        starterQuestions={selectedTool.starterQuestions}
                        audioEnabled={selectedTool.audioEnabled}
                        audioPersonaName={selectedTool.audioPersonaName}
                        audioVoiceName={selectedTool.audioVoiceName}
                        audioSpeed={selectedTool.audioSpeed}
                        audioBackgroundTrack={selectedTool.audioBackgroundTrack}
                        onMessagesChange={setDemoMessages}
                        onUserMessageCountChange={setUserMessageCount}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 bg-white px-5 py-4">
                  {(selectedTool.toolType === 'EXTERNAL' || userMessageCount >= 3) ? (
                    <button
                      type="button"
                      onClick={() => setReviewStage('feedback')}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                    >
                      <Sparkles className="h-4 w-4" />
                      Give Feedback
                    </button>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Send {3 - userMessageCount} more message{3 - userMessageCount !== 1 ? 's' : ''} to unlock feedback.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <SandyReviewPanel
                request={selectedRequest}
                transcript={transcript}
                currentUserEmail={currentUser.email}
                onSubmitted={async () => {
                  await loadData()
                  setSelectedRequest(null)
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
