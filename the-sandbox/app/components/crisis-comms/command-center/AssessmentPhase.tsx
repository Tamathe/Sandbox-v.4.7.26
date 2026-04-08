'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, CheckCircle, Plus, X, Loader2, ChevronDown, ChevronUp, GripVertical, Minus } from 'lucide-react'
import type { AssessmentResult, DocumentType, SeverityLevel } from '../../../lib/crisis-comms/command-center/types'
import SeverityBadge from './SeverityBadge'
import DocumentIcon from './DocumentIcon'

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  EMERGENCY_TEXT_ALERT: 'Emergency Text Alert',
  PRESS_STATEMENT: 'Press Statement',
  INTERNAL_EMAIL: 'Internal Email',
  SOCIAL_TWITTER: 'X/Twitter',
  SOCIAL_INSTAGRAM: 'Instagram',
  SOCIAL_FACEBOOK: 'Facebook',
  PARENT_NOTIFICATION: 'Parent Notification',
  WEBSITE_BANNER: 'Website Banner',
  TALKING_POINTS: 'Talking Points',
  AFTER_ACTION_REPORT: 'After-Action Report',
}

const ALL_DOC_TYPES: DocumentType[] = [
  'EMERGENCY_TEXT_ALERT',
  'PRESS_STATEMENT',
  'INTERNAL_EMAIL',
  'SOCIAL_TWITTER',
  'SOCIAL_INSTAGRAM',
  'SOCIAL_FACEBOOK',
  'PARENT_NOTIFICATION',
  'WEBSITE_BANNER',
  'TALKING_POINTS',
  'AFTER_ACTION_REPORT',
]

const ALL_POPULATIONS = [
  'students', 'faculty', 'staff', 'parents', 'media',
  'donors', 'alumni', 'community', 'legislators', 'prospective students',
]

interface AssessmentPhaseProps {
  assessment: AssessmentResult
  loading: boolean
  incidentInputText?: string
  onEdit: (updated: AssessmentResult) => void
  onConfirm: () => void
  onBack: () => void
}

