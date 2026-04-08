'use client'

import { useState, useEffect } from 'react'
import { X, Search, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface Template {
  id: string
  title: string
  description: string
  aiTier: string
  aiLevel: string
  assignmentType: string
  tags: string[]
}

interface TemplatePickerProps {
  discipline: string
  currentTemplateId: string | null
  onSelect: (templateId: string) => Promise<void>
  onClose: () => void
}

const TIER_COLORS: Record<string, string> = {
  FOUNDATION: 'bg-gray-100 text-gray-700',
  AWARENESS: 'bg-sky-100 text-sky-700',
  PARTNERSHIP: 'bg-violet-100 text-violet-700',
  FLUENCY: 'bg-emerald-100 text-emerald-700',
}

const AI_LEVEL_COLORS: Record<string, string> = {
  PROHIBIT: 'bg-red-100 text-red-700',
  CAUTIOUS: 'bg-amber-100 text-amber-700',
  GUIDED: 'bg-blue-100 text-blue-700',
  INTEGRATE: 'bg-indigo-100 text-indigo-700',
  REQUIRE: 'bg-green-100 text-green-700',
}

export default function TemplatePicker({ discipline, currentTemplateId, onSelect, onClose }: TemplatePickerProps) {
  const { currentUser } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const params = new URLSearchParams({ discipline, pageSize: '50' })
        if (search) params.set('search', search)
        const res = await fetch(`/api/ai-literacy/starter-packs/templates?${params}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          setTemplates(data.templates ?? data.items ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    setLoading(true)
    const timer = setTimeout(fetchTemplates, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [discipline, search, currentUser.email])

  const handleSelect = async (templateId: string) => {
    if (templateId === currentTemplateId) return
    setSelecting(templateId)
    await onSelect(templateId)
    setSelecting(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between shrink-0">
          <h2 className="font-extrabold text-gray-900">Swap Assignment Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-[#0033A0] outline-none"
            />
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-[#0033A0]" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No templates found.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {templates.map(tpl => {
                const isCurrent = tpl.id === currentTemplateId
                const isSelecting = selecting === tpl.id

                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelect(tpl.id)}
                    disabled={isCurrent || isSelecting}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'border-[#0033A0] bg-[#0033A0]/5 ring-1 ring-[#0033A0]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${isSelecting ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{tpl.title}</h3>
                          {isCurrent && <Check className="size-4 text-[#0033A0] shrink-0" />}
                          {isSelecting && <Loader2 className="size-4 animate-spin text-[#0033A0] shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[tpl.aiTier] ?? 'bg-gray-100 text-gray-700'}`}>
                        {tpl.aiTier}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${AI_LEVEL_COLORS[tpl.aiLevel] ?? 'bg-gray-100 text-gray-700'}`}>
                        {tpl.aiLevel}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                        {tpl.assignmentType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
