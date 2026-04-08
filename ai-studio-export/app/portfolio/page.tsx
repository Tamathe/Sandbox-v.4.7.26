'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  Award,
  BadgeCheck,
  Briefcase,
  Check,
  ChevronRight,
  Copy,
  FileText,
  FileUp,
  FolderOpen,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Trophy,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { getLevelInfo } from '../lib/xp'
import PortfolioAddItemModal, {
  PortfolioItemRecord,
} from '../components/PortfolioAddItemModal'
import type { PortfolioType } from '../generated/prisma'

type SuggestionItem = {
  id: string
  kind: 'TOOL' | 'QUEST'
  title: string
  description: string
  suggestedType: PortfolioType
  draftItem: {
    type: PortfolioType
    title: string
    organization?: string
    description?: string
    skills?: string[]
    url?: string
    metadata?: Record<string, unknown>
    isVerified?: boolean
  }
}

type BadgeRecord = {
  id: string
  slug: string
  name: string
  icon: string
  description: string
  earnedAt: string
}

type XPRecord = {
  totalXP: number
  sandBalance: number
}

type ResumeDraft = {
  type: PortfolioType
  title: string
  organization: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
  skills: string[]
}

const QUICK_ADD_OPTIONS: Array<{
  type: PortfolioType
  label: string
  icon: React.ElementType
}> = [
  { type: 'EDUCATION', label: 'Education', icon: GraduationCap },
  { type: 'EXPERIENCE', label: 'Experience', icon: Briefcase },
  { type: 'PROJECT', label: 'Project', icon: FolderOpen },
  { type: 'AWARD', label: 'Award', icon: Award },
  { type: 'CERTIFICATION', label: 'Certification', icon: BadgeCheck },
]

function createFallbackItem(
  item: Omit<
    PortfolioItemRecord,
    'createdAt' | 'updatedAt'
  >
): PortfolioItemRecord {
  const now = new Date().toISOString()
  return {
    ...item,
    createdAt: now,
    updatedAt: now,
  }
}

const IAN_FALLBACK_ITEMS: PortfolioItemRecord[] = [
  createFallbackItem({
    id: 'fallback-ian-education',
    userId: 'fallback',
    type: 'EDUCATION',
    title: 'Juris Doctor (J.D.) Candidate',
    organization: 'University of Kentucky J. David Rosenberg College of Law',
    startDate: '2023-08-01T00:00:00.000Z',
    endDate: '2026-05-01T00:00:00.000Z',
    description:
      'Focused on civil procedure, evidence, and legal writing with a strong interest in courtroom advocacy.',
    skills: ['Legal research', 'Case briefing', 'Oral advocacy'],
    url: null,
    isVerified: true,
    metadata: null,
  }),
  createFallbackItem({
    id: 'fallback-ian-experience',
    userId: 'fallback',
    type: 'EXPERIENCE',
    title: 'Legal Intern',
    organization: 'Legal Aid of the Bluegrass',
    startDate: '2024-05-01T00:00:00.000Z',
    endDate: '2024-08-01T00:00:00.000Z',
    description:
      'Supported client intake, researched Kentucky civil procedure issues, and drafted internal memos for supervising attorneys.',
    skills: ['Client intake', 'Legal writing', 'Research'],
    url: null,
    isVerified: false,
    metadata: null,
  }),
  createFallbackItem({
    id: 'fallback-ian-project',
    userId: 'fallback',
    type: 'PROJECT',
    title: 'Evidence Rules Simulator',
    organization: 'The Sandbox',
    startDate: '2024-10-01T00:00:00.000Z',
    endDate: null,
    description:
      'Designed an AI-powered practice experience that helps law students work through Federal Rules of Evidence scenarios.',
    skills: ['Prompt design', 'Learning design', 'Evidence'],
    url: null,
    isVerified: true,
    metadata: { toolId: 'tool-law756-evidence-quiz' },
  }),
]

