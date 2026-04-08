'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Check, Loader2 } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'
import { useAuth } from '../../lib/auth-context'

interface ToolResult {
  id: string
  name: string
  shortDescription: string
  category: string
}

interface ToolPickerModalProps {
  open: boolean
  onClose: () => void
  onAdd: (toolIds: string[]) => void
  existingToolIds: string[]
  slug: string
  collectionSlug: string
}

export default function ToolPickerModal({ open, onClose, onAdd, existingToolIds, slug, collectionSlug }: ToolPickerModalProps) {
  const { currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [tools, setTools] = useState<ToolResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Focus input on open
  useEffect(() => {
    if (open) {
      setSearch('')
      setSelected(new Set())
      setTools([])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Search tools with debounce
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ approvalStatus: 'APPROVED', limit: '30' })
        if (search.trim()) params.set('search', search.trim())
        const res = await fetch(`/api/tools?${params}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          setTools(data.tools ?? data ?? [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, open, currentUser.email])

  const toggleTool = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (selected.size === 0) return
    setAdding(true)
    const toolIds = Array.from(selected)

    // Add tools one by one to the collection
    for (const toolId of toolIds) {
      try {
        await fetch(`/api/departments/${slug}/collections/${collectionSlug}/tools`, {
          method: 'POST',
          headers: { 'x-demo-user-email': currentUser.email, 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolId }),
        })
      } catch {
        // continue with remaining
      }
    }

    setAdding(false)
    onAdd(toolIds)
    onClose()
  }

  if (!open) return null

  const existingSet = new Set(existingToolIds)

  return (
    <ModalShell title="Add Tools to Collection" onClose={onClose} zIndex={50}>
      <div className="max-h-[calc(80vh-60px)] flex flex-col">
        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="size-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search approved tools..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-gray-300" />
            </div>
          ) : tools.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {search ? 'No tools found' : 'Search for tools to add'}
            </p>
          ) : (
            tools.map(tool => {
              const alreadyIn = existingSet.has(tool.id)
              const isSelected = selected.has(tool.id)
              return (
                <button
                  key={tool.id}
                  type="button"
                  disabled={alreadyIn}
                  onClick={() => toggleTool(tool.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    alreadyIn
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : isSelected
                      ? 'bg-blue-50 border border-[#0033A0]/20'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`size-5 rounded flex items-center justify-center flex-shrink-0 border ${
                    alreadyIn
                      ? 'bg-gray-200 border-gray-300'
                      : isSelected
                      ? 'bg-[#0033A0] border-[#0033A0]'
                      : 'border-gray-300'
                  }`}>
                    {(alreadyIn || isSelected) && <Check className="size-3 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{tool.name}</p>
                    <p className="text-xs text-gray-500 truncate">{tool.shortDescription}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">
                    {tool.category}
                  </span>
                  {alreadyIn && (
                    <span className="text-[10px] font-semibold text-green-600 flex-shrink-0">Added</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {selected.size > 0 ? `${selected.size} selected` : 'Select tools to add'}
          </span>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || adding}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
