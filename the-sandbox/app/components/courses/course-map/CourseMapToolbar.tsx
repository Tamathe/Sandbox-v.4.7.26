'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Activity, BarChart3, Calendar, Check, ChevronDown, ClipboardList, Download, FileText,
  GitBranch, GitCompare, History, Loader2, Lock, Pencil, Printer, Search,
  Share2, Sparkles, Tag, Unlock, Upload, Users, X,
} from 'lucide-react'
import type { CourseMapWeek, CourseMapResult, CourseMapRubricResult } from './types'
import {
  ASSIGNMENT_TYPE_LABELS, downloadCSV, downloadMarkdown, generateICalExport,
  generatePrintLayout, hasAnyDates,
} from './types'

interface CourseMapToolbarProps {
  viewState: 'preview' | 'saved'
  editing: boolean
  isStudent: boolean
  weeks: CourseMapWeek[]
  confirming: boolean
  courseId: string
  courseCode?: string
  metadata: CourseMapResult['metadata'] | null
  assignmentRubrics: Map<string, CourseMapRubricResult>
  hasCanvasId: boolean

  // Toggle states
  bulkSelectMode: boolean
  showExportMenu: boolean
  loadingBloomTags: boolean
  weekReorderLocked: boolean
  showPrintPreview: boolean
  showAnalyticsSummary: boolean
  showHistory: boolean
  loadingSuggestions: boolean
  showSharePanel: boolean
  generatingShare: boolean
  pushingToCanvas: boolean
  showGapAnalysis: boolean
  loadingGapAnalysis: boolean
  showAlignmentPanel: boolean
  loadingAlignment: boolean
  showPacing: boolean
  loadingWorkload: boolean
  showRecentChanges: boolean
  showComparePicker: boolean
  showPrerequisites: boolean
  showDateFill: boolean

  // Handlers
  onEdit: () => void
  onBulkToggle: () => void
  onSetShowExportMenu: (v: boolean) => void
  onAutoTagBloom: () => void
  onSetWeekReorderLocked: (v: boolean) => void
  onSetShowPrintPreview: (v: boolean) => void
  onSetShowAnalyticsSummary: (v: boolean) => void
  onToggleHistory: () => void
  onGetSuggestions: () => void
  onToggleSharePanel: () => void
  onPushToCanvas: () => void
  onToggleGapAnalysis: () => void
  onToggleAlignment: () => void
  onTogglePacing: () => void
  onToggleRecentChanges: () => void
  onToggleComparePicker: () => void
  onTogglePrerequisites: () => void
  onSetShowDateFill: (v: boolean) => void
  onRegenerate: () => void
  onConfirm: () => void
}

// ── Dropdown wrapper ────────────────────────────────────────────────────────

