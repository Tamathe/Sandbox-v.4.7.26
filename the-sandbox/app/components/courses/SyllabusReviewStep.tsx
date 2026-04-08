'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Trash2,
  ArrowRight,
  BookOpen,
  FlaskConical,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  HelpCircle,
  Layers,
  GitBranch,
  Target,
} from 'lucide-react'

// ── Types (mirror pdf-parser.ts) ─────────────────────────────────────────────

type UnitType = 'lecture' | 'lab' | 'exam' | 'quiz' | 'assignment' | 'discussion' | 'other'
type LayoutHint = 'week-based' | 'unit-based' | 'topic-based' | 'date-based'

interface ExtractedLesson {
  label: string
  rawSourceText: string
  dueDate: string | null
  dateConfidence: number
}

interface ExtractedModule {
  label: string
  description: string | null
  lessons: ExtractedLesson[]
}

interface ExtractedUnit {
  label: string
  description: string | null
  rawSourceText: string
  unitType: UnitType
  startDate: string | null
  endDate: string | null
  dateConfidence: number
  modules: ExtractedModule[]
  explicitObjectives: string[]
}

interface ExtractedEdge {
  fromLabel: string
  toLabel: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
  evidence: string
}

export interface ExtractedPolicy {
  category: 'late' | 'attendance' | 'grading' | 'academic_integrity' | 'communication' | 'other'
  title: string
  content: string
}

export interface ExtractedGradingWeight {
  category: string
  weight: number
  description: string | null
}

export interface ParseResult {
  units: ExtractedUnit[]
  edges: ExtractedEdge[]
  policies: ExtractedPolicy[]
  gradingWeights: ExtractedGradingWeight[]
  layoutHint: LayoutHint
  semesterStart: string | null
  semesterEnd: string | null
  overallDateConfidence: number
}

