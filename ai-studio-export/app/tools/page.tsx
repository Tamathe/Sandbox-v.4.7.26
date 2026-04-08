'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, SlidersHorizontal, X, Sparkles, GraduationCap, ArrowRight, Building2, Coins, Lock, Gamepad2, Headphones, Trophy, Users, Mic, TrendingUp, Shield, Coffee, Compass, ChevronDown, FlaskConical, BookOpen } from 'lucide-react'
import ToolLaunchModal from '../components/ToolLaunchModal'
import { ToolWithDetails } from '../lib/types'
import { useAuth } from '../lib/auth-context'
import { SANDCASTLE_EXPERIENCES, CATEGORY_ORDER, SandcastleCategory } from '../lib/sandcastle'
import { CAMPUS_TOOLS } from '../lib/campus-navigator'
import { RESEARCH_TOOLS } from '../lib/research-hub'

const CATEGORIES = ['All', 'Law', 'History', 'STEM', 'Medicine', 'Business', 'Arts', 'University', 'Registrar Tools', 'General']

const TOOL_TYPES = ['All', 'AI Chat', 'Scenario', 'Practice Quiz', 'Mock Interview', 'Debate', 'Study Aid', 'External Link']

const TOOL_TYPE_VALUES: Record<string, string> = {
  'AI Chat':        'CHATBOT',
  'External Link':  'EXTERNAL',
  'Scenario':       'SIMULATION',
  'Practice Quiz':  'QUIZ',
  'Mock Interview': 'AI_INTERVIEW',
  'Debate':         'DEBATE',
  'Study Aid':      'STUDY_BUDDY',
}

const TOOL_TYPE_LABELS: Record<string, string> = {
  CHATBOT:      'AI Chat',
  SIMULATION:   'Scenario',
  QUIZ:         'Practice Quiz',
  AI_INTERVIEW: 'Mock Interview',
  DEBATE:       'Debate',
  STUDY_BUDDY:  'Study Aid',
  EXTERNAL:     'External Link',
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

const CATEGORY_LABELS: Record<SandcastleCategory, string> = {
  'Educator Tools': 'Educator Tools',
  'Game': 'Games & Challenges',
  'Role-Play': 'AI Role-Play Experiences',
  'Sports AI': 'Sports & Competition',
  'Club & Organizer': 'Clubs & Organizers',
}

const CATEGORY_DESCRIPTIONS: Record<SandcastleCategory, string> = {
  'Educator Tools': 'AI-powered tools for faculty — stress-test assignments, build rubrics, and design better learning experiences.',
  'Game': 'Test your mind, compete for scores, and challenge friends.',
  'Role-Play': 'Step into another world and talk to characters from history and fiction.',
  'Sports AI': 'AI-powered strategy tools for brackets, drafts, and game-day decisions.',
  'Club & Organizer': 'Find venues, send emails, make posters, and run your group — AI handles the logistics.',
}

const LEAGUE_ENGINE_LINKS = [
  {
    href: '/tools/prediction-market',
    title: 'Prediction Market',
    description: 'Make bold predictions on shared questions, bet your Sand, and see who called it right.',
    icon: TrendingUp,
  },
  {
    href: '/tools/survivor-pool',
    title: 'Survivor Pool',
    description: 'Pick one winner each week, no repeats. One wrong pick and you\'re out. Last one standing wins.',
    icon: Shield,
  },
  {
    href: '/tools/coffee-roulette',
    title: 'Coffee Roulette',
    description: 'Get matched with a random campus member each week for a coffee chat. Simple, low-pressure networking.',
    icon: Coffee,
  },
] as const

const CATEGORY_ICONS: Record<SandcastleCategory, React.ComponentType<{ className?: string }>> = {
  'Game': Gamepad2,
  'Role-Play': Mic,
  'Sports AI': Trophy,
  'Club & Organizer': Users,
  'Educator Tools': GraduationCap,
}

function getDeptCategory(user: { department?: string | null; college?: string | null }): string | null {
  const haystack = `${user.department ?? ''} ${user.college ?? ''}`.toLowerCase()
  for (const { match, category } of DEPT_TO_CATEGORY) {
    if (haystack.includes(match)) return category
  }
  return null
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 animate-pulse">
      <div className="h-8 w-8 bg-gray-200 rounded mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-full mb-1" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  )
}

