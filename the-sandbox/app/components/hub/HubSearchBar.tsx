'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, TrendingUp, Wrench, Building2, FolderOpen, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface ToolHit {
  id: string
  name: string
  shortDescription: string | null
  category: string
  departmentName: string | null
}

interface DepartmentHit {
  id: string
  name: string
  shortName: string
  slug: string
}

interface CollectionHit {
  id: string
  name: string
  slug: string
  emoji: string | null
  toolCount: number
  departmentSlug: string | null
}

interface SearchResults {
  tools: ToolHit[]
  departments: DepartmentHit[]
  collections: CollectionHit[]
  totalTools: number
}

interface SuggestionData {
  recent: string[]
  popular: string[]
}

// ─── Highlight matching substring ────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-blue-100 text-[#0033A0] rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Build flat list of navigable items for keyboard nav ─────────────────────

interface NavItem {
  type: 'suggestion' | 'department' | 'collection' | 'tool' | 'see-all'
  href?: string
  term?: string
  label: string
}

function buildNavItems(
  query: string,
  suggestions: SuggestionData | null,
  results: SearchResults | null,
): NavItem[] {
  const items: NavItem[] = []

  if (!query && suggestions) {
    for (const term of suggestions.recent) items.push({ type: 'suggestion', term, label: term })
    for (const term of suggestions.popular) items.push({ type: 'suggestion', term, label: term })
  }

  if (query.length >= 2 && results) {
    for (const dept of results.departments) items.push({ type: 'department', href: `/hub/s/${dept.slug}`, label: dept.shortName })
    for (const coll of results.collections) items.push({ type: 'collection', href: coll.departmentSlug ? `/hub/s/${coll.departmentSlug}/${coll.slug}` : '/hub/browse', label: coll.name })
    for (const tool of results.tools) items.push({ type: 'tool', href: `/tools/${tool.id}`, label: tool.name })
    if (results.totalTools > results.tools.length) items.push({ type: 'see-all', href: `/hub/browse?search=${encodeURIComponent(query)}`, label: `See all ${results.totalTools} results` })
  }

  return items
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HubSearchBar() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const headers = { 'x-demo-user-email': currentUser.email }

  // Debounce query (350ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350)
    return () => clearTimeout(t)
  }, [query])

  // Reset active index when results change
  useEffect(() => { setActiveIdx(-1) }, [results, suggestions])

  // Fetch suggestions on focus (no query)
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/hub/search', { headers })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.email])

  // Fetch search results when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    fetch(`/api/hub/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setResults(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleFocus = () => {
    setOpen(true)
    if (!suggestions) fetchSuggestions()
  }

  const handleSuggestionClick = (term: string) => {
    setQuery(term)
    setDebouncedQuery(term)
    inputRef.current?.focus()
  }

  // Keyboard navigation
  const navItems = buildNavItems(query, suggestions, results)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || navItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => (prev + 1) % navItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => (prev <= 0 ? navItems.length - 1 : prev - 1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      const item = navItems[activeIdx]
      if (item.type === 'suggestion' && item.term) {
        handleSuggestionClick(item.term)
      } else if (item.href) {
        router.push(item.href)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Only show dropdown if there's actual content to show
  const hasSuggestions = suggestions && (suggestions.recent.length > 0 || suggestions.popular.length > 0)
  const hasResults = results && (results.tools.length > 0 || results.departments.length > 0 || results.collections.length > 0)
  const showDropdown = open && (
    query.length >= 2
      ? (hasResults || loading || (results && !hasResults)) // show "no results" too
      : hasSuggestions
  )

  // Track flat index for keyboard highlight
  let flatIdx = -1
  const nextIdx = () => ++flatIdx

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="flex items-center overflow-hidden rounded-2xl border-2 border-gray-200 bg-white focus-within:border-[#0033A0] focus-within:shadow-sm transition-all">
        <Search className="size-4 text-gray-400 ml-4 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={!!showDropdown}
          aria-autocomplete="list"
          placeholder="Search tools, departments, collections..."
          value={query}
          onChange={e => {
            setQuery(e.target.value)
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-3 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
        />
        {loading && <Loader2 className="size-4 text-gray-300 animate-spin mr-2" />}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults(null) }}
            className="p-2 mr-1 text-gray-400 hover:text-gray-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div role="listbox" className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden max-h-[420px] overflow-y-auto">

          {/* Suggestions (no query) */}
          {!query && suggestions && hasSuggestions && (
            <div className="p-3 space-y-3">
              {suggestions.recent.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">Recent</p>
                  {suggestions.recent.map(term => {
                    const idx = nextIdx()
                    return (
                      <button
                        key={term}
                        type="button"
                        role="option"
                        aria-selected={idx === activeIdx}
                        onClick={() => handleSuggestionClick(term)}
                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-gray-600 text-left transition-colors ${idx === activeIdx ? 'bg-blue-50 text-[#0033A0]' : 'hover:bg-gray-50'}`}
                      >
                        <Clock className="size-3 text-gray-300 flex-shrink-0" />
                        {term}
                      </button>
                    )
                  })}
                </div>
              )}
              {suggestions.popular.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">Trending</p>
                  {suggestions.popular.map(term => {
                    const idx = nextIdx()
                    return (
                      <button
                        key={term}
                        type="button"
                        role="option"
                        aria-selected={idx === activeIdx}
                        onClick={() => handleSuggestionClick(term)}
                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-gray-600 text-left transition-colors ${idx === activeIdx ? 'bg-blue-50 text-[#0033A0]' : 'hover:bg-gray-50'}`}
                      >
                        <TrendingUp className="size-3 text-gray-300 flex-shrink-0" />
                        {term}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search results */}
          {query.length >= 2 && results && (
            <div className="p-2 space-y-1">
              {/* Department hits */}
              {results.departments.length > 0 && (
                <div className="pb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">Storefronts</p>
                  {results.departments.map(dept => {
                    const idx = nextIdx()
                    return (
                      <Link
                        key={dept.id}
                        href={`/hub/s/${dept.slug}`}
                        role="option"
                        aria-selected={idx === activeIdx}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${idx === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <Building2 className="size-4 text-[#0033A0] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate"><Highlight text={dept.shortName} query={query} /></p>
                          <p className="text-xs text-gray-400 truncate"><Highlight text={dept.name} query={query} /></p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Collection hits */}
              {results.collections.length > 0 && (
                <div className="pb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">Collections</p>
                  {results.collections.map(coll => {
                    const idx = nextIdx()
                    return (
                      <Link
                        key={coll.id}
                        href={coll.departmentSlug ? `/hub/s/${coll.departmentSlug}/${coll.slug}` : '/hub/browse'}
                        role="option"
                        aria-selected={idx === activeIdx}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${idx === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <FolderOpen className="size-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {coll.emoji ? `${coll.emoji} ` : ''}<Highlight text={coll.name} query={query} />
                          </p>
                          {coll.departmentSlug && (
                            <p className="text-xs text-gray-400 truncate">{coll.toolCount} tools</p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Tool hits */}
              {results.tools.length > 0 && (
                <div className="pb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">Tools</p>
                  {results.tools.map(tool => {
                    const idx = nextIdx()
                    return (
                      <Link
                        key={tool.id}
                        href={`/tools/${tool.id}`}
                        role="option"
                        aria-selected={idx === activeIdx}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${idx === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <Wrench className="size-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate"><Highlight text={tool.name} query={query} /></p>
                          <p className="text-xs text-gray-400 truncate">
                            {tool.departmentName ? `${tool.departmentName} · ` : ''}{tool.category}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* No results */}
              {!hasResults && (
                <p className="text-sm text-gray-400 text-center py-4">No results for &ldquo;{query}&rdquo;</p>
              )}

              {/* See all results */}
              {results.totalTools > results.tools.length && (() => {
                const idx = nextIdx()
                return (
                  <Link
                    href={`/hub/browse?search=${encodeURIComponent(query)}`}
                    role="option"
                    aria-selected={idx === activeIdx}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 mt-1 rounded-xl text-xs font-semibold text-[#0033A0] transition-colors ${idx === activeIdx ? 'bg-blue-100' : 'bg-gray-50 hover:bg-blue-50'}`}
                  >
                    See all {results.totalTools} results <ArrowRight className="size-3" />
                  </Link>
                )
              })()}
            </div>
          )}

          {/* Loading state */}
          {query.length >= 2 && loading && !results && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-gray-300" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
