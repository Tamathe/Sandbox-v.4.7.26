'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, Info, Bot } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import PolicySearchBar from '../../components/staff/policies/PolicySearchBar'
import PolicyResultCard, { type PolicyResult } from '../../components/staff/policies/PolicyResultCard'
import PolicyCategoryGroup from '../../components/staff/policies/PolicyCategoryGroup'
import PolicyDetailPanel from '../../components/staff/policies/PolicyDetailPanel'
import PolicyAnswerCard from '../../components/staff/policies/PolicyAnswerCard'

interface PolicyListItem {
  id: string
  policyNumber: string
  title: string
  category: string
  responsibleOffice: string
  effectiveDate: string
  lastRevised: string
  summary: string | null
  source?: string
}

interface PolicyAnswer {
  answer: string
  citations: {
    policyNumber: string
    policyTitle: string
    section: string
    excerpt: string
    effectiveDate: string
    responsibleOffice: string
  }[]
  followUpSuggestions: string[]
}

export default function PoliciesPage() {
  const router = useRouter()
  const { currentUser } = useAuth()

  if (currentUser.role !== 'STAFF' && currentUser.role !== 'ADMIN') {
    router.replace('/')
    return null
  }

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchResults, setSearchResults] = useState<PolicyResult[]>([])
  const [browsePolicies, setBrowsePolicies] = useState<PolicyListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'browse' | 'search' | 'answer'>('browse')
  const [searchMode, setSearchMode] = useState<'search' | 'ask'>('search')
  const [answer, setAnswer] = useState<PolicyAnswer | null>(null)
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([])

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/staff/policies/categories', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || data)
        }
      } catch { /* non-fatal */ }
    }
    loadCategories()
  }, [currentUser.email])

  // Load browse data on mount / category change
  useEffect(() => {
    async function loadBrowse() {
      try {
        const catParam = activeCategory && activeCategory !== 'All' ? `category=${encodeURIComponent(activeCategory)}` : ''
        const res = await fetch(`/api/staff/policies?${catParam}&limit=100`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          setBrowsePolicies(data.documents)
        }
      } catch { /* non-fatal */ }
    }
    loadBrowse()
  }, [currentUser.email, activeCategory])

  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery)
    if (!searchQuery.trim()) {
      setViewMode('browse')
      setSearchResults([])
      return
    }
    setViewMode('search')
    setLoading(true)
    try {
      const res = await fetch('/api/staff/policies/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          query: searchQuery,
          category: activeCategory && activeCategory !== 'All' ? activeCategory : undefined,
          limit: 10,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results)
      }
    } catch { /* non-fatal */ }
    setLoading(false)
  }, [currentUser.email, activeCategory])

  const handleAskQuestion = useCallback(async (question: string) => {
    setQuery(question)
    setViewMode('answer')
    setLoading(true)
    setAnswer(null)
    try {
      const res = await fetch('/api/staff/policies/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          question,
          category: activeCategory && activeCategory !== 'All' ? activeCategory : undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnswer(data)
      }
    } catch { /* non-fatal */ }
    setLoading(false)
  }, [currentUser.email, activeCategory])

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category || 'All')
    if (query && viewMode === 'search') {
      handleSearch(query)
    }
  }, [query, viewMode, handleSearch])

  const handleAskSandy = useCallback((policyNumber: string) => {
    window.dispatchEvent(new CustomEvent('sandy-open-with-context', {
      detail: { message: `Tell me about policy ${policyNumber}` },
    }))
  }, [])

  const handleModeChange = useCallback((mode: 'search' | 'ask') => {
    setSearchMode(mode)
    // Reset results when switching modes
    if (mode === 'search') {
      setViewMode(query ? 'search' : 'browse')
      setAnswer(null)
    } else {
      setViewMode(query ? 'answer' : 'browse')
      setSearchResults([])
    }
  }, [query])

  // Group browse policies by category
  const groupedPolicies = browsePolicies.reduce<Record<string, PolicyListItem[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const isRealData = browsePolicies.length > 0 && browsePolicies[0]?.source === 'regs.uky.edu'

  return (
    <div>
      <PageHeader
        title="Policy Navigator"
        subtitle={`Search and browse ${browsePolicies.length || ''} university policies. Ask Sandy for instant answers.`}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Data source banner */}
        {isRealData ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            <BookOpen className="size-4 shrink-0" />
            <span><strong>Official policies</strong> — Sourced from <a href="https://regs.uky.edu" target="_blank" rel="noopener noreferrer" className="underline">regs.uky.edu</a>. {categories.length > 0 && `${categories.reduce((s, c) => s + c.count, 0)} documents across ${categories.length} categories.`}</span>
          </div>
        ) : browsePolicies.length > 0 ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <Info className="size-4 shrink-0" />
            <span><strong>Simulated data</strong> — Policies shown are seeded demo data representing typical university administrative regulations.</span>
          </div>
        ) : null}

        {/* Search bar + category filters */}
        <PolicySearchBar
          query={query}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          onAskQuestion={handleAskQuestion}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          categories={categories}
          mode={searchMode}
          onModeChange={handleModeChange}
        />

        {/* Results area */}
        <div className="mt-6">
          {/* Answer mode */}
          {viewMode === 'answer' ? (
            <div className="space-y-4">
              {loading ? (
                <div className="border-2 border-[#0033A0]/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-full bg-[#0033A0] flex items-center justify-center">
                      <Bot className="size-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">Sandy</div>
                      <div className="text-xs text-gray-500">Analyzing policies...</div>
                    </div>
                  </div>
                  <div className="space-y-3 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                    <div className="h-3 bg-gray-200 rounded w-4/6" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ) : answer ? (
                <div className="border-2 border-[#0033A0]/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-full bg-[#0033A0] flex items-center justify-center">
                      <Bot className="size-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">Sandy</div>
                      <div className="text-xs text-gray-500">Policy Advisor</div>
                    </div>
                  </div>
                  <PolicyAnswerCard
                    answer={answer.answer}
                    citations={answer.citations}
                    followUpSuggestions={answer.followUpSuggestions}
                    onFollowUp={(q) => {
                      setQuery(q)
                      handleAskQuestion(q)
                    }}
                    onViewPolicy={(num) => setSelectedPolicy(num)}
                  />
                </div>
              ) : (
                <div className="border-2 border-gray-200 rounded-2xl p-8 text-center">
                  <Bot className="size-10 mx-auto text-gray-300 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">No answer available</h3>
                  <p className="text-sm text-gray-500">Try rephrasing your question or switch to Search mode.</p>
                </div>
              )}
            </div>
          ) : viewMode === 'search' ? (
            /* Search results */
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border-2 border-gray-200 rounded-2xl p-5 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
                  </p>
                  {searchResults.map((result, i) => (
                    <PolicyResultCard
                      key={i}
                      result={result}
                      query={query}
                      onView={(num) => setSelectedPolicy(num)}
                      onAskSandy={handleAskSandy}
                    />
                  ))}
                </>
              ) : (
                <div className="border-2 border-gray-200 rounded-2xl p-8 text-center">
                  <Search className="size-10 mx-auto text-gray-300 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">No results found</h3>
                  <p className="text-sm text-gray-500">Try a different search term or browse by category below.</p>
                  <button
                    onClick={() => { setViewMode('browse'); setQuery('') }}
                    className="mt-4 text-sm text-[#0033A0] font-medium hover:underline"
                  >
                    Browse all policies
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Browse mode */
            <div className="space-y-4">
              {Object.entries(groupedPolicies).sort(([a], [b]) => a.localeCompare(b)).map(([category, policies]) => (
                <PolicyCategoryGroup
                  key={category}
                  category={category}
                  count={policies.length}
                  policies={policies.map(p => ({
                    id: p.id,
                    policyNumber: p.policyNumber,
                    title: p.title,
                    category: p.category,
                    effectiveDate: p.effectiveDate,
                    responsibleOffice: p.responsibleOffice,
                  }))}
                  onSelectPolicy={(p) => setSelectedPolicy(p.policyNumber)}
                />
              ))}
              {browsePolicies.length === 0 && (
                <div className="border-2 border-gray-200 rounded-2xl p-8 text-center">
                  <BookOpen className="size-10 mx-auto text-gray-300 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">No policies loaded yet</h3>
                  <p className="text-sm text-gray-500">Run the policy seed to populate the policy corpus.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedPolicy && (
          <PolicyDetailPanel
            policyNumber={selectedPolicy}
            onClose={() => setSelectedPolicy(null)}
          />
        )}
      </div>
    </div>
  )
}
