'use client'

import { useState } from 'react'
import {
  X, FileText, Calendar, GripVertical, Pencil, CheckCircle, Circle,
  Users, AlertTriangle, MessageSquare, Flag,
} from 'lucide-react'
import ConfidenceDot from './ConfidenceDot'
import { UNIT_TYPE_COLORS } from './types'
import type { MapNode, CourseUnit, ConflictInfo, RemoteEditingNode } from './types'

export default function NodeDetailDrawer({
  node,
  unit,
  courseId,
  userEmail,
  readOnly,
  lessonProgress,
  onClose,
  onUpdated,
  onAddComment,
  conflictInfo,
  onConflictResolve,
  remoteEditingUsers,
  isMilestoneNode,
  onSetMilestone,
  onRemoveMilestone,
}: {
  node: MapNode
  unit: CourseUnit | null
  courseId: string
  userEmail: string
  readOnly: boolean
  lessonProgress: Map<string, boolean>
  onClose: () => void
  onUpdated: () => void
  onAddComment?: (nodeId: string) => void
  conflictInfo?: ConflictInfo | null
  onConflictResolve?: (resolution: 'keep-mine' | 'use-theirs' | 'merge') => void
  remoteEditingUsers?: RemoteEditingNode[]
  isMilestoneNode?: boolean
  onSetMilestone?: (nodeId: string, label: string) => void
  onRemoveMilestone?: (nodeId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [milestoneLabel, setMilestoneLabel] = useState('')
  const [label, setLabel] = useState(unit?.label || node.label)
  const [unitType, setUnitType] = useState(unit?.unitType || 'LECTURE')
  const [startDate, setStartDate] = useState(unit?.startDate?.slice(0, 10) || '')
  const [endDate, setEndDate] = useState(unit?.endDate?.slice(0, 10) || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/nodes/${node.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          label,
          unitType,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      })
      if (res.ok) {
        setEditing(false)
        onUpdated()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="node-drawer-title" className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-w-full max-md:max-h-[80vh] max-md:rounded-t-2xl max-md:border-t-2 max-md:border-l-0">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="hidden max-md:block w-10 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
        <h2 id="node-drawer-title" className="text-lg font-extrabold text-gray-900 truncate">{node.label}</h2>
        <button onClick={onClose} aria-label="Close node details" className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="size-5 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Remote editors indicator */}
        {remoteEditingUsers && remoteEditingUsers.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-800">
            <Users className="size-4 shrink-0" />
            {remoteEditingUsers.map((e) => e.userName).join(', ')} {remoteEditingUsers.length === 1 ? 'is' : 'are'} also viewing this node
          </div>
        )}

        {/* Conflict banner (Task 50) */}
        {conflictInfo && editing && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-900 mb-2">
              <AlertTriangle className="size-4 shrink-0" />
              {conflictInfo.editorName} also modified this node
            </div>
            <p className="text-amber-800 text-xs mb-3">
              Their changes:{' '}
              {conflictInfo.label && <span>Label &rarr; &ldquo;{conflictInfo.label}&rdquo;</span>}
              {conflictInfo.label && conflictInfo.unitType && ', '}
              {conflictInfo.unitType && <span>Type &rarr; {conflictInfo.unitType}</span>}
              {!conflictInfo.label && !conflictInfo.unitType && 'content updated'}
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onConflictResolve?.('keep-mine')}
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                Keep mine
              </button>
              <button
                onClick={() => onConflictResolve?.('use-theirs')}
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                Use theirs
              </button>
              <button
                onClick={() => onConflictResolve?.('merge')}
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                Merge
              </button>
            </div>
          </div>
        )}

        {/* Unit type & confidence */}
        {unit && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${UNIT_TYPE_COLORS[unit.unitType] || UNIT_TYPE_COLORS.OTHER}`}>
              {unit.unitType}
            </span>
            <ConfidenceDot confidence={unit.dateConfidence} />
          </div>
        )}

        {/* Editable fields — only for non-readOnly */}
        {!readOnly && (
          <>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Unit Type</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  >
                    {Object.keys(UNIT_TYPE_COLORS).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-sm text-[#0033A0] font-semibold hover:underline"
              >
                <Pencil className="size-3.5" /> Edit
              </button>
            )}
          </>
        )}

        {/* Date range */}
        {unit && (unit.startDate || unit.endDate) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="size-4 shrink-0" />
            {unit.startDate ? new Date(unit.startDate).toLocaleDateString() : '—'}
            {' \u2192 '}
            {unit.endDate ? new Date(unit.endDate).toLocaleDateString() : '—'}
          </div>
        )}

        {/* Description */}
        {unit?.description && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-1">Description</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{unit.description}</p>
          </div>
        )}

        {/* Raw source text */}
        {unit?.rawSourceText && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-1">Raw Source Text</h3>
            <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48">
              {unit.rawSourceText}
            </pre>
          </div>
        )}

        {/* Modules & Lessons */}
        {unit && unit.modules.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Modules & Lessons</h3>
            <div className="space-y-3">
              {unit.modules.map((mod) => (
                <div key={mod.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="size-3.5 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-800">{mod.label}</span>
                  </div>
                  {mod.description && (
                    <p className="text-xs text-gray-500 mb-2">{mod.description}</p>
                  )}
                  {mod.lessons.length > 0 && (
                    <ul className="space-y-1 ml-4">
                      {mod.lessons.map((lesson) => {
                        const isCompleted = lessonProgress.get(lesson.id) === true
                        return (
                          <li key={lesson.id} className="text-xs text-gray-600 flex items-start gap-1.5">
                            {readOnly ? (
                              isCompleted ? (
                                <CheckCircle className="size-3.5 text-green-500 mt-0.5 shrink-0" />
                              ) : (
                                <Circle className="size-3.5 text-gray-300 mt-0.5 shrink-0" />
                              )
                            ) : (
                              <GripVertical className="size-3 text-gray-300 mt-0.5 shrink-0" />
                            )}
                            <span>
                              {lesson.label}
                              {lesson.dueDate && (
                                <span className="text-gray-400 ml-1">
                                  (due {new Date(lesson.dueDate).toLocaleDateString()})
                                </span>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add comment button */}
        {!readOnly && onAddComment && (
          <button
            onClick={() => onAddComment(node.id)}
            className="flex items-center gap-1.5 text-sm text-[#0033A0] font-semibold hover:underline"
          >
            <MessageSquare className="size-3.5" /> Add Comment
          </button>
        )}

        {/* Set Milestone — educators only (Task 64) */}
        {!readOnly && onSetMilestone && (
          <div className="border-t border-gray-100 pt-3">
            {isMilestoneNode ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-amber-700 font-semibold">
                  <Flag className="size-3.5" /> Milestone set
                </div>
                {onRemoveMilestone && (
                  <button
                    onClick={() => onRemoveMilestone(node.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Set as Milestone</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={milestoneLabel}
                    onChange={(e) => setMilestoneLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && milestoneLabel.trim()) { onSetMilestone(node.id, milestoneLabel.trim()); setMilestoneLabel('') } }}
                    placeholder="e.g., Midpoint"
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    onClick={() => { if (milestoneLabel.trim()) { onSetMilestone(node.id, milestoneLabel.trim()); setMilestoneLabel('') } }}
                    disabled={!milestoneLabel.trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    <Flag className="size-3" /> Set
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