export default function AssessmentPhase({
  assessment,
  loading,
  incidentInputText,
  onEdit,
  onConfirm,
  onBack,
}: AssessmentPhaseProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [newFact, setNewFact] = useState('')
  const [newUnknown, setNewUnknown] = useState('')
  const [newAction, setNewAction] = useState('')

  function setSeverity(severity: SeverityLevel) {
    onEdit({ ...assessment, severity })
  }

  function setSummary(summary: string) {
    onEdit({ ...assessment, summary })
  }

  function togglePopulation(pop: string) {
    const current = assessment.affectedPopulations
    const updated = current.includes(pop) ? current.filter((p) => p !== pop) : [...current, pop]
    onEdit({ ...assessment, affectedPopulations: updated })
  }

  function addDocType(type: DocumentType) {
    if (assessment.suggestedDocumentTypes.includes(type)) return
    onEdit({ ...assessment, suggestedDocumentTypes: [...assessment.suggestedDocumentTypes, type] })
  }

  function removeDocType(type: DocumentType) {
    onEdit({ ...assessment, suggestedDocumentTypes: assessment.suggestedDocumentTypes.filter((t) => t !== type) })
  }

  function reorderDocTypes(fromIndex: number, toIndex: number) {
    const updated = [...assessment.suggestedDocumentTypes]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onEdit({ ...assessment, suggestedDocumentTypes: updated })
  }

  function addToList(key: 'keyFacts' | 'unknowns' | 'immediateActions', value: string, clear: () => void) {
    if (!value.trim()) return
    onEdit({ ...assessment, [key]: [...assessment[key], value.trim()] })
    clear()
  }

  function removeFromList(key: 'keyFacts' | 'unknowns' | 'immediateActions', index: number) {
    onEdit({ ...assessment, [key]: assessment[key].filter((_, i) => i !== index) })
  }

  function updateInList(key: 'keyFacts' | 'unknowns' | 'immediateActions', index: number, value: string) {
    const updated = [...assessment[key]]
    updated[index] = value
    onEdit({ ...assessment, [key]: updated })
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to Initiation
      </button>

      {incidentInputText && (
        <div className="border rounded-2xl shadow-sm bg-gray-50 overflow-hidden">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Original Incident Report
            {showOriginal ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {showOriginal && (
            <div className="px-6 pb-4">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{incidentInputText}</pre>
            </div>
          )}
        </div>
      )}

      <div className="border rounded-2xl shadow-sm bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">AI Situation Assessment</h2>
          <p className="text-xs text-gray-400">Review and edit before generating documents</p>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
          <div className="flex gap-2">
            {([1, 2, 3] as SeverityLevel[]).map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  assessment.severity === s
                    ? 'border-[#0033A0] bg-[#0033A0]/5 text-[#0033A0]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <SeverityBadge severity={s} />
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            value={assessment.summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
          />
        </div>

        {/* Affected Populations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Affected Populations</label>
          <div className="flex flex-wrap gap-2">
            {ALL_POPULATIONS.map((pop) => {
              const active = assessment.affectedPopulations.includes(pop)
              return (
                <button
                  key={pop}
                  onClick={() => togglePopulation(pop)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#0033A0] text-white border-[#0033A0]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {pop}
                </button>
              )
            })}
          </div>
        </div>

        {/* Document Types — reorderable priority list */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Documents to Generate</label>
          <p className="text-xs text-gray-400 mb-3">Drag to reorder priority. Documents generate in this order.</p>

          {/* Selected types (ordered) */}
          {assessment.suggestedDocumentTypes.length > 0 && (
            <ReorderableDocList
              items={assessment.suggestedDocumentTypes}
              onReorder={reorderDocTypes}
              onRemove={removeDocType}
            />
          )}

          {/* Available (unselected) types */}
          {(() => {
            const available = ALL_DOC_TYPES.filter((t) => !assessment.suggestedDocumentTypes.includes(t))
            if (available.length === 0) return null
            return (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">Available</p>
                <div className="space-y-1">
                  {available.map((type) => (
                    <button
                      key={type}
                      onClick={() => addDocType(type)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 hover:border-[#0033A0]/40 hover:text-[#0033A0] transition-colors"
                    >
                      <Plus className="size-3.5 shrink-0" />
                      <DocumentIcon type={type} className="size-3.5 shrink-0" />
                      {DOC_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Editable Lists */}
        <EditableList
          label="Key Facts"
          items={assessment.keyFacts}
          newValue={newFact}
          onNewValueChange={setNewFact}
          onAdd={() => addToList('keyFacts', newFact, () => setNewFact(''))}
          onRemove={(i) => removeFromList('keyFacts', i)}
          onUpdate={(i, v) => updateInList('keyFacts', i, v)}
          placeholder="Add a confirmed fact..."
        />

        <EditableList
          label="Unknowns"
          items={assessment.unknowns}
          newValue={newUnknown}
          onNewValueChange={setNewUnknown}
          onAdd={() => addToList('unknowns', newUnknown, () => setNewUnknown(''))}
          onRemove={(i) => removeFromList('unknowns', i)}
          onUpdate={(i, v) => updateInList('unknowns', i, v)}
          placeholder="Add an unknown..."
        />

        <EditableList
          label="Immediate Actions"
          items={assessment.immediateActions}
          newValue={newAction}
          onNewValueChange={setNewAction}
          onAdd={() => addToList('immediateActions', newAction, () => setNewAction(''))}
          onRemove={(i) => removeFromList('immediateActions', i)}
          onUpdate={(i, v) => updateInList('immediateActions', i, v)}
          placeholder="Add an immediate action..."
        />
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={loading || assessment.suggestedDocumentTypes.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#0033A0] hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Generating Documents...
          </>
        ) : (
          <>
            <CheckCircle className="size-4" />
            Confirm & Generate {assessment.suggestedDocumentTypes.length} Documents
          </>
        )}
      </button>
    </div>
  )
}

// ── Reorderable Document List sub-component ─────────────────────────────────

function ReorderableDocList({
  items,
  onReorder,
  onRemove,
}: {
  items: DocumentType[]
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (type: DocumentType) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault()
    setDragIndex(index)
    setOverIndex(index)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!listRef.current) return
      const children = listRef.current.children
      let newOverIndex = items.length - 1
      for (let i = 0; i < children.length; i++) {
        const childRect = children[i].getBoundingClientRect()
        const childMid = childRect.top + childRect.height / 2
        if (moveEvent.clientY < childMid) {
          newOverIndex = i
          break
        }
      }
      setOverIndex(Math.max(0, Math.min(newOverIndex, items.length - 1)))
    }

    const handlePointerUp = () => {
      setDragIndex((prev) => {
        setOverIndex((over) => {
          if (prev !== null && over !== null && prev !== over) {
            onReorder(prev, over)
          }
          return null
        })
        return null
      })
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }, [items.length, onReorder])

  return (
    <div ref={listRef} className="space-y-1">
      {items.map((type, index) => {
        const isDragging = dragIndex === index
        const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
        return (
          <div
            key={type}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              isDragging
                ? 'bg-[#0033A0]/10 border-[#0033A0] opacity-60 scale-[0.98]'
                : 'bg-[#0033A0]/5 border-[#0033A0]/30 text-[#0033A0]'
            } ${isOver ? 'ring-2 ring-[#0033A0]/40' : ''}`}
          >
            <span className="text-[10px] text-[#0033A0]/50 w-4 text-center shrink-0">{index + 1}</span>
            <button
              onPointerDown={(e) => handlePointerDown(e, index)}
              className="cursor-grab active:cursor-grabbing touch-none p-0.5 text-[#0033A0]/40 hover:text-[#0033A0]"
            >
              <GripVertical className="size-3.5" />
            </button>
            <DocumentIcon type={type} className="size-3.5 shrink-0" />
            <span className="flex-1">{DOC_TYPE_LABELS[type]}</span>
            <button
              onClick={() => onRemove(type)}
              className="p-0.5 text-[#0033A0]/40 hover:text-red-500 transition-colors"
            >
              <Minus className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Editable List sub-component ─────────────────────────────────────────────

function EditableList({
  label,
  items,
  newValue,
  onNewValueChange,
  onAdd,
  onRemove,
  onUpdate,
  placeholder,
}: {
  label: string
  items: string[]
  newValue: string
  onNewValueChange: (v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <ul className="space-y-1.5 mb-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 group">
            <span className="text-gray-400 text-xs mt-2 shrink-0">{i + 1}.</span>
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(i, e.target.value)}
              className="flex-1 border border-transparent hover:border-gray-200 focus:border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0033A0]/40"
            />
            <button
              onClick={() => onRemove(i)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
        />
        <button
          onClick={onAdd}
          disabled={!newValue.trim()}
          className="p-1.5 text-[#0033A0] hover:bg-[#0033A0]/5 rounded-lg disabled:opacity-30 transition-colors"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
