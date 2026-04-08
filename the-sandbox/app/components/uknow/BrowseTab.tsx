'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Newspaper, Loader2, Sparkles } from 'lucide-react'
import { ArticleCard, HeroArticleCard, SkeletonCard, HeroSkeletonCard } from './ArticleCard'
import { TrendingChips } from './TrendingChips'
import { SECTIONS, PAGE_SIZE } from './uknow-helpers'
import type { UknowArticleSummary } from '../../lib/uknow-service'

interface BrowseTabProps {
  userEmail: string
  prefetchedArticles?: UknowArticleSummary[]
  prefetchedTotal?: number
}

export function BrowseTab({ userEmail, prefetchedArticles, prefetchedTotal }: BrowseTabProps) {
  const [q, setQ] = useState('')
  const [section, setSection] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [articles, setArticles] = useState<UknowArticleSummary[]>(prefetchedArticles ?? [])
  const [total, setTotal] = useState(prefetchedTotal ?? 0)
  const [loading, setLoading] = useState(!prefetchedArticles)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [trending, setTrending] = useState<Array<{ topic: string; count: number }>>([])
  const [recommended, setRecommended] = useState<UknowArticleSummary[]>([])
  const [recLoading, setRecLoading] = useState(true)
  const pageRef = useRef(1)

  const fetchArticles = useCallback(
    async (query: string, sec: string, start: string, end: string, pg: number, append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const params = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(pg) })
        if (query) params.set('q', query)
        if (sec) params.set('section', sec)
        if (start) params.set('startDate', start)
        if (end) params.set('endDate', end)

        const res = await fetch(`/api/uknow/articles?${params}`, {
          headers: { 'x-demo-user-email': userEmail },
        })
        if (!res.ok) return
        const data = await res.json()
        if (append) {
          setArticles((prev) => [...prev, ...(data.articles ?? [])])
        } else {
          setArticles(data.articles ?? [])
        }
        setTotal(data.total ?? 0)
        pageRef.current = pg
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [userEmail]
  )

  // Initial load + trending + recommended (with SWR-like caching)
  useEffect(() => {
    if (!prefetchedArticles) {
      void fetchArticles('', '', '', '', 1)
    }

    // Trending with 5-min cache
    const trendingCache = sessionStorage.getItem('uknow-trending')
    const trendingTs = sessionStorage.getItem('uknow-trending-ts')
    if (trendingCache && trendingTs && Date.now() - Number(trendingTs) < 5 * 60 * 1000) {
      try { setTrending(JSON.parse(trendingCache)) } catch { /* ignore */ }
    } else {
      fetch('/api/uknow/trending', { headers: { 'x-demo-user-email': userEmail } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.topics) {
            setTrending(data.topics)
            sessionStorage.setItem('uknow-trending', JSON.stringify(data.topics))
            sessionStorage.setItem('uknow-trending-ts', String(Date.now()))
          }
        })
        .catch(() => {})
    }

    // Recommended articles (for all roles now)
    fetch('/api/uknow/recommended', { headers: { 'x-demo-user-email': userEmail } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.articles) setRecommended(data.articles) })
      .catch(() => {})
      .finally(() => setRecLoading(false))
  }, [fetchArticles, userEmail, prefetchedArticles])

  // Debounced re-fetch on q change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pageRef.current = 1
      void fetchArticles(q, section, startDate, endDate, 1)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const applyFilters = (sec: string, start: string, end: string) => {
    pageRef.current = 1
    void fetchArticles(q, sec, start, end, 1)
  }

  const handleLoadMore = () => {
    const nextPage = pageRef.current + 1
    void fetchArticles(q, section, startDate, endDate, nextPage, true)
  }

  const hasMore = articles.length < total

  // Top Stories = first 3 articles when no filters are applied
  const showHero = !q && !section && !startDate && !endDate && !hasInteracted && articles.length >= 3
  const heroArticles = showHero ? articles.slice(0, 3) : []
  const gridArticles = showHero ? articles.slice(3) : articles

  return (
    <div className="flex flex-col gap-6">
      {/* Trending chips — above search for immediate discovery */}
      <TrendingChips trending={trending} onSelect={(topic) => { setQ(topic); setHasInteracted(true) }} />

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setHasInteracted(true) }}
          placeholder="Search UK news…"
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#0033A0]"
        />
      </div>

      {/* Section pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => {
          const isActive = section === s.slug
          return (
            <button
              key={s.slug}
              onClick={() => {
                const newSection = s.slug
                setSection(newSection)
                if (s.slug) {
                  setHasInteracted(true)
                } else {
                  // "All" resets to default view with hero
                  setHasInteracted(false)
                  setStartDate('')
                  setEndDate('')
                }
                applyFilters(newSection, s.slug ? startDate : '', s.slug ? endDate : '')
              }}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                isActive
                  ? 'bg-[#0033A0] text-white border-[#0033A0]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Date range — shown after interaction */}
      {hasInteracted && (
        <div className="flex gap-3 items-center justify-end">
          <span className="text-sm text-gray-500">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); applyFilters(section, e.target.value, endDate) }}
            className="border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-[#0033A0]"
          />
          <span className="text-sm text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); applyFilters(section, startDate, e.target.value) }}
            className="border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-[#0033A0]"
          />
        </div>
      )}

      {/* For You — personalized recommendations */}
      {!hasInteracted && recommended.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#0033A0]" />
            <span className="text-sm font-extrabold text-gray-900">For You</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recommended.map((a) => (
              <div key={a.id} className="shrink-0 w-72">
                <ArticleCard article={a} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Stories hero row */}
      {loading && showHero && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <HeroSkeletonCard key={i} />)}
        </div>
      )}
      {!loading && heroArticles.length > 0 && (
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 mb-3">Top Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {heroArticles.map((a) => <HeroArticleCard key={a.id} article={a} />)}
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {total.toLocaleString()} article{total !== 1 ? 's' : ''}
          {q && <span> matching &ldquo;{q}&rdquo;</span>}
        </p>
      )}

      {/* Article grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : gridArticles.length === 0 && heroArticles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Newspaper className="size-10" />
          <p className="font-medium">No articles found</p>
          <p className="text-sm">Try a different search or section filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gridArticles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}

      {/* Load More (replaces pagination) */}
      {!loading && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium hover:border-gray-300 disabled:opacity-50 transition-colors"
          >
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            {loadingMore ? 'Loading…' : `Load more (${(total - articles.length).toLocaleString()} remaining)`}
          </button>
        </div>
      )}
    </div>
  )
}
