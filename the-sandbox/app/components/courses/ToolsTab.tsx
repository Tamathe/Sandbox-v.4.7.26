'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Compass, Loader2, Pencil, RefreshCw, Sparkles, X } from 'lucide-react'
import type { LinkedTool } from './course-types'
import { TOOL_TYPE_COLORS, courseHeaders, formatToolType, readJson } from './course-utils'
import AdaptiveDifficultyToggle from './AdaptiveDifficultyToggle'

interface ToolsTabProps {
  courseId: string
  courseCode: string
  canManage: boolean
  userEmail: string
  linkedTools: LinkedTool[]
  onRefresh: () => void
  onOpenLinkModal: () => void
}

export default function ToolsTab({
  courseId,
  courseCode,
  canManage,
  userEmail,
  linkedTools,
  onRefresh,
  onOpenLinkModal,
}: ToolsTabProps) {
  const [editingContextToolId, setEditingContextToolId] = useState<string | null>(null)
  const [contextForm, setContextForm] = useState({ weekLabel: '', syllabusContext: '' })
  const [savingContextToolId, setSavingContextToolId] = useState<string | null>(null)
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null)
  const [unlinking, setUnlinking] = useState(false)
  const [reordering, setReordering] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function handleEditContext(tool: LinkedTool) {
    setEditingContextToolId(tool.id)
    setContextForm({ weekLabel: tool.weekLabel ?? '', syllabusContext: tool.syllabusContext ?? '' })
  }

  async function handleSaveContext(toolId: string) {
    setSavingContextToolId(toolId)
    try {
      await fetch(`/api/courses/${courseId}/tools/${toolId}`, {
        method: 'PUT',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify(contextForm),
      })
      setEditingContextToolId(null)
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save context')
    } finally {
      setSavingContextToolId(null)
    }
  }

  async function handleUnlink(toolId: string) {
    setUnlinking(true)
    try {
      await readJson(`/api/courses/${courseId}/tools?toolId=${toolId}`, {
        method: 'DELETE',
        headers: courseHeaders(userEmail),
      })
      setUnlinkConfirmId(null)
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to unlink tool')
    } finally {
      setUnlinking(false)
    }
  }

  async function handleReorder(toolId: string, direction: 'up' | 'down') {
    const idx = linkedTools.findIndex((t) => t.id === toolId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= linkedTools.length) return

    const current = linkedTools[idx]
    const swap = linkedTools[swapIdx]

    setReordering(toolId)
    try {
      await Promise.all([
        fetch(`/api/courses/${courseId}/tools/${current.id}`, {
          method: 'PUT',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ displayOrder: swap.displayOrder }),
        }),
        fetch(`/api/courses/${courseId}/tools/${swap.id}`, {
          method: 'PUT',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify({ displayOrder: current.displayOrder }),
        }),
      ])
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reorder tools')
    } finally {
      setReordering(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tools for {courseCode}</h3>
          <p className="text-sm text-gray-500">
            Launch AI tools connected to this course, or curate the list from the catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh tools list"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <RefreshCw className="size-4" />
              </button>
              <button
                type="button"
                onClick={onOpenLinkModal}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Link a Tool
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
          <button type="button" onClick={() => setActionError(null)}><X className="size-4" /></button>
        </div>
      )}

      {linkedTools.length === 0 ? (
        <div className="py-12 text-center">
          <Compass className="mx-auto mb-3 size-10 text-gray-200" />
          <h3 className="mb-1 text-sm font-semibold text-gray-600">No tools linked yet</h3>
          <p className="mb-4 text-xs text-gray-400">
            {canManage
              ? 'Build a course-aligned tool or link one from the published catalog. Just built something? Click the refresh button above.'
              : 'Ask your instructor to add AI tools for practice and review.'}
          </p>
          {canManage && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/builder?course=${encodeURIComponent(courseCode)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
              >
                <Sparkles className="size-4" />
                Build with AI
              </Link>
              <Link
                href={`/publish?course=${encodeURIComponent(courseCode)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Create manually
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {linkedTools.map((tool, idx) => (
            <div key={tool.id} className="rounded-3xl border border-gray-200 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-gray-900">{tool.name}</h4>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      {tool.category}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TOOL_TYPE_COLORS[tool.toolType] || 'bg-gray-100 text-gray-600'}`}>
                      {formatToolType(tool.toolType)}
                    </span>
                    {tool.weekLabel && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
                        {tool.weekLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-500">{tool.shortDescription}</p>
                  {tool.syllabusContext && (
                    <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                        Syllabus context
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-blue-800">{tool.syllabusContext}</p>
                    </div>
                  )}
                  {canManage && (
                    <AdaptiveDifficultyToggle
                      courseId={courseId}
                      toolId={tool.id}
                      userEmail={userEmail}
                      currentOverride={tool.adaptiveDifficultyOverride}
                    />
                  )}
                </div>
                <div className="rounded-2xl bg-gray-50 px-3 py-2 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Sessions</div>
                  <div className="text-lg font-semibold text-gray-900">{tool._count.sessions}</div>
                  {tool.estimatedMinutes && (
                    <div className="mt-1 text-xs font-medium text-gray-500">{tool.estimatedMinutes} min</div>
                  )}
                  {tool.topScore != null && (
                    <div className="mt-1 text-xs font-semibold text-[#0033A0]">
                      Top: {Math.round(tool.topScore)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={`/tools/${tool.id}?courseId=${encodeURIComponent(courseId)}&launch=true`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
                >
                  Launch
                </Link>

                {canManage && (
                  <>
                    {/* Reorder arrows */}
                    <button
                      type="button"
                      disabled={idx === 0 || reordering === tool.id}
                      onClick={() => handleReorder(tool.id, 'up')}
                      className="inline-flex items-center rounded-xl border border-gray-300 p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30"
                      title="Move up"
                    >
                      {reordering === tool.id ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                    </button>
                    <button
                      type="button"
                      disabled={idx === linkedTools.length - 1 || reordering === tool.id}
                      onClick={() => handleReorder(tool.id, 'down')}
                      className="inline-flex items-center rounded-xl border border-gray-300 p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditContext(tool)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      <Pencil className="size-4" />
                      Edit Context
                    </button>

                    {/* Inline unlink confirm */}
                    {unlinkConfirmId === tool.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-700">Remove this tool?</span>
                        <button
                          type="button"
                          disabled={unlinking}
                          onClick={() => handleUnlink(tool.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {unlinking && <Loader2 className="size-3 animate-spin" />}
                          Yes, remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnlinkConfirmId(null)}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUnlinkConfirmId(tool.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        Unlink
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Edit context inline form */}
              {editingContextToolId === tool.id && (
                <div className="mt-4 space-y-3 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    These fields help students understand when and how to use this tool. They appear as a label and note card on the tool listing.
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                      Week label
                    </label>
                    <input
                      value={contextForm.weekLabel}
                      onChange={(e) => setContextForm((p) => ({ ...p, weekLabel: e.target.value }))}
                      placeholder="e.g. Week 5: Cardiovascular Cases"
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                    />
                    <p className="mt-1 text-[10px] text-blue-600">Shown as a badge on the tool card so students know which week it belongs to.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#0033A0]">
                      Syllabus context for students
                    </label>
                    <textarea
                      value={contextForm.syllabusContext}
                      onChange={(e) => setContextForm((p) => ({ ...p, syllabusContext: e.target.value }))}
                      rows={4}
                      placeholder="e.g. Focus on this week's lecture themes and how the AI should frame its questioning."
                      className="w-full resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0033A0]"
                    />
                    <p className="mt-1 text-[10px] text-blue-600">A brief note injected into the AI prompt to align its responses with your current syllabus topic.</p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditingContextToolId(null); setContextForm({ weekLabel: '', syllabusContext: '' }) }}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveContext(tool.id)}
                      disabled={savingContextToolId === tool.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                    >
                      {savingContextToolId === tool.id && <Loader2 className="size-4 animate-spin" />}
                      Save context
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
