'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lightbulb, Send, ThumbsUp, Search } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

const TARGET_TYPES = [
  { value: 'TOOL', label: 'Tool' },
  { value: 'COURSE', label: 'Course' },
  { value: 'SIMULATION', label: 'Simulation' },
] as const

interface Suggestion {
  id: string
  userId: string
  targetType: string
  targetId: string
  suggestion: string
  sandyCategory: string | null
  upvoteCount: number
  createdAt: string
  user?: { id: string; name: string; avatarUrl: string | null }
  _count?: { upvotes: number }
}

export default function SuggestionsTab() {
  const { currentUser } = useAuth()
  const [view, setView] = useState<'top' | 'mine'>('top')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [targetType, setTargetType] = useState('TOOL')
  const [targetId, setTargetId] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [toolSearch, setToolSearch] = useState('')
  const [tools, setTools] = useState<{ id: string; name: string }[]>([])

  const loadSuggestions = useCallback(async () => {
    const controller = new AbortController()
    try {
      setLoading(true)
      const url = view === 'top' ? '/api/contribute/suggestions?view=top' : '/api/contribute/suggestions'
      const data = await apiFetch<Suggestion[]>(currentUser.email, url, { signal: controller.signal })
      setSuggestions(data)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('Failed to load suggestions')
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [currentUser.email, view])

  useEffect(() => { loadSuggestions() }, [loadSuggestions])

  // Tool search
  useEffect(() => {
    if (targetType !== 'TOOL' || !toolSearch.trim()) { setTools([]); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<{ tools: { id: string; name: string }[] }>(
          currentUser.email, `/api/tools?search=${encodeURIComponent(toolSearch)}&limit=5`,
          { signal: controller.signal },
        )
        setTools(data.tools || [])
      } catch { /* ignore */ }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [toolSearch, targetType, currentUser.email])

  const handleSubmit = async () => {
    if (!targetId || !suggestion.trim()) return
    setSubmitting(true)
    try {
      await apiFetch(currentUser.email, '/api/contribute/suggestions', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, suggestion }),
      })
      setSuggestion(''); setTargetId(''); setToolSearch('')
      loadSuggestions()
    } catch {
      setError('Failed to submit suggestion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (id: string) => {
    try {
      await apiFetch(currentUser.email, `/api/contribute/suggestions/${id}/upvote`, { method: 'POST' })
      loadSuggestions()
    } catch {
      setError('Failed to upvote')
    }
  }

  return (
    <div className="space-y-8">
      {/* Submit form */}
      <div className="border rounded-2xl shadow-sm bg-white p-6">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Suggest an Improvement</h2>
        <p className="text-sm text-gray-500 mb-4">
          &quot;This tool would be better if...&quot; Sandy triages and groups suggestions by theme so educators see what matters most.
        </p>
        <div className="space-y-4">
          <div className="flex gap-2">
            {TARGET_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setTargetType(t.value); setTargetId(''); setToolSearch('') }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  targetType === t.value ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {targetType === 'TOOL' ? (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
              <input
                type="text"
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                placeholder="Search for a tool..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
              />
              {tools.length > 0 && (
                <div className="absolute z-10 mt-1 w-full border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => { setTargetId(tool.id); setToolSearch(tool.name); setTools([]) }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={`Enter ${targetType.toLowerCase()} ID`}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
            />
          )}

          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="This tool would be better if..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 resize-none"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !targetId || !suggestion.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002878] disabled:opacity-40 transition-colors"
          >
            <Send className="size-4" />
            {submitting ? 'Submitting...' : 'Submit Suggestion'}
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">
          {view === 'top' ? 'Top Suggestions' : 'My Suggestions'}
        </h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setView('top')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'top' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => setView('mine')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Mine
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} />}
      {!loading && suggestions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Lightbulb className="size-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No suggestions yet. Be the first!</p>
        </div>
      )}

      <div className="space-y-3">
        {suggestions.map((s) => (
          <div key={s.id} className="border rounded-2xl shadow-sm bg-white p-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => handleUpvote(s.id)}
                className="flex flex-col items-center gap-0.5 pt-0.5 min-w-[40px]"
              >
                <ThumbsUp className="size-4 text-gray-400 hover:text-[#0033A0] transition-colors" />
                <span className="text-xs font-semibold text-gray-500">{s.upvoteCount}</span>
              </button>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{s.suggestion}</p>
                <div className="flex items-center gap-2 mt-2">
                  {s.sandyCategory && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                      {s.sandyCategory}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{s.targetType}</span>
                  {s.user && <span className="text-xs text-gray-400">by {s.user.name}</span>}
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
