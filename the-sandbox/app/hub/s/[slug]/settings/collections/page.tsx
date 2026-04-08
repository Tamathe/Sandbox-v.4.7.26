'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, ChevronUp, ChevronDown, Loader2, Plus, Trash2, Pin, PinOff,
  Settings, FolderOpen, BarChart3, Pencil, X, Save,
} from 'lucide-react'
import { useAuth } from '../../../../../lib/auth-context'
import PageHeader from '../../../../../components/PageHeader'
import TabNav from '../../../../../components/TabNav'
import ToolPickerModal from '../../../../../components/hub/ToolPickerModal'

interface CollectionTool {
  id: string
  displayOrder: number
  pinned: boolean
  tool: {
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
}

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  emoji: string | null
  displayOrder: number
  pinned: boolean
  tools: CollectionTool[]
  _count: { tools: number }
}

const SETTINGS_TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'collections', label: 'Collections', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const

export default function CollectionManagerPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { currentUser } = useAuth()

  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [departmentShortName, setDepartmentShortName] = useState('')

  // Create/edit collection form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEmoji, setFormEmoji] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  // Tool picker
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerCollectionSlug, setPickerCollectionSlug] = useState('')

  const headers = { 'x-demo-user-email': currentUser.email, 'Content-Type': 'application/json' }

  const loadCollections = useCallback(async () => {
    try {
      // Fetch department to get shortName + verify access
      const deptRes = await fetch(`/api/departments/${slug}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!deptRes.ok) return
      const dept = await deptRes.json()
      setDepartmentShortName(dept.shortName)
      setCollections(dept.collections ?? [])
    } catch {
      // ignore
    }
  }, [slug, currentUser.email])

  useEffect(() => {
    loadCollections().finally(() => setLoading(false))
  }, [loadCollections])

  const resetForm = () => {
    setFormName('')
    setFormSlug('')
    setFormDescription('')
    setFormEmoji('')
    setShowCreateForm(false)
    setEditingId(null)
  }

  const startEdit = (c: Collection) => {
    setEditingId(c.id)
    setFormName(c.name)
    setFormSlug(c.slug)
    setFormDescription(c.description ?? '')
    setFormEmoji(c.emoji ?? '')
    setShowCreateForm(false)
  }

  const startCreate = () => {
    resetForm()
    setShowCreateForm(true)
  }

  const handleSaveCollection = async () => {
    if (!formName.trim() || !formSlug.trim()) return
    setFormSaving(true)
    try {
      if (editingId) {
        const coll = collections.find(c => c.id === editingId)
        if (!coll) return
        await fetch(`/api/departments/${slug}/collections/${coll.slug}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ name: formName, slug: formSlug, description: formDescription || null, emoji: formEmoji || null }),
        })
      } else {
        await fetch(`/api/departments/${slug}/collections`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: formName, slug: formSlug, description: formDescription || null, emoji: formEmoji || null }),
        })
      }
      resetForm()
      await loadCollections()
    } catch {
      // ignore
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteCollection = async (collSlug: string, collName: string) => {
    if (!confirm(`Delete "${collName}"? This will remove the collection and all its tool mappings. This cannot be undone.`)) return
    try {
      await fetch(`/api/departments/${slug}/collections/${collSlug}`, {
        method: 'DELETE',
        headers,
      })
      await loadCollections()
    } catch {
      // ignore
    }
  }

  const handleReorderCollection = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= collections.length) return

    const reordered = [...collections]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp

    setCollections(reordered)

    // Update displayOrder for both swapped collections
    await Promise.all([
      fetch(`/api/departments/${slug}/collections/${reordered[index].slug}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ displayOrder: index }),
      }),
      fetch(`/api/departments/${slug}/collections/${reordered[swapIndex].slug}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ displayOrder: swapIndex }),
      }),
    ])
  }

  const handleRemoveTool = async (collSlug: string, toolId: string) => {
    try {
      await fetch(`/api/departments/${slug}/collections/${collSlug}/tools`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ toolId }),
      })
      await loadCollections()
    } catch {
      // ignore
    }
  }

  const handleReorderTool = async (coll: Collection, toolIndex: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? toolIndex - 1 : toolIndex + 1
    if (swapIndex < 0 || swapIndex >= coll.tools.length) return

    const reordered = [...coll.tools]
    const temp = reordered[toolIndex]
    reordered[toolIndex] = reordered[swapIndex]
    reordered[swapIndex] = temp

    // Optimistic update
    setCollections(prev => prev.map(c =>
      c.id === coll.id ? { ...c, tools: reordered } : c
    ))

    // Reorder via PATCH
    await fetch(`/api/departments/${slug}/collections/${coll.slug}/tools`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ toolIds: reordered.map(t => t.tool.id) }),
    })
  }

  const handleTogglePin = async (coll: Collection, toolEntry: CollectionTool) => {
    try {
      await fetch(`/api/departments/${slug}/collections/${coll.slug}/tools`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ toolId: toolEntry.tool.id }),
      })
      await loadCollections()
    } catch {
      // ignore
    }
  }

  const openToolPicker = (collSlug: string) => {
    setPickerCollectionSlug(collSlug)
    setPickerOpen(true)
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Collections" subtitle="Loading..." />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center">
          <Loader2 className="size-8 animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  const expandedCollection = expandedId ? collections.find(c => c.id === expandedId) : null

  return (
    <div>
      <PageHeader
        title={`${departmentShortName} Collections`}
        subtitle="Manage collections and their tools"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/hub" className="hover:text-[#0033A0] transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Hub
          </Link>
          <ChevronRight className="size-3" />
          <Link href={`/hub/s/${slug}`} className="hover:text-[#0033A0] transition-colors">
            {departmentShortName}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-gray-700 font-medium">Collections</span>
        </div>

        {/* Tab Nav */}
        <TabNav
          tabs={SETTINGS_TABS as unknown as Array<{ id: string; label: string; icon?: typeof Settings }>}
          activeTab="collections"
          onTabChange={(id) => {
            if (id === 'settings') router.push(`/hub/s/${slug}/settings`)
            else if (id === 'analytics') router.push(`/hub/s/${slug}/settings/analytics`)
          }}
        />

        {/* Create button */}
        <div className="flex justify-end">
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] transition-colors"
          >
            <Plus className="size-4" /> New Collection
          </button>
        </div>

        {/* Create / Edit form */}
        {(showCreateForm || editingId) && (
          <div className="border rounded-2xl shadow-sm bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">
                {editingId ? 'Edit Collection' : 'New Collection'}
              </h3>
              <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <input
                  type="text"
                  value={formName}
                  onChange={e => {
                    setFormName(e.target.value)
                    if (!editingId) setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Slug</span>
                <input
                  type="text"
                  value={formSlug}
                  onChange={e => { if (!editingId) setFormSlug(e.target.value) }}
                  readOnly={!!editingId}
                  className={`mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ${editingId ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]'}`}
                />
                {editingId && <p className="text-xs text-gray-400 mt-1">Slug cannot be changed after creation</p>}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Emoji</span>
                <input
                  type="text"
                  value={formEmoji}
                  onChange={e => setFormEmoji(e.target.value)}
                  maxLength={4}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Description</span>
              <input
                type="text"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
              />
            </label>
            <button
              onClick={handleSaveCollection}
              disabled={formSaving || !formName.trim() || !formSlug.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {formSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        )}

        {/* Collections list */}
        <div className="space-y-3">
          {collections.length === 0 && (
            <div className="border rounded-2xl shadow-sm bg-white p-8 text-center">
              <p className="text-sm text-gray-500">No collections yet. Create one to get started.</p>
            </div>
          )}

          {collections.map((coll, index) => {
            const isExpanded = expandedId === coll.id
            return (
              <div key={coll.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                {/* Collection header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : coll.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {coll.emoji && <span className="text-lg">{coll.emoji}</span>}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">
                        {coll.name}
                        {coll.pinned && <span className="ml-2 text-[10px] text-[#0033A0] font-semibold">PINNED</span>}
                      </h4>
                      <p className="text-xs text-gray-500">{coll._count.tools} tools</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleReorderCollection(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      onClick={() => handleReorderCollection(index, 'down')}
                      disabled={index === collections.length - 1}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                      title="Move down"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      onClick={() => startEdit(coll)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(coll.slug, coll.name)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded tools list */}
                {isExpanded && expandedCollection && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => openToolPicker(coll.slug)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0033A0] border border-[#0033A0]/20 hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="size-3.5" /> Add Tools
                      </button>
                    </div>

                    {expandedCollection.tools.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No tools in this collection</p>
                    ) : (
                      expandedCollection.tools.map((entry, toolIndex) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{toolIndex + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{entry.tool.name}</p>
                              <p className="text-xs text-gray-500 truncate">{entry.tool.category}</p>
                            </div>
                            {entry.pinned && (
                              <span className="text-[10px] font-semibold text-[#0033A0] bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => handleReorderTool(expandedCollection, toolIndex, 'up')}
                              disabled={toolIndex === 0}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                            >
                              <ChevronUp className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleReorderTool(expandedCollection, toolIndex, 'down')}
                              disabled={toolIndex === expandedCollection.tools.length - 1}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                            >
                              <ChevronDown className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleTogglePin(expandedCollection, entry)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#0033A0] transition-colors"
                              title={entry.pinned ? 'Unpin' : 'Pin'}
                            >
                              {entry.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                            </button>
                            <button
                              onClick={() => handleRemoveTool(coll.slug, entry.tool.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tool Picker Modal */}
      <ToolPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={() => loadCollections()}
        existingToolIds={
          (expandedCollection?.tools ?? []).map(t => t.tool.id)
        }
        slug={slug}
        collectionSlug={pickerCollectionSlug}
      />
    </div>
  )
}
