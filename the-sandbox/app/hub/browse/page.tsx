'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Search, X, ChevronDown, Loader2, SearchX,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import StorefrontToolCard from '../../components/hub/StorefrontToolCard'
import DepartmentCard from '../../components/hub/DepartmentCard'

interface DepartmentSummary {
  id: string
  name: string
  shortName: string
  slug: string
  description: string | null
  logoUrl: string | null
  themeColor: string | null
  _count: { collections: number; followers: number; members: number }
}

interface ToolResult {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
  thumbnailUrl: string | null
  approvalStatus: string
  isPortfolio: boolean
  creator: { id: string; name: string; role: string } | null
}

const SORTS = [
  { value: 'sessions', label: 'Most Used' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'A-Z' },
]

const PAGE_SIZE = 48

export default function BrowsePage() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const headers = { 'x-demo-user-email': currentUser.email }

  // Read initial search from URL param (e.g. /hub/browse?search=rubric)
  const initialSearch = searchParams.get('search') ?? ''
  const typeFilter = searchParams.get('type') ?? ''
  const isPortfolioView = typeFilter === 'portfolio'

  // Departments for filtering
  const [departments, setDepartments] = useState<DepartmentSummary[]>([])
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set())

  // Tools
  const [tools, setTools] = useState<ToolResult[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [search, setSearch] = useState(initialSearch)
  const [searchDebounced, setSearchDebounced] = useState(initialSearch)
  const [sort, setSort] = useState('sessions')
  const [showDeptFilter, setShowDeptFilter] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Load departments
  useEffect(() => {
    fetch('/api/departments?pageSize=50', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.departments) setDepartments(data.departments) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.email])

  // Fetch tools
  const fetchTools = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchDebounced) params.set('search', searchDebounced)
      params.set('approvalStatus', 'APPROVED')
      params.set('sort', sort)
      params.set('limit', String(PAGE_SIZE))
      params.set('page', String(pageNum))

      const res = await fetch(`/api/tools?${params.toString()}`, { headers })
      if (res.ok) {
        const data = await res.json()
        let toolList: ToolResult[] = data.tools

        // Portfolio type filter (from ?type=portfolio)
        if (isPortfolioView) {
          toolList = toolList.filter(t => t.toolType === 'PORTFOLIO' || t.isPortfolio)
        }

        // Client-side department filter: only show tools in selected departments' collections
        if (selectedDepts.size > 0) {
          // Fetch collection tools for selected departments
          const deptSlugs = departments.filter(d => selectedDepts.has(d.id)).map(d => d.slug)
          const deptToolIds = new Set<string>()
          await Promise.all(deptSlugs.map(async (slug) => {
            try {
              const r = await fetch(`/api/departments/${slug}`, { headers })
              if (r.ok) {
                const dept = await r.json()
                for (const coll of dept.collections ?? []) {
                  for (const entry of coll.tools ?? []) {
                    deptToolIds.add(entry.tool.id)
                  }
                }
              }
            } catch { /* skip */ }
          }))
          toolList = toolList.filter(t => deptToolIds.has(t.id))
        }

        if (append) setTools(prev => [...prev, ...toolList])
        else setTools(toolList)
        setTotal(data.total)
        setPage(pageNum)
      }
    } catch { /* silently ignore */ }
    finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounced, sort, selectedDepts, currentUser.email])

  useEffect(() => { fetchTools(1) }, [fetchTools])

  const toggleDept = (id: string) => {
    setSelectedDepts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearFilters = () => {
    setSearch('')
    setSearchDebounced('')
    setSelectedDepts(new Set())
    setSort('sessions')
  }

  const hasFilters = search !== '' || selectedDepts.size > 0

  return (
    <div>
      <PageHeader
        title={isPortfolioView ? 'Community Projects' : 'Browse'}
        subtitle={isPortfolioView ? 'Student and faculty portfolio apps' : 'Explore all tools and storefronts'}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/hub" className="hover:text-[#0033A0] transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Explore
          </Link>
          <span className="text-gray-700 font-medium">{isPortfolioView ? 'Community Projects' : 'Browse'}</span>
          {isPortfolioView && (
            <Link href="/hub/browse" className="ml-2 text-xs text-[#0033A0] hover:underline">View all tools</Link>
          )}
        </div>

        {/* All Departments */}
        {departments.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
              All Storefronts
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {departments.map(dept => (
                <div key={dept.id} className="snap-start flex-shrink-0">
                  <DepartmentCard department={dept} />
                </div>
              ))}
            </div>
          </section>
        )}

        <hr className="border-gray-100" />

        {/* Filter bar */}
        <div className="sticky top-0 z-10 bg-white pt-2 pb-2 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0]">
              <Search className="size-4 text-gray-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search tools, topics, categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="p-2 text-gray-400 hover:text-gray-600">
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Department filter toggle */}
            <button
              type="button"
              onClick={() => setShowDeptFilter(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                selectedDepts.size > 0
                  ? 'bg-[#0033A0] text-white border-[#0033A0]'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              Departments{selectedDepts.size > 0 && ` (${selectedDepts.size})`}
              <ChevronDown className={`size-3 transition-transform ${showDeptFilter ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort */}
            {SORTS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  sort === s.value
                    ? 'bg-[#0033A0] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}

            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#0033A0] font-medium hover:underline">
                <X className="size-3" /> Clear
              </button>
            )}
          </div>

          {/* Department filter chips */}
          {showDeptFilter && departments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggleDept(dept.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                    selectedDepts.has(dept.id)
                      ? 'bg-[#0033A0] text-white border-[#0033A0]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
                  }`}
                >
                  {dept.shortName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tools grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-gray-300" />
          </div>
        ) : tools.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-10 text-center">
            <div className="size-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-[#0033A0] flex items-center justify-center">
              <SearchX className="size-8" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-700 mb-2">No tools found</h3>
            <p className="text-gray-500 mb-4 text-sm">
              {search ? `No tools match "${search}".` : 'No tools match your current filters.'}
            </p>
            <button onClick={clearFilters} className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-medium text-sm hover:bg-[#002580] transition-colors">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tools.map(tool => (
                <StorefrontToolCard key={tool.id} tool={tool} />
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
                  {loadingMore ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" /> Loading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Show more ({total - tools.length} remaining)
                      <ChevronDown className="size-3.5" />
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
