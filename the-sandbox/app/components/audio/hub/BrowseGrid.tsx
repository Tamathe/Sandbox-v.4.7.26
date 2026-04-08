'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Tag } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { AudioHubBrowseResponse, EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'

interface Props {
  onPlay: (episode: EpisodeCardData) => void
}

export default function BrowseGrid({ onPlay }: Props) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<AudioHubBrowseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const fetchEpisodes = useCallback(async (q?: string, tag?: string | null) => {
    if (!currentUser?.email) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (tag) params.set('tag', tag)
      const result = await apiFetch(currentUser.email, `/api/audio/hub/browse?${params}`)
      setData(result as AudioHubBrowseResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load episodes')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  const handleSearch = () => fetchEpisodes(query, activeTag)
  const handleTagClick = (tag: string) => {
    const next = activeTag === tag ? null : tag
    setActiveTag(next)
    fetchEpisodes(query, next)
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search episodes..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
          />
        </div>
      </div>

      {/* Tag cloud */}
      {data?.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Tag className="size-4 text-gray-400 mt-0.5" />
          {data.tags.map(t => (
            <button
              key={t.tag}
              type="button"
              onClick={() => handleTagClick(t.tag)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                activeTag === t.tag
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.tag} ({t.count})
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data?.episodes.length ? (
        <p className="text-gray-500 text-sm py-8 text-center">No episodes found.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">{data.total} episodes</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