function ToolbarDropdown({
  label,
  icon: Icon,
  children,
  active,
}: {
  label: string
  icon: typeof Activity
  children: React.ReactNode
  active?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
          active || open
            ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon className="size-3.5" />
        {label}
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  loading,
}: {
  icon: typeof Activity
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-blue-50 text-[#0033A0] font-semibold' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  )
}

// ── Main toolbar ────────────────────────────────────────────────────────────

export function CourseMapToolbar(props: CourseMapToolbarProps) {
  const {
    viewState, editing, isStudent, weeks, confirming, courseId, courseCode,
    metadata, assignmentRubrics, hasCanvasId,
    bulkSelectMode, showExportMenu, loadingBloomTags, weekReorderLocked,
    showPrintPreview, showAnalyticsSummary, showHistory, loadingSuggestions,
    showSharePanel, generatingShare, pushingToCanvas, showGapAnalysis,
    loadingGapAnalysis, showAlignmentPanel, loadingAlignment, showPacing,
    loadingWorkload, showRecentChanges, showComparePicker, showPrerequisites,
    showDateFill,
    onEdit, onBulkToggle, onSetShowExportMenu, onAutoTagBloom,
    onSetWeekReorderLocked, onSetShowPrintPreview, onSetShowAnalyticsSummary,
    onToggleHistory, onGetSuggestions, onToggleSharePanel, onPushToCanvas,
    onToggleGapAnalysis, onToggleAlignment, onTogglePacing, onToggleRecentChanges,
    onToggleComparePicker, onTogglePrerequisites, onSetShowDateFill,
    onRegenerate, onConfirm,
  } = props

  const hasActiveAnalysis = showGapAnalysis || showAlignmentPanel || showPacing || showPrerequisites || loadingBloomTags
  const hasActiveHistory = showHistory || showRecentChanges || showComparePicker

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-extrabold text-gray-900">
        Course Map
        {viewState === 'preview' && (
          <span className="ml-2 text-sm font-normal text-amber-600">(Preview — not yet saved)</span>
        )}
      </h3>
      <div className="flex items-center gap-2">
        {viewState === 'saved' && !editing && !isStudent && (
          <>
            {/* ── Primary actions (always visible) ── */}
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>

            <button
              type="button"
              onClick={onGetSuggestions}
              disabled={loadingSuggestions}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingSuggestions ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              AI Suggestions
            </button>

            {/* ── Analyze dropdown ── */}
            <ToolbarDropdown label="Analyze" icon={Search} active={hasActiveAnalysis}>
              <DropdownItem icon={Search} label="Gap Analysis" onClick={onToggleGapAnalysis} active={showGapAnalysis} loading={loadingGapAnalysis} disabled={loadingGapAnalysis} />
              {viewState === 'saved' && (
                <DropdownItem icon={Activity} label="Alignment Check" onClick={onToggleAlignment} active={showAlignmentPanel} loading={loadingAlignment} disabled={loadingAlignment} />
              )}
              <DropdownItem icon={Activity} label="Pacing & Workload" onClick={onTogglePacing} active={showPacing} loading={loadingWorkload} disabled={loadingWorkload} />
              <DropdownItem icon={GitBranch} label="Prerequisites" onClick={onTogglePrerequisites} active={showPrerequisites} />
              {weeks.some((w) => w.objectives.length > 0) && (
                <DropdownItem icon={Tag} label="Auto-tag Bloom's" onClick={onAutoTagBloom} loading={loadingBloomTags} disabled={loadingBloomTags} />
              )}
            </ToolbarDropdown>

            {/* ── Share & Export dropdown ── */}
            <ToolbarDropdown label="Share" icon={Share2} active={showSharePanel}>
              <DropdownItem icon={Share2} label="Share Link" onClick={onToggleSharePanel} active={showSharePanel} loading={generatingShare} disabled={generatingShare} />
              {hasCanvasId && (
                <DropdownItem icon={Upload} label="Push to Canvas" onClick={onPushToCanvas} loading={pushingToCanvas} disabled={pushingToCanvas} />
              )}
              <div className="my-1 border-t border-gray-100" />
              <DropdownItem icon={FileText} label="Download Markdown" onClick={() => downloadMarkdown(weeks)} />
              <DropdownItem icon={FileText} label="Download CSV" onClick={() => downloadCSV(weeks, courseCode)} />
              <DropdownItem icon={FileText} label="Print / Save as PDF" onClick={() => generatePrintLayout(weeks, courseCode, metadata, assignmentRubrics)} />
              <DropdownItem icon={Calendar} label="Calendar (.ics)" onClick={() => {
                const ics = generateICalExport(weeks, courseId, courseCode)
                const blob = new Blob([ics], { type: 'text/calendar' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `course-map${courseCode ? `-${courseCode}` : ''}.ics`
                a.click()
                URL.revokeObjectURL(url)
              }} disabled={!hasAnyDates(weeks)} />
            </ToolbarDropdown>

            {/* ── History dropdown ── */}
            <ToolbarDropdown label="History" icon={History} active={hasActiveHistory}>
              <DropdownItem icon={History} label="Snapshots" onClick={onToggleHistory} active={showHistory} />
              <DropdownItem icon={Users} label="Recent Changes" onClick={onToggleRecentChanges} active={showRecentChanges} />
              <DropdownItem icon={GitCompare} label="Compare Versions" onClick={onToggleComparePicker} active={showComparePicker} />
            </ToolbarDropdown>

            {/* ── View dropdown ── */}
            <ToolbarDropdown label="View" icon={BarChart3} active={showPrintPreview || showAnalyticsSummary || bulkSelectMode}>
              <DropdownItem icon={BarChart3} label="Analytics" onClick={() => onSetShowAnalyticsSummary(!showAnalyticsSummary)} active={showAnalyticsSummary} />
              <DropdownItem icon={Printer} label={showPrintPreview ? 'Exit Print View' : 'Print View'} onClick={() => onSetShowPrintPreview(!showPrintPreview)} active={showPrintPreview} />
              <DropdownItem icon={ClipboardList} label="Bulk Edit" onClick={onBulkToggle} active={bulkSelectMode} />
            </ToolbarDropdown>
          </>
        )}

        {/* ── Edit-mode controls ── */}
        {viewState === 'saved' && editing && !isStudent && (
          <>
            <button
              type="button"
              onClick={() => onSetWeekReorderLocked(!weekReorderLocked)}
              title={weekReorderLocked ? 'Unlock week reordering' : 'Lock week order'}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                weekReorderLocked
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {weekReorderLocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              {weekReorderLocked ? 'Locked' : 'Unlocked'}
            </button>
          </>
        )}

        {/* ── Auto-fill Dates (editing/preview) ── */}
        {(editing || viewState === 'preview') && weeks.length >= 2 && (
          <button
            type="button"
            onClick={() => onSetShowDateFill(!showDateFill)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
              showDateFill
                ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="size-3.5" />
            Auto-fill Dates
          </button>
        )}

        {/* ── Re-generate ── */}
        {!isStudent && (
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Upload className="size-3.5" />
            Re-generate
          </button>
        )}

        {/* ── Confirm & Save (preview/editing) ── */}
        {(viewState === 'preview' || editing) && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming || weeks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {confirming ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Confirm & Save
          </button>
        )}
      </div>
    </div>
  )
}
