'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, Sparkles, GraduationCap, ArrowRight, Building2 } from 'lucide-react'
import ToolCard from '../components/ToolCard'
import ToolLaunchModal from '../components/ToolLaunchModal'
import { ToolWithDetails } from '../lib/types'
import { useAuth } from '../lib/auth-context'

const CATEGORIES = ['All', 'Law', 'History', 'STEM', 'Medicine', 'Business', 'Arts', 'University', 'General']

const TOOL_TYPES = ['All', 'Chatbot', 'External', 'Simulation', 'Quiz', 'AI Interview', 'Debate', 'Study Buddy']

const TOOL_TYPE_VALUES: Record<string, string> = {
  'Chatbot':      'CHATBOT',
  'External':     'EXTERNAL',
  'Simulation':   'SIMULATION',
  'Quiz':         'QUIZ',
  'AI Interview': 'AI_INTERVIEW',
  'Debate':       'DEBATE',
  'Study Buddy':  'STUDY_BUDDY',
}

const DIFFICULTIES = ['All', 'Introductory', 'Intermediate', 'Advanced']
const SORTS = [
  { value: 'newest',    label: 'Newest' },
  { value: 'upvotes',   label: 'Most Upvoted' },
  { value: 'favorites', label: 'Most Favorited' },
  { value: 'sessions',  label: 'Most Used' },
]

const SERVICE_TOOL_IDS = [
  'tool-financial-aid-advisor',
  'tool-course-catalog-navigator',
  'tool-it-help-desk',
  'tool-admissions-advisor',
  'tool-library-research-assistant',
]

// Maps fragments of User.department or User.college to a Tool.category
const DEPT_TO_CATEGORY: { match: string; category: string }[] = [
  { match: 'law',         category: 'Law' },
  { match: 'legal',       category: 'Law' },
  { match: 'engineer',    category: 'STEM' },
  { match: 'science',     category: 'STEM' },
  { match: 'math',        category: 'STEM' },
  { match: 'medicine',    category: 'Medicine' },
  { match: 'medical',     category: 'Medicine' },
  { match: 'nursing',     category: 'Medicine' },
  { match: 'business',    category: 'Business' },
  { match: 'management',  category: 'Business' },
  { match: 'english',     category: 'Arts' },
  { match: 'arts',        category: 'Arts' },
  { match: 'humanities',  category: 'Arts' },
  { match: 'history',     category: 'History' },
  { match: 'provost',     category: 'University' },
  { match: 'cats',        category: 'University' },
]

