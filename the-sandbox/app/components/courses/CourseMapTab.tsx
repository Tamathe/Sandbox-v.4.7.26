'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlignLeft,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Copy,
  GraduationCap,
  LayoutTemplate,
  Lightbulb,
  LinkIcon,
  Loader2,
  MessageSquare,
  MoveRight,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  StickyNote,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { addDays, formatDistanceToNow } from 'date-fns'
import type {
  CourseMapResult,
  CourseMapWeek,
  CourseMapObjective,
  CourseMapMaterial,
  CourseMapAssignment,
  ConfirmResult,
  CourseMapEditEntry,
  CourseMapComparison,
  PrerequisiteGraph,
  StudentWeekProgress,
  GapAnalysisResult,
  CourseMapCommentEntry,
  WorkloadMetrics,
  CourseMapNoteEntry,
  AlignmentIssue,
  AssignmentSuggestion,
} from '../../lib/course-map-service'
import type { SnapshotSummary, RebalanceSuggestion, ShareAnalytics, BloomLevel, BloomTagResult, CourseMapRubricResult } from '../../lib/course-map-service'
import { COURSE_MAP_TEMPLATES, WEEK_TEMPLATES } from '../../lib/course-map-templates'

// ── Imported extracted components ────────────────────────────────────────────
import {
  BLOOM_LEVELS, BLOOM_LABELS, BLOOM_COLORS,
  MATERIAL_TYPE_LABELS, ASSIGNMENT_TYPE_LABELS,
  courseHeaders,
} from './course-map/types'
import type { ViewState, MaterialSuggestion } from './course-map/types'
import { CourseMapToolbar } from './course-map/CourseMapToolbar'
import {
  GapAnalysisPanel,
  HistoryPanel,
  AlignmentPanel,
  DateFillPanel,
  SuggestionsPanel,
  SharePanel,
  RecentChangesPanel,
  ComparePickerPanel,
  PrerequisitesPanel,
  PacingPanel,
} from './course-map/SidePanels'
import { EmptyStateView } from './course-map/EmptyStateView'
import { AnalyticsSummary } from './course-map/AnalyticsSummary'
import { PrintPreview } from './course-map/PrintPreview'
import { CourseMapCompareView } from './course-map/CourseMapCompareView'
import { BulkEditBar, BulkSelectControls } from './course-map/BulkEditBar'
import { CourseMapDiffView } from './course-map/CourseMapDiffView'
import { BottomConfirmBar } from './course-map/BottomConfirmBar'
import { WeekSearchFilter } from './course-map/WeekSearchFilter'
import { CourseMapAnalytics } from './course-map/CourseMapAnalytics'

// ── Types ────────────────────────────────────────────────────────────────────

interface CourseMapTabProps {
  courseId: string
  userEmail: string
  userRole?: string
  courseCode?: string
  canvasCourseId?: string | null
  onCourseMapConfirmed?: () => void
  onSwitchTab?: (tab: string) => void
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CourseMapTab({ courseId, userEmail, userRole, courseCode, canvasCourseId, onCourseMapConfirmed, onSwitchTab }: CourseMapTabProps) {
  const isStudent = userRole === 'STUDENT'
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [weeks, setWeeks] = useState<CourseMapWeek[]>([])
  const [metadata, setMetadata] = useState<CourseMapResult['metadata'] | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null)

  // Upload state
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Confirm/generate loading
  const [confirming, setConfirming] = useState(false)

