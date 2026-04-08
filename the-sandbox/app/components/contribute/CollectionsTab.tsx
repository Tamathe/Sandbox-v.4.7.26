'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderHeart, Plus, Globe, Lock, Trash2, Search, Bookmark } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

interface CollectionItem {
  id: string
  tool: { id: string; name: string; shortDescription: string; category: string }
}

interface Collection {
  id: string
  title: string
  description: string | null
  emoji: string
  isPublic: boolean
  items: CollectionItem[]
  _count: { saves: number; items?: number }
  user?: { id: string; name: string; avatarUrl: string | null }
  createdAt: string
}

export default function CollectionsTab() {
  const { currentUser } = useAuth()
  const [myCollections, setMyCollections] = useState<Collection[]>([])
  const [publicCollections, setPublicCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'mine' | 'community'>('mine')
  const [creating, setCreating] = useState(false)

  // Create form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newEmoji, setNewEmoji] = useState('📚')
  const [newPublic, setNewPublic] = useState(false)

  // Add tool
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [toolSearch, setToolSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([])

  const loadCollections = useCallback(async () => {
    const controller = new AbortController()
    try {
      setLoading(true)
      const [mine, pub] = await Promise.allSettled([
        apiFetch<Collection[]>(currentUser.email, '/api/contribute/collections', { signal: controller.signal }),
        apiFetch<Collection[]>(currentUser.email, '/api/contribute/collections?browse=public', { signal: controller.signal }),
      ])
      if (mine.status === 'fulfilled') setMyCollections(mine.value)
      if (pub.status === 'fulfilled') setPublicCollections(pub.value)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('Failed to load collections')
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [currentUser.email])

  useEffect(() => { loadCollections() }, [loadCollections])

  // Tool search for adding
  useEffect(() => {
    if (!addingTo || !toolSearch.trim()) { setSearchResults([]); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<{ tools: { id: string; name: string }[] }>(
          currentUser.email, `/api/tools?search=${encodeURIComponent(toolSearch)}&limit=5`,
          { signal: controller.signal },
        )
        setSearchResults(data.tools || [])
      } catch { /* ignore */ }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [toolSearch, addingTo, currentUser.email])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      await apiFetch(currentUser.email, '/api/contribute/collections', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, description: newDesc, emoji: newEmoji, isPublic: newPublic }),
      })
      setNewTitle(''); setNewDesc(''); setNewEmoji('📚'); setNewPublic(false)
      loadCollections()
    } catch {
      setError('Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(currentUser.email, `/api/contribute/collections/${id}`, { method: 'DELETE' })
      loadCollections()
    } catch {
      setError('Failed to delete collection')
    }
  }

  const handleAddTool = async (collectionId: string, toolId: string) => {
    try {
      await apiFetch(currentUser.email, `/api/contribute/collections/${collectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ toolId }),
      })
      setAddingTo(null); setToolSearch(''); setSearchResults([])
      loadCollections()
    } catch {
      setError('Failed to add tool')
    }
  }

  const handleRemoveTool = async (collectionId: string, toolId: string) => {
    try {
      await apiFetch(currentUser.email, `/api/contribute/collections/${collectionId}/items`, {
        method: 'DELETE',
        body: JSON.stringify({ toolId }),
      })
      loadCollections()
    } catch {
      setError('Failed to remove tool')
    }
  }

  const handleSave = async (collectionId: string) => {
    try {
      await apiFetch(currentUser.email, `/api/contribute/collections/${collectionId}/save`, { method: 'POST' })
      loadCollections()
    } catch {
      setError('Failed to save collection')
    }
  }

  const collections = view === 'mine' ? myCollections : publicCollections

  return (
    <div className="space-y-8">
      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setView('mine')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Collections
        </button>
        <button
          type="button"
          onClick={() => setView('community')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === 'community' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Community Collections
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Create new collection */}
      {view === 'mine' && (
        <div className="border rounded-2xl shadow-sm bg-white p-6">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Create a Collection</h2>
          <p className="text-sm text-gray-500 mb-4">
            Curate themed sets of tools — &quot;Best tools for STEM majors,&quot; &quot;Everything for the GRE&quot; — and share them with the community.
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="w-14 px-2 py-2 border border-gray-200 rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
                maxLength={4}
              />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Collection title"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
              />
            </div>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe what this collection is for (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 resize-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPublic}
                  onChange={(e) => setNewPublic(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Make public
                {newPublic ? <Globe className="size-3.5 text-green-500" /> : <Lock className="size-3.5 text-gray-400" />}
              </label>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-xl hover:bg-[#002878] disabled:opacity-40 transition-colors"
              >
                <Plus className="size-4" />
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections list */}
      {loading && <LoadingSpinner />}
      {!loading && collections.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FolderHeart className="size-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {view === 'mine' ? "You haven't created any collections yet." : 'No community collections yet.'}
          </p>
        </div>
      )}
      <div className="space-y-4">
        {collections.map((col) => (
          <div key={col.id} className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{col.emoji}</span>
                <div>
                  <h3 className="font-extrabold text-gray-900">{col.title}</h3>
                  {col.description && <p className="text-sm text-gray-500 mt-0.5">{col.description}</p>}
                  {col.user && view === 'community' && (
                    <p className="text-xs text-gray-400 mt-1">by {col.user.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {col.items.length} tool{col.items.length !== 1 ? 's' : ''}
                  {col._count.saves > 0 && ` · ${col._count.saves} save${col._count.saves !== 1 ? 's' : ''}`}
                </span>
                {col.isPublic ? <Globe className="size-3.5 text-green-500" /> : <Lock className="size-3.5 text-gray-400" />}
                {view === 'community' && (
                  <button type="button" onClick={() => handleSave(col.id)} className="p-1 rounded-lg hover:bg-gray-100">
                    <Bookmark className="size-4 text-gray-400" />
                  </button>
                )}
                {view === 'mine' && (
                  <button type="button" onClick={() => handleDelete(col.id)} className="p-1 rounded-lg hover:bg-red-50">
                    <Trash2 className="size-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Tools in collection */}
            {col.items.length > 0 && (
              <div className="space-y-2 mb-3">
                {col.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.tool.name}</p>
                      <p className="text-xs text-gray-400">{item.tool.category}</p>
                    </div>
                    {view === 'mine' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTool(col.id, item.tool.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add tool */}
            {view === 'mine' && (
              <>
                {addingTo === col.id ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
                    <input
                      type="text"
                      value={toolSearch}
                      onChange={(e) => setToolSearch(e.target.value)}
                      placeholder="Search tools to add..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
                      autoFocus
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden">
                        {searchResults.map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => handleAddTool(col.id, tool.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            {tool.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setAddingTo(null); setToolSearch(''); setSearchResults([]) }}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTo(col.id)}
                    className="flex items-center gap-1.5 text-sm text-[#0033A0] font-medium hover:text-[#002878]"
                  >
                    <Plus className="size-4" />
                    Add a tool
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
