'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
} from 'lucide-react'
import { apiFetch } from '../../lib/api-client'
import type {
  MasteryGateCard,
  MasteryGateDesignInput,
  MasteryGateProgressPayload,
} from '../../lib/assessment/types'

interface MasteryGateDesignerProps {
  userEmail: string
  courseId: string
  onSaved?: () => Promise<void> | void
}

const DEFAULT_DRAFT: Omit<MasteryGateDesignInput, 'courseId'> = {
  title: '',
  description: '',
  weekId: null,
  concepts: [],
  bloomFloor: 3,
  passThreshold: 0.8,
  maxAttempts: 3,
  cooldownHours: 24,
  orderIndex: null,
  unlocksWeekId: null,
  unlocksGateId: null,
  isPublished: false,
}

export default function MasteryGateDesigner({
  userEmail,
  courseId,
  onSaved,
}: MasteryGateDesignerProps) {
  const [data, setData] = useState<MasteryGateProgressPayload | null>(null)
  const [editingGateId, setEditingGateId] = useState('new')
  const [draft, setDraft] = useState(DEFAULT_DRAFT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const payload = await apiFetch<MasteryGateProgressPayload>(
        userEmail,
        `/api/assessment/mastery-gate/course/${courseId}`
      )
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mastery gates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userEmail])

  const gateOptions = useMemo(() => data?.gates ?? [], [data])

  function resetDraft() {
    setEditingGateId('new')
    setDraft(DEFAULT_DRAFT)
  }

  function startEditing(gate: MasteryGateCard) {
    setEditingGateId(gate.id)
    setDraft({
      title: gate.title,
      description: gate.description ?? '',
      weekId: gate.weekId,
      concepts: gate.concepts,
      bloomFloor: gate.bloomFloor,
      passThreshold: gate.passThreshold,
      maxAttempts: gate.maxAttempts,
      cooldownHours: gate.cooldownHours,
      orderIndex: gate.orderIndex,
      unlocksWeekId: null,
      unlocksGateId: null,
      isPublished: gate.isPublished,
    })
    setSuccess(null)
  }

  function toggleConcept(concept: string) {
    setDraft((current) => ({
      ...current,
      concepts: current.concepts.includes(concept)
        ? current.concepts.filter((item) => item !== concept)
        : [...current.concepts, concept],
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await apiFetch(userEmail, `/api/assessment/mastery-gate/${editingGateId}/design`, {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          ...draft,
        }),
      })
      await load()
      await onSaved?.()
      setSuccess(editingGateId === 'new' ? 'Gate created.' : 'Gate updated.')
      resetDraft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gate')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border-2 border-gray-200 bg-white p-12">
        <Loader2 className="size-5 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <section className="space-y-6 rounded-3xl border-2 border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0033A0]">
            Faculty Designer
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Mastery gates for {data.course.courseCode}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Build adaptive checkpoints tied to course weeks and objectives.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDraft}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0033A0] hover:text-[#0033A0]"
        >
          <Plus className="size-4" />
          New gate
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="size-4 text-[#0033A0]" />
            Existing gates
          </div>

          {gateOptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No mastery gates yet. Start by creating one for an upcoming week.
            </div>
          ) : (
            gateOptions.map((gate) => (
              <div key={gate.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{gate.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {gate.weekTitle ?? 'Course-level'} · Order {gate.orderIndex}
                    </p>
                  </div>
                  {gate.isPublished ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      Published
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      Draft
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">{gate.concepts.join(' · ')}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(gate)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0033A0] hover:text-[#0033A0]"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {editingGateId === 'new' ? 'Create a new gate' : 'Edit gate'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Choose a week, select the concepts students must prove, and set the retry rules.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              placeholder="Unit 3 Mastery Gate: Cellular Respiration"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
            <textarea
              value={draft.description ?? ''}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              placeholder="Explain what students are proving before the next unit unlocks."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Week</span>
              <select
                value={draft.weekId ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, weekId: event.target.value || null }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              >
                <option value="">No week link</option>
                {data.weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Week {week.weekNumber}: {week.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Order</span>
              <input
                type="number"
                min={0}
                value={draft.orderIndex ?? 0}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    orderIndex:
                      event.target.value === '' ? null : Number(event.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Concepts</span>
              <span className="text-xs text-slate-500">{draft.concepts.length} selected</span>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
              {data.objectives.map((objective) => (
                <label
                  key={objective.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={draft.concepts.includes(objective.title)}
                    onChange={() => toggleConcept(objective.title)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{objective.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {objective.weekLabel ?? 'Course-level objective'}
                    </p>
                    {objective.description && (
                      <p className="mt-1 text-xs text-slate-500">{objective.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Bloom floor</span>
              <select
                value={draft.bloomFloor}
                onChange={(event) => setDraft((current) => ({ ...current, bloomFloor: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              >
                <option value={1}>1 - Remember</option>
                <option value={2}>2 - Understand</option>
                <option value={3}>3 - Apply</option>
                <option value={4}>4 - Analyze</option>
                <option value={5}>5 - Evaluate</option>
                <option value={6}>6 - Create</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pass threshold</span>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={draft.passThreshold}
                  onChange={(event) => setDraft((current) => ({ ...current, passThreshold: Number(event.target.value) }))}
                  className="w-full"
                />
                <p className="mt-2 text-sm font-semibold text-slate-800">{Math.round(draft.passThreshold * 100)}%</p>
              </div>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Max attempts</span>
              <input
                type="number"
                min={0}
                max={20}
                value={draft.maxAttempts}
                onChange={(event) => setDraft((current) => ({ ...current, maxAttempts: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cooldown hours</span>
              <input
                type="number"
                min={0}
                max={240}
                value={draft.cooldownHours}
                onChange={(event) => setDraft((current) => ({ ...current, cooldownHours: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={Boolean(draft.isPublished)}
              onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Publish gate</p>
              <p className="text-xs text-slate-500">Students only see published gates in their progression path.</p>
            </div>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save gate
            </button>
            {editingGateId !== 'new' && (
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0033A0] hover:text-[#0033A0]"
              >
                <CheckCircle2 className="size-4" />
                Done editing
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
