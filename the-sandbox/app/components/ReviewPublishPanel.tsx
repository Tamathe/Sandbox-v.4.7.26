'use client'

import { useState } from 'react'
import { Pencil, Check, X, Rocket } from 'lucide-react'
import { BuilderSpec } from '../lib/types'

interface ReviewPublishPanelProps {
  spec: BuilderSpec
  onSpecChange: (field: keyof BuilderSpec, value: string | string[]) => void
  onPublish: () => void
  onBack: () => void
}

type EditingField = 'name' | 'shortDescription' | 'systemPrompt' | 'welcomeMessage' | 'starterQuestions' | 'learningObjectives' | null

export default function ReviewPublishPanel({ spec, onSpecChange, onPublish, onBack }: ReviewPublishPanelProps) {
  const [editing, setEditing] = useState<EditingField>(null)
  const [editValue, setEditValue] = useState('')

  const canPublish = !!(spec.name && spec.systemPrompt && spec.systemPrompt.length > 20)

  function startEdit(field: EditingField) {
    if (!field) return
    if (field === 'starterQuestions') {
      setEditValue((spec.starterQuestions ?? []).join('\n'))
    } else if (field === 'learningObjectives') {
      setEditValue((spec.learningObjectives ?? []).join('\n'))
    } else {
      setEditValue((spec[field] as string) ?? '')
    }
    setEditing(field)
  }

  function saveEdit() {
    if (!editing) return
    if (editing === 'starterQuestions' || editing === 'learningObjectives') {
      onSpecChange(editing, editValue.split('\n').map(s => s.trim()).filter(Boolean))
    } else {
      onSpecChange(editing, editValue)
    }
    setEditing(null)
    setEditValue('')
  }

  function cancelEdit() {
    setEditing(null)
    setEditValue('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto py-6 px-4 space-y-5">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-[#0033A0]/10 mb-3">
            <Rocket className="size-6 text-[#0033A0]" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Review & Publish</h2>
          <p className="text-sm text-gray-500 mt-1">Check everything looks right, then publish.</p>
        </div>

        {/* Sections */}
        <ReviewSection
          label="Name"
          value={spec.name || '—'}
          isEditing={editing === 'name'}
          onEdit={() => startEdit('name')}
          editValue={editValue}
          onEditChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
          required={!spec.name}
        />

        <ReviewSection
          label="Short Description"
          value={spec.shortDescription || '—'}
          isEditing={editing === 'shortDescription'}
          onEdit={() => startEdit('shortDescription')}
          editValue={editValue}
          onEditChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />

        <ReviewSection
          label="System Prompt"
          value={spec.systemPrompt || '—'}
          isEditing={editing === 'systemPrompt'}
          onEdit={() => startEdit('systemPrompt')}
          editValue={editValue}
          onEditChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
          multiline
          collapsed
          required={!spec.systemPrompt || spec.systemPrompt.length < 20}
        />

        <ReviewSection
          label="Welcome Message"
          value={spec.welcomeMessage || '—'}
          isEditing={editing === 'welcomeMessage'}
          onEdit={() => startEdit('welcomeMessage')}
          editValue={editValue}
          onEditChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
          multiline
        />

        <ReviewSection
          label="Starter Questions"
          value={(spec.starterQuestions ?? []).length > 0 ? (spec.starterQuestions ?? []).join(' · ') : '—'}
          isEditing={editing === 'starterQuestions'}
          onEdit={() => startEdit('starterQuestions')}
          editValue={editValue}
          onEditChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
          multiline
          hint="One per line"
        />

        <ReviewSection
          label="Learning Objectives"
          value={(spec.learningObjectives ?? []).length > 0 ? (spec.learningObjectives ?? []).join(' · ') : '—'}
          isEditing={editing === 'learningObjectives'}
          onEdit={() => startEdit('learningObjectives')}
          editValue={editValue}
          onEditChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
          multiline
          hint="One per line"
        />

        {/* Metadata row */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="bg-[#0033A0] text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
            {spec.toolType?.replace(/_/g, ' ') || 'Chatbot'}
          </span>
          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
            {spec.category || 'General'}
          </span>
          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
            {spec.difficultyLevel || 'Introductory'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0033A0] px-5 py-4 text-white font-bold text-lg hover:bg-[#002580] disabled:opacity-40 transition-colors"
          >
            <Rocket className="size-5" />
            Publish
          </button>
          {!canPublish && (
            <p className="text-xs text-amber-600 text-center">Add a name and system prompt to publish.</p>
          )}
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors text-center"
          >
            ← Back to refining
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Inline editable section ─────────────────────────────────────────── */

function ReviewSection({
  label,
  value,
  isEditing,
  onEdit,
  editValue,
  onEditChange,
  onSave,
  onCancel,
  multiline,
  collapsed,
  hint,
  required,
}: {
  label: string
  value: string
  isEditing: boolean
  onEdit: () => void
  editValue: string
  onEditChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  multiline?: boolean
  collapsed?: boolean
  hint?: string
  required?: boolean
}) {
  const [expanded, setExpanded] = useState(!collapsed)

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
          {required && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Required</span>}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="text-gray-400 hover:text-[#0033A0] transition-colors"
            aria-label={`Edit ${label}`}
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="px-4 pb-3 space-y-2">
          {multiline ? (
            <textarea
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 resize-none"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
              autoFocus
            />
          )}
          {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
            >
              <Check className="size-3" /> Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <X className="size-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-3">
          {collapsed && !expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs text-[#0033A0] hover:underline"
            >
              Show details...
            </button>
          ) : (
            <p className={`text-sm text-gray-700 leading-relaxed ${value === '—' ? 'italic text-gray-400' : ''}`}>
              {value.length > 300 && collapsed ? `${value.slice(0, 300)}…` : value}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