  // Collapsed weeks
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())

  // Diff state
  const [previousWeeks, setPreviousWeeks] = useState<CourseMapWeek[] | null>(null)

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)

  // History (snapshots)
  const [showHistory, setShowHistory] = useState(false)
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(false)
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null)

  // AI suggestions
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<RebalanceSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Canvas push
  const [hasCanvasId, setHasCanvasId] = useState(!!canvasCourseId)
  const [pushingToCanvas, setPushingToCanvas] = useState(false)
  const [canvasPushResult, setCanvasPushResult] = useState<string | null>(null)

  // Share link
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [generatingShare, setGeneratingShare] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  // Clone
  const [showClonePanel, setShowClonePanel] = useState(false)
  const [cloneableCourses, setCloneableCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [loadingCloneable, setLoadingCloneable] = useState(false)
  const [cloningFromId, setCloningFromId] = useState<string | null>(null)

  // Recent Changes (collaboration)
  const [showRecentChanges, setShowRecentChanges] = useState(false)
  const [recentEdits, setRecentEdits] = useState<CourseMapEditEntry[]>([])
  const [loadingEdits, setLoadingEdits] = useState(false)
  const [courseMapVersion, setCourseMapVersion] = useState<number>(0)

  // Compare
  const [showCompare, setShowCompare] = useState(false)
  const [showComparePicker, setShowComparePicker] = useState(false)
  const [comparison, setComparison] = useState<CourseMapComparison | null>(null)
  const [loadingCompare, setLoadingCompare] = useState(false)

  // Canvas import
  const [importingFromCanvas, setImportingFromCanvas] = useState(false)

  // AI teaching tips (Task 24)
  const [weekTips, setWeekTips] = useState<Map<number, string[]>>(new Map())
  const [loadingTipsWeek, setLoadingTipsWeek] = useState<number | null>(null)

  // Bulk edit (Task 25)
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set())
  const [bulkShiftDays, setBulkShiftDays] = useState<number>(0)
  const [bulkTargetWeek, setBulkTargetWeek] = useState<number | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Share analytics (Task 26)
  const [shareAnalytics, setShareAnalytics] = useState<ShareAnalytics | null>(null)
  const [loadingShareAnalytics, setLoadingShareAnalytics] = useState(false)

  // Prerequisites (Task 27)
  const [showPrerequisites, setShowPrerequisites] = useState(false)
  const [prerequisiteGraph, setPrerequisiteGraph] = useState<PrerequisiteGraph>([])
  const [loadingPrereqs, setLoadingPrereqs] = useState(false)

  // Student progress (Task 28)
  const [studentProgress, setStudentProgress] = useState<StudentWeekProgress[] | null>(null)

  // Notify toggle (Task 29)
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [notifyResult, setNotifyResult] = useState<number | null>(null)
  const [, setSendingNotify] = useState(false)

  // Gap analysis (Task 30)
  const [showGapAnalysis, setShowGapAnalysis] = useState(false)
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null)
  const [loadingGapAnalysis, setLoadingGapAnalysis] = useState(false)

  // Comments (Task 31)
  const [comments, setComments] = useState<CourseMapCommentEntry[]>([])
  const [openCommentWeek, setOpenCommentWeek] = useState<number | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Deep link copied (Task 32)
  const [copiedDeepLinkWeek, setCopiedDeepLinkWeek] = useState<number | null>(null)

  // Pacing heatmap (Task 33)
  const [showPacing, setShowPacing] = useState(false)
  const [workloadMetrics, setWorkloadMetrics] = useState<WorkloadMetrics | null>(null)
  const [loadingWorkload, setLoadingWorkload] = useState(false)

  // Week template dropdown (Task 34)
  const [showWeekTemplateMenu, setShowWeekTemplateMenu] = useState(false)

  // Instructor notes (Task 35)
  const [notes, setNotes] = useState<CourseMapNoteEntry[]>([])
  const [expandedNoteWeek, setExpandedNoteWeek] = useState<number | null>(null)
  const [noteTexts, setNoteTexts] = useState<Map<number, string>>(new Map())
  const noteDebounceRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // Material suggestions (Task 38)
  const [weekSuggestions, setWeekSuggestions] = useState<Map<number, MaterialSuggestion[]>>(new Map())
  const [loadingSuggestionsWeek, setLoadingSuggestionsWeek] = useState<number | null>(null)

  // Drag-and-drop reorder (Task 40)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  // Week summaries (Task 41)
  const [weekSummaries, setWeekSummaries] = useState<Map<number, string>>(new Map())
  const [loadingSummaryWeek, setLoadingSummaryWeek] = useState<number | null>(null)

  // Alignment check (Task 43)
  const [alignmentIssues, setAlignmentIssues] = useState<AlignmentIssue[] | null>(null)
  const [loadingAlignment, setLoadingAlignment] = useState(false)
  const [showAlignmentPanel, setShowAlignmentPanel] = useState(false)

  // Date auto-fill (Task 44)
  const [showDateFill, setShowDateFill] = useState(false)

  // Assignment suggestions (Task 46)
  const [weekAssignmentSuggestions, setWeekAssignmentSuggestions] = useState<Map<number, AssignmentSuggestion[]>>(new Map())
  const [loadingAssignmentSugWeek, setLoadingAssignmentSugWeek] = useState<number | null>(null)

  // Week search & filter (Task 47)
  const [weekSearchTerm, setWeekSearchTerm] = useState('')
  const [weekFilters, setWeekFilters] = useState<Set<'has-assignments' | 'has-objectives' | 'no-assignments' | 'has-dates' | 'no-dates'>>(new Set())

  // Bloom tagging (Task 48)
  const [loadingBloomTags, setLoadingBloomTags] = useState(false)

  // Week reorder lock (Task 49)
  const [weekReorderLocked, setWeekReorderLocked] = useState(false)

  // Print preview (Task 50)
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  // Rubric generation (Task 51)
  const [assignmentRubrics, setAssignmentRubrics] = useState<Map<string, CourseMapRubricResult>>(new Map())
  const [loadingRubricKey, setLoadingRubricKey] = useState<string | null>(null)

  // Analytics summary (Task 52)
  const [showAnalyticsSummary, setShowAnalyticsSummary] = useState(false)

  // ── Load existing map on mount ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}/course-map`, {
          headers: courseHeaders(userEmail),
        })
        if (!res.ok) throw new Error('Failed to load')
        const data = (await res.json()) as { courseMap: CourseMapResult | null; version?: number }
        if (cancelled) return
        if (typeof data.version === 'number') setCourseMapVersion(data.version)
        if (data.courseMap && data.courseMap.weeks.length > 0) {
          setWeeks(data.courseMap.weeks)
          setMetadata(data.courseMap.metadata)
          setViewState('saved')
          // Auto-expand from LTI deep link param, or current+next week for students, or first week
          const urlParams = new URLSearchParams(window.location.search)
          const expandWeekParam = urlParams.get('expandWeek')
          const expandNum = expandWeekParam ? Number(expandWeekParam) : null
          if (expandNum && data.courseMap.weeks.some((w) => w.weekNumber === expandNum)) {
            setExpandedWeeks(new Set([expandNum]))
          } else if (isStudent) {
            // Students: auto-expand current week + next week
            const now = new Date()
            const weeksToExpand: number[] = []
            const sorted = [...data.courseMap.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
            let foundCurrent = false
            for (const w of sorted) {
              if (w.startDate && w.endDate) {
                const start = new Date(w.startDate)
                const end = new Date(w.endDate)
                if (now >= start && now <= end) {
                  weeksToExpand.push(w.weekNumber)
                  foundCurrent = true
                } else if (foundCurrent && weeksToExpand.length < 2) {
                  weeksToExpand.push(w.weekNumber)
                }
              } else if (w.startDate) {
                const start = new Date(w.startDate)
                if (now >= start && now <= addDays(start, 7)) {
                  weeksToExpand.push(w.weekNumber)
                  foundCurrent = true
                } else if (foundCurrent && weeksToExpand.length < 2) {
                  weeksToExpand.push(w.weekNumber)
                }
              }
            }
            // Fallback: expand first week if no date-matched week found
            if (weeksToExpand.length === 0 && sorted.length > 0) {
              weeksToExpand.push(sorted[0].weekNumber)
            }
            setExpandedWeeks(new Set(weeksToExpand))
          } else {
            setExpandedWeeks(new Set([data.courseMap.weeks[0]?.weekNumber]))
          }
        } else {
          setViewState('empty')
        }
      } catch {
        if (!cancelled) setViewState('empty')
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, userEmail, isStudent])

  // Fetch student progress on mount (Task 28)
  useEffect(() => {
    if (!isStudent) return
    fetch(`/api/courses/${courseId}/course-map/student-progress`, {
      headers: courseHeaders(userEmail),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.progress) setStudentProgress(data.progress) })
      .catch(() => {})
  }, [courseId, userEmail, isStudent])

  // ── File handling ────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfFiles = Array.from(incoming).filter((f) => f.type === 'application/pdf')
    setFiles((prev) => {
      const combined = [...prev, ...pdfFiles]
      return combined.slice(0, 5) // max 5
    })
  }, [])

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Generate ─────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (files.length === 0) return

    // Snapshot existing weeks for diff if we have saved data
    const hadExistingMap = weeks.length > 0 && viewState !== 'empty'
    if (hadExistingMap) {
      setPreviousWeeks([...weeks])
    } else {
      setPreviousWeeks(null)
    }

    setViewState('generating')
    setError(null)
    setConfirmResult(null)

    const formData = new FormData()
    for (const file of files) formData.append('files', file)

    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/generate`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
        body: formData,
      })
      const data = (await res.json()) as { courseMap?: CourseMapResult; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      if (!data.courseMap) throw new Error('No course map returned')

      setWeeks(data.courseMap.weeks)
      setMetadata(data.courseMap.metadata)

      if (hadExistingMap) {
        // Show diff view
        setViewState('diff')
      } else {
        setEditing(true)
        setViewState('preview')
        setExpandedWeeks(new Set(data.courseMap.weeks.map((w) => w.weekNumber)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      // Restore previous state
      if (hadExistingMap && previousWeeks) {
        setWeeks(previousWeeks)
        setPreviousWeeks(null)
        setViewState('saved')
      } else {
        setViewState('empty')
      }
    }
  }

  // ── Confirm ──────────────────────────────────────────────────────────────

  async function handleConfirm() {
    setConfirming(true)
    setError(null)

    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/confirm`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ weeks, expectedVersion: courseMapVersion }),
      })
      const data = (await res.json()) as { result?: ConfirmResult; error?: string; conflict?: boolean }

      if (data.conflict) {
        const reload = window.confirm(
          'Another user has modified this course map since you started editing.\n\n' +
          'Click OK to reload the latest version, or Cancel to force-overwrite with your changes.'
        )
        if (reload) {
          const mapRes = await fetch(`/api/courses/${courseId}/course-map`, { headers: courseHeaders(userEmail) })
          if (mapRes.ok) {
            const mapData = (await mapRes.json()) as { courseMap: CourseMapResult | null; version?: number }
            if (typeof mapData.version === 'number') setCourseMapVersion(mapData.version)
            if (mapData.courseMap && mapData.courseMap.weeks.length > 0) {
              setWeeks(mapData.courseMap.weeks)
              setMetadata(mapData.courseMap.metadata)
              setViewState('saved')
              setEditing(false)
            }
          }
        } else {
          const forceRes = await fetch(`/api/courses/${courseId}/course-map/confirm`, {
            method: 'POST',
            headers: courseHeaders(userEmail, true),
            body: JSON.stringify({ weeks }),
          })
          const forceData = (await forceRes.json()) as { result?: ConfirmResult; error?: string }
          if (!forceRes.ok) throw new Error(forceData.error ?? 'Force confirmation failed')
          setConfirmResult(forceData.result ?? null)
          setEditing(false)
          setViewState('saved')
          setFiles([])
          setPreviousWeeks(null)
          onCourseMapConfirmed?.()
        }
        return
      }

      if (!res.ok) throw new Error(data.error ?? 'Confirmation failed')
      if (!data.result) throw new Error('No result returned')

      setCourseMapVersion((v) => v + 1)
      setConfirmResult(data.result)
      setEditing(false)
      setViewState('saved')
      setFiles([])
      setPreviousWeeks(null)
      onCourseMapConfirmed?.()

      if (notifyStudents) {
        handleNotifyStudents()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed')
    } finally {
      setConfirming(false)
    }
  }

  function handleDiffCancel() {
    if (previousWeeks) {
      setWeeks(previousWeeks)
      setPreviousWeeks(null)
    }
    setViewState('saved')
  }

  // ── Week editing helpers ─────────────────────────────────────────────────

  function toggleWeek(weekNumber: number) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekNumber)) next.delete(weekNumber)
      else next.add(weekNumber)
      return next
    })
  }

  function moveWeek(index: number, direction: 'up' | 'down') {
    if (weekReorderLocked) return
    setWeeks((prev) => {
      const next = [...prev]
      const swapIdx = direction === 'up' ? index - 1 : index + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[index], next[swapIdx]] = [next[swapIdx], next[index]]
      return next.map((w, i) => ({ ...w, weekNumber: i + 1 }))
    })
  }

  function cloneWeek(weekIdx: number) {
    if (weekReorderLocked) return
    setWeeks((prev) => {
      const source = prev[weekIdx]
      if (!source) return prev
      const cloned: CourseMapWeek = {
        weekNumber: source.weekNumber + 1,
        title: `${source.title} (Copy)`,
        topic: source.topic,
        startDate: null,
        endDate: null,
        objectives: source.objectives.map((o) => ({ ...o })),
        materials: source.materials.map((m) => ({ ...m })),
        assignments: source.assignments.map((a) => ({ ...a, dueDate: null })),
        toolSuggestions: source.toolSuggestions.map((t) => ({ ...t })),
      }
      const next = [...prev]
      next.splice(weekIdx + 1, 0, cloned)
      const renumbered = next.map((w, i) => ({ ...w, weekNumber: i + 1 }))
      setExpandedWeeks((ex) => new Set([...ex, weekIdx + 2]))
      return renumbered
    })
  }

  async function handleSuggestAssignments(weekNumber: number) {
    setLoadingAssignmentSugWeek(weekNumber)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/suggest-assignments`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ weekNumber }),
      })
      if (!res.ok) throw new Error('Failed to suggest assignments')
      const data = (await res.json()) as { suggestions: AssignmentSuggestion[] }
      setWeekAssignmentSuggestions((prev) => new Map(prev).set(weekNumber, data.suggestions))
    } catch (err) {
      console.error('Suggest assignments error:', err)
    } finally {
      setLoadingAssignmentSugWeek(null)
    }
  }

  function addSuggestedAssignment(weekIdx: number, weekNumber: number, suggestion: AssignmentSuggestion) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx
          ? {
              ...w,
              assignments: [
                ...w.assignments,
                {
                  title: suggestion.title,
                  type: suggestion.type as CourseMapAssignment['type'],
                  description: suggestion.description,
                  dueDate: null,
                  pointsPossible: suggestion.pointsPossible,
                },
              ],
            }
          : w
      )
    )
    setWeekAssignmentSuggestions((prev) => {
      const next = new Map(prev)
      const remaining = (next.get(weekNumber) ?? []).filter((s) => s.title !== suggestion.title)
      if (remaining.length === 0) next.delete(weekNumber)
      else next.set(weekNumber, remaining)
      return next
    })
  }

  function dismissAssignmentSuggestion(weekNumber: number, title: string) {
    setWeekAssignmentSuggestions((prev) => {
      const next = new Map(prev)
      const remaining = (next.get(weekNumber) ?? []).filter((s) => s.title !== title)
      if (remaining.length === 0) next.delete(weekNumber)
      else next.set(weekNumber, remaining)
      return next
    })
  }

  // ── Bloom tagging helpers (Task 48) ──────────────────────────────────────

  async function handleAutoTagBloom() {
    setLoadingBloomTags(true)
    try {
      const payload = weeks.map((w) => ({
        weekNumber: w.weekNumber,
        objectives: w.objectives.map((o) => ({ title: o.title })),
      }))
      const res = await fetch(`/api/courses/${courseId}/course-map/bloom-tag`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ weeks: payload }),
      })
      if (!res.ok) throw new Error('Failed to tag objectives')
      const data = (await res.json()) as { tags: BloomTagResult[] }
      setWeeks((prev) =>
        prev.map((w) => ({
          ...w,
          objectives: w.objectives.map((o, oIdx) => {
            const tag = data.tags.find(
              (t) => t.weekNumber === w.weekNumber && t.objectiveIndex === oIdx
            )
            return tag ? { ...o, bloomLevel: tag.bloomLevel } : o
          }),
        }))
      )
    } catch (err) {
      console.error('Bloom tagging error:', err)
    } finally {
      setLoadingBloomTags(false)
    }
  }

  // ── Rubric generation handler (Task 51) ──────────────────────────────────
  async function handleGenerateRubric(weekNumber: number, assignmentIndex: number) {
    const rubricKey = `${weekNumber}-${assignmentIndex}`
    setLoadingRubricKey(rubricKey)
    try {
      const payload = weeks.map((w) => ({
        weekNumber: w.weekNumber,
        objectives: w.objectives.map((o) => ({ title: o.title })),
        assignments: w.assignments.map((a) => ({
          title: a.title,
          type: a.type,
          description: a.description,
          pointsPossible: a.pointsPossible,
        })),
      }))
      const res = await fetch(`/api/courses/${courseId}/course-map/generate-rubric`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ weekNumber, assignmentIndex, weeks: payload }),
      })
      if (!res.ok) throw new Error('Failed to generate rubric')
      const result = (await res.json()) as CourseMapRubricResult
      setAssignmentRubrics((prev) => {
        const next = new Map(prev)
        next.set(rubricKey, result)
        return next
      })
    } catch (err) {
      console.error('Rubric generation error:', err)
    } finally {
      setLoadingRubricKey(null)
    }
  }

  function dismissRubric(weekNumber: number, assignmentIndex: number) {
    const rubricKey = `${weekNumber}-${assignmentIndex}`
    setAssignmentRubrics((prev) => {
      const next = new Map(prev)
      next.delete(rubricKey)
      return next
    })
  }

  function updateObjectiveBloom(weekIdx: number, objIdx: number, bloomLevel: BloomLevel | null) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx
          ? {
              ...w,
              objectives: w.objectives.map((o, j) =>
                j === objIdx ? { ...o, bloomLevel } : o
              ),
            }
          : w
      )
    )
  }

  function updateWeekField(weekIdx: number, field: keyof CourseMapWeek, value: string | null) {
    setWeeks((prev) =>
      prev.map((w, i) => (i === weekIdx ? { ...w, [field]: value } : w))
    )
  }

  function removeObjective(weekIdx: number, objIdx: number) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx
          ? { ...w, objectives: w.objectives.filter((_, j) => j !== objIdx) }
          : w
      )
    )
  }

  function addObjective(weekIdx: number) {
    const newObj: CourseMapObjective = { title: 'New objective', description: null, sourceDocument: '' }
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx ? { ...w, objectives: [...w.objectives, newObj] } : w
      )
    )
  }

  function updateObjectiveTitle(weekIdx: number, objIdx: number, title: string) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx
          ? {
              ...w,
              objectives: w.objectives.map((o, j) =>
                j === objIdx ? { ...o, title } : o
              ),
            }
          : w
      )
    )
  }

  function removeMaterial(weekIdx: number, matIdx: number) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx
          ? { ...w, materials: w.materials.filter((_, j) => j !== matIdx) }
          : w
      )
    )
  }

  function addMaterial(weekIdx: number) {
    const newMat: CourseMapMaterial = { title: 'New material', materialType: 'lecture', content: '', sourceDocument: '' }
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx ? { ...w, materials: [...w.materials, newMat] } : w
      )
    )
  }

  function removeAssignment(weekIdx: number, aIdx: number) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx
          ? { ...w, assignments: w.assignments.filter((_, j) => j !== aIdx) }
          : w
      )
    )
  }

  function addAssignment(weekIdx: number) {
    const newA: CourseMapAssignment = {
      title: 'New assignment',
      type: 'TEXT_SUBMISSION',
      description: null,
      dueDate: null,
      pointsPossible: 100,
    }
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx ? { ...w, assignments: [...w.assignments, newA] } : w
      )
    )
  }

  function updateAssignment(weekIdx: number, aIdx: number, updates: Partial<CourseMapAssignment>) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIdx
          ? {
              ...w,
              assignments: w.assignments.map((a, j) =>
                j === aIdx ? { ...a, ...updates } : a
              ),
            }
          : w
      )
    )
  }

  // ── Snapshot / History helpers ───────────────────────────────────────────

  async function loadSnapshots() {
    setLoadingSnapshots(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as { snapshots: SnapshotSummary[] }
      setSnapshots(data.snapshots ?? [])
    } catch {
      setSnapshots([])
    } finally {
      setLoadingSnapshots(false)
    }
  }

  async function handleRestore(snapshotId: string) {
    setRestoringSnapshotId(snapshotId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots/${snapshotId}/restore`, {
        method: 'POST',
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Restore failed')
      const mapRes = await fetch(`/api/courses/${courseId}/course-map`, {
        headers: courseHeaders(userEmail),
      })
      if (mapRes.ok) {
        const data = (await mapRes.json()) as { courseMap: CourseMapResult | null }
        if (data.courseMap && data.courseMap.weeks.length > 0) {
          setWeeks(data.courseMap.weeks)
          setMetadata(data.courseMap.metadata)
          setViewState('saved')
          setShowHistory(false)
          onCourseMapConfirmed?.()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setRestoringSnapshotId(null)
    }
  }

  // ── AI suggestions helpers ─────────────────────────────────────────────

  async function handleGetSuggestions() {
    setLoadingSuggestions(true)
    setSuggestions([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/suggest`, {
        method: 'POST',
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Failed to get suggestions')
      const data = (await res.json()) as { suggestions: RebalanceSuggestion[] }
      setSuggestions(data.suggestions ?? [])
      setShowSuggestions(true)
    } catch {
      setError('Failed to get AI suggestions. Please try again.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // ── Canvas push helper ─────────────────────────────────────────────────

  async function handlePushToCanvas() {
    setPushingToCanvas(true)
    setCanvasPushResult(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/push-to-canvas`, {
        method: 'POST',
        headers: courseHeaders(userEmail),
      })
      const data = (await res.json()) as { result?: { modulesCreated: number; itemsCreated: number }; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Push failed')
      setCanvasPushResult(`Pushed ${data.result?.modulesCreated ?? 0} modules and ${data.result?.itemsCreated ?? 0} items to Canvas`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push to Canvas')
    } finally {
      setPushingToCanvas(false)
    }
  }

  // ── Share helpers ─────────────────────────────────────────────────────

  async function handleGenerateShare() {
    setGeneratingShare(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'POST',
        headers: courseHeaders(userEmail),
      })
      const data = (await res.json()) as { shareUrl?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate share link')
      setShareUrl(data.shareUrl ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link')
    } finally {
      setGeneratingShare(false)
    }
  }

  async function handleRevokeShare() {
    try {
      await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'DELETE',
        headers: courseHeaders(userEmail),
      })
      setShareUrl(null)
      setShowSharePanel(false)
    } catch {
      setError('Failed to revoke share link')
    }
  }

  function handleCopyShareUrl() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
    }
  }

  // ── Clone helpers ─────────────────────────────────────────────────────

  async function loadCloneableCourses() {
    setLoadingCloneable(true)
    try {
      const res = await fetch('/api/courses', { headers: courseHeaders(userEmail) })
      if (!res.ok) throw new Error('Failed to load courses')
      const courses = (await res.json()) as { id: string; courseCode: string; title: string }[]
      const withWeeks: { id: string; courseCode: string; title: string }[] = []
      for (const c of courses) {
        if (c.id === courseId) continue
        const mapRes = await fetch(`/api/courses/${c.id}/course-map`, { headers: courseHeaders(userEmail) })
        if (mapRes.ok) {
          const mapData = (await mapRes.json()) as { courseMap: { weeks: unknown[] } | null }
          if (mapData.courseMap && mapData.courseMap.weeks.length > 0) {
            withWeeks.push(c)
          }
        }
      }
      setCloneableCourses(withWeeks)
    } catch {
      setCloneableCourses([])
    } finally {
      setLoadingCloneable(false)
    }
  }

  async function handleClone(sourceCourseId: string) {
    setCloningFromId(sourceCourseId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/duplicate`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ sourceCourseId }),
      })
      const data = (await res.json()) as { result?: ConfirmResult; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Clone failed')

      const mapRes = await fetch(`/api/courses/${courseId}/course-map`, {
        headers: courseHeaders(userEmail),
      })
      if (mapRes.ok) {
        const mapData = (await mapRes.json()) as { courseMap: CourseMapResult | null }
        if (mapData.courseMap && mapData.courseMap.weeks.length > 0) {
          setWeeks(mapData.courseMap.weeks)
          setMetadata(mapData.courseMap.metadata)
          setViewState('saved')
          setShowClonePanel(false)
          setConfirmResult(data.result ?? null)
          onCourseMapConfirmed?.()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clone failed')
    } finally {
      setCloningFromId(null)
    }
  }

  // ── Recent Changes helpers ────────────────────────────────────────────

  async function loadRecentEdits() {
    setLoadingEdits(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/edits`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Failed to load edits')
      const data = (await res.json()) as { edits: CourseMapEditEntry[]; version: number }
      setRecentEdits(data.edits ?? [])
      if (typeof data.version === 'number') setCourseMapVersion(data.version)
    } catch {
      setRecentEdits([])
    } finally {
      setLoadingEdits(false)
    }
  }

  // ── Compare helpers ──────────────────────────────────────────────────

  async function handleCompareWithCourse(otherCourseId: string) {
    setLoadingCompare(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/course-map/compare?compareTo=${otherCourseId}`,
        { headers: courseHeaders(userEmail) },
      )
      if (!res.ok) throw new Error('Compare failed')
      const data = (await res.json()) as { comparison: CourseMapComparison }
      setComparison(data.comparison)
      setShowCompare(true)
      setShowComparePicker(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compare failed')
    } finally {
      setLoadingCompare(false)
    }
  }

  async function handleCompareWithSnapshot(snapshotId: string) {
    setLoadingCompare(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/course-map/compare?snapshotId=${snapshotId}`,
        { headers: courseHeaders(userEmail) },
      )
      if (!res.ok) throw new Error('Compare failed')
      const data = (await res.json()) as { comparison: CourseMapComparison }
      setComparison(data.comparison)
      setShowCompare(true)
      setShowComparePicker(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compare failed')
    } finally {
      setLoadingCompare(false)
    }
  }

  // ── Canvas import helpers ────────────────────────────────────────────

  async function handleImportFromCanvas() {
    setImportingFromCanvas(true)
    setError(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/import-from-canvas`, {
        method: 'POST',
        headers: courseHeaders(userEmail),
      })
      const data = (await res.json()) as { courseMap?: CourseMapResult; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      if (!data.courseMap) throw new Error('No course map returned')

      setWeeks(data.courseMap.weeks)
      setMetadata(data.courseMap.metadata)
      setEditing(true)
      setViewState('preview')
      setExpandedWeeks(new Set(data.courseMap.weeks.map((w) => w.weekNumber)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from Canvas')
      setViewState('empty')
    } finally {
      setImportingFromCanvas(false)
    }
  }

  // ── AI teaching tips helpers (Task 24) ──────────────────────────────────

  async function handleGetTips(weekNumber: number) {
    if (weekTips.has(weekNumber)) return
    setLoadingTipsWeek(weekNumber)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/insights`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ weekNumber }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as { tips: string[]; weekNumber: number }
      setWeekTips((prev) => {
        const next = new Map(prev)
        next.set(weekNumber, data.tips)
        return next
      })
    } catch {
      setError('Failed to generate teaching tips. Please try again.')
    } finally {
      setLoadingTipsWeek(null)
    }
  }

  // ── Bulk edit helpers (Task 25) ──────────────────────────────────────────

  function toggleBulkWeek(weekNumber: number) {
    setSelectedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekNumber)) next.delete(weekNumber)
      else next.add(weekNumber)
      return next
    })
  }

  function handleBulkShiftDates() {
    if (bulkShiftDays === 0 || selectedWeeks.size === 0) return
    setWeeks((prev) =>
      prev.map((w) => {
        if (!selectedWeeks.has(w.weekNumber)) return w
        return {
          ...w,
          startDate: w.startDate ? addDays(new Date(w.startDate), bulkShiftDays).toISOString().slice(0, 10) : null,
          endDate: w.endDate ? addDays(new Date(w.endDate), bulkShiftDays).toISOString().slice(0, 10) : null,
        }
      })
    )
    setSelectedWeeks(new Set())
    setBulkShiftDays(0)
  }

  function handleBulkDelete() {
    setWeeks((prev) => {
      const filtered = prev.filter((w) => !selectedWeeks.has(w.weekNumber))
      return filtered.map((w, i) => ({ ...w, weekNumber: i + 1 }))
    })
    setSelectedWeeks(new Set())
    setShowBulkDeleteConfirm(false)
  }

  function handleBulkMoveMaterials() {
    if (bulkTargetWeek === null || selectedWeeks.size === 0) return
    setWeeks((prev) => {
      const movedMaterials: CourseMapMaterial[] = []
      const updated = prev.map((w) => {
        if (selectedWeeks.has(w.weekNumber)) {
          movedMaterials.push(...w.materials)
          return { ...w, materials: [] }
        }
        return w
      })
      return updated.map((w) => {
        if (w.weekNumber === bulkTargetWeek) {
          return { ...w, materials: [...w.materials, ...movedMaterials] }
        }
        return w
      })
    })
    setSelectedWeeks(new Set())
    setBulkTargetWeek(null)
  }

  // ── Share analytics helpers (Task 26) ──────────────────────────────────

  async function loadShareAnalytics() {
    setLoadingShareAnalytics(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share-analytics`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as ShareAnalytics
      setShareAnalytics(data)
    } catch {
      setShareAnalytics(null)
    } finally {
      setLoadingShareAnalytics(false)
    }
  }

  // ── Prerequisites helpers (Task 27) ──────────────────────────────────────

  async function loadPrerequisites() {
    setLoadingPrereqs(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/prerequisites`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as { graph: PrerequisiteGraph }
      setPrerequisiteGraph(data.graph ?? [])
    } catch {
      setPrerequisiteGraph([])
    } finally {
      setLoadingPrereqs(false)
    }
  }

  async function handlePrerequisiteChange(weekId: string, prerequisiteWeekId: string, action: 'add' | 'remove') {
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/prerequisites`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ weekId, prerequisiteWeekId, action }),
      })
      const data = (await res.json()) as { graph?: PrerequisiteGraph; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to update prerequisite')
        return
      }
      if (data.graph) setPrerequisiteGraph(data.graph)
    } catch {
      setError('Failed to update prerequisite')
    }
  }

  // ── Notify helpers (Task 29) ────────────────────────────────────────────

  async function handleNotifyStudents() {
    setSendingNotify(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/notify`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({}),
      })
      const data = (await res.json()) as { notified?: number }
      if (res.ok) setNotifyResult(data.notified ?? 0)
    } catch { /* silent */ } finally {
      setSendingNotify(false)
    }
  }

  // ── Gap analysis helpers (Task 30) ────────────────────────────────────

  async function handleGapAnalysis() {
    setLoadingGapAnalysis(true)
    setShowGapAnalysis(true)
    setShowHistory(false)
    setShowSuggestions(false)
    setShowSharePanel(false)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/gap-analysis`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as GapAnalysisResult
      setGapAnalysis(data)
    } catch {
      setError('Failed to run gap analysis')
      setShowGapAnalysis(false)
    } finally {
      setLoadingGapAnalysis(false)
    }
  }

  // ── Comments helpers (Task 31) ──────────────────────────────────────

  async function loadComments() {
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) return
      const data = (await res.json()) as { comments: CourseMapCommentEntry[] }
      setComments(data.comments ?? [])
    } catch { /* silent */ }
  }

  async function handlePostComment(_weekNumber: number) {
    if (!newCommentText.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ content: newCommentText.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as { comment: CourseMapCommentEntry }
      setComments((prev) => [...prev, data.comment])
      setNewCommentText('')
    } catch {
      setError('Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  async function handleResolveComment(commentId: string) {
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/comments/${commentId}`, {
        method: 'PATCH',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ action: 'resolve' }),
      })
      if (!res.ok) throw new Error('Failed')
      await loadComments()
    } catch {
      setError('Failed to resolve comment')
    }
  }

  // ── Deep link helpers (Task 32) ─────────────────────────────────────

  async function handleCopyDeepLink(weekNumber: number) {
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/deep-link?weekNumber=${weekNumber}`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as { url: string }
      await navigator.clipboard.writeText(`${window.location.origin}${data.url}`)
      setCopiedDeepLinkWeek(weekNumber)
      setTimeout(() => setCopiedDeepLinkWeek(null), 2000)
    } catch {
      setError('Failed to generate deep link')
    }
  }

  // ── Load comments on mount (if saved) ──────────────────────────────

  useEffect(() => {
    if (viewState === 'saved' && !isStudent) {
      loadComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState])

  // ── Load notes on mount (if saved, non-student) ──────────────────────

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/notes`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.notes) {
        setNotes(data.notes)
        const map = new Map<number, string>()
        for (const n of data.notes as CourseMapNoteEntry[]) {
          map.set(n.weekNumber, n.text)
        }
        setNoteTexts(map)
      }
    } catch {}
  }, [courseId, userEmail])

  useEffect(() => {
    if (viewState === 'saved' && !isStudent) {
      loadNotes()
    }
  }, [viewState, isStudent, loadNotes])

  const saveNote = useCallback(async (weekNumber: number, text: string) => {
    try {
      await fetch(`/api/courses/${courseId}/course-map/notes`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ weekNumber, text }),
      })
    } catch {}
  }, [courseId, userEmail])

  const handleNoteChange = useCallback((weekNumber: number, text: string) => {
    setNoteTexts((prev) => {
      const next = new Map(prev)
      next.set(weekNumber, text)
      return next
    })
    const existing = noteDebounceRef.current.get(weekNumber)
    if (existing) clearTimeout(existing)
    noteDebounceRef.current.set(
      weekNumber,
      setTimeout(() => {
        saveNote(weekNumber, text)
        noteDebounceRef.current.delete(weekNumber)
      }, 500),
    )
  }, [saveNote])

  const handleNoteBlur = useCallback((weekNumber: number) => {
    const existing = noteDebounceRef.current.get(weekNumber)
    if (existing) {
      clearTimeout(existing)
      noteDebounceRef.current.delete(weekNumber)
    }
    const text = noteTexts.get(weekNumber) ?? ''
    saveNote(weekNumber, text)
  }, [noteTexts, saveNote])

  // ── Workload metrics (Task 33) ──────────────────────────────────────────

  const loadWorkloadMetrics = useCallback(async () => {
    setLoadingWorkload(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/workload`, {
        headers: courseHeaders(userEmail),
      })
      if (!res.ok) return
      const data = await res.json() as WorkloadMetrics
      setWorkloadMetrics(data)
    } catch {} finally {
      setLoadingWorkload(false)
    }
  }, [courseId, userEmail])

  // ── Add week from template (Task 34) ──────────────────────────────────

  const addWeekFromTemplate = useCallback((template: typeof WEEK_TEMPLATES[number]) => {
    const maxWeekNum = weeks.length > 0 ? Math.max(...weeks.map((w) => w.weekNumber)) : 0
    const newWeek: CourseMapWeek = {
      weekNumber: maxWeekNum + 1,
      title: template.name,
      topic: template.description,
      startDate: null,
      endDate: null,
      objectives: template.objectives,
      materials: template.materials,
      assignments: template.assignments,
      toolSuggestions: template.toolSuggestions,
    }
    setWeeks((prev) => [...prev, newWeek])
    setExpandedWeeks((prev) => new Set([...prev, newWeek.weekNumber]))
    setShowWeekTemplateMenu(false)
  }, [weeks])

  // ── Scroll to week helper ──────────────────────────────────────────────

  function scrollToWeek(weekNumber: number) {
    setExpandedWeeks((prev) => new Set([...prev, weekNumber]))
    const el = document.getElementById(`course-map-week-${weekNumber}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Toolbar handler wrappers ───────────────────────────────────────────

  function handleToolbarEdit() {
    setEditing(true)
    if (prerequisiteGraph.length === 0) loadPrerequisites()
  }

  function handleToolbarBulkToggle() {
    const entering = !bulkSelectMode
    setBulkSelectMode(entering)
    if (entering) {
      setEditing(true)
      setSelectedWeeks(new Set())
    }
  }

  function handleToolbarToggleHistory() {
    setShowHistory((p) => !p)
    setShowSuggestions(false)
    if (!showHistory) loadSnapshots()
  }

  function handleToolbarGetSuggestions() {
    if (loadingSuggestions) return
    setShowHistory(false)
    handleGetSuggestions()
  }

  function handleToolbarToggleSharePanel() {
    setShowSharePanel((p) => !p)
    setShowHistory(false)
    setShowSuggestions(false)
    if (!showSharePanel && !shareUrl) handleGenerateShare()
    if (!showSharePanel) loadShareAnalytics()
  }

  function handleToolbarToggleGapAnalysis() {
    if (showGapAnalysis) {
      setShowGapAnalysis(false)
    } else {
      handleGapAnalysis()
    }
  }

  async function handleToolbarToggleAlignment() {
    if (showAlignmentPanel) {
      setShowAlignmentPanel(false)
      return
    }
    setLoadingAlignment(true)
    setShowAlignmentPanel(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/alignment-check`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as { alignmentIssues: AlignmentIssue[] }
      setAlignmentIssues(data.alignmentIssues)
    } catch {
      setAlignmentIssues([])
    } finally {
      setLoadingAlignment(false)
    }
  }

  function handleToolbarTogglePacing() {
    const next = !showPacing
    setShowPacing(next)
    if (next && !workloadMetrics) loadWorkloadMetrics()
  }

  function handleToolbarToggleRecentChanges() {
    setShowRecentChanges((p) => !p)
    setShowHistory(false)
    setShowSuggestions(false)
    setShowSharePanel(false)
    setShowComparePicker(false)
    if (!showRecentChanges) loadRecentEdits()
  }

  function handleToolbarToggleComparePicker() {
    setShowComparePicker((p) => !p)
    setShowHistory(false)
    setShowSuggestions(false)
    setShowSharePanel(false)
    setShowRecentChanges(false)
    if (!showComparePicker) {
      loadCloneableCourses()
      loadSnapshots()
    }
  }

  function handleToolbarTogglePrerequisites() {
    setShowPrerequisites((p) => !p)
    setShowHistory(false)
    setShowSuggestions(false)
    setShowSharePanel(false)
    setShowRecentChanges(false)
    setShowComparePicker(false)
    if (!showPrerequisites) loadPrerequisites()
  }

  function handleToolbarRegenerate() {
    setViewState('empty')
    setEditing(false)
    setWeeks([])
    setMetadata(null)
    setConfirmResult(null)
  }

  // ── Template selection handler for EmptyStateView ──────────────────────

  function handleSelectTemplate(templateWeeks: CourseMapWeek[], templateMetadata: CourseMapResult['metadata']) {
    setWeeks(templateWeeks)
    setMetadata(templateMetadata)
    setEditing(true)
    setViewState('preview')
    setExpandedWeeks(new Set(templateWeeks.map((w) => w.weekNumber)))
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (viewState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Compare view takes over the whole component
  if (showCompare && comparison) {
    return (
      <div className="space-y-6 px-6 py-6">
        <CourseMapCompareView
          comparison={comparison}
          onClose={() => { setShowCompare(false); setComparison(null) }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-6 py-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Success banner */}
      {confirmResult && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="size-5 shrink-0" />
          <span>
            Course map saved: {confirmResult.weeksCreated} weeks, {confirmResult.materialsCreated} materials,{' '}
            {confirmResult.objectivesCreated} objectives, {confirmResult.assignmentsCreated} assignments created.
            A teaching assistant is being generated in the background.
          </span>
          <button type="button" onClick={() => setConfirmResult(null)} className="ml-auto">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── State: Diff View ──────────────────────────────────────────────────── */}
      {viewState === 'diff' && previousWeeks && (
        <CourseMapDiffView
          oldWeeks={previousWeeks}
          newWeeks={weeks}
          onConfirm={handleConfirm}
          onCancel={handleDiffCancel}
          confirming={confirming}
        />
      )}

      {/* ── State 1: Empty / Upload ─────────────────────────────────────────── */}
      {(viewState === 'empty' || viewState === 'generating') && isStudent && (
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <Calendar className="mx-auto mb-3 size-10 text-gray-300" />
          <h3 className="text-lg font-extrabold text-gray-700">No weekly schedule yet</h3>
          <p className="mt-1 text-sm text-gray-500">Your professor hasn&apos;t set up the weekly schedule for this course. Check the Assignments tab for due dates.</p>
          {onSwitchTab && (
            <button
              type="button"
              onClick={() => onSwitchTab('assignments')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880]"
            >
              <ClipboardList className="size-4" />
              View Assignments
            </button>
          )}
        </div>
      )}
      {(viewState === 'empty' || viewState === 'generating') && !isStudent && (
        <EmptyStateView
          viewState={viewState}
          files={files}
          dragOver={dragOver}
          canvasCourseId={canvasCourseId}
          importingFromCanvas={importingFromCanvas}
          showClonePanel={showClonePanel}
          loadingCloneable={loadingCloneable}
          cloneableCourses={cloneableCourses}
          cloningFromId={cloningFromId}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          onSetDragOver={setDragOver}
          onGenerate={handleGenerate}
          onImportFromCanvas={handleImportFromCanvas}
          onShowClonePanel={setShowClonePanel}
          onLoadCloneableCourses={loadCloneableCourses}
          onClone={handleClone}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {/* ── State 2/3: Preview or Saved ─────────────────────────────────────── */}
      {(viewState === 'preview' || viewState === 'saved') && (
        <div className="space-y-4">
          {/* Header toolbar */}
          <CourseMapToolbar
            viewState={viewState}
            editing={editing}
            isStudent={isStudent}
            weeks={weeks}
            confirming={confirming}
            courseId={courseId}
            courseCode={courseCode}
            metadata={metadata}
            assignmentRubrics={assignmentRubrics}
            hasCanvasId={hasCanvasId}
            bulkSelectMode={bulkSelectMode}
            showExportMenu={showExportMenu}
            loadingBloomTags={loadingBloomTags}
            weekReorderLocked={weekReorderLocked}
            showPrintPreview={showPrintPreview}
            showAnalyticsSummary={showAnalyticsSummary}
            showHistory={showHistory}
            loadingSuggestions={loadingSuggestions}
            showSharePanel={showSharePanel}
            generatingShare={generatingShare}
            pushingToCanvas={pushingToCanvas}
            showGapAnalysis={showGapAnalysis}
            loadingGapAnalysis={loadingGapAnalysis}
            showAlignmentPanel={showAlignmentPanel}
            loadingAlignment={loadingAlignment}
            showPacing={showPacing}
            loadingWorkload={loadingWorkload}
            showRecentChanges={showRecentChanges}
            showComparePicker={showComparePicker}
            showPrerequisites={showPrerequisites}
            showDateFill={showDateFill}
            onEdit={handleToolbarEdit}
            onBulkToggle={handleToolbarBulkToggle}
            onSetShowExportMenu={setShowExportMenu}
            onAutoTagBloom={handleAutoTagBloom}
            onSetWeekReorderLocked={setWeekReorderLocked}
            onSetShowPrintPreview={setShowPrintPreview}
            onSetShowAnalyticsSummary={setShowAnalyticsSummary}
            onToggleHistory={handleToolbarToggleHistory}
            onGetSuggestions={handleToolbarGetSuggestions}
            onToggleSharePanel={handleToolbarToggleSharePanel}
            onPushToCanvas={handlePushToCanvas}
            onToggleGapAnalysis={handleToolbarToggleGapAnalysis}
            onToggleAlignment={handleToolbarToggleAlignment}
            onTogglePacing={handleToolbarTogglePacing}
            onToggleRecentChanges={handleToolbarToggleRecentChanges}
            onToggleComparePicker={handleToolbarToggleComparePicker}
            onTogglePrerequisites={handleToolbarTogglePrerequisites}
            onSetShowDateFill={setShowDateFill}
            onRegenerate={handleToolbarRegenerate}
            onConfirm={handleConfirm}
          />

          {/* Metadata summary */}
          {metadata && (
            <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{metadata.totalWeeks}</span> weeks
              </span>
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{metadata.totalObjectives}</span> {isStudent ? 'topics' : 'objectives'}
              </span>
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{metadata.totalAssignments}</span> assignments
              </span>
              {!isStudent && metadata.documentsProcessed > 0 && (
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{metadata.documentsProcessed}</span> documents processed
                </span>
              )}
            </div>
          )}

          {/* Student progress bar (Task 28) — studied/not-studied model */}
          {isStudent && viewState === 'saved' && studentProgress && studentProgress.length > 0 && (() => {
            const totalObj = studentProgress.reduce((s, w) => s + w.objectives.length, 0)
            const studiedObj = studentProgress.reduce((s, w) => s + w.objectives.filter((o) => o.masteryLevel === 'mastered' || o.masteryLevel === 'struggling').length, 0)
            const pct = totalObj > 0 ? Math.round((studiedObj / totalObj) * 100) : 0
            return (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Your Progress</span>
                  <span className="text-sm font-extrabold text-emerald-700">{pct}% studied</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-emerald-600">{studiedObj} of {totalObj} topics studied</p>
              </div>
            )
          })()}

          {/* Analytics strip (saved state only, educators) */}
          {viewState === 'saved' && !editing && !isStudent && (
            <CourseMapAnalytics courseId={courseId} userEmail={userEmail} />
          )}

          {/* Side panels — extracted components */}
          <GapAnalysisPanel
            showGapAnalysis={showGapAnalysis && viewState === 'saved' && !editing}
            loadingGapAnalysis={loadingGapAnalysis}
            gapAnalysis={gapAnalysis}
            onClose={() => setShowGapAnalysis(false)}
          />

          <HistoryPanel
            showHistory={showHistory && viewState === 'saved' && !editing}
            loadingSnapshots={loadingSnapshots}
            snapshots={snapshots}
            restoringSnapshotId={restoringSnapshotId}
            onClose={() => setShowHistory(false)}
            onRestore={handleRestore}
          />

          <AlignmentPanel
            showAlignmentPanel={showAlignmentPanel}
            loadingAlignment={loadingAlignment}
            alignmentIssues={alignmentIssues}
            onClose={() => { setShowAlignmentPanel(false); setAlignmentIssues(null) }}
            onScrollToWeek={scrollToWeek}
          />

          <DateFillPanel
            showDateFill={showDateFill}
            editing={editing}
            viewState={viewState}
            weeks={weeks}
            onClose={() => setShowDateFill(false)}
            onApply={(updatedWeeks) => setWeeks(updatedWeeks)}
          />

          <SuggestionsPanel
            showSuggestions={showSuggestions && viewState === 'saved' && !editing}
            suggestions={suggestions}
            onClose={() => { setShowSuggestions(false); setSuggestions([]) }}
          />

          <SharePanel
            showSharePanel={showSharePanel && viewState === 'saved' && !editing}
            generatingShare={generatingShare}
            shareUrl={shareUrl}
            copiedShare={copiedShare}
            loadingShareAnalytics={loadingShareAnalytics}
            shareAnalytics={shareAnalytics}
            onClose={() => setShowSharePanel(false)}
            onCopyUrl={handleCopyShareUrl}
            onRevokeShare={handleRevokeShare}
          />

          <RecentChangesPanel
            showRecentChanges={showRecentChanges && viewState === 'saved' && !editing}
            loadingEdits={loadingEdits}
            recentEdits={recentEdits}
            courseMapVersion={courseMapVersion}
            onClose={() => setShowRecentChanges(false)}
          />

          <ComparePickerPanel
            showComparePicker={showComparePicker && viewState === 'saved' && !editing}
            loadingCompare={loadingCompare}
            loadingCloneable={loadingCloneable}
            loadingSnapshots={loadingSnapshots}
            cloneableCourses={cloneableCourses}
            snapshots={snapshots}
            onClose={() => setShowComparePicker(false)}
            onCompareWithCourse={handleCompareWithCourse}
            onCompareWithSnapshot={handleCompareWithSnapshot}
          />

          <PrerequisitesPanel
            showPrerequisites={showPrerequisites && viewState === 'saved' && !editing}
            loadingPrereqs={loadingPrereqs}
            prerequisiteGraph={prerequisiteGraph}
            weeks={weeks}
            onClose={() => setShowPrerequisites(false)}
          />

          {/* Canvas push result */}
          {canvasPushResult && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <Check className="size-4 shrink-0" />
              {canvasPushResult}
              <button type="button" onClick={() => setCanvasPushResult(null)} className="ml-auto">
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Notice banner */}
          {metadata?.notice && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertTriangle className="size-4 shrink-0" />
              {metadata.notice}
            </div>
          )}

          {/* Pacing heatmap (Task 33) */}
          <PacingPanel
            showPacing={showPacing && viewState === 'saved' && !editing && !isStudent}
            workloadMetrics={workloadMetrics}
            onClose={() => setShowPacing(false)}
            onScrollToWeek={scrollToWeek}
          />

          {/* Bulk select controls */}
          <BulkSelectControls
            bulkSelectMode={bulkSelectMode}
            selectedWeeks={selectedWeeks}
            onSelectAll={() => setSelectedWeeks(new Set(weeks.map((w) => w.weekNumber)))}
            onDeselectAll={() => setSelectedWeeks(new Set())}
          />

          {/* Week search & filter (Task 47) */}
          {weeks.length >= 3 && !isStudent && (
            <WeekSearchFilter
              weekSearchTerm={weekSearchTerm}
              weekFilters={weekFilters}
              onSearchChange={setWeekSearchTerm}
              onFiltersChange={setWeekFilters}
            />
          )}

          {/* Print preview (Task 50) */}
          {showPrintPreview && (
            <PrintPreview
              weeks={weeks}
              courseCode={courseCode}
              metadata={metadata}
              assignmentRubrics={assignmentRubrics}
              onClose={() => setShowPrintPreview(false)}
            />
          )}

          {/* Analytics Summary Panel (Task 52) */}
          {showAnalyticsSummary && weeks.length > 0 && (
            <AnalyticsSummary
              weeks={weeks}
              assignmentRubrics={assignmentRubrics}
              onClose={() => setShowAnalyticsSummary(false)}
            />
          )}

          {/* Weeks list */}
          {!showPrintPreview && <div className="space-y-3">
            {(() => {
              const searchLower = weekSearchTerm.trim().toLowerCase()
              const hasActiveFilter = searchLower !== '' || weekFilters.size > 0

              const filteredWeeks = weeks.map((week, idx) => ({ week, idx })).filter(({ week }) => {
                if (searchLower) {
                  const haystack = [
                    week.title,
                    week.topic ?? '',
                    ...week.objectives.map((o) => o.title),
                    ...week.materials.map((m) => m.title),
                    ...week.assignments.map((a) => a.title),
                    ...week.toolSuggestions.map((t) => t.title),
                  ].join(' ').toLowerCase()
                  if (!haystack.includes(searchLower)) return false
                }
                if (weekFilters.has('has-assignments') && week.assignments.length === 0) return false
                if (weekFilters.has('has-objectives') && week.objectives.length === 0) return false
                if (weekFilters.has('no-assignments') && week.assignments.length > 0) return false
                if (weekFilters.has('has-dates') && !week.startDate) return false
                if (weekFilters.has('no-dates') && week.startDate) return false
                return true
              })

              return (
                <>
                  {hasActiveFilter && (
                    <p className="text-xs text-gray-400">Showing {filteredWeeks.length} of {weeks.length} weeks</p>
                  )}
                  {filteredWeeks.map(({ week, idx: weekIdx }) => {
              const isExpanded = expandedWeeks.has(week.weekNumber)
              const canEdit = editing || viewState === 'preview'

              return (
                <div
                  key={week.weekNumber}
                  id={`course-map-week-${week.weekNumber}`}
                  className={`rounded-2xl border-2 border-gray-200 bg-white${draggingIndex === weekIdx ? ' opacity-50' : ''}`}
                >
                  {/* Drop indicator above */}
                  {dragOverIndex === weekIdx && draggingIndex !== weekIdx && (
                    <div className="h-0.5 rounded-full bg-[#0033A0]" />
                  )}
                  {/* Week header */}
                  <div
                    className="flex w-full items-center gap-3 px-4 py-3"
                    draggable={canEdit && !weekReorderLocked}
                    onDragStart={(e) => {
                      if (!canEdit || weekReorderLocked) return
                      dragIndexRef.current = weekIdx
                      setDraggingIndex(weekIdx)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => {
                      if (!canEdit || dragIndexRef.current === null) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverIndex(weekIdx)
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === weekIdx) setDragOverIndex(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const fromIdx = dragIndexRef.current
                      if (fromIdx === null || fromIdx === weekIdx) { setDragOverIndex(null); setDraggingIndex(null); dragIndexRef.current = null; return }
                      setWeeks((prev) => {
                        const next = [...prev]
                        const [moved] = next.splice(fromIdx, 1)
                        next.splice(weekIdx, 0, moved)
                        return next.map((w, i) => ({ ...w, weekNumber: i + 1 }))
                      })
                      setDragOverIndex(null)
                      setDraggingIndex(null)
                      dragIndexRef.current = null
                    }}
                    onDragEnd={() => {
                      setDragOverIndex(null)
                      setDraggingIndex(null)
                      dragIndexRef.current = null
                    }}
                  >
                    {bulkSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleBulkWeek(week.weekNumber) }}
                        className="shrink-0 rounded p-0.5 hover:bg-gray-100"
                      >
                        {selectedWeeks.has(week.weekNumber) ? (
                          <CheckSquare className="size-4 text-[#0033A0]" />
                        ) : (
                          <Square className="size-4 text-gray-300" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleWeek(week.weekNumber)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-gray-400" />
                      )}
                      <span className="rounded-full bg-[#0033A0] px-2.5 py-0.5 text-xs font-bold text-white">
                        Week {week.weekNumber}
                      </span>
                      <span className="flex-1 truncate text-sm font-semibold text-gray-900">
                        {week.title}
                      </span>
                      {week.startDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="size-3" />
                          {week.startDate}
                          {week.endDate && ` — ${week.endDate}`}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {isStudent
                          ? `${week.materials.length + week.assignments.length} items`
                          : `${week.objectives.length}O / ${week.materials.length}M / ${week.assignments.length}A`
                        }
                      </span>
                      {isStudent && studentProgress && (() => {
                        const wp = studentProgress.find((p) => p.weekNumber === week.weekNumber)
                        if (!wp) return null
                        const anyStudied = wp.objectives.some((o) => o.masteryLevel === 'mastered' || o.masteryLevel === 'struggling')
                        const allStudied = wp.objectives.every((o) => o.masteryLevel === 'mastered' || o.masteryLevel === 'struggling')
                        const color = allStudied ? 'bg-emerald-500' : anyStudied ? 'bg-emerald-300' : 'bg-gray-300'
                        return <span className={`size-2.5 shrink-0 rounded-full ${color}`} title={allStudied ? 'All studied' : anyStudied ? 'In progress' : 'Not started'} />
                      })()}
                    </button>
                    {viewState === 'saved' && !editing && !isStudent && isExpanded && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleGetTips(week.weekNumber) }}
                        disabled={loadingTipsWeek === week.weekNumber}
                        className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"
                        title="Get AI teaching tips"
                      >
                        {loadingTipsWeek === week.weekNumber ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Lightbulb className="size-4" />
                        )}
                      </button>
                    )}
                    {viewState === 'saved' && !editing && !isStudent && isExpanded && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          setLoadingSummaryWeek(week.weekNumber)
                          try {
                            const res = await fetch(`/api/courses/${courseId}/course-map/week-summary`, {
                              method: 'POST',
                              headers: courseHeaders(userEmail, true),
                              body: JSON.stringify({ weekNumber: week.weekNumber }),
                            })
                            if (res.ok) {
                              const data = await res.json() as { summary: string }
                              setWeekSummaries((prev) => new Map(prev).set(week.weekNumber, data.summary))
                            }
                          } catch { /* ignore */ }
                          setLoadingSummaryWeek(null)
                        }}
                        disabled={loadingSummaryWeek === week.weekNumber}
                        className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                        title="Generate AI summary"
                      >
                        {loadingSummaryWeek === week.weekNumber ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <AlignLeft className="size-4" />
                        )}
                      </button>
                    )}
                    {viewState === 'saved' && !editing && !isStudent && (() => {
                      const weekComments = comments.filter((c) => !c.resolved)
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenCommentWeek(openCommentWeek === week.weekNumber ? null : week.weekNumber)
                            if (!expandedWeeks.has(week.weekNumber)) toggleWeek(week.weekNumber)
                          }}
                          className="relative shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Comments"
                        >
                          <MessageSquare className="size-4" />
                          {weekComments.length > 0 && (
                            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#0033A0] text-[10px] font-bold text-white">
                              {weekComments.length}
                            </span>
                          )}
                        </button>
                      )
                    })()}
                    {viewState === 'saved' && !editing && !isStudent && hasCanvasId && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCopyDeepLink(week.weekNumber) }}
                          className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Copy LTI deep link"
                        >
                          <LinkIcon className="size-4" />
                        </button>
                        {copiedDeepLinkWeek === week.weekNumber && (
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white">
                            Copied!
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline comment thread (Task 31) */}
                  {openCommentWeek === week.weekNumber && viewState === 'saved' && !editing && !isStudent && (
                    <div className="border-t border-blue-100 bg-blue-50/50 px-4 py-3">
                      <div className="space-y-2">
                        {comments
                          .map((c) => (
                            <div
                              key={c.id}
                              className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                                c.resolved ? 'bg-gray-50 text-gray-400 line-through' : 'bg-white'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-gray-700">{c.userName}</span>
                                <span className="mx-1.5 text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                </span>
                                <p className={`mt-0.5 ${c.resolved ? 'text-gray-400' : 'text-gray-700'}`}>
                                  {c.content}
                                </p>
                              </div>
                              {!c.resolved && (
                                <button
                                  type="button"
                                  onClick={() => handleResolveComment(c.id)}
                                  className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          ))}
                        {comments.length === 0 && (
                          <p className="text-xs text-gray-400">No comments yet</p>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handlePostComment(week.weekNumber)
                            }
                          }}
                          placeholder="Add a comment..."
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handlePostComment(week.weekNumber)}
                          disabled={postingComment || !newCommentText.trim()}
                          className="rounded-lg bg-[#0033A0] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
                        >
                          {postingComment ? <Loader2 className="size-4 animate-spin" /> : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => moveWeek(weekIdx, 'up')} disabled={weekIdx === 0 || weekReorderLocked} title={weekReorderLocked ? 'Week order is locked' : 'Move up'} className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                          <button type="button" onClick={() => moveWeek(weekIdx, 'down')} disabled={weekIdx === weeks.length - 1 || weekReorderLocked} title={weekReorderLocked ? 'Week order is locked' : 'Move down'} className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                          <button type="button" onClick={() => cloneWeek(weekIdx)} disabled={weekReorderLocked} title={weekReorderLocked ? 'Week order is locked' : 'Duplicate week'} className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-30"><Copy className="size-3.5" /></button>
                          <input type="text" value={week.title} onChange={(e) => updateWeekField(weekIdx, 'title', e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm" />
                          <input type="text" value={week.topic ?? ''} placeholder="Topic" onChange={(e) => updateWeekField(weekIdx, 'topic', e.target.value || null)} className="w-48 rounded-lg border border-gray-200 px-2 py-1 text-sm" />
                        </div>
                      )}
                      {canEdit && prerequisiteGraph.length > 0 && (() => {
                        const entry = prerequisiteGraph.find((e) => e.weekNumber === week.weekNumber)
                        const earlierWeeks = weeks.filter((w) => w.weekNumber < week.weekNumber)
                        if (earlierWeeks.length === 0) return null
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">Requires:</span>
                            {earlierWeeks.map((ew) => {
                              const isPrereq = entry?.prerequisites.includes(ew.weekNumber)
                              const ewEntry = prerequisiteGraph.find((e) => e.weekNumber === ew.weekNumber)
                              return (
                                <button key={ew.weekNumber} type="button" onClick={() => { if (!entry?.weekId || !ewEntry?.weekId) return; handlePrerequisiteChange(entry.weekId, ewEntry.weekId, isPrereq ? 'remove' : 'add') }} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${isPrereq ? 'bg-[#0033A0] text-white' : 'border border-gray-300 text-gray-500 hover:bg-gray-100'}`}>W{ew.weekNumber}</button>
                              )
                            })}
                          </div>
                        )
                      })()}
                      {!canEdit && week.topic && <p className="text-sm text-gray-500">{week.topic}</p>}

                      {!isStudent && weekSummaries.has(week.weekNumber) && (
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm italic text-gray-500">{weekSummaries.get(week.weekNumber)}</p>
                          <button type="button" onClick={() => setWeekSummaries((prev) => { const next = new Map(prev); next.delete(week.weekNumber); return next })} className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Dismiss summary"><X className="size-3.5" /></button>
                        </div>
                      )}

                      {!isStudent && weekTips.has(week.weekNumber) && (
                        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3">
                          <div className="mb-2 flex items-center gap-2">
                            <Sparkles className="size-4 text-purple-600" />
                            <span className="text-xs font-bold uppercase tracking-wide text-purple-700">Teaching Tips</span>
                          </div>
                          <ul className="space-y-1">
                            {weekTips.get(week.weekNumber)!.map((tip, tipIdx) => (
                              <li key={tipIdx} className="flex items-start gap-2 text-sm text-purple-900">
                                <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-purple-400" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Objectives */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Target className="size-4 text-[#0033A0]" />
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Objectives ({week.objectives.length})</span>
                          {canEdit && (<button type="button" onClick={() => addObjective(weekIdx)} className="ml-auto rounded-full p-1 hover:bg-gray-100"><Plus className="size-3.5 text-gray-400" /></button>)}
                        </div>
                        {week.objectives.length === 0 && <p className="text-xs text-gray-400 italic">No objectives</p>}
                        <ul className="space-y-1">
                          {week.objectives.map((obj, objIdx) => (
                            <li key={objIdx} className="flex items-start gap-2 text-sm">
                              <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-gray-300" />
                              {canEdit ? (
                                <>
                                  <input type="text" value={obj.title} onChange={(e) => updateObjectiveTitle(weekIdx, objIdx, e.target.value)} className="flex-1 rounded border border-gray-200 px-2 py-0.5 text-sm" />
                                  <select value={obj.bloomLevel ?? ''} onChange={(e) => updateObjectiveBloom(weekIdx, objIdx, (e.target.value || null) as BloomLevel | null)} className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                                    <option value="">Bloom…</option>
                                    {BLOOM_LEVELS.map((bl) => (<option key={bl} value={bl}>{BLOOM_LABELS[bl]}</option>))}
                                  </select>
                                  <button type="button" onClick={() => removeObjective(weekIdx, objIdx)} className="rounded-full p-1 hover:bg-red-50"><Trash2 className="size-3 text-red-400" /></button>
                                </>
                              ) : (
                                <>
                                  <span className="text-gray-700">{obj.title}</span>
                                  {obj.bloomLevel && (<span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${BLOOM_COLORS[obj.bloomLevel]}`}>{BLOOM_LABELS[obj.bloomLevel]}</span>)}
                                  {isStudent && studentProgress && (() => {
                                    const wp = studentProgress.find((p) => p.weekNumber === week.weekNumber)
                                    const op = wp?.objectives.find((o) => o.title === obj.title)
                                    if (!op) return null
                                    const studied = op.masteryLevel === 'mastered' || op.masteryLevel === 'struggling'
                                    return <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${studied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{studied ? '✓ Studied' : 'Not studied'}</span>
                                  })()}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Materials */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <BookOpen className="size-4 text-emerald-600" />
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Materials ({week.materials.length})</span>
                          {canEdit && (<button type="button" onClick={() => addMaterial(weekIdx)} className="ml-auto rounded-full p-1 hover:bg-gray-100"><Plus className="size-3.5 text-gray-400" /></button>)}
                          {!canEdit && !isStudent && viewState === 'saved' && (
                            <button type="button" disabled={loadingSuggestionsWeek === week.weekNumber} onClick={async () => {
                              setLoadingSuggestionsWeek(week.weekNumber)
                              try {
                                const res = await fetch(`/api/courses/${courseId}/course-map/suggest-materials`, { method: 'POST', headers: courseHeaders(userEmail, true), body: JSON.stringify({ weekNumber: week.weekNumber }) })
                                if (!res.ok) throw new Error('Failed')
                                const data = await res.json() as { suggestions: MaterialSuggestion[] }
                                setWeekSuggestions((prev) => new Map(prev).set(week.weekNumber, data.suggestions))
                              } catch {} finally { setLoadingSuggestionsWeek(null) }
                            }} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold text-purple-600 hover:bg-purple-50 disabled:opacity-50">
                              {loadingSuggestionsWeek === week.weekNumber ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                              Suggest Materials
                            </button>
                          )}
                        </div>
                        {week.materials.length === 0 && <p className="text-xs text-gray-400 italic">No materials</p>}
                        <ul className="space-y-1">
                          {week.materials.map((mat, matIdx) => (
                            <li key={matIdx} className="flex items-center gap-2 text-sm">
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{MATERIAL_TYPE_LABELS[mat.materialType] ?? mat.materialType}</span>
                              <span className="flex-1 truncate text-gray-700">{mat.title}</span>
                              {canEdit && (<button type="button" onClick={() => removeMaterial(weekIdx, matIdx)} className="rounded-full p-1 hover:bg-red-50"><Trash2 className="size-3 text-red-400" /></button>)}
                            </li>
                          ))}
                        </ul>
                        {weekSuggestions.has(week.weekNumber) && (weekSuggestions.get(week.weekNumber) ?? []).length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-purple-600">AI Suggestions</span>
                              <button type="button" onClick={() => setWeekSuggestions((prev) => { const next = new Map(prev); next.delete(week.weekNumber); return next })} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                            </div>
                            {(weekSuggestions.get(week.weekNumber) ?? []).map((sug, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-2 rounded-lg border-l-4 border-purple-300 bg-purple-50 px-3 py-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">{sug.title}</span>
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{MATERIAL_TYPE_LABELS[sug.materialType] ?? sug.materialType}</span>
                                  </div>
                                  <p className="mt-0.5 text-xs italic text-gray-500">{sug.rationale}</p>
                                </div>
                                <button type="button" onClick={() => {
                                  if (!editing) setEditing(true)
                                  setWeeks((prev) => prev.map((w) => {
                                    if (w.weekNumber !== week.weekNumber) return w
                                    return { ...w, materials: [...w.materials, { title: sug.title, materialType: (MATERIAL_TYPE_LABELS[sug.materialType] ? sug.materialType : 'reading') as CourseMapMaterial['materialType'], content: '', sourceDocument: '' }] }
                                  }))
                                  setWeekSuggestions((prev) => {
                                    const next = new Map(prev)
                                    const remaining = (next.get(week.weekNumber) ?? []).filter((_, i) => i !== sIdx)
                                    if (remaining.length === 0) next.delete(week.weekNumber)
                                    else next.set(week.weekNumber, remaining)
                                    return next
                                  })
                                }} className="shrink-0 rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700">Add</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Assignments */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <ClipboardList className="size-4 text-amber-600" />
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Assignments ({week.assignments.length})</span>
                          {canEdit && (<button type="button" onClick={() => addAssignment(weekIdx)} className="ml-auto rounded-full p-1 hover:bg-gray-100"><Plus className="size-3.5 text-gray-400" /></button>)}
                        </div>
                        {week.assignments.length === 0 && <p className="text-xs text-gray-400 italic">No assignments</p>}
                        <ul className="space-y-2">
                          {week.assignments.map((a, aIdx) => (
                            <li key={aIdx} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                              {canEdit ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input type="text" value={a.title} onChange={(e) => updateAssignment(weekIdx, aIdx, { title: e.target.value })} className="flex-1 rounded border border-gray-200 px-2 py-0.5 text-sm" />
                                    <button type="button" onClick={() => removeAssignment(weekIdx, aIdx)} className="rounded-full p-1 hover:bg-red-50"><Trash2 className="size-3 text-red-400" /></button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select value={a.type} onChange={(e) => updateAssignment(weekIdx, aIdx, { type: e.target.value as CourseMapAssignment['type'] })} className="rounded border border-gray-200 px-2 py-0.5 text-xs">
                                      <option value="TEXT_SUBMISSION">Text / File</option>
                                      <option value="AI_EXPERIENCE">AI Experience</option>
                                      <option value="FILE_UPLOAD">File Upload</option>
                                    </select>
                                    <input type="number" value={a.pointsPossible ?? ''} placeholder="Points" onChange={(e) => updateAssignment(weekIdx, aIdx, { pointsPossible: e.target.value ? Number(e.target.value) : null })} className="w-20 rounded border border-gray-200 px-2 py-0.5 text-xs" />
                                    <input type="date" value={a.dueDate ?? ''} onChange={(e) => updateAssignment(weekIdx, aIdx, { dueDate: e.target.value || null })} className="rounded border border-gray-200 px-2 py-0.5 text-xs" />
                                  </div>
                                  {(() => {
                                    const rubricKey = `${week.weekNumber}-${aIdx}`
                                    const rubric = assignmentRubrics.get(rubricKey)
                                    const loading = loadingRubricKey === rubricKey
                                    return (
                                      <>
                                        {!rubric && (
                                          <button type="button" onClick={() => handleGenerateRubric(week.weekNumber, aIdx)} disabled={loading} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                                            {loading ? <Loader2 className="size-3 animate-spin" /> : <ClipboardCheck className="size-3" />}
                                            Generate Rubric
                                          </button>
                                        )}
                                        {rubric && (
                                          <div className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2">
                                            <div className="mb-1.5 flex items-center justify-between">
                                              <span className="text-xs font-bold text-emerald-700">Rubric ({rubric.totalPoints} pts)</span>
                                              <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => handleGenerateRubric(week.weekNumber, aIdx)} disabled={loading} className="rounded-full p-0.5 text-emerald-500 hover:bg-emerald-100 disabled:opacity-50" title="Regenerate">{loading ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}</button>
                                                <button type="button" onClick={() => dismissRubric(week.weekNumber, aIdx)} className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100" title="Dismiss rubric"><X className="size-3" /></button>
                                              </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-[10px]">
                                                <thead>
                                                  <tr className="text-left text-gray-500">
                                                    <th className="py-0.5 pr-1 font-semibold">Criterion</th>
                                                    <th className="py-0.5 px-1 font-semibold text-emerald-600">Excellent</th>
                                                    <th className="py-0.5 px-1 font-semibold text-blue-600">Proficient</th>
                                                    <th className="py-0.5 px-1 font-semibold text-amber-600">Developing</th>
                                                    <th className="py-0.5 px-1 font-semibold text-red-600">Beginning</th>
                                                    <th className="py-0.5 pl-1 font-semibold text-gray-500">Wt</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {rubric.criteria.map((c, cIdx) => (
                                                    <tr key={cIdx} className="border-t border-emerald-100">
                                                      <td className="py-1 pr-1 font-medium text-gray-700">{c.criterion}</td>
                                                      <td className="py-1 px-1 text-gray-600">{c.excellent}</td>
                                                      <td className="py-1 px-1 text-gray-600">{c.proficient}</td>
                                                      <td className="py-1 px-1 text-gray-600">{c.developing}</td>
                                                      <td className="py-1 px-1 text-gray-600">{c.beginning}</td>
                                                      <td className="py-1 pl-1 text-center font-medium text-gray-500">{c.weight}%</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="font-medium text-gray-800">{a.title}</span>
                                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type}</span>
                                    {a.pointsPossible != null && <span className="text-xs text-gray-500">{a.pointsPossible} pts</span>}
                                    {a.dueDate && <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar className="size-3" />{a.dueDate}</span>}
                                    {viewState === 'saved' && onSwitchTab && (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); onSwitchTab('assignments') }} className="ml-auto text-xs font-semibold text-[#0033A0] hover:underline">View in Assignments →</button>
                                    )}
                                  </div>
                                  {assignmentRubrics.has(`${week.weekNumber}-${aIdx}`) && (
                                    <div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 p-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Rubric</span>
                                      <div className="mt-0.5 flex flex-wrap gap-1">
                                        {assignmentRubrics.get(`${week.weekNumber}-${aIdx}`)!.criteria.map((c, cIdx) => (
                                          <span key={cIdx} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">{c.criterion} ({c.weight}%)</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>

                        {canEdit && week.objectives.length > 0 && (
                          <div className="mt-2">
                            <button type="button" onClick={() => handleSuggestAssignments(week.weekNumber)} disabled={loadingAssignmentSugWeek === week.weekNumber} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50">
                              {loadingAssignmentSugWeek === week.weekNumber ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                              Suggest Assignments
                            </button>
                            {(weekAssignmentSuggestions.get(week.weekNumber) ?? []).length > 0 && (
                              <ul className="mt-2 space-y-2">
                                {weekAssignmentSuggestions.get(week.weekNumber)!.map((sug) => (
                                  <li key={sug.title} className="rounded-xl border border-purple-100 bg-purple-50/50 px-3 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800">{sug.title}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{ASSIGNMENT_TYPE_LABELS[sug.type as keyof typeof ASSIGNMENT_TYPE_LABELS] ?? sug.type}</span>
                                          <span className="text-xs text-gray-500">{sug.pointsPossible} pts</span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-600">{sug.description}</p>
                                        <p className="mt-0.5 text-xs italic text-gray-400">{sug.rationale}</p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-1">
                                        <button type="button" onClick={() => addSuggestedAssignment(weekIdx, week.weekNumber, sug)} title="Add assignment" className="rounded-full p-1 text-green-600 hover:bg-green-50"><Plus className="size-4" /></button>
                                        <button type="button" onClick={() => dismissAssignmentSuggestion(week.weekNumber, sug.title)} title="Dismiss" className="rounded-full p-1 text-gray-400 hover:bg-gray-100"><X className="size-4" /></button>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tool suggestions (read-only, educators only) */}
                      {!isStudent && week.toolSuggestions.length > 0 && (
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Lightbulb className="size-4 text-purple-500" />
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Suggested Tools</span>
                          </div>
                          <ul className="space-y-1">
                            {week.toolSuggestions.map((ts, tsIdx) => (
                              <li key={tsIdx} className="text-sm text-gray-600">
                                <span className="font-medium">{ts.title}</span>
                                <span className="ml-1 text-xs text-gray-400">({ts.toolType})</span>
                                {ts.rationale && <span className="ml-1 text-xs text-gray-400">— {ts.rationale}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Instructor Notes (Task 35) */}
                      {viewState === 'saved' && !editing && !isStudent && (
                        <div>
                          <button type="button" onClick={() => setExpandedNoteWeek(expandedNoteWeek === week.weekNumber ? null : week.weekNumber)} className="flex items-center gap-2 text-xs">
                            <StickyNote className="size-3.5 text-amber-500" />
                            <span className="font-bold uppercase tracking-wide text-gray-500">Notes</span>
                            {noteTexts.has(week.weekNumber) && noteTexts.get(week.weekNumber)!.trim() && expandedNoteWeek !== week.weekNumber && <span className="size-2 rounded-full bg-amber-400" />}
                            {expandedNoteWeek === week.weekNumber ? <ChevronDown className="size-3 text-gray-400" /> : <ChevronRight className="size-3 text-gray-400" />}
                          </button>
                          {expandedNoteWeek === week.weekNumber && (
                            <div className="mt-2">
                              <textarea value={noteTexts.get(week.weekNumber) ?? ''} onChange={(e) => handleNoteChange(week.weekNumber, e.target.value)} onBlur={() => handleNoteBlur(week.weekNumber)} placeholder="Add private notes for this week..." rows={3} className="w-full rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300" />
                              <p className="mt-1 text-[10px] text-gray-400">Only visible to you. Auto-saves on blur.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
                </>
              )
            })()}

            {/* Add week from template (Task 34) */}
            {(editing || viewState === 'preview') && !isStudent && (
              <div className="relative">
                <button type="button" onClick={() => setShowWeekTemplateMenu((p) => !p)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-500 transition-colors hover:border-[#0033A0] hover:bg-blue-50 hover:text-[#0033A0]">
                  <Plus className="size-4" />
                  Add Week from Template
                </button>
                {showWeekTemplateMenu && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border-2 border-gray-200 bg-white py-1 shadow-lg">
                    {WEEK_TEMPLATES.map((tpl) => (
                      <button key={tpl.id} type="button" onClick={() => addWeekFromTemplate(tpl)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50">
                        <LayoutTemplate className="mt-0.5 size-4 shrink-0 text-[#0033A0]" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{tpl.name}</p>
                          <p className="text-xs text-gray-500">{tpl.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>}

          {/* Bulk edit floating action bar (Task 25) */}
          <BulkEditBar
            bulkSelectMode={bulkSelectMode}
            selectedWeeks={selectedWeeks}
            weeks={weeks}
            bulkShiftDays={bulkShiftDays}
            bulkTargetWeek={bulkTargetWeek}
            showBulkDeleteConfirm={showBulkDeleteConfirm}
            onSelectAll={() => setSelectedWeeks(new Set(weeks.map((w) => w.weekNumber)))}
            onDeselectAll={() => setSelectedWeeks(new Set())}
            onSetBulkShiftDays={setBulkShiftDays}
            onBulkShiftDates={handleBulkShiftDates}
            onSetBulkTargetWeek={setBulkTargetWeek}
            onBulkMoveMaterials={handleBulkMoveMaterials}
            onSetShowBulkDeleteConfirm={setShowBulkDeleteConfirm}
            onBulkDelete={handleBulkDelete}
          />

          {/* Bottom confirm bar */}
          <BottomConfirmBar
            viewState={viewState}
            editing={editing}
            isStudent={isStudent}
            confirming={confirming}
            weeksLength={weeks.length}
            notifyStudents={notifyStudents}
            notifyResult={notifyResult}
            onSetNotifyStudents={setNotifyStudents}
            onSetNotifyResult={setNotifyResult}
            onCancelEdit={() => { setEditing(false); setBulkSelectMode(false); setSelectedWeeks(new Set()) }}
            onConfirm={handleConfirm}
          />
        </div>
      )}
    </div>
  )
}
