'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquareText, Send, Search } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

const FEEDBACK_TYPES = [
  { value: 'CLARITY', label: 'Clarity', desc: 'Hard to understand' },
  { value: 'ACCURACY', label: 'Accuracy', desc: 'Something seems wrong' },
  { value: 'RELEVANCE', label: 'Relevance', desc: 'Not useful for me' },
  { value: 'DIFFICULTY', label: 'Difficulty', desc: 'Too easy or too hard' },
  { value: 'SUGGESTION', label: 'Suggestion', desc: 'I have an idea' },
] as const

const TARGET_TYPES = [
  { value: 'TOOL', label: 'Tool' },
  { value: 'COURSE', label: 'Course' },
  { value: 'SIMULATION', label: 'Simulation' },
] as const

interface FeedbackItem {
  id: string
  targetType: string
  targetId: string
  feedbackType: string
  content: string
  createdAt: string
}

export default function FeedbackTab() {
  const { currentUser } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [targetType, setTargetType] = useState('TOOL')
  const [targetId, setTargetId] = useState('')
  const [feedbackType, setFeedbackType] = useState('SUGGESTION')
  const [content, setContent] = useState('')

  // Search tools
  const [tools, setTools] = useState<{ id: string; name: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const loadFeedback = useCallback(async () => {
    const controller = new AbortController()
    try {
      setLoading(true)
      const data = await apiFetch<FeedbackItem[]>(currentUser.email, '/api/contribute/feedback', { signal: controller.signal })
      setFeedback(data)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('Failed to load feedback')
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [currentUser.email])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  // Search tools for target picker
  useEffect(() => {
    if (targetType !== 'TOOL' || !searchQuery.trim()) {
      setTools([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<{ tools: { id: string; name: string }[] }>(
          currentUser.email, `/api/tools?search=${encodeURIComponent(searchQuery)}&limit=5`,
          { signal: controller.signal },
        )
        setTools(data.tools || [])
      } catch { /* ignore */ }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [searchQuery, targetType, currentUser.email])

  const handleSubmit = async () => {
    if (!targetId || !content.trim()) return
    setSubmitting(true)
    try {
      await apiFetch(currentUser.email, '/api/contribute/feedback', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, feedbackType, content }),
      })
      setContent('')
      setTargetId('')
      setSearchQuery('')
      loadFeedback()
    } catch {
      setError('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Submit Form */}
      <div className="border rounded-2xl shadow-sm bg-white p-6">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Share Feedback</h2>
        <p className="text-sm text-gray-500 mb-6">
          Help educators improve their tools and courses. Your feedback is synthesized by Sandy and shared as insights — never as raw noise.
        </p>

        <div className="space-y-4">
          {/* Target type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What are you giving feedback on?</label>
            <div className="flex gap-2">
              {TARGET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setTargetType(t.value); setTargetId(''); setSearchQuery('') }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    targetType === t.value ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target search */}
          {targetType === 'TOOL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search for a tool</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search tools..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
                />
              </div>
              {tools.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => { setTargetId(tool.id); setSearchQuery(tool.name); setTools([]) }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {targetType !== 'TOOL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{targetType === 'COURSE' ? 'Course' : 'Simulation'} ID</label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder={`Enter the ${targetType.toLowerCase()} ID`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
              />
            </div>
          )}

          {/* Feedback type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type of feedback</label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFeedbackType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    feedbackType === t.value ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your feedback</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="This explanation of recursion didn't work for me because..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0] resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !targetId || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="size-4" />
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>

      {/* Past Feedback */}
      <div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Your Feedback History</h2>
        {loading && <LoadingSpinner />}
        {error && <ErrorBanner message={error} />}
        {!loading && feedback.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MessageSquareText className="size-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">You haven&apos;t submitted any feedback yet.</p>
          </div>
        )}
        <div className="space-y-3">
          {feedback.map((f) => (
            <div key={f.id} className="border rounded-2xl shadow-sm bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-[#0033A0]/10 text-[#0033A0] text-xs font-semibold">
                  {f.feedbackType}
                </span>
                <span className="text-xs text-gray-400">{f.targetType}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(f.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{f.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