function sortPortfolioItems(items: PortfolioItemRecord[]) {
  return [...items].sort((a, b) => {
    const aStart = a.startDate ? new Date(a.startDate).getTime() : 0
    const bStart = b.startDate ? new Date(b.startDate).getTime() : 0
    if (aStart !== bStart) return bStart - aStart
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return 'Dates not provided'

  const formatValue = (value: string | null) => {
    if (!value) return 'Present'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return format(parsed, 'MMM yyyy')
  }

  if (!startDate) return formatValue(endDate)
  return `${formatValue(startDate)} - ${formatValue(endDate)}`
}

function itemTypeLabel(type: PortfolioType) {
  switch (type) {
    case 'EDUCATION':
      return 'Education'
    case 'EXPERIENCE':
      return 'Experience'
    case 'PROJECT':
      return 'Project'
    case 'AWARD':
      return 'Award'
    case 'CERTIFICATION':
      return 'Certification'
    case 'PUBLICATION':
      return 'Publication'
    case 'SKILL':
      return 'Skill'
    default:
      return type
  }
}

function itemTypeIcon(type: PortfolioType) {
  switch (type) {
    case 'EDUCATION':
      return GraduationCap
    case 'EXPERIENCE':
      return Briefcase
    case 'PROJECT':
      return FolderOpen
    case 'AWARD':
      return Award
    case 'CERTIFICATION':
      return BadgeCheck
    default:
      return FileText
  }
}

export default function PortfolioPage() {
  const { currentUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PortfolioItemRecord[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [badges, setBadges] = useState<BadgeRecord[]>([])
  const [xpStats, setXpStats] = useState<XPRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallbackItems, setUsingFallbackItems] = useState(false)
  const [activeTab, setActiveTab] = useState<'timeline' | 'credentials'>('timeline')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<PortfolioType>('EXPERIENCE')
  const [editingItem, setEditingItem] = useState<PortfolioItemRecord | undefined>(undefined)
  const [pageError, setPageError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importDrafts, setImportDrafts] = useState<ResumeDraft[]>([])
  const [isSavingDrafts, setIsSavingDrafts] = useState(false)
  const [showResumeWriter, setShowResumeWriter] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [jobDescription, setJobDescription] = useState('')
  const [resumeOutput, setResumeOutput] = useState('')
  const [isGeneratingBullets, setIsGeneratingBullets] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [resumeCopied, setResumeCopied] = useState(false)

  const loadPortfolioData = useCallback(async () => {
    setLoading(true)
    setPageError('')

    try {
      const [portfolioResponse, suggestionsResponse, xpResponse, badgesResponse] = await Promise.all([
        fetch('/api/portfolio', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch('/api/portfolio/suggestions', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch(`/api/xp?email=${encodeURIComponent(currentUser.email)}`),
        fetch('/api/xp/badges', {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])

      const [portfolioData, suggestionData, xpData, badgeData] = await Promise.all([
        portfolioResponse.json().catch(() => ({})),
        suggestionsResponse.json().catch(() => ({})),
        xpResponse.json().catch(() => ({})),
        badgesResponse.json().catch(() => ({})),
      ])

      if (!portfolioResponse.ok) {
        throw new Error(portfolioData.error || 'Failed to load portfolio')
      }

      const fetchedItems = Array.isArray(portfolioData.items)
        ? (portfolioData.items as PortfolioItemRecord[])
        : []

      if (fetchedItems.length > 0) {
        setItems(sortPortfolioItems(fetchedItems))
        setUsingFallbackItems(false)
      } else if (currentUser.email === 'ian.mcclure.student@uky.edu') {
        setItems(sortPortfolioItems(IAN_FALLBACK_ITEMS))
        setUsingFallbackItems(true)
      } else {
        setItems([])
        setUsingFallbackItems(false)
      }

      setSuggestions(Array.isArray(suggestionData.suggestions) ? suggestionData.suggestions : [])
      if (xpData.totalXP !== undefined && xpData.sandBalance !== undefined) {
        setXpStats({
          totalXP: xpData.totalXP,
          sandBalance: xpData.sandBalance,
        })
      } else {
        setXpStats(null)
      }
      setBadges(Array.isArray(badgeData.badges) ? badgeData.badges : [])
    } catch (err) {
      setItems([])
      setSuggestions([])
      setBadges([])
      setXpStats(null)
      setUsingFallbackItems(false)
      setPageError(err instanceof Error ? err.message : 'Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    void loadPortfolioData()
  }, [loadPortfolioData])

  const uniqueSkills = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.skills))).sort((a, b) => a.localeCompare(b)),
    [items]
  )

  const credentialsItems = useMemo(
    () => items.filter((item) => item.type === 'CERTIFICATION' || item.type === 'AWARD'),
    [items]
  )

  const levelInfo = xpStats ? getLevelInfo(xpStats.totalXP) : null

  const openCreateModal = (type: PortfolioType) => {
    setEditingItem(undefined)
    setModalType(type)
    setModalOpen(true)
  }

  const handleModalSave = (saved: PortfolioItemRecord) => {
    setUsingFallbackItems(false)
    setItems((prev) => {
      const base = usingFallbackItems ? [] : prev
      const existingIndex = base.findIndex((item) => item.id === saved.id)
      if (existingIndex >= 0) {
        const next = [...base]
        next[existingIndex] = saved
        return sortPortfolioItems(next)
      }
      return sortPortfolioItems([saved, ...base])
    })
    void loadPortfolioData()
  }

  const handleDeleteItem = async (item: PortfolioItemRecord) => {
    const confirmed = window.confirm(`Delete "${item.title}" from your portfolio?`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/portfolio/items/${item.id}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete portfolio item')
      }

      setItems((prev) => prev.filter((entry) => entry.id !== item.id))
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to delete portfolio item')
    }
  }

  const addSuggestion = async (suggestion: SuggestionItem) => {
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify(suggestion.draftItem),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add suggestion')
      }

      const created = (data.item ?? data) as PortfolioItemRecord
      setUsingFallbackItems(false)
      setItems((prev) => sortPortfolioItems([created, ...(usingFallbackItems ? [] : prev)]))
      setSuggestions((prev) => prev.filter((entry) => entry.id !== suggestion.id))
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to add suggestion')
    }
  }

  const dismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((entry) => entry.id !== id))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setPageError('')

    try {
      const text = await file.text()
      const response = await fetch('/api/portfolio/import-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ text }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import resume')
      }

      setImportDrafts(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to import resume')
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const handleAddAllDrafts = async () => {
    if (!importDrafts.length) return
    setIsSavingDrafts(true)
    setPageError('')

    try {
      const createdItems = await Promise.all(
        importDrafts.map(async (draft) => {
          const response = await fetch('/api/portfolio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-demo-user-email': currentUser.email,
            },
            body: JSON.stringify(draft),
          })

          const data = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(data.error || `Failed to save ${draft.title}`)
          }

          return (data.item ?? data) as PortfolioItemRecord
        })
      )

      setUsingFallbackItems(false)
      setItems((prev) => sortPortfolioItems([...createdItems, ...(usingFallbackItems ? [] : prev)]))
      setImportDrafts([])
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to save imported resume items')
    } finally {
      setIsSavingDrafts(false)
      void loadPortfolioData()
    }
  }

  const openResumeWriter = () => {
    setSelectedItemIds(items.map((item) => item.id))
    setJobDescription('')
    setResumeOutput('')
    setResumeCopied(false)
    setShowResumeWriter(true)
  }

  const handleGenerateBullets = async () => {
    const selectedItems = items.filter((item) => selectedItemIds.includes(item.id))
    if (!selectedItems.length || !jobDescription.trim()) return

    setIsGeneratingBullets(true)
    setResumeOutput('')

    try {
      const response = await fetch('/api/portfolio/generate-bullets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          items: selectedItems,
          jobDescription,
        }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate resume bullets')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value)
        setResumeOutput(text)
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to generate resume bullets')
    } finally {
      setIsGeneratingBullets(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setPageError('Could not copy portfolio link')
    }
  }

  const handleCopyResumeOutput = async () => {
    if (!resumeOutput) return
    try {
      await navigator.clipboard.writeText(resumeOutput)
      setResumeCopied(true)
      window.setTimeout(() => setResumeCopied(false), 2000)
    } catch {
      setPageError('Could not copy resume bullets')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0033A0]">
              <FileText className="h-3.5 w-3.5" />
              Living Portfolio
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Build a portfolio that grows with your Sandbox work
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Capture your coursework, projects, awards, and certifications in one place, then turn
              them into resume-ready bullets tailored to the next opportunity you want.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50"
            >
              {shareCopied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
              {shareCopied ? 'Link copied' : 'Share'}
            </button>
            <button
              type="button"
              onClick={() => openCreateModal('EXPERIENCE')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
        </div>

        {pageError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-1">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#0033A0] to-blue-600 px-5 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                  Portfolio Snapshot
                </p>
                <h2 className="mt-1 text-xl font-bold">{currentUser.name}</h2>
                <p className="mt-1 text-sm text-blue-100">
                  {currentUser.department} · {currentUser.college}
                </p>
                {xpStats && levelInfo && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/15 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                        Level
                      </p>
                      <p className="mt-1 text-lg font-bold">Level {levelInfo.level}</p>
                      <p className="text-xs text-blue-100">{levelInfo.name}</p>
                    </div>
                    <div className="rounded-2xl bg-white/15 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                        Sand
                      </p>
                      <p className="mt-1 text-lg font-bold">{xpStats.sandBalance.toLocaleString()}</p>
                      <p className="text-xs text-blue-100">Marketplace balance</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Quick Add
                    </span>
                    <span className="text-xs text-slate-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    {QUICK_ADD_OPTIONS.map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => openCreateModal(option.type)}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-[#0033A0]/30 hover:bg-blue-50"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0033A0]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{option.label}</span>
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0033A0]">
                      <FileUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-900">Import Resume</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Upload resume text and let Claude draft structured portfolio items for review.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isImporting}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
                        >
                          {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                          {isImporting ? 'Reading...' : 'Choose file'}
                        </button>
                        <button
                          type="button"
                          onClick={openResumeWriter}
                          disabled={items.length === 0}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-[#0033A0] transition-colors hover:bg-blue-50 disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Resume Writer
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(event) => void handleFileUpload(event)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Skills Snapshot
                    </span>
                    <span className="text-xs text-slate-400">{uniqueSkills.length} skills</span>
                  </div>
                  {uniqueSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {uniqueSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Skills will appear here automatically as you add experience, projects, and credentials.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-2">
            {suggestions.length > 0 && (
              <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0033A0]">
                      Sandbox Suggestion
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      You recently completed {suggestions[0].title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{suggestions[0].description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void addSuggestion(suggestions[0])}
                      className="rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                    >
                      Add to {itemTypeLabel(suggestions[0].suggestedType)}
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissSuggestion(suggestions[0].id)}
                      className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-blue-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Your Portfolio</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Curate the evidence of your growth and turn it into career-ready language.
                    </p>
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('timeline')}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        activeTab === 'timeline'
                          ? 'bg-white text-[#0033A0] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('credentials')}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        activeTab === 'credentials'
                          ? 'bg-white text-[#0033A0] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Credentials & Badges
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="animate-pulse rounded-2xl border border-slate-200 p-5">
                        <div className="h-4 w-32 rounded bg-slate-200" />
                        <div className="mt-3 h-6 w-3/5 rounded bg-slate-200" />
                        <div className="mt-2 h-4 w-2/5 rounded bg-slate-100" />
                        <div className="mt-4 h-16 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : activeTab === 'timeline' ? (
                  items.length > 0 ? (
                    <>
                      {usingFallbackItems && (
                        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Showing a starter portfolio preview for Ian. Add your own items to replace it with real data.
                        </div>
                      )}
                      <div className="space-y-5">
                        {sortPortfolioItems(items).map((item) => {
                          const Icon = itemTypeIcon(item.type)
                          return (
                            <div key={item.id} className="relative pl-8">
                              <div className="absolute left-0 top-5 h-3.5 w-3.5 rounded-full bg-[#0033A0]" />
                              <div className="absolute left-[6px] top-8 h-[calc(100%-8px)] w-px bg-slate-200" />
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#0033A0]">
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                          {itemTypeLabel(item.type)}
                                        </span>
                                        {item.isVerified && (
                                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-700">
                                            Verified
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h3>
                                      {item.organization && (
                                        <p className="text-sm font-medium text-slate-600">{item.organization}</p>
                                      )}
                                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                                        {formatDateRange(item.startDate, item.endDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItem(item)
                                        setModalType(item.type)
                                        setModalOpen(true)
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteItem(item)}
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {item.description && (
                                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                    {item.description}
                                  </p>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  {item.skills.map((skill) => (
                                    <span
                                      key={`${item.id}-${skill}`}
                                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {item.url && (
                                    <Link
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0033A0] hover:bg-blue-100"
                                    >
                                      View link
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                      <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <h3 className="text-lg font-semibold text-slate-700">No portfolio items yet</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Start with a course project, internship, or academic award and build from there.
                      </p>
                      <button
                        type="button"
                        onClick={() => openCreateModal('EXPERIENCE')}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                      >
                        <Plus className="h-4 w-4" />
                        Add your first item
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-8">
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <h3 className="text-base font-bold text-slate-900">Platform Badges</h3>
                      </div>
                      {badges.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {badges.map((badge) => (
                            <div
                              key={badge.id}
                              className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                                  <span>{badge.icon}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{badge.name}</p>
                                  <p className="text-xs text-slate-500">
                                    Earned {format(new Date(badge.earnedAt), 'MMM d, yyyy')}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-3 text-sm text-slate-600">{badge.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          Earn platform badges by completing sessions, quests, and learning milestones.
                        </div>
                      )}
                    </section>

                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-[#0033A0]" />
                        <h3 className="text-base font-bold text-slate-900">Awards & Certifications</h3>
                      </div>
                      {credentialsItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {credentialsItems.map((item) => {
                            const Icon = itemTypeIcon(item.type)
                            return (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0033A0]">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900">{item.title}</p>
                                    {item.organization && (
                                      <p className="text-sm text-slate-500">{item.organization}</p>
                                    )}
                                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                                      {formatDateRange(item.startDate, item.endDate)}
                                    </p>
                                  </div>
                                </div>
                                {item.description && (
                                  <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          Add awards or certifications to make credentials easy to scan alongside your Sandbox badges.
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PortfolioAddItemModal
        open={modalOpen}
        defaultType={modalType}
        editItem={editingItem}
        onClose={() => {
          setModalOpen(false)
          setEditingItem(undefined)
        }}
        onSave={handleModalSave}
      />

      {importDrafts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review imported resume items</h2>
                <p className="text-sm text-slate-500">
                  Claude drafted these items from your file. Add them to your portfolio when they look right.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportDrafts([])}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
              {importDrafts.map((draft, index) => {
                const Icon = itemTypeIcon(draft.type)
                return (
                  <div key={`${draft.title}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0033A0]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {itemTypeLabel(draft.type)}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">{draft.title}</h3>
                        {draft.organization && (
                          <p className="text-sm text-slate-500">{draft.organization}</p>
                        )}
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {formatDateRange(draft.startDate, draft.endDate)}
                        </p>
                      </div>
                    </div>
                    {draft.description && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">{draft.description}</p>
                    )}
                    {draft.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {draft.skills.map((skill) => (
                          <span
                            key={`${draft.title}-${skill}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setImportDrafts([])}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAddAllDrafts()}
                disabled={isSavingDrafts}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
              >
                {isSavingDrafts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isSavingDrafts ? 'Saving...' : 'Add All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResumeWriter && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 p-4">
          <div className="mx-auto flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">AI Resume Writer</h2>
                <p className="text-sm text-slate-500">
                  Select the portfolio items that fit the role, then tailor them to a target job description.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResumeWriter(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
              <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                    Select experiences
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedItemIds(items.map((item) => item.id))}
                    className="text-xs font-semibold text-[#0033A0] hover:underline"
                  >
                    Select all
                  </button>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedItemIds((prev) => [...prev, item.id])
                          } else {
                            setSelectedItemIds((prev) => prev.filter((id) => id !== item.id))
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0033A0] focus:ring-[#0033A0]"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{itemTypeLabel(item.type)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="border-b border-slate-200 p-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Target job description
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    rows={8}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0033A0]"
                    placeholder="Paste the internship, job, fellowship, or clerkship description here..."
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleGenerateBullets()}
                      disabled={isGeneratingBullets || selectedItemIds.length === 0 || !jobDescription.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
                    >
                      {isGeneratingBullets ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isGeneratingBullets ? 'Generating...' : 'Generate'}
                    </button>
                    {resumeOutput && !isGeneratingBullets && (
                      <button
                        type="button"
                        onClick={() => void handleCopyResumeOutput()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        {resumeCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        {resumeCopied ? 'Copied' : 'Copy to Clipboard'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  {resumeOutput ? (
                    <div className="prose prose-sm max-w-none text-slate-700">
                      <ReactMarkdown>{resumeOutput}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                      <Sparkles className="mb-3 h-8 w-8 text-slate-300" />
                      <h3 className="text-lg font-semibold text-slate-700">Ready for tailored bullets</h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Choose your strongest experiences, paste a job description, and generate a targeted markdown draft you can refine.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
