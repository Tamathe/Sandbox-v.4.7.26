'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, SearchX, X, ChevronDown, Loader2, Sparkles,
} from 'lucide-react'
import { ToolWithDetails } from '../lib/types'
import { useAuth } from '../lib/auth-context'
import ToolCard from './ToolCard'
import { SkeletonCard } from './ui/SkeletonCard'

const CATEGORY_MAPPING: Record<string, string[]> = {
  All: [],
  Learn: ['Law', 'History', 'STEM', 'Medicine', 'General'],
  Practice: ['Arts & Humanities', 'Business'],
  Campus: ['University', 'University Service', 'Registrar Tools'],
  Faculty: ['Faculty', 'Research', 'Operations'],
}

const WORKSHOP_TOOL_NAMES = new Set([
  'Grant Finder',
  'Space Utilization Optimizer',
  'Grant Writing Assistant',
  'Faculty Command Center',
])

const TOP_CATEGORIES = Object.keys(CATEGORY_MAPPING)

const SORTS = [
  { value: 'sessions', label: 'Most Used' },
  { value: 'newest',   label: 'Newest' },
  { value: 'upvotes',  label: 'Most Upvoted' },
]

const PAGE_SIZE = 48

export default function ToolsBrowser() {
  const { currentUser } = useAuth()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [topCategory, setTopCategory] = useState('All')
  const [sort, setSort] = useState('sessions')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // ZEN-05: Recommendations (STUDENT only)
  const [recommendations, setRecommendations] = useState<Array<{ tool: ToolWithDetails; reason: string }>>([])
  useEffect(() => {
    if (currentUser.role !== 'STUDENT') return
    fetch('/api/recommendations', { headers: { 'x-demo-user-email': currentUser.email } })
      .then(r => r.ok ? r.json() : [])
      .then((data: { recommendations?: Array<{ tool: ToolWithDetails; reason: string }> } | Array<{ tool: ToolWithDetails; reason: string }>) => {
        const items = Array.isArray(data) ? data : (Array.isArray(data?.recommendations) ? data.recommendations : [])
        setRecommendations(items.slice(0, 4))
      })
      .catch(() => {})
  }, [currentUser.email, currentUser.role])

  const [tools, setTools] = useState<ToolWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Click outside to close sort dropdown
  useEffect(() => {
    if (!sortOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sortOpen])

  const fetchTools = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('approvalStatus', 'APPROVED')
      params.set('sort', sort)
      params.set('limit', String(PAGE_SIZE))
      params.set('page', String(pageNum))
      const res = await fetch(`/api/tools?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        if (append) setTools(prev => [...prev, ...data.tools])
        else setTools(data.tools)
        setTotal(data.total)
        setPage(pageNum)
      }
    } catch {
      // silently ignore
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [search, sort, currentUser.email])

  useEffect(() => { fetchTools(1) }, [fetchTools])

  useEffect(() => {
    if (loading) {
      setGridVisible(false)
    } else {
      requestAnimationFrame(() => setGridVisible(true))
    }
  }, [loading])

  // Client-side filter when top-level tab is selected
  const displayTools = topCategory !== 'All'
    ? tools.filter(t => CATEGORY_MAPPING[topCategory]?.includes(t.category))
    : tools

  const hasActiveFilters = topCategory !== 'All' || search !== ''
  const clearAllFilters = () => {
    setTopCategory('All'); setSearchInput(''); setSearch(''); setPage(1)
  }

  return (
    <div>
      {/* ZEN-05: Recommended for You (STUDENT only) */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50/50 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-[#0033A0]" />
            <h3 className="text-sm font-bold text-gray-900">Recommended for You</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {recommendations.map(rec => (
              <ToolCard key={rec.tool.id} tool={rec.tool} reason={rec.reason} showCloneAction />
            ))}
          </div>
        </div>
      )}

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 bg-white pt-2 pb-2 border-b border-gray-100">
      {/* Top-level category tabs */}
      <div className="flex items-center gap-1 mb-3">
        {TOP_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setTopCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              topCategory === cat
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search + sort row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0]">
          <Search className="size-4 text-gray-400 ml-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search tools, topics, categories…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            type="button"
            onClick={() => setSortOpen(v => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0033A0] transition-colors whitespace-nowrap"
          >
            {SORTS.find(s => s.value === sort)?.label}
            <ChevronDown className={`size-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl border border-gray-200 bg-white shadow-lg py-1">
              {SORTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setSort(s.value); setSortOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    sort === s.value
                      ? 'bg-blue-50 text-[#0033A0]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-[#0033A0] font-medium hover:underline">
            <X className="size-3" />
            Clear
          </button>
        )}
      </div>

      </div>{/* end sticky filter bar */}

      {/* Tools grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayTools.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-10 text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-[#0033A0] flex items-center justify-center">
            <SearchX className="size-8" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-700 mb-2">No tools match your filters</h3>
          <p className="text-gray-500 mb-4 text-sm">
            {search ? `We couldn\u2019t find any tools matching \u201c${search}\u201d with your current filters. Try broadening your search or clearing filters.` : 'No marketplace tools match your current filters. Try selecting a different category or clearing all filters.'}
          </p>
          <button
            onClick={clearAllFilters}
            className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-medium text-sm hover:bg-[#002580] transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={`transition-opacity duration-300 ${gridVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5" data-tour="tools-grid">
            {displayTools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                inDevelopment={WORKSHOP_TOOL_NAMES.has(tool.name)}
                showCloneAction
              />
            ))}
          </div>
          {tools.length < total && (
            <div className="text-center mt-8">
              <button
                type="button"
                onClick={() => fetchTools(page + 1, true)}
                disabled={loadingMore}
                className="px-6 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5">
                  {loadingMore ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      Show more ({total - tools.length} remaining)
                      <ChevronDown className="size-3.5" />
                    </>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
