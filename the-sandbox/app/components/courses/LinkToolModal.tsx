'use client'

import { Compass, Loader2, Search, Wand2 } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'
import Link from 'next/link'
import type { CatalogTool } from './course-types'
import { TOOL_TYPE_COLORS, formatToolType } from './course-utils'

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Compass
  title: string
  description: string
}) {
  return (
    <div className="py-12 text-center">
      <Icon className="mx-auto mb-3 size-10 text-gray-200" />
      <h3 className="mb-1 text-sm font-semibold text-gray-600">{title}</h3>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  )
}

interface LinkToolModalProps {
  open: boolean
  tools: CatalogTool[]
  linkedToolIds: Set<string>
  search: string
  onSearchChange: (value: string) => void
  onClose: () => void
  onLink: (toolId: string) => void
  loading: boolean
  linkingToolId: string | null
  courseCode?: string
}

export default function LinkToolModal({
  open,
  tools,
  linkedToolIds,
  search,
  onSearchChange,
  onClose,
  onLink,
  loading,
  linkingToolId,
  courseCode,
}: LinkToolModalProps) {
  if (!open) return null

  const filteredTools = tools.filter((tool) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return [tool.name, tool.category, tool.toolType, tool.shortDescription]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  return (
    <ModalShell title="Link a published tool" onClose={onClose} maxWidth="2xl" zIndex={50}>
        <p className="text-sm text-gray-500 px-5 -mt-1 pb-3">Choose from tools already in the platform catalog.</p>

        <div className="border-b border-gray-200 px-5 py-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by tool name, category, or type"
              className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0033A0]"
            />
          </label>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading published tools...
            </div>
          ) : filteredTools.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No matching tools"
              description="Try a different search or publish a new tool first."
            />
          ) : (
            <div className="space-y-3">
              {filteredTools.map((tool) => {
                const alreadyLinked = linkedToolIds.has(tool.id)
                const isLinking = linkingToolId === tool.id
                return (
                  <div key={tool.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{tool.name}</h4>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            {tool.category}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              TOOL_TYPE_COLORS[tool.toolType] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {formatToolType(tool.toolType)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{tool.shortDescription}</p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyLinked || isLinking}
                        onClick={() => onLink(tool.id)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                          alreadyLinked
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                            : 'bg-[#0033A0] text-white hover:bg-[#002580]'
                        }`}
                      >
                        {isLinking && <Loader2 className="size-4 animate-spin" />}
                        {alreadyLinked ? 'Already linked' : 'Link tool'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Don&apos;t see what you need?</p>
          <Link
            href={`/builder${courseCode ? `?prompt=${encodeURIComponent(`Build a tool for my ${courseCode} course`)}` : ''}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0033A0] px-3 py-1.5 text-xs font-semibold text-[#0033A0] hover:bg-[#0033A0] hover:text-white transition-colors"
          >
            <Wand2 className="size-3.5" />
            Build a new tool
          </Link>
        </div>
    </ModalShell>
  )
}