interface Props {
  result: ParseResult
  onResultChange: (result: ParseResult) => void
  onApply: () => void
  onReupload: () => void
  onCancel: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const UNIT_TYPE_CONFIG: Record<UnitType, { label: string; color: string; icon: typeof BookOpen }> = {
  lecture:    { label: 'Lecture',    color: 'bg-blue-100 text-blue-700',   icon: BookOpen },
  lab:       { label: 'Lab',        color: 'bg-emerald-100 text-emerald-700', icon: FlaskConical },
  exam:      { label: 'Exam',       color: 'bg-red-100 text-red-700',     icon: ClipboardList },
  quiz:      { label: 'Quiz',       color: 'bg-amber-100 text-amber-700', icon: HelpCircle },
  assignment:{ label: 'Assignment', color: 'bg-orange-100 text-orange-700', icon: ClipboardList },
  discussion:{ label: 'Discussion', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  other:     { label: 'Other',      color: 'bg-gray-100 text-gray-700',   icon: Layers },
}

function confidenceColor(c: number): string {
  if (c >= 0.95) return 'bg-green-500'
  if (c >= 0.80) return 'bg-amber-500'
  return 'bg-red-500'
}

function confidenceLabel(c: number): string {
  if (c >= 0.95) return 'High confidence'
  if (c >= 0.80) return 'Medium confidence — review recommended'
  return 'Low confidence — manual verification needed'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const EDGE_TYPE_COLORS: Record<string, string> = {
  PREREQUISITE: 'bg-red-100 text-red-700',
  SEQUENCE:     'bg-blue-100 text-blue-700',
  CONCURRENT:   'bg-purple-100 text-purple-700',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SyllabusReviewStep({ result, onResultChange, onApply, onReupload, onCancel }: Props) {
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set())
  const [editingLabel, setEditingLabel] = useState<number | null>(null)

  const totalModules = result.units.reduce((s, u) => s + u.modules.length, 0)
  const totalObjectives = result.units.reduce((s, u) => s + (u.explicitObjectives?.length ?? 0), 0)

  const toggleUnit = (i: number) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const updateUnit = (index: number, patch: Partial<ExtractedUnit>) => {
    const units = [...result.units]
    units[index] = { ...units[index], ...patch }
    onResultChange({ ...result, units })
  }

  const removeEdge = (index: number) => {
    const edges = result.edges.filter((_, i) => i !== index)
    onResultChange({ ...result, edges })
  }

  return (
    <div className="space-y-6">
      {/* ── Overview card ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="rounded-full bg-[#0033A0] px-3 py-0.5 text-xs font-semibold text-white">
            {result.layoutHint.replace('-', ' ')}
          </span>
          {result.semesterStart && (
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Calendar className="size-3" />
              {formatDate(result.semesterStart)}
              {result.semesterEnd && ` – ${formatDate(result.semesterEnd)}`}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{result.units.length}</p>
            <p className="text-xs text-gray-500">Units</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{totalModules}</p>
            <p className="text-xs text-gray-500">Modules</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{totalObjectives}</p>
            <p className="text-xs text-gray-500">Objectives</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{result.edges.length}</p>
            <p className="text-xs text-gray-500">Edges</p>
          </div>
        </div>

        {/* Date confidence bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Overall date confidence</span>
            <span className="text-xs font-semibold text-gray-700">
              {(result.overallDateConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${confidenceColor(result.overallDateConfidence)}`}
              style={{ width: `${result.overallDateConfidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Units list ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-extrabold text-gray-900 mb-3">Extracted Units</h2>
        <div className="space-y-2">
          {result.units.map((unit, i) => {
            const expanded = expandedUnits.has(i)
            const cfg = UNIT_TYPE_CONFIG[unit.unitType] || UNIT_TYPE_CONFIG.other
            const Icon = cfg.icon

            return (
              <div key={i} className="rounded-2xl border-2 border-gray-200 overflow-hidden">
                {/* Unit header */}
                <button
                  type="button"
                  onClick={() => toggleUnit(i)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {expanded ? <ChevronDown className="size-4 text-gray-400 shrink-0" /> : <ChevronRight className="size-4 text-gray-400 shrink-0" />}

                  {/* Confidence dot */}
                  <span
                    className={`size-2.5 rounded-full shrink-0 ${confidenceColor(unit.dateConfidence)}`}
                    title={confidenceLabel(unit.dateConfidence)}
                  />

                  {/* Label (inline edit) */}
                  {editingLabel === i ? (
                    <input
                      autoFocus
                      className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-sm"
                      defaultValue={unit.label}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        updateUnit(i, { label: e.target.value.trim() || unit.label })
                        setEditingLabel(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setEditingLabel(null)
                      }}
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm font-bold text-gray-900 cursor-text"
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingLabel(i) }}
                      title="Double-click to edit"
                    >
                      {unit.label}
                    </span>
                  )}

                  {/* Type badge */}
                  <span className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                    <Icon className="size-3" />
                    {cfg.label}
                  </span>

                  {/* Date range */}
                  {unit.startDate && (
                    <span className="shrink-0 text-xs text-gray-500">
                      {formatDate(unit.startDate)}
                      {unit.endDate && ` – ${formatDate(unit.endDate)}`}
                    </span>
                  )}

                  {/* Module count */}
                  {unit.modules.length > 0 && (
                    <span className="shrink-0 text-xs text-gray-400">
                      {unit.modules.length} module{unit.modules.length !== 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Objective count */}
                  {unit.explicitObjectives && unit.explicitObjectives.length > 0 && (
                    <span className="shrink-0 flex items-center gap-1 text-xs text-emerald-600">
                      <Target className="size-3" />
                      {unit.explicitObjectives.length}
                    </span>
                  )}
                </button>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
                    {/* Editable fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={unit.unitType}
                          onChange={(e) => updateUnit(i, { unitType: e.target.value as UnitType })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          {Object.entries(UNIT_TYPE_CONFIG).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Confidence: {(unit.dateConfidence * 100).toFixed(0)}%
                        </label>
                        <div className="h-2 rounded-full bg-gray-200 mt-2">
                          <div
                            className={`h-full rounded-full ${confidenceColor(unit.dateConfidence)}`}
                            style={{ width: `${unit.dateConfidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start date</label>
                        <input
                          type="date"
                          value={unit.startDate ?? ''}
                          onChange={(e) => updateUnit(i, { startDate: e.target.value || null })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End date</label>
                        <input
                          type="date"
                          value={unit.endDate ?? ''}
                          onChange={(e) => updateUnit(i, { endDate: e.target.value || null })}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>

                    {/* Modules */}
                    {unit.modules.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Modules</p>
                        <ul className="space-y-1">
                          {unit.modules.map((mod, mi) => (
                            <li key={mi} className="rounded-lg bg-white border border-gray-200 px-3 py-2">
                              <p className="text-sm font-semibold text-gray-800">{mod.label}</p>
                              {mod.description && <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>}
                              {mod.lessons.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {mod.lessons.map((lesson, li) => (
                                    <li key={li} className="text-xs text-gray-600 pl-3 border-l-2 border-gray-200">
                                      {lesson.label}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Explicit objectives */}
                    {unit.explicitObjectives && unit.explicitObjectives.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                          <Target className="size-3 text-emerald-600" />
                          Learning Objectives ({unit.explicitObjectives.length})
                        </p>
                        <ul className="space-y-1">
                          {unit.explicitObjectives.map((obj, oi) => (
                            <li key={oi} className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                              <span className="mt-0.5 size-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-xs text-emerald-800">{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Raw source preview */}
                    {unit.rawSourceText && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                          Raw source text
                        </summary>
                        <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-white border border-gray-200 p-2 text-xs text-gray-600 whitespace-pre-wrap">
                          {unit.rawSourceText}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Prerequisite edges ─────────────────────────────────────────── */}
      {result.edges.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <GitBranch className="size-4" />
            Prerequisites & Dependencies
          </h2>
          <div className="space-y-2">
            {result.edges.map((edge, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-2"
              >
                <span className="text-sm font-semibold text-gray-800">{edge.fromLabel}</span>
                <ArrowRight className="size-3 text-gray-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-800">{edge.toLabel}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${EDGE_TYPE_COLORS[edge.edgeType] || 'bg-gray-100 text-gray-700'}`}>
                  {edge.edgeType}
                </span>
                <span className="flex-1 text-xs text-gray-500 italic truncate" title={edge.evidence}>
                  &ldquo;{edge.evidence}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => removeEdge(i)}
                  className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove edge"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
        >
          Apply to Course
        </button>
        <button
          type="button"
          onClick={onReupload}
          className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Re-upload
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-3 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
