'use client'

import { useEffect, useState } from 'react'
import { BookMarked, FileText, Loader2, Map as MapIcon, Pencil, Plus, Sparkles, Trash2, X, FileCheck, Brain } from 'lucide-react'
import type { LearningObjective, ObjectiveProgress } from './course-types'
import { courseHeaders } from './course-utils'

interface LearningMapTabProps {
  courseId: string
  canManage: boolean
  userEmail: string
  isStudent: boolean
  onOpenViewer: (materialId: string) => void
}

export default function LearningMapTab({
  courseId,
  canManage,
  userEmail,
  isStudent,
  onOpenViewer,
}: LearningMapTabProps) {
  const [objectives, setObjectives] = useState<LearningObjective[]>([])
  const [studentProgress, setStudentProgress] = useState<ObjectiveProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '' })
  const [savingObjectiveId, setSavingObjectiveId] = useState<string | null>(null)
  const [deletingObjectiveId, setDeletingObjectiveId] = useState<string | null>(null)
  const [deletingConfirmId, setDeletingConfirmId] = useState<string | null>(null)
  const [addingToModule, setAddingToModule] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ title: '', description: '' })
  const [addingSaving, setAddingSaving] = useState(false)
  const [editingBloomId, setEditingBloomId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/courses/${courseId}/objectives`, {
        headers: { 'x-demo-user-email': userEmail },
      }).then((r) => r.json()) as Promise<{ objectives?: LearningObjective[] }>,
      fetch(`/api/objectives/progress?courseId=${courseId}`, {
        headers: { 'x-demo-user-email': userEmail },
      }).then((r) => r.json()) as Promise<{ progress?: ObjectiveProgress[] }>,
    ])
      .then(([objData, progData]) => {
        setObjectives(objData.objectives ?? [])
        setStudentProgress(progData.progress ?? [])
      })
      .catch(() => setError('Failed to load learning map'))
      .finally(() => setLoading(false))
  }, [courseId, userEmail])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/objectives`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      const data = (await res.json()) as { objectives?: LearningObjective[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate')
      setObjectives(data.objectives ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleClear() {
    await fetch(`/api/courses/${courseId}/objectives`, {
      method: 'DELETE',
      headers: courseHeaders(userEmail),
    })
    setObjectives([])
    setClearConfirm(false)
  }

  function startEdit(obj: LearningObjective) {
    setEditingObjectiveId(obj.id)
    setEditForm({ title: obj.title, description: obj.description ?? '' })
  }

  async function handleSaveObjective(objectiveId: string) {
    if (!editForm.title.trim()) return
    setSavingObjectiveId(objectiveId)
    try {
      const res = await fetch(`/api/courses/${courseId}/objectives/${objectiveId}`, {
        method: 'PATCH',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ title: editForm.title.trim(), description: editForm.description.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = (await res.json()) as { objective?: LearningObjective }
      if (data.objective) {
        setObjectives((prev) => prev.map((o) => o.id === objectiveId ? { ...o, ...data.objective } : o))
      }
      setEditingObjectiveId(null)
    } catch {
      setError('Failed to save objective')
    } finally {
      setSavingObjectiveId(null)
    }
  }

  async function handleDeleteObjective(objectiveId: string) {
    setDeletingObjectiveId(objectiveId)
    try {
      const res = await fetch(`/api/courses/${courseId}/objectives/${objectiveId}`, {
        method: 'DELETE',
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Failed to delete')
      setObjectives((prev) => prev.filter((o) => o.id !== objectiveId))
      setDeletingConfirmId(null)
    } catch {
      setError('Failed to delete objective')
    } finally {
      setDeletingObjectiveId(null)
    }
  }

  async function handleAddObjective(moduleKey: string) {
    if (!addForm.title.trim()) return
    setAddingSaving(true)
    const moduleNumber = moduleKey === 'General' ? null : parseInt(moduleKey.replace('Module ', ''), 10)
    try {
      const res = await fetch(`/api/courses/${courseId}/objectives`, {
        method: 'PUT',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ title: addForm.title.trim(), description: addForm.description.trim() || null, moduleNumber }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = (await res.json()) as { objective?: LearningObjective }
      if (data.objective) {
        setObjectives((prev) => [...prev, data.objective!])
      }
      setAddingToModule(null)
      setAddForm({ title: '', description: '' })
    } catch {
      setError('Failed to add objective')
    } finally {
      setAddingSaving(false)
    }
  }

  const BLOOM_LEVELS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'] as const

  async function handleBloomChange(objectiveId: string, newLevel: string) {
    setEditingBloomId(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/objectives/${objectiveId}`, {
        method: 'PATCH',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ bloomLevel: newLevel }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setObjectives((prev) => prev.map((o) => o.id === objectiveId ? { ...o, bloomLevel: newLevel } : o))
    } catch {
      setError('Failed to update Bloom\'s level')
    }
  }

  const progressMap = new Map(studentProgress.map((p) => [p.objectiveId, p]))

  function getMasteryLevel(obj: LearningObjective): 'not_started' | 'struggling' | 'mastered' {
    return (progressMap.get(obj.id)?.masteryLevel as 'not_started' | 'struggling' | 'mastered') ?? 'not_started'
  }

  function masteryBadge(level: 'not_started' | 'struggling' | 'mastered') {
    if (level === 'mastered') return { label: 'Mastered', className: 'bg-green-100 text-green-700' }
    if (level === 'struggling') return { label: 'Needs work', className: 'bg-amber-100 text-amber-700' }
    return { label: 'Not started', className: 'bg-red-100 text-red-600' }
  }

  // Student-friendly binary: studied (any engagement) vs not studied
  function isStudied(obj: LearningObjective): boolean {
    const progress = progressMap.get(obj.id)
    return progress != null && (progress.attempts > 0 || progress.masteryLevel === 'mastered' || progress.masteryLevel === 'struggling')
  }

  const grouped = objectives.reduce<Record<string, LearningObjective[]>>((acc, obj) => {
    const key = obj.moduleNumber != null ? `Module ${obj.moduleNumber}` : 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(obj)
    return acc
  }, {})

  const weakObjectives = objectives.filter((o) => getMasteryLevel(o) !== 'mastered')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{isStudent ? 'Your Progress' : 'Learning Map'}</h3>
          <p className="text-sm text-gray-500">
            {objectives.length > 0
              ? isStudent
                ? `${objectives.length} topics to study`
                : `${objectives.length} learning objectives across ${Object.keys(grouped).length} module${Object.keys(grouped).length !== 1 ? 's' : ''}`
              : isStudent ? 'No topics available yet.' : 'No objectives extracted yet.'}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {objectives.length > 0 && (
              clearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-700">Clear all objectives?</span>
                  <button
                    type="button"
                    onClick={() => handleClear()}
                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Yes, clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearConfirm(false)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setClearConfirm(true)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Clear
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002580] disabled:opacity-60"
            >
              {generating ? (
                <><Loader2 className="size-4 animate-spin" /> Mapping objectives</>
              ) : (
                <><Sparkles className="size-4" /> {objectives.length > 0 ? 'Regenerate Map' : 'Generate Learning Map'}</>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      ) : objectives.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 py-16 text-center">
          <MapIcon className="mx-auto mb-3 size-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No learning objectives yet</p>
          <p className="mt-1 text-xs text-gray-400">
            {canManage
              ? 'Upload course materials, then click "Generate Learning Map" to extract objectives automatically.'
              : 'Your instructor has not generated the learning map yet.'}
          </p>
        </div>
      ) : (
        <>
          {isStudent && objectives.length > 0 && (() => {
            const studiedCount = objectives.filter((o) => isStudied(o)).length
            const totalCount = objectives.length
            const pct = totalCount > 0 ? Math.round((studiedCount / totalCount) * 100) : 0
            const unstudied = objectives.filter((o) => !isStudied(o))
            return (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900">{studiedCount} of {totalCount} topics studied</span>
                  <span className="text-sm font-extrabold text-[#0033A0]">{pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                {unstudied.length > 0 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">{unstudied.length} topic{unstudied.length !== 1 ? 's' : ''} still to go</p>
                    <a
                      href={`/playground?prompt=${encodeURIComponent(
                        `I need to study the following topics:\n${unstudied.slice(0, 5).map((o) => `- ${o.title}`).join('\n')}\n\nPlease quiz me on these topics, starting with the most fundamental concepts.`
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Review what I&apos;ve missed
                    </a>
                  </div>
                )}
                <p className="mt-2 text-[10px] text-gray-400">Based on your reading and practice activity — not your official grade.</p>
              </div>
            )
          })()}

          {Object.entries(grouped).map(([moduleKey, objs]) => (
            <div key={moduleKey} className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <BookMarked className="size-4 text-[#0033A0]" />
                <h4 className="font-semibold text-gray-900">{moduleKey}</h4>
                <span className="ml-auto text-xs text-gray-400">
                  {objs.length} objective{objs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3">
                {objs.map((obj) => {
                  const level = getMasteryLevel(obj)
                  const badge = masteryBadge(level)
                  const isEditingThis = editingObjectiveId === obj.id
                  const isDeletingThis = deletingConfirmId === obj.id

                  if (isEditingThis) {
                    return (
                      <div key={obj.id} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-[#0033A0]"
                          placeholder="Objective title"
                          autoFocus
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          rows={2}
                          className="w-full resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-gray-600 outline-none focus:border-[#0033A0]"
                          placeholder="Description (optional)"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingObjectiveId(null)}
                            className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!editForm.title.trim() || savingObjectiveId === obj.id}
                            onClick={() => handleSaveObjective(obj.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#002580] disabled:opacity-50"
                          >
                            {savingObjectiveId === obj.id && <Loader2 className="size-3 animate-spin" />}
                            Save
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={obj.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800">{obj.title}</p>
                          {obj.description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{obj.description}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {!isStudent && obj.source === 'explicit' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700" title="Extracted verbatim from syllabus">
                                <FileCheck className="size-3" />
                                From Syllabus
                              </span>
                            )}
                            {!isStudent && obj.source === 'inferred' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700" title="Inferred from syllabus content via Bloom&rsquo;s taxonomy">
                                <Brain className="size-3" />
                                Inferred
                              </span>
                            )}
                            {!isStudent && obj.bloomLevel && (
                              canManage && editingBloomId === obj.id ? (
                                <select
                                  autoFocus
                                  value={obj.bloomLevel.toUpperCase()}
                                  onChange={(e) => handleBloomChange(obj.id, e.target.value)}
                                  onBlur={() => setEditingBloomId(null)}
                                  className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-300 outline-none focus:border-[#0033A0]"
                                >
                                  {BLOOM_LEVELS.map((level) => (
                                    <option key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  className={`rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 capitalize ${canManage ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}
                                  onClick={canManage ? () => setEditingBloomId(obj.id) : undefined}
                                  title={canManage ? 'Click to change Bloom\'s level' : undefined}
                                >
                                  {obj.bloomLevel.toLowerCase()}
                                </span>
                              )
                            )}
                            {obj.material && (
                              <button
                                type="button"
                                onClick={() => onOpenViewer(obj.material!.id)}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                              >
                                <FileText className="size-3" />
                                {obj.material.title}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isStudent && (
                            isStudied(obj) ? (
                              <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                ✓ Studied
                              </div>
                            ) : (
                              <div className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                                Not studied
                              </div>
                            )
                          )}
                          {canManage && (
                            <>
                              {isDeletingThis ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-red-700">Delete?</span>
                                  <button
                                    type="button"
                                    disabled={deletingObjectiveId === obj.id}
                                    onClick={() => handleDeleteObjective(obj.id)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {deletingObjectiveId === obj.id ? <Loader2 className="size-3 animate-spin" /> : null}
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingConfirmId(null)}
                                    className="rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(obj)}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                                    title="Edit objective"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingConfirmId(obj.id)}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                    title="Delete objective"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {!isStudent && !canManage && (
                            <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                              {badge.label}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add objective to this module */}
              {canManage && (
                <div className="mt-3">
                  {addingToModule === moduleKey ? (
                    <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 space-y-2">
                      <input
                        value={addForm.title}
                        onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-[#0033A0]"
                        placeholder="New objective title"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddObjective(moduleKey) }}
                      />
                      <textarea
                        value={addForm.description}
                        onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="w-full resize-none rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-gray-600 outline-none focus:border-[#0033A0]"
                        placeholder="Description (optional)"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setAddingToModule(null); setAddForm({ title: '', description: '' }) }}
                          className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white"
                        >
                          <X className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={!addForm.title.trim() || addingSaving}
                          onClick={() => handleAddObjective(moduleKey)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#002580] disabled:opacity-50"
                        >
                          {addingSaving && <Loader2 className="size-3 animate-spin" />}
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAddingToModule(moduleKey); setAddForm({ title: '', description: '' }) }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-[#0033A0] transition-colors"
                    >
                      <Plus className="size-3.5" />
                      Add objective
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {!isStudent && (
            <p className="text-xs text-gray-400">
              Student mastery percentages appear when students answer questions linked to these objectives through course tools.
            </p>
          )}
        </>
      )}
    </div>
  )
}