const CARD_EMOJI: Record<string, string> = {
  Law: '⚖️', History: '🏛️', STEM: '🧪', Medicine: '🩺',
  Business: '💼', Arts: '🎨', University: '🎓',
  'University Service': '🏫', 'Registrar Tools': '📋', General: '💡',
}
const CARD_COLOR: Record<string, string> = {
  Law: 'text-indigo-600', History: 'text-amber-600', STEM: 'text-emerald-600',
  Medicine: 'text-red-600', Business: 'text-blue-600', Arts: 'text-purple-600',
  University: 'text-sky-600', 'University Service': 'text-sky-600',
  'Registrar Tools': 'text-[#0033A0]', General: 'text-gray-600',
}
const CARD_BORDER: Record<string, string> = {
  Law: 'border-indigo-200 hover:border-indigo-400',
  History: 'border-amber-200 hover:border-amber-400',
  STEM: 'border-emerald-200 hover:border-emerald-400',
  Medicine: 'border-red-200 hover:border-red-400',
  Business: 'border-blue-200 hover:border-blue-400',
  Arts: 'border-purple-200 hover:border-purple-400',
  University: 'border-sky-200 hover:border-sky-400',
  'University Service': 'border-sky-200 hover:border-sky-400',
  'Registrar Tools': 'border-blue-200 hover:border-blue-400',
  General: 'border-gray-200 hover:border-gray-400',
}

