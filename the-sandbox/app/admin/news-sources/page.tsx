'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Loader2,
  Plus,
  RefreshCw,
  Rss,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

type NewsSource = {
  id: string
  name: string
  rssUrl: string
  sourceType: 'INTERNAL' | 'EXTERNAL'
  category: string | null
  active: boolean
  lastFetchedAt: string | null
  createdAt: string
  _count: { articles: number }
}

type Toast = { message: string; type: 'success' | 'error' }

export default function NewsSourcesPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [sources, setSources] = useState<NewsSource[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // New source form state
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newType, setNewType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL')
  const [newCategory, setNewCategory] = useState('')

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchSources = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const data = await apiFetch<{ sources: NewsSource[] }>(currentUser.email, '/api/news/sources', {
        signal,
      })
      setSources(data.sources)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      showToast('Failed to load news sources', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, router, showToast])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') { router.replace('/'); return }
    const controller = new AbortController()
    void fetchSources(controller.signal)
    return () => controller.abort()
  }, [currentUser.role, router, fetchSources])

  const handleToggleActive = async (source: NewsSource) => {
    setActionLoading(`toggle-${source.id}`)
    try {
      await apiFetch(currentUser.email, `/api/news/sources/${source.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !source.active }),
      })
      showToast(`Source ${source.active ? 'deactivated' : 'activated'}`)
      await fetchSources()
    } catch {
      showToast('Failed to update source', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleFetchNow = async (sourceId: string, sourceName: string) => {
    setActionLoading(`fetch-${sourceId}`)
    try {
      const data = await apiFetch<{ newArticles?: number; message?: string }>(
        currentUser.email,
        `/api/cron/news-fetch?sourceId=${sourceId}`,
        { method: 'POST' },
      )
      showToast(`${sourceName}: fetched ${data.newArticles ?? 0} new articles`)
      await fetchSources()
    } catch {
      showToast('Fetch failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddSource = async () => {
    if (!newName.trim() || !newUrl.trim()) {
      showToast('Name and URL are required', 'error')
      return
    }

    setActionLoading('add')
    try {
      await apiFetch(currentUser.email, '/api/news/sources', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          rssUrl: newUrl.trim(),
          sourceType: newType,
          category: newCategory.trim() || undefined,
        }),
      })
      showToast('Source added successfully')
      setShowAddForm(false)
      setNewName('')
      setNewUrl('')
      setNewType('INTERNAL')
      setNewCategory('')
      await fetchSources()
    } catch {
      showToast('Failed to add source', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {toast ? (
        <div className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="size-4" /> : <AlertTriangle className="size-4" />}
          {toast.message}
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/admin" className="flex items-center gap-1 hover:text-[#0033A0]">
              <ChevronLeft className="size-4" />
              Admin Control Tower
            </Link>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-900">
            <Rss className="size-8 text-[#0033A0]" />
            News Source Manager
          </h1>
          <p className="mt-1 text-sm text-slate-500">Manage RSS feeds for UK Now and UK in the News.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002580]"
        >
          {showAddForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showAddForm ? 'Cancel' : 'Add Source'}
        </button>
      </div>

      {/* Add source form */}
      {showAddForm ? (
        <div className="mb-6 rounded-3xl border border-[#0033A0]/30 bg-blue-50/50 p-6">
          <h2 className="mb-4 text-lg font-extrabold text-slate-900">New RSS Source</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Source Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. UK Athletics"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">RSS URL</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Source Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'INTERNAL' | 'EXTERNAL')}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
              >
                <option value="INTERNAL">INTERNAL (UK Official)</option>
                <option value="EXTERNAL">EXTERNAL (Media Coverage)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Category (optional)</label>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Research, Athletics"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleAddSource()}
              disabled={actionLoading === 'add'}
              className="flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002580] disabled:opacity-60"
            >
              {actionLoading === 'add' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add Source
            </button>
          </div>
        </div>
      ) : null}

      {/* Sources table */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[#0033A0]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Last Fetched</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Articles</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                      No sources yet. Add your first RSS source above.
                    </td>
                  </tr>
                ) : sources.map((source) => (
                  <tr key={source.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{source.name}</div>
                      <div className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{source.rssUrl}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        source.sourceType === 'INTERNAL'
                          ? 'bg-blue-100 text-[#0033A0]'
                          : 'bg-violet-100 text-violet-700'
                      }`}>
                        {source.sourceType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{source.category ?? '—'}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(source)}
                        disabled={actionLoading === `toggle-${source.id}`}
                        className="flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {actionLoading === `toggle-${source.id}` ? (
                          <Loader2 className="size-5 animate-spin text-slate-400" />
                        ) : source.active ? (
                          <ToggleRight className="size-6 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="size-6 text-slate-300" />
                        )}
                        <span className={`text-xs font-semibold ${source.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {source.active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {source.lastFetchedAt
                        ? format(new Date(source.lastFetchedAt), 'MMM d, h:mm a')
                        : 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {source._count.articles.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void handleFetchNow(source.id, source.name)}
                        disabled={!!actionLoading || !source.active}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        title={!source.active ? 'Activate source first' : 'Fetch articles now'}
                      >
                        {actionLoading === `fetch-${source.id}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                        Fetch Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
