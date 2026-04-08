'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Search, ChevronDown, ChevronUp, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'

const DISCIPLINES = ['All', 'STEM', 'Humanities', 'Social Sciences', 'Arts', 'Professional', 'Health Sciences']
const TIERS = ['All', 'Foundation', 'Awareness', 'Partnership', 'Fluency']
const TYPES = ['All', 'Essay', 'Lab', 'Problem Set', 'Case Study', 'Presentation', 'Project', 'Exam', 'Discussion', 'Portfolio', 'Report']

const TIER_STYLES: Record<string, string> = {
  FOUNDATION: 'bg-gray-100 text-gray-700',
  AWARENESS: 'bg-amber-100 text-amber-700',
  PARTNERSHIP: 'bg-blue-100 text-blue-700',
  FLUENCY: 'bg-green-100 text-green-700',
}

const AI_LEVEL_STYLES: Record<string, string> = {
  PROHIBITED: 'bg-red-100 text-red-700',
  LIMITED: 'bg-amber-100 text-amber-700',
  GUIDED: 'bg-blue-100 text-blue-700',
  OPEN: 'bg-green-100 text-green-700',
}

interface RubricRow {
  criterion: string
  excellent: string
  proficient: string
  developing: string
  beginning: string
}

interface Template {
  id: string
  title: string
  description: string
  tier: string
  aiLevel: string
  assignmentType: string
  discipline: string
  tags: string[]
  syllabusLanguage?: string
  rubricRows?: RubricRow[]
  implementationNotes?: string
}

const PAGE_SIZE = 10

export default function BrowseTemplatesPage() {
  const { currentUser } = useAuth()

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)

  // Filters
  const [discipline, setDiscipline] = useState('All')
  const [tier, setTier] = useState('All')
  const [type, setType] = useState('All')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Expanded cards
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Debounce search
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [discipline, tier, type])

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (discipline !== 'All') params.set('discipline', discipline.toUpperCase().replace(' ', '_'))
    if (tier !== 'All') params.set('tier', tier.toUpperCase())
    if (type !== 'All') params.set('type', type)
    if (debouncedSearch) params.set('search', debouncedSearch)
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))

    try {
      const res = await fetch(`/api/ai-literacy/starter-packs/templates?${params}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
        setTotalCount(data.totalCount ?? 0)
      }
    } catch {
      // silently handle
    }
    setLoading(false)
  }, [currentUser.email, discipline, tier, type, debouncedSearch, page])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      <PageHeader
        title="Assignment Template Library"
        subtitle="Browse 66 AI-integrated assignment templates across 6 disciplines"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filter Bar */}
        <div className="border rounded-2xl shadow-sm bg-white p-4 sm:p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="size-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none"
            />
          </div>

          {/* Discipline Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Discipline</label>
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINES.map(d => (
                <button
                  key={d}
                  onClick={() => setDiscipline(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    discipline === d
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tier</label>
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map(t => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    tier === t
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    type === t
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Template Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No templates match your filters. Try broadening your search.</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500">{totalCount} template{totalCount !== 1 ? 's' : ''} found</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {templates.map(template => {
                const isExpanded = expandedId === template.id
                return (
                  <div key={template.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : template.id)}
                      className="w-full p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{template.title}</h3>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-gray-400 shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="size-4 text-gray-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_STYLES[template.tier] ?? 'bg-gray-100 text-gray-700'}`}>
                          {template.tier}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AI_LEVEL_STYLES[template.aiLevel] ?? 'bg-gray-100 text-gray-700'}`}>
                          {template.aiLevel}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                          {template.assignmentType}
                        </span>
                      </div>
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.map(tag => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t px-5 py-4 space-y-4 bg-gray-50/50">
                        {/* Syllabus Language */}
                        {template.syllabusLanguage && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Syllabus Language</h4>
                              <button
                                onClick={() => handleCopy(template.syllabusLanguage!, template.id)}
                                className="inline-flex items-center gap-1 text-xs text-[#0033A0] hover:text-[#002880] font-medium"
                              >
                                {copiedId === template.id ? (
                                  <>
                                    <Check className="size-3" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-3" /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 italic bg-white border rounded-lg p-3">
                              {template.syllabusLanguage}
                            </p>
                          </div>
                        )}

                        {/* Rubric Rows */}
                        {template.rubricRows && template.rubricRows.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Rubric</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="text-left p-2 font-semibold text-gray-700 border">Criterion</th>
                                    <th className="text-left p-2 font-semibold text-gray-700 border">Excellent</th>
                                    <th className="text-left p-2 font-semibold text-gray-700 border">Proficient</th>
                                    <th className="text-left p-2 font-semibold text-gray-700 border">Developing</th>
                                    <th className="text-left p-2 font-semibold text-gray-700 border">Beginning</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {template.rubricRows.map((row, i) => (
                                    <tr key={i} className="bg-white">
                                      <td className="p-2 border font-medium text-gray-900">{row.criterion}</td>
                                      <td className="p-2 border text-gray-600">{row.excellent}</td>
                                      <td className="p-2 border text-gray-600">{row.proficient}</td>
                                      <td className="p-2 border text-gray-600">{row.developing}</td>
                                      <td className="p-2 border text-gray-600">{row.beginning}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Implementation Notes */}
                        {template.implementationNotes && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Implementation Notes</h4>
                            <p className="text-xs text-gray-600">{template.implementationNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