function getDeptCategory(user: { department?: string | null; college?: string | null }): string | null {
  const haystack = `${user.department ?? ''} ${user.college ?? ''}`.toLowerCase()
  for (const { match, category } of DEPT_TO_CATEGORY) {
    if (haystack.includes(match)) return category
  }
  return null
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-36 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="flex items-center gap-2 pt-2">
          <div className="w-5 h-5 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

function SmartSection({
  title,
  subtitle,
  icon: Icon,
  tools,
  loading,
  getSignals,
  libraryIds,
  onToggleLibrary,
  onOpenModal,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  tools: ToolWithDetails[]
  loading: boolean
  getSignals: (tool: ToolWithDetails) => { label: string; color: string }[]
  libraryIds?: Set<string>
  onToggleLibrary?: (toolId: string, add: boolean) => void
  onOpenModal?: (tool: ToolWithDetails) => void
}) {
  if (!loading && tools.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-[#0033A0]" />
        <div>
          <h2 className="text-base font-extrabold text-gray-900 leading-tight">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              signals={getSignals(tool)}
              inLibrary={libraryIds?.has(tool.id)}
              onToggleLibrary={onToggleLibrary}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function sortByPreferredIds(tools: ToolWithDetails[], preferredIds: string[]) {
  return [...tools].sort((a, b) => {
    const aIndex = preferredIds.indexOf(a.id)
    const bIndex = preferredIds.indexOf(b.id)

    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export default function ToolsPage() {
  const { currentUser } = useAuth()
  const browseRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  // All published tools (fetched once, used for smart sections)
  const [allTools, setAllTools] = useState<ToolWithDetails[]>([])
  const [allLoading, setAllLoading] = useState(true)

  // Browse / filter state
  const [tools, setTools] = useState<ToolWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const initialQ = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(initialQ)
  const [search, setSearch] = useState(initialQ)
  const [category, setCategory] = useState('All')
  const [toolType, setToolType] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [sort, setSort] = useState('newest')
  const [activeTab, setActiveTab] = useState<'marketplace' | 'community'>('community')
  const [total, setTotal] = useState(0)
  const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set())
  const [modalTool, setModalTool] = useState<ToolWithDetails | null>(null)

  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'
  const canPublish = ['EDUCATOR', 'STUDENT', 'ADMIN'].includes(currentUser.role)
  const deptCategory = getDeptCategory(currentUser)

  // Fetch all published tools once; used to build smart sections client-side.
  useEffect(() => {
    setAllLoading(true)
    const params = new URLSearchParams({
      limit: '100',
      sort: 'newest',
    })
    if (activeTab === 'marketplace') {
      params.set('approvalStatus', 'APPROVED')
    }

    fetch(`/api/tools?${params.toString()}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then(d => setAllTools(d.tools ?? []))
      .catch(() => {})
      .finally(() => setAllLoading(false))
  }, [activeTab, currentUser.email])

  useEffect(() => {
    fetch('/api/library/ids', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((response) => response.json())
      .then((data) => setLibraryIds(new Set(data.libraryIds ?? [])))
      .catch(() => {})
  }, [currentUser.email])

  // Educator's own published tools
  const myTools = useMemo(() => {
    if (!isEducator || allTools.length === 0) return []
    return allTools.filter(t => t.creator.email === currentUser.email).slice(0, 4)
  }, [allTools, isEducator, currentUser.email])

  const universityServiceTools = useMemo(() => {
    if (allTools.length === 0) return []
    return sortByPreferredIds(
      allTools.filter((tool) => tool.isOfficialService),
      SERVICE_TOOL_IDS
    ).slice(0, 6)
  }, [allTools])

  const featuredTools = useMemo(() => {
    if (allTools.length === 0) return []
    return allTools
      .filter((tool) => tool.featured && !tool.isOfficialService)
      .slice(0, 8)
  }, [allTools])

  // Debounced search fires 300ms after the user stops typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchTools = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category !== 'All') params.set('category', category)
      if (toolType !== 'All') params.set('toolType', TOOL_TYPE_VALUES[toolType] || toolType.toUpperCase())
      if (difficulty !== 'All') params.set('difficulty', difficulty)
      if (activeTab === 'marketplace') params.set('approvalStatus', 'APPROVED')
      params.set('sort', sort)
      params.set('limit', '48')
      const res = await fetch(`/api/tools?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setTools(data.tools)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('Failed to fetch tools:', err)
    } finally {
      setLoading(false)
    }
  }, [search, category, toolType, difficulty, sort, activeTab, currentUser.email])

  useEffect(() => { fetchTools() }, [fetchTools])

  const handleToggleLibrary = useCallback(
    async (toolId: string, add: boolean) => {
      setLibraryIds((previous) => {
        const next = new Set(previous)
        if (add) next.add(toolId)
        else next.delete(toolId)
        return next
      })

      if (add) {
        await fetch('/api/library', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-email': currentUser.email,
          },
          body: JSON.stringify({ toolId }),
        })
      } else {
        await fetch(`/api/library?toolId=${encodeURIComponent(toolId)}`, {
          method: 'DELETE',
          headers: { 'x-demo-user-email': currentUser.email },
        })
      }
    },
    [currentUser.email]
  )

  const clearSearch = () => setSearchInput('')
  const hasActiveFilters = category !== 'All' || toolType !== 'All' || difficulty !== 'All' || search !== ''
  const clearAllFilters = () => {
    setCategory('All'); setToolType('All'); setDifficulty('All')
    setSearchInput(''); setSearch('')
  }

  function getSignals(tool: ToolWithDetails): { label: string; color: string }[] {
    const signals: { label: string; color: string }[] = []
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (new Date(tool.createdAt) >= sevenDaysAgo) {
      signals.push({ label: 'New', color: 'bg-blue-500' })
    }
    if ((tool._count.sessions ?? 0) >= 50) {
      signals.push({ label: 'Hot', color: 'bg-orange-500' })
    }
    return signals
  }

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Tools</h1>
              <p className="text-gray-500 text-sm mt-1">
                {activeTab === 'marketplace'
                  ? 'Officially verified tools only, including university service assistants.'
                  : 'All published tools - including official university assistants and course-specific faculty tools.'}
              </p>
            </div>
            {canPublish && (
              <a
                href="/publish"
                className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#002580] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Publish a Tool
              </a>
            )}
          </div>
        </div>
      </div>

      {/* FINANCIAL AID SPOTLIGHT */}
      <div className="bg-[#0033A0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="text-5xl leading-none shrink-0">💰</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-300">UK Official · Financial Aid</span>
                </div>
                <h2 className="text-xl font-extrabold text-white">Financial Aid Advisor — Finley</h2>
                <p className="text-blue-200 text-sm mt-1 max-w-xl">
                  Walk through your myUK financial aid status step by step — FAFSA, required documents, offer acceptance, MPN &amp; Entrance Counseling, SAP, enrollment status, and FERPA.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['FAFSA Status', 'Required Documents', 'Loan Requirements', 'SAP Check', 'Enrollment Status', 'FERPA Designee'].map(item => (
                    <span key={item} className="text-xs bg-white/10 text-blue-100 px-2.5 py-1 rounded-full">{item}</span>
                  ))}
                </div>
              </div>
            </div>
            <a
              href="/tools/tool-financial-aid-advisor"
              className="shrink-0 flex items-center gap-2 bg-white text-[#0033A0] font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-lg"
            >
              Get Help Now →
            </a>
          </div>
        </div>
      </div>

      {/* FEATURED TOOLS */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

          <SmartSection
            title="University Services"
            subtitle="Official UK assistants for financial aid, course planning, IT support, admissions, and library research"
            icon={Building2}
            tools={universityServiceTools}
            loading={allLoading}
            getSignals={getSignals}
            libraryIds={libraryIds}
            onToggleLibrary={handleToggleLibrary}
            onOpenModal={setModalTool}
          />

          <SmartSection
            title="Featured Experiences"
            subtitle="A curated set of AI-powered tools across disciplines — built to show what's possible"
            icon={Sparkles}
            tools={featuredTools}
            loading={allLoading}
            getSignals={getSignals}
            libraryIds={libraryIds}
            onToggleLibrary={handleToggleLibrary}
            onOpenModal={setModalTool}
          />

          {/* My Tools - educator only */}
          {isEducator && myTools.length > 0 && (
            <SmartSection
              title="Your Published Tools"
              subtitle="Tools you've built and published"
              icon={GraduationCap}
              tools={myTools}
              loading={allLoading}
              getSignals={getSignals}
              libraryIds={libraryIds}
              onToggleLibrary={handleToggleLibrary}
              onOpenModal={setModalTool}
            />
          )}

        </div>
      </div>

      {/* BROWSE ALL */}
      <div ref={browseRef}>

        {/* Search + tabs */}
        <div className="bg-white border-b border-gray-200 py-5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-4 h-4 text-gray-400" />
              <h2 className="text-gray-900 font-bold text-base">Browse All Tools</h2>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Filter by source:
            </p>
            <div className="mb-4 flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
              {(['marketplace', 'community'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'marketplace' ? 'Verified Only' : 'All Tools'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0]">
                <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search tools, topics, categories..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
                />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Not sure what you need?{' '}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('sandy-prefill', {
                    detail: {
                      message: searchInput.trim()
                        ? `Help me find a tool for: ${searchInput}`
                        : `What tools do you recommend for someone studying ${currentUser.department ?? 'my field'}?`
                    }
                  }))
                }}
                className="font-semibold text-[#0033A0] hover:underline"
              >
                Ask Sandy →
              </button>
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    title={cat === deptCategory ? 'Matches your department' : undefined}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      category === cat
                        ? 'bg-[#0033A0] text-white'
                        : cat === deptCategory
                          ? 'bg-[#0033A0]/10 text-[#0033A0] border border-[#0033A0]/20 hover:bg-[#0033A0]/15'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                    {cat === deptCategory && cat !== 'All' && (
                      <Sparkles className="ml-1 h-2.5 w-2.5 opacity-70" />
                    )}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-gray-200 hidden sm:block" />
              <div className="flex flex-wrap gap-2">
                {TOOL_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setToolType(type)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      toolType === type
                        ? 'border-[#0033A0] bg-[#0033A0] text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                    }`}
                  >
                    {type === 'All' ? 'All Types' : type}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      difficulty === level
                        ? 'border-[#0033A0] bg-[#0033A0] text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                    }`}
                  >
                    {level === 'All' ? 'All Levels' : level}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSort(option.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      sort === option.value
                        ? 'border-[#0033A0] bg-[#0033A0] text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                {!loading && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {total} result{total !== 1 ? 's' : ''}
                  </span>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 text-xs text-[#0033A0] font-medium hover:underline"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tools grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-[#0033A0] flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No tools found</h3>
              <p className="text-gray-500 mb-4 text-sm">
                {search
                  ? `No tools match "${search}" with your current filters.`
                  : activeTab === 'marketplace'
                    ? 'No marketplace tools match your current filters.'
                    : 'No community tools match your current filters.'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-medium text-sm hover:bg-[#002580] transition-colors"
                >
                  Clear all filters
                </button>
                {canPublish && (
                  <a
                    href={search ? `/builder?idea=${encodeURIComponent(search)}` : '/builder'}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0033A0] px-5 py-2.5 text-sm font-medium text-[#0033A0] transition-colors hover:bg-blue-50"
                  >
                    <span>Build this tool</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map(tool => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  signals={getSignals(tool)}
                  inLibrary={libraryIds.has(tool.id)}
                  onToggleLibrary={handleToggleLibrary}
                  onOpenModal={setModalTool}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {modalTool && (
        <ToolLaunchModal
          tool={modalTool}
          inLibrary={libraryIds.has(modalTool.id)}
          onClose={() => setModalTool(null)}
          onToggleLibrary={handleToggleLibrary}
        />
      )}
    </div>
  )
}
