'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Send, ThumbsUp, Building2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

const TIP_TYPES = [
  { value: 'STUDY_SPOT', label: 'Study Spot', emoji: '📖' },
  { value: 'FOOD_TIP', label: 'Food Tip', emoji: '🍕' },
  { value: 'PARKING', label: 'Parking', emoji: '🅿️' },
  { value: 'ACCESSIBILITY', label: 'Accessibility', emoji: '♿' },
  { value: 'GENERAL', label: 'General', emoji: '💡' },
] as const

interface CampusTip {
  id: string
  userId: string
  buildingId: string
  tipType: string
  content: string
  upvoteCount: number
  createdAt: string
  user?: { id: string; name: string; avatarUrl: string | null }
  _count?: { upvotes: number }
}

interface Building {
  id: string
  name: string
  type: string
}

export default function CampusTipsTab() {
  const { currentUser } = useAuth()
  const [view, setView] = useState<'browse' | 'mine'>('browse')
  const [tips, setTips] = useState<CampusTip[]>([])
  const [myTips, setMyTips] = useState<CampusTip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Buildings
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [buildingSearch, setBuildingSearch] = useState('')

  // Form
  const [tipType, setTipType] = useState('STUDY_SPOT')
  const [content, setContent] = useState('')

  // Load buildings
  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Building[]>(currentUser.email, '/api/campus-map/buildings', { signal: controller.signal })
      .then(setBuildings)
      .catch(() => {})
    return () => controller.abort()
  }, [currentUser.email])

  const loadTips = useCallback(async () => {
    const controller = new AbortController()
    try {
      setLoading(true)
      const data = await apiFetch<CampusTip[]>(currentUser.email, '/api/contribute/campus-tips', { signal: controller.signal })
      setMyTips(data)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('Failed to load tips')
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [currentUser.email])

  useEffect(() => { loadTips() }, [loadTips])

  // Load tips for selected building
  const loadBuildingTips = useCallback(async (buildingId: string) => {
    if (!buildingId) return
    const controller = new AbortController()
    try {
      setLoading(true)
      const data = await apiFetch<CampusTip[]>(
        currentUser.email, `/api/contribute/campus-tips?buildingId=${buildingId}`,
        { signal: controller.signal },
      )
      setTips(data)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('Failed to load building tips')
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [currentUser.email])

  useEffect(() => {
    if (selectedBuilding && view === 'browse') loadBuildingTips(selectedBuilding)
  }, [selectedBuilding, view, loadBuildingTips])

  const handleSubmit = async () => {
    if (!selectedBuilding || !content.trim()) return
    setSubmitting(true)
    try {
      await apiFetch(currentUser.email, '/api/contribute/campus-tips', {
        method: 'POST',
        body: JSON.stringify({ buildingId: selectedBuilding, tipType, content }),
      })
      setContent('')
      loadTips()
      if (selectedBuilding) loadBuildingTips(selectedBuilding)
    } catch {
      setError('Failed to submit tip')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (id: string) => {
    try {
      await apiFetch(currentUser.email, `/api/contribute/campus-tips/${id}/upvote`, { method: 'POST' })
      if (selectedBuilding) loadBuildingTips(selectedBuilding)
      loadTips()
    } catch {
      setError('Failed to upvote')
    }
  }

  const filteredBuildings = buildingSearch
    ? buildings.filter((b) => b.name.toLowerCase().includes(buildingSearch.toLowerCase()))
    : buildings

  const displayTips = view === 'browse' ? tips : myTips
  const tipTypeEmoji = (type: string) => TIP_TYPES.find((t) => t.value === type)?.emoji ?? '💡'

  return (
    <div className="space-y-8">
      {/* Submit form */}
      <div className="border rounded-2xl shadow-sm bg-white p-6">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Share a Campus Tip</h2>
        <p className="text-sm text-gray-500 mb-4">
          Best study spots, food tips, parking hacks — help fellow Wildcats navigate campus like a pro.
        </p>

        <div className="space-y-4">
          {/* Building picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 size-4 text-gray-400" />
              <input
                type="text"
                value={buildingSearch}
                onChange={(e) => setBuildingSearch(e.target.value)}
                placeholder="Search buildings..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
              />
            </div>
            {buildingSearch && filteredBuildings.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {filteredBuildings.slice(0, 10).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setSelectedBuilding(b.id); setBuildingSearch(b.name) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      selectedBuilding === b.id ? 'bg-[#0033A0]/5 text-[#0033A0]' : ''
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tip type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip type</label>
            <div className="flex flex-wrap gap-2">
              {TIP_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tipType === t.value ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="The third floor of Young Library has the best quiet study spots..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 resize-none"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedBuilding || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002878] disabled:opacity-40 transition-colors"
          >
            <Send className="size-4" />
            {submitting ? 'Submitting...' : 'Share Tip'}
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">
          {view === 'browse' ? 'Building Tips' : 'My Tips'}
        </h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setView('browse')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'browse' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            By Building
          </button>
          <button
            type="button"
            onClick={() => setView('mine')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            My Tips
          </button>
        </div>
      </div>

      {view === 'browse' && !selectedBuilding && (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="size-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select a building above to see tips from other students.</p>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} />}

      {!loading && ((view === 'browse' && selectedBuilding) || view === 'mine') && displayTips.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="size-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {view === 'mine' ? "You haven't shared any tips yet." : 'No tips for this building yet. Be the first!'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {displayTips.map((tip) => (
          <div key={tip.id} className="border rounded-2xl shadow-sm bg-white p-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => handleUpvote(tip.id)}
                className="flex flex-col items-center gap-0.5 pt-0.5 min-w-[40px]"
              >
                <ThumbsUp className="size-4 text-gray-400 hover:text-[#0033A0] transition-colors" />
                <span className="text-xs font-semibold text-gray-500">{tip.upvoteCount}</span>
              </button>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{tip.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">{tipTypeEmoji(tip.tipType)}</span>
                  <span className="text-xs text-gray-400">{TIP_TYPES.find((t) => t.value === tip.tipType)?.label}</span>
                  {tip.user && <span className="text-xs text-gray-400">by {tip.user.name}</span>}
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(tip.createdAt).toLocaleDateString()}
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