function SimpleToolCard({ tool, onOpenModal }: { tool: ToolWithDetails; onOpenModal?: (tool: ToolWithDetails) => void }) {
  const emoji = CARD_EMOJI[tool.category] ?? '🛠️'
  const color = CARD_COLOR[tool.category] ?? 'text-gray-600'
  const border = CARD_BORDER[tool.category] ?? 'border-gray-200 hover:border-gray-400'
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const isNew = new Date(tool.createdAt) >= sevenDaysAgo
  const isHot = !isNew && (tool._count.sessions ?? 0) >= 50
  const typeLabel = tool.toolType ? TOOL_TYPE_LABELS[tool.toolType] : null
  return (
    <button
      type="button"
      onClick={() => onOpenModal?.(tool)}
      className={`group relative bg-white rounded-xl border-2 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left w-full ${border}`}
    >
      {isNew && (
        <span className="absolute top-2 right-2 text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">New</span>
      )}
      {isHot && (
        <span className="absolute top-2 right-2 text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">Hot</span>
      )}
      <span className="text-3xl block mb-2">{emoji}</span>
      <div className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 leading-snug">{tool.name}</div>
      {typeLabel && (
        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mb-1">{typeLabel}</span>
      )}
      <div className={`text-xs font-medium line-clamp-3 leading-snug ${color}`}>{tool.shortDescription}</div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-semibold text-[#0033A0]">Open →</span>
      </div>
    </button>
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

const TABS = [
  { key: 'educational', label: 'Learn',    Icon: BookOpen   },
  { key: 'university',  label: 'Services', Icon: Building2  },
  { key: 'live',        label: 'Play',     Icon: Gamepad2   },
] as const

type TabKey = typeof TABS[number]['key']

export default function ToolsPage() {
  const { currentUser } = useAuth()
  const browseRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  const rawSection = searchParams.get('section') ?? 'educational'
  const section: TabKey = ['educational', 'university', 'live'].includes(rawSection)
    ? (rawSection as TabKey)
    : 'educational'

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
  const [audioOnly, setAudioOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'community'>('marketplace')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set())
  const [modalTool, setModalTool] = useState<ToolWithDetails | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Live / Sandcastle state
  const [sandBalance, setSandBalance] = useState<number>(0)
  const [sandBalanceLoading, setSandBalanceLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<SandcastleCategory | 'All'>('All')
  const [comingSoonClicked, setComingSoonClicked] = useState<string | null>(null)

  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'
  const canPublish = ['EDUCATOR', 'STUDENT', 'ADMIN'].includes(currentUser.role)
  const deptCategory = getDeptCategory(currentUser)

  useEffect(() => {
    setAllLoading(true)
    const params = new URLSearchParams({ limit: '100', sort: 'newest' })
    if (activeTab === 'marketplace') params.set('approvalStatus', 'APPROVED')

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

  useEffect(() => {
    let cancelled = false
    fetch(`/api/xp?email=${encodeURIComponent(currentUser.email)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.sandBalance !== undefined) setSandBalance(d.sandBalance) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSandBalanceLoading(false) })
    return () => { cancelled = true }
  }, [currentUser.email])

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

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput) }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const PAGE_SIZE = 24

  const fetchTools = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category !== 'All') params.set('category', category)
      if (toolType !== 'All') params.set('toolType', TOOL_TYPE_VALUES[toolType] || toolType.toUpperCase())
      if (difficulty !== 'All') params.set('difficulty', difficulty)
      if (audioOnly) params.set('audioEnabled', 'true')
      if (activeTab === 'marketplace') params.set('approvalStatus', 'APPROVED')
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
    } catch (err) {
      console.error('Failed to fetch tools:', err)
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [search, category, toolType, difficulty, sort, audioOnly, activeTab, currentUser.email])

  useEffect(() => { fetchTools(1) }, [fetchTools])

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
  const hasActiveFilters =
    category !== 'All' || toolType !== 'All' || difficulty !== 'All' || audioOnly || search !== ''
  const clearAllFilters = () => {
    setCategory('All'); setToolType('All'); setDifficulty('All')
    setAudioOnly(false)
    setSearchInput(''); setSearch('')
    setPage(1)
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

  const visibleSandcastleCategories = currentUser.role === 'STUDENT'
    ? CATEGORY_ORDER.filter((cat) => cat !== 'Educator Tools')
    : CATEGORY_ORDER

  const filteredExperiences = activeCategory === 'All'
    ? SANDCASTLE_EXPERIENCES
    : SANDCASTLE_EXPERIENCES.filter(e => e.category === activeCategory)

  const groupedExperiences = visibleSandcastleCategories.reduce<Record<string, typeof SANDCASTLE_EXPERIENCES>>((acc, cat) => {
    const items = filteredExperiences.filter(e => e.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Tools</h1>
              <p className="text-gray-500 text-sm mt-1">
                Discover AI-powered learning tools, university services, and live experiences.
              </p>
            </div>
            {canPublish && (
              <a
                href="/build"
                className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#002580] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Build a Tool
              </a>
            )}
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
            {TABS.map(tab => {
              const activeClass =
                tab.key === 'university' ? 'bg-[#0033A0] text-white shadow-sm' :
                tab.key === 'live'       ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm' :
                                          'bg-white text-gray-900 shadow-sm'
              return (
                <Link
                  key={tab.key}
                  href={`/tools?section=${tab.key}`}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    section === tab.key ? activeClass : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </Link>
              )
            })}
          </div>

          {/* Search bar — Learn tab only */}
          {section === 'educational' && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0]">
                <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search tools, topics, categories..."
                  value={searchInput}
                  onChange={e => {
                    setSearchInput(e.target.value)
                    if (e.target.value.trim()) {
                      setTimeout(() => browseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
                    }
                  }}
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
                />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] border border-[#0033A0]/30 rounded-full px-3 py-2 hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3" />
                Ask Sandy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── EDUCATIONAL TAB ── */}
      {section === 'educational' && (
        <>
          {/* CURATED SECTIONS — hidden when search is active */}
          {!search && (
            <>
              {/* FEATURED + MY TOOLS */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                  {/* Your Published Tools — educators first */}
                  {isEducator && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <GraduationCap className="w-4 h-4 text-[#0033A0]" />
                        <h2 className="text-base font-extrabold text-gray-900">Your Tools</h2>
                      </div>
                      {allLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                      ) : myTools.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {myTools.slice(0, 4).map(tool => (
                            <SimpleToolCard key={tool.id} tool={tool} onOpenModal={setModalTool} />
                          ))}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                          <p className="text-sm text-gray-500 mb-3">You haven&apos;t published any tools yet.</p>
                          <a href="/build" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0033A0] hover:underline">
                            <Sparkles className="w-3.5 h-3.5" />
                            Build your first tool →
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Featured Experiences */}
                  <div>
                    <div
                      className="rounded-t-2xl px-6 py-4 flex items-center justify-between"
                      style={{ background: 'linear-gradient(135deg, #001f6b 0%, #0033A0 50%, #1a56d6 100%)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-200" />
                        <span className="text-white font-bold text-lg">Featured Experiences</span>
                        <span className="text-blue-200 text-sm hidden sm:inline">— curated AI tools across disciplines</span>
                      </div>
                      <Link href="/tools?featured=true&section=educational" className="text-blue-200 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <div className="border-2 border-t-0 border-[#0033A0]/20 rounded-b-2xl bg-gray-50 p-4">
                      {allLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {featuredTools.slice(0, 4).map(tool => (
                            <SimpleToolCard key={tool.id} tool={tool} onOpenModal={setModalTool} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* CAMPUS NAVIGATOR + RESEARCH HUB — role-gated order */}
              {isEducator ? (
                <>
                  {/* Research Hub first for educators */}
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
                    <div>
                      <div
                        className="rounded-t-2xl px-6 py-4 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #1e5c1e 50%, #2d8c2d 100%)' }}
                      >
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-5 h-5 text-green-200" />
                          <span className="text-white font-bold text-lg">Research Hub</span>
                          <span className="text-green-200 text-sm hidden sm:inline">— for faculty &amp; graduate researchers</span>
                        </div>
                        <Link href="/research-hub" className="text-green-200 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                          View all <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      <div className="border-2 border-t-0 border-green-800/20 rounded-b-2xl bg-gray-50 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {RESEARCH_TOOLS.filter(t => t.status === 'live').map(tool => (
                            <Link key={tool.slug} href={`/research-hub/${tool.slug}`} className={`bg-white rounded-xl border-2 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ${tool.border}`}>
                              <span className="text-3xl block mb-2">{tool.emoji}</span>
                              <div className="text-sm font-bold text-gray-900 mb-0.5">{tool.title}</div>
                              <div className={`text-xs font-medium ${tool.color}`}>{tool.tagline}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
                    <div>
                      <div
                        className="rounded-t-2xl px-6 py-4 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #001f6b 0%, #0033A0 50%, #1a56d6 100%)' }}
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="w-5 h-5 text-blue-200" />
                          <span className="text-white font-bold text-lg">Campus Navigator</span>
                          <span className="text-blue-200 text-sm hidden sm:inline">— AI tools to navigate UK</span>
                        </div>
                        <Link href="/campus-navigator" className="text-blue-200 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                          View all <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      <div className="border-2 border-t-0 border-[#0033A0]/20 rounded-b-2xl bg-gray-50 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {CAMPUS_TOOLS.filter(t => t.status === 'live').map(tool => (
                            <Link key={tool.slug} href={`/campus-navigator/${tool.slug}`} className={`bg-white rounded-xl border-2 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ${tool.border}`}>
                              <span className="text-3xl block mb-2">{tool.emoji}</span>
                              <div className="text-sm font-bold text-gray-900 mb-0.5">{tool.title}</div>
                              <div className={`text-xs font-medium ${tool.color}`}>{tool.tagline}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Campus Navigator first for students */}
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
                    <div>
                      <div
                        className="rounded-t-2xl px-6 py-4 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #001f6b 0%, #0033A0 50%, #1a56d6 100%)' }}
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="w-5 h-5 text-blue-200" />
                          <span className="text-white font-bold text-lg">Campus Navigator</span>
                          <span className="text-blue-200 text-sm hidden sm:inline">— AI tools to navigate UK</span>
                        </div>
                        <Link href="/campus-navigator" className="text-blue-200 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                          View all <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      <div className="border-2 border-t-0 border-[#0033A0]/20 rounded-b-2xl bg-gray-50 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {CAMPUS_TOOLS.filter(t => t.status === 'live').map(tool => (
                            <Link key={tool.slug} href={`/campus-navigator/${tool.slug}`} className={`bg-white rounded-xl border-2 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ${tool.border}`}>
                              <span className="text-3xl block mb-2">{tool.emoji}</span>
                              <div className="text-sm font-bold text-gray-900 mb-0.5">{tool.title}</div>
                              <div className={`text-xs font-medium ${tool.color}`}>{tool.tagline}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
                    <div>
                      <div
                        className="rounded-t-2xl px-6 py-4 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #1e5c1e 50%, #2d8c2d 100%)' }}
                      >
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-5 h-5 text-green-200" />
                          <span className="text-white font-bold text-lg">Research Hub</span>
                          <span className="text-green-200 text-sm hidden sm:inline">— for faculty &amp; graduate researchers</span>
                        </div>
                        <Link href="/research-hub" className="text-green-200 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                          View all <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      <div className="border-2 border-t-0 border-green-800/20 rounded-b-2xl bg-gray-50 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {RESEARCH_TOOLS.filter(t => t.status === 'live').map(tool => (
                            <Link key={tool.slug} href={`/research-hub/${tool.slug}`} className={`bg-white rounded-xl border-2 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all ${tool.border}`}>
                              <span className="text-3xl block mb-2">{tool.emoji}</span>
                              <div className="text-sm font-bold text-gray-900 mb-0.5">{tool.title}</div>
                              <div className={`text-xs font-medium ${tool.color}`}>{tool.tagline}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* BROWSE ALL */}
          <div ref={browseRef}>

            {/* Browse tabs */}
            <div className="bg-white border-b border-gray-200 py-4">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
                  {(['marketplace', 'community'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setPage(1) }}
                      className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === tab
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab === 'marketplace' ? 'Curated' : 'Community'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter bar */}
            <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                {/* Primary row: categories + sort + filter toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        title={cat === deptCategory ? 'Matches your department' : undefined}
                        className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
                          category === cat
                            ? 'border-[#0033A0] bg-[#0033A0] text-white'
                            : cat === deptCategory
                              ? 'border-[#0033A0]/40 bg-[#0033A0]/10 text-[#0033A0] hover:bg-[#0033A0]/15'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                        }`}
                      >
                        {cat}
                        {cat === deptCategory && cat !== 'All' && (
                          <Sparkles className="ml-1 h-2.5 w-2.5 opacity-70" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={sort}
                      onChange={e => setSort(e.target.value)}
                      className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-600 bg-white outline-none focus:border-[#0033A0] cursor-pointer"
                    >
                      {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(v => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        showAdvancedFilters || toolType !== 'All' || difficulty !== 'All' || audioOnly
                          ? 'border-[#0033A0] bg-[#0033A0] text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                      }`}
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Filters
                      <ChevronDown className={`h-3 w-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                    </button>
                    {!loading && (
                      <span className="text-xs text-gray-400 whitespace-nowrap">
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

                {/* Advanced filters (collapsible) */}
                {showAdvancedFilters && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mr-1">Type</span>
                      {TOOL_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setToolType(type)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            toolType === type
                              ? 'border-[#0033A0] bg-[#0033A0] text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                          }`}
                        >
                          {type === 'All' ? 'Any' : type}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mr-1">Level</span>
                      {DIFFICULTIES.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setDifficulty(level)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            difficulty === level
                              ? 'border-[#0033A0] bg-[#0033A0] text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                          }`}
                        >
                          {level === 'All' ? 'Any' : level}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAudioOnly((previous) => !previous)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        audioOnly
                          ? 'border-[#0033A0] bg-[#0033A0] text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
                      }`}
                    >
                      <Headphones className="h-3.5 w-3.5" />
                      Audio-Ready
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tools grid */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
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
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {tools.map(tool => (
                      <SimpleToolCard key={tool.id} tool={tool} onOpenModal={setModalTool} />
                    ))}
                  </div>
                  {tools.length < total && (
                    <div className="text-center mt-8">
                      <button
                        type="button"
                        onClick={() => fetchTools(page + 1, true)}
                        disabled={loadingMore}
                        className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0] transition-colors disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading…' : `Show more (${total - tools.length} remaining)`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </>
      )}

      {/* ── UNIVERSITY TAB ── */}
      {section === 'university' && (
        <>
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
                    <p className="text-blue-300 text-xs mt-0.5 font-medium">AI-powered assistant · Not a licensed financial advisor</p>
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
                <Link
                  href="/tools/tool-financial-aid-advisor"
                  className="shrink-0 flex items-center gap-2 bg-white text-[#0033A0] font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-lg"
                >
                  Get Help Now →
                </Link>
              </div>
            </div>
          </div>

          {/* UNIVERSITY SERVICES */}
          <div className="bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-[#0033A0]" />
                <h2 className="text-base font-extrabold text-gray-900">University Services</h2>
              </div>
              {allLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {universityServiceTools.slice(0, 4).map(tool => (
                    <SimpleToolCard key={tool.id} tool={tool} onOpenModal={setModalTool} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── LIVE TAB ── */}
      {section === 'live' && (
        <>
          {/* Live Hero */}
          <div
            className="relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 40%, #f59e0b 100%)' }}
          >
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium text-amber-50 mb-4">
                    <Gamepad2 className="w-4 h-4" />
                    <span>The Sandcastle</span>
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
                    Play, Explore,<br />
                    <span className="text-amber-200">and Connect</span>
                  </h2>
                  <p className="text-amber-100 text-lg max-w-xl leading-relaxed">
                    Games, AI role-play, sports strategy, clubs, and community — this is where your Sand gets spent.
                  </p>
                </div>
                <div className="flex-shrink-0 bg-white/20 backdrop-blur border border-white/30 rounded-2xl px-6 py-5 text-center min-w-[160px]">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Coins className="w-5 h-5 text-amber-200" />
                    <span className="text-sm font-semibold text-amber-100">Your Balance</span>
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {sandBalanceLoading ? (
                      <div className="mx-auto h-8 w-16 animate-pulse rounded bg-white/30" />
                    ) : (
                      sandBalance.toLocaleString()
                    )}
                  </div>
                  <div className="text-xs text-amber-200 mt-0.5">Sand</div>
                </div>
              </div>
            </div>
          </div>

          {/* Category filter bar */}
          <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setActiveCategory('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeCategory === 'All' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {visibleSandcastleCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeCategory === cat ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Experiences */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

            {Object.entries(groupedExperiences).map(([category, experiences]) => (
              <section key={category}>
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    {(() => { const Icon = CATEGORY_ICONS[category as SandcastleCategory]; return <Icon className="w-4 h-4 text-amber-500" /> })()}
                    <h2 className="text-xl font-extrabold text-gray-900">{CATEGORY_LABELS[category as SandcastleCategory]}</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{CATEGORY_DESCRIPTIONS[category as SandcastleCategory]}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {experiences.map(exp => {
                    const canAfford = sandBalance >= exp.sandCost
                    const isLive = exp.status === 'live'

                    return (
                      <div
                        key={exp.slug}
                        className={`relative bg-white rounded-2xl border overflow-hidden transition-all ${
                          isLive
                            ? 'border-gray-200 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5'
                            : 'border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="px-5 pt-5 pb-3">
                          <div className="flex items-start justify-between mb-3">
                            {exp.image ? (
                              <Image src={exp.image} alt={exp.title} width={44} height={32} className="rounded-lg" />
                            ) : (
                              <span className="text-3xl">{exp.emoji}</span>
                            )}
                            <div className="flex items-center gap-1.5">
                              {exp.status === 'coming-soon' && (
                                <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Coming Soon
                                </span>
                              )}
                              {exp.sandCost === 0 ? (
                                <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  Free
                                </span>
                              ) : (
                                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  canAfford ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                                }`}>
                                  <Coins className="w-2.5 h-2.5" />
                                  {exp.sandCost}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${exp.categoryColor}`}>
                            {exp.category}
                          </span>
                          <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{exp.title}</h3>
                          <p className="text-xs text-amber-600 font-medium mb-2">{exp.tagline}</p>
                          <p className="text-sm text-gray-500 leading-relaxed">{exp.description}</p>
                        </div>

                        <div className="px-5 pb-5">
                          {isLive ? (
                            !canAfford ? (
                              <div className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium">
                                <Lock className="w-4 h-4" />
                                Need {exp.sandCost} Sand
                              </div>
                            ) : (
                              <Link
                                href={`/sandcastle/${exp.slug}`}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                              >
                                Launch
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setComingSoonClicked(exp.slug)
                                setTimeout(() => setComingSoonClicked(null), 2500)
                              }}
                              className="w-full cursor-pointer rounded-xl bg-gray-100 py-2.5 text-center text-sm font-medium text-gray-400 transition-colors hover:bg-gray-200"
                            >
                              {comingSoonClicked === exp.slug ? '🏗️ Coming soon - stay tuned!' : 'Coming Soon'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

            {/* Compete with Friends */}
            <section>
              <div className="mb-5">
                <h2 className="text-xl font-extrabold text-gray-900">Compete with Friends</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Join a live group, make your picks, and see where you land on the leaderboard.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {LEAGUE_ENGINE_LINKS.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.description}</p>
                      <div className="mt-4 text-sm font-semibold text-[#0033A0]">Open →</div>
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* Build your own CTA */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Build Your Own Sandcastle Experience</h3>
              <p className="text-gray-600 text-sm mb-5 max-w-xl mx-auto">
                Have an idea for a game, role-play scenario, community tool, or AI-powered organizer? Use the Builder to create it and publish it to the Sandcastle.
              </p>
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Open the Builder
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </>
      )}

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
