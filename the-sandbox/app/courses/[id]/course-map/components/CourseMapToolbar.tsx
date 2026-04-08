'use client'

import {
  MousePointer, Link as LinkIcon, Maximize2, Group, Activity, Users,
  Camera, History, Check, X, Loader2, Bell, Settings, Flame, Search,
  Share2, BarChart3, Download, PenTool, StickyNote, Brain, Zap,
  FileBarChart, Package, Heart, LayoutTemplate, RefreshCw, Globe,
  Code, FileText, ExternalLink, Printer, ImageDown, FileCode,
  ArrowLeftRight, Sparkles, ShieldCheck, Wand2, Send, CheckCircle,
  CopyPlus, Layers, Flag, Plus, Link2,
} from 'lucide-react'
import BranchSwitcher from '../../../../components/course-map/BranchSwitcher'
import LocaleSwitcher from '../../../../components/course-map/LocaleSwitcher'
import { getEditorColor, EDGE_COLORS } from './types'
import type { CanvasMode, ActiveEditor } from './types'
import type { EdgeRoutingMode } from '../../../../lib/course-map/visualization-service'
import type { RenderMetrics } from '../../../../lib/course-map/performance-service'
import type { BranchInfo } from '../../../../lib/course-map/branch-service'
import {
  exportToSCORM, exportToMarkdown, generateTimeLimitedShareLink,
  downloadScormPackage, downloadText,
} from '../../../../lib/course-map/export-service'
import type { GraphMap } from './types'
import { useT } from '../../../../lib/i18n/locale-context'

interface CourseMapToolbarProps {
  // Canvas mode
  canvasMode: CanvasMode
  setCanvasMode: (mode: CanvasMode) => void
  connectSource: string | null

  // Edge routing / groups
  edgeRoutingMode: EdgeRoutingMode
  setEdgeRoutingMode: (mode: EdgeRoutingMode) => void
  showGroups: boolean
  setShowGroups: (fn: (v: boolean) => boolean) => void
  handleZoomToFit: () => void

  // Perf metrics
  perfMetrics: RenderMetrics | null
  totalNodeCount: number

  // Active editors
  activeEditors: ActiveEditor[]

  // Branch management
  branches: BranchInfo[]
  currentBranch: BranchInfo | null
  branchesLoading: boolean
  handleCreateBranch: (name: string, description: string) => Promise<void>
  handleSwitchBranch: (branchId: string) => Promise<void>
  handleDeleteBranch: (branchId: string) => Promise<void>
  handleCompareBranches: (a: string, b: string) => Promise<void>
  handleOpenMergeDialog: (sourceId: string, targetId: string) => void

  // Snapshots
  snapshots: Array<{ id: string; name: string; createdAt: string; nodeCount: number; edgeCount: number }>
  snapshotName: string
  setSnapshotName: (name: string) => void
  savingSnapshot: boolean
  showSnapshotDropdown: boolean
  setShowSnapshotDropdown: (fn: (v: boolean) => boolean) => void
  showSnapshotNameInput: boolean
  setShowSnapshotNameInput: (v: boolean) => void
  saveSnapshot: () => Promise<void>
  setPendingRestoreId: (id: string | null) => void
  runDiff: (snapshotId: string) => Promise<void>
  diffLoading: boolean
  runMerge: (baseId: string, sourceId: string) => void
  mergeLoading: boolean
  deleteSnapshot: (id: string) => Promise<void>
  setShowCompareView: (v: boolean) => void
  setCompareSnapshotA: (id: string) => void
  setCompareSnapshotB: (id: string) => void
  addCollabToast: (message: string) => void

  // Notifications
  showNotifPanel: boolean
  setShowNotifPanel: (fn: (v: boolean) => boolean) => void
  notifUnreadCount: number
  fetchNotifications: (filterType: string) => void
  notifFilterType: string

  // Push
  pushEnabled: boolean
  pushToggling: boolean
  handlePushToggle: () => void

  // Webhook dashboard
  openWebhookDashboard: () => void

  // Notify students
  handleNotifyStudents: () => void
  notifyingStu: boolean
  notifyStuResult: string | null

  // Heatmap
  showHeatmap: boolean
  setShowHeatmap: (fn: (v: boolean) => boolean) => void

  // Search
  showSearchFilter: boolean
  setShowSearchFilter: (fn: (v: boolean) => boolean) => void

  // Share
  setShowShareDialog: (v: boolean) => void
  showSharingPanel: boolean
  setShowSharingPanel: (fn: (v: boolean) => boolean) => void
  setShowExportSuite: (v: boolean) => void
  isEditorRole: boolean

  // Analytics
  openAnalyticsPanel: () => void
  showRealtimeDashboard: boolean
  openRealtimeDashboard: () => void

  // Activity
  openActivityFeed: () => void

  // Comments
  openCommentPanel: (nodeId?: string, edgeId?: string) => void
  commentCounts: { nodeCounts: Record<string, number>; edgeCounts: Record<string, number> }

  // Annotations
  showAnnotationPanel: boolean
  setShowAnnotationPanel: (fn: (v: boolean) => boolean) => void
  totalAnnotationCount: number

  // Milestones
  showMilestonePanel: boolean
  setShowMilestonePanel: (fn: (v: boolean) => boolean) => void
  milestoneTotal: number
  fetchMilestones?: () => void

  // Whiteboard & annotation layer
  whiteboardActive: boolean
  setWhiteboardActive: (fn: (v: boolean) => boolean) => void
  annotationLayerActive: boolean
  setAnnotationLayerActive: (fn: (v: boolean) => boolean) => void
  annotationNodeCounts: Map<string, number>

  // AI panels
  showTeachingAssistant: boolean
  setShowTeachingAssistant: (fn: (v: boolean) => boolean) => void
  showSmartSuggestions: boolean
  setShowSmartSuggestions: (fn: (v: boolean) => boolean) => void
  showExportSuite: boolean
  showReportingDashboard: boolean
  setShowReportingDashboard: (fn: (v: boolean) => boolean) => void
  showPluginMarketplace: boolean
  setShowPluginMarketplace: (fn: (v: boolean) => boolean) => void
  pluginEntries: Array<{ manifest: { id: string }; status: string }>
  showAIAssistant: boolean
  setShowAIAssistant: (fn: (v: boolean) => boolean) => void
  showSmartAutomation: boolean
  setShowSmartAutomation: (fn: (v: boolean) => boolean) => void

  // Health
  healthData: { overallScore: number } | null
  openHealthPanel: () => void

  // Template suggestions
  templateSuggestLoading: boolean
  runTemplateSuggestions: () => void

  // Canvas sync
  setShowCanvasSyncDialog: (v: boolean) => void
  setCanvasSyncResult: (v: string | null) => void
  setCanvasSyncError: (v: string | null) => void
  setCanvasSyncStatus: (v: unknown) => void
  courseId: string
  userEmail: string

  // LMS links
  fetchLmsLinks: () => void
  lmsLinksLoading: boolean

  // Export
  showExportDropdown: boolean
  setShowExportDropdown: (fn: (v: boolean) => boolean) => void
  exportAs: (format: 'csv' | 'svg' | 'json') => void
  exportAsPng: () => void
  handlePrint: () => void
  setShowReportModal: (v: boolean) => void
  graphMap: GraphMap

  // Course comparison
  setShowCourseCompare: (v: boolean) => void
  setCourseComparisonResult: (v: null) => void
  setCompareTargetCourseId: (v: string) => void
  fetchCompareCourses: () => void

  // Gap analysis & suggestions
  runGapAnalysis: () => void
  gapLoading: boolean
  runPrereqValidation: () => void
  prereqValidLoading: boolean
  runSuggestEdges: () => void
  suggestLoading: boolean
  runAiSuggestions: () => void
  aiSuggestionsLoading: boolean

  // NL Edit
  nlEditOpen: boolean
  setNlEditOpen: (v: boolean) => void
  nlEditInstruction: string
  setNlEditInstruction: (v: string) => void
  nlEditLoading: boolean
  nlEditChanges: Array<{ action: string; details: Record<string, unknown>; description: string }>
  nlEditSummary: string
  nlEditApplying: boolean
  submitNlEdit: () => void
  applyNlChanges: () => void

  // Template save
  setShowSaveTemplateDialog: (v: boolean) => void

  // Duplicate
  setShowDuplicateDialog: (v: boolean) => void
  setUserCourses: (courses: Array<{ id: string; courseCode: string; title: string }>) => void
}

export default function CourseMapToolbar(props: CourseMapToolbarProps) {
  const t = useT()
  const {
    canvasMode, setCanvasMode, connectSource,
    edgeRoutingMode, setEdgeRoutingMode,
    showGroups, setShowGroups, handleZoomToFit,
    perfMetrics, totalNodeCount, activeEditors,
    branches, currentBranch, branchesLoading,
    handleCreateBranch, handleSwitchBranch, handleDeleteBranch,
    handleCompareBranches, handleOpenMergeDialog,
    snapshots, snapshotName, setSnapshotName,
    savingSnapshot, showSnapshotDropdown, setShowSnapshotDropdown,
    showSnapshotNameInput, setShowSnapshotNameInput,
    saveSnapshot, setPendingRestoreId, runDiff, diffLoading,
    runMerge, mergeLoading, deleteSnapshot, addCollabToast,
    setShowCompareView, setCompareSnapshotA, setCompareSnapshotB,
    showNotifPanel, setShowNotifPanel, notifUnreadCount,
    fetchNotifications, notifFilterType,
    pushEnabled, pushToggling, handlePushToggle,
    openWebhookDashboard,
    handleNotifyStudents, notifyingStu, notifyStuResult,
    showHeatmap, setShowHeatmap,
    showSearchFilter, setShowSearchFilter,
    setShowShareDialog, showSharingPanel, setShowSharingPanel,
    setShowExportSuite, isEditorRole,
    openAnalyticsPanel, showRealtimeDashboard, openRealtimeDashboard,
    openActivityFeed, openCommentPanel, commentCounts,
    showAnnotationPanel, setShowAnnotationPanel, totalAnnotationCount,
    showMilestonePanel, setShowMilestonePanel, milestoneTotal, fetchMilestones,
    whiteboardActive, setWhiteboardActive,
    annotationLayerActive, setAnnotationLayerActive, annotationNodeCounts,
    showTeachingAssistant, setShowTeachingAssistant,
    showSmartSuggestions, setShowSmartSuggestions,
    showExportSuite, showReportingDashboard, setShowReportingDashboard,
    showPluginMarketplace, setShowPluginMarketplace, pluginEntries,
    showAIAssistant, setShowAIAssistant,
    showSmartAutomation, setShowSmartAutomation,
    healthData, openHealthPanel,
    templateSuggestLoading, runTemplateSuggestions,
    setShowCanvasSyncDialog, setCanvasSyncResult, setCanvasSyncError, setCanvasSyncStatus,
    courseId, userEmail,
    fetchLmsLinks, lmsLinksLoading,
    showExportDropdown, setShowExportDropdown,
    exportAs, exportAsPng, handlePrint, setShowReportModal, graphMap,
    setShowCourseCompare, setCourseComparisonResult, setCompareTargetCourseId, fetchCompareCourses,
    runGapAnalysis, gapLoading,
    runPrereqValidation, prereqValidLoading,
    runSuggestEdges, suggestLoading,
    runAiSuggestions, aiSuggestionsLoading,
    nlEditOpen, setNlEditOpen, nlEditInstruction, setNlEditInstruction,
    nlEditLoading, nlEditChanges, nlEditSummary, nlEditApplying,
    submitNlEdit, applyNlChanges,
    setShowSaveTemplateDialog,
    setShowDuplicateDialog, setUserCourses,
  } = props

  const totalCommentCount = Object.values(commentCounts.nodeCounts).reduce((a, b) => a + b, 0) +
    Object.values(commentCounts.edgeCounts).reduce((a, b) => a + b, 0)

  return (
    <div id="course-map-toolbar" role="toolbar" aria-label={t('courseMap.a11y.toolbarLabel')} className="flex items-center gap-1.5 md:gap-2 flex-wrap print:hidden">
      <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-xl p-1">
        <button
          onClick={() => setCanvasMode('select')}
          title={t('courseMap.toolbar.selectMode')}
          aria-pressed={canvasMode === 'select'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            canvasMode === 'select' ? 'bg-[#0033A0] text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MousePointer className="size-4" />
          <span className="hidden md:inline">{t('courseMap.toolbar.select')}</span>
        </button>
        <button
          onClick={() => setCanvasMode('connect')}
          title={t('courseMap.toolbar.connectMode')}
          aria-pressed={canvasMode === 'connect'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            canvasMode === 'connect' ? 'bg-[#0033A0] text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LinkIcon className="size-4" />
          <span className="hidden md:inline">{t('courseMap.toolbar.connect')}</span>
        </button>
      </div>
      {canvasMode === 'connect' && (
        <span className="text-xs text-gray-500" aria-live="polite">
          {connectSource ? t('courseMap.toolbar.connectHintTarget') : t('courseMap.toolbar.connectHintSource')}
        </span>
      )}
      <button onClick={handleZoomToFit} title="Zoom to fit all nodes" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors">
        <Maximize2 className="size-4" /><span className="hidden md:inline">Fit</span>
      </button>
      <button onClick={() => setShowGroups((v) => !v)} title={showGroups ? 'Hide node groups' : 'Group nodes by type'} aria-pressed={showGroups} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showGroups ? 'bg-[#0033A0] text-white border-[#0033A0]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
        <Group className="size-4" /><span className="hidden md:inline">Group</span>
      </button>
      <select value={edgeRoutingMode} onChange={(e) => setEdgeRoutingMode(e.target.value as EdgeRoutingMode)} title="Edge routing style" className="px-2 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
        <option value="bezier">Bezier</option>
        <option value="orthogonal">Orthogonal</option>
        <option value="step">Step</option>
      </select>
      {perfMetrics && totalNodeCount >= 50 && (
        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${perfMetrics.performanceGrade === 'green' ? 'bg-green-50 text-green-700' : perfMetrics.performanceGrade === 'yellow' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`} title={`FPS: ${perfMetrics.fps} | Frame: ${perfMetrics.frameTime}ms | Visible: ${perfMetrics.visibleNodeCount}/${perfMetrics.nodeCount}`}>
          <Activity className="size-3" />{perfMetrics.fps} FPS
        </span>
      )}
      {activeEditors.length > 0 && (
        <div className="flex items-center gap-1 ml-2">
          <Users className="size-4 text-gray-400" />
          <div className="flex -space-x-2">
            {activeEditors.map((editor, i) => (
              <div key={editor.userId} className="size-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: getEditorColor(i) }} title={editor.name}>
                {editor.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">
            {activeEditors.length === 1 ? `${activeEditors[0].name} is editing` : `${activeEditors.length} editors`}
          </span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        <BranchSwitcher branches={branches} currentBranch={currentBranch} loading={branchesLoading} onCreateBranch={handleCreateBranch} onSwitchBranch={handleSwitchBranch} onDeleteBranch={handleDeleteBranch} onCompareBranches={handleCompareBranches} onMergeBranch={handleOpenMergeDialog} />
        <LocaleSwitcher />
        {/* Snapshot controls */}
        <div className="relative">
          {showSnapshotNameInput ? (
            <div className="flex items-center gap-1.5">
              <input type="text" value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveSnapshot(); if (e.key === 'Escape') setShowSnapshotNameInput(false) }} placeholder="Snapshot name..." className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#0033A0]" autoFocus />
              <button onClick={saveSnapshot} disabled={savingSnapshot || !snapshotName.trim()} className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50">
                {savingSnapshot ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Save
              </button>
              <button onClick={() => { setShowSnapshotNameInput(false); setSnapshotName('') }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X className="size-3.5 text-gray-400" /></button>
            </div>
          ) : (
            <button onClick={() => setShowSnapshotNameInput(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors">
              <Camera className="size-4" />Save Snapshot
            </button>
          )}
        </div>
        {/* Snapshot list */}
        <div className="relative">
          <button onClick={() => setShowSnapshotDropdown((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors">
            <History className="size-4" />Snapshots{snapshots.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold">{snapshots.length}</span>}
          </button>
          {showSnapshotDropdown && (
            <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 flex items-center justify-between">
                <span>Saved Snapshots</span>
                <button onClick={() => setShowSnapshotDropdown(() => false)} className="p-0.5 rounded hover:bg-gray-100"><X className="size-3.5 text-gray-400" /></button>
              </div>
              {snapshots.length >= 2 && (
                <div className="px-3 py-2 border-b border-gray-100">
                  <button onClick={() => { setShowSnapshotDropdown(() => false); setShowCompareView(true); setCompareSnapshotA(snapshots[1]?.id || ''); setCompareSnapshotB(snapshots[0]?.id || '') }} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                    Compare Snapshots
                  </button>
                </div>
              )}
              {snapshots.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">No snapshots yet.</div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{snap.name || 'Unnamed'}</p>
                          <p className="text-[10px] text-gray-400">{new Date(snap.createdAt).toLocaleString()} · {snap.nodeCount} nodes · {snap.edgeCount} edges</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => runDiff(snap.id)} className="p-1 rounded-lg hover:bg-violet-50" title="Compare" disabled={diffLoading}><span className="size-3.5 text-violet-600">⇔</span></button>
                          <button onClick={() => { if (snapshots.length < 2) { addCollabToast('Need at least 2 snapshots'); return }; runMerge(snapshots[snapshots.length - 1].id, snap.id) }} className="p-1 rounded-lg hover:bg-teal-50" title="Merge" disabled={mergeLoading}><span className="size-3.5 text-teal-600">⤓</span></button>
                          <button onClick={() => setPendingRestoreId(snap.id)} className="p-1 rounded-lg hover:bg-blue-50" title="Restore"><span className="size-3.5 text-blue-600">↻</span></button>
                          <button onClick={() => deleteSnapshot(snap.id)} className="p-1 rounded-lg hover:bg-red-50" title="Delete"><span className="size-3.5 text-red-500">✕</span></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Notification bell */}
        <button onClick={() => { setShowNotifPanel((v) => !v); if (!showNotifPanel) fetchNotifications(notifFilterType) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors relative" title="Notifications">
          <Bell className="size-4" />
          {notifUnreadCount > 0 && <span className="absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] px-1 h-[18px]">{notifUnreadCount > 9 ? notifUnreadCount : ''}{notifUnreadCount <= 9 && <span className="size-1.5 rounded-full bg-white" />}</span>}
        </button>
        {/* Push toggle */}
        <button onClick={handlePushToggle} disabled={pushToggling} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${pushEnabled ? 'bg-[#0033A0]/10 text-[#0033A0] border border-[#0033A0]/30' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'} disabled:opacity-50`} title={pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}>
          {pushToggling ? <Loader2 className="size-4 motion-safe:animate-spin" /> : <Bell className="size-4" />}
          <span className="hidden md:inline">{pushEnabled ? 'Alerts On' : 'Alerts'}</span>
        </button>
        <button onClick={openWebhookDashboard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors" title="Webhook Management"><Settings className="size-4" /><span className="hidden md:inline">Webhooks</span></button>
        <button onClick={handleNotifyStudents} disabled={notifyingStu} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50" title="Notify students">
          {notifyingStu ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}<span className="hidden md:inline">Notify Students</span>
        </button>
        {notifyStuResult && <span className="text-xs text-green-600 font-medium">{notifyStuResult}</span>}
        <button onClick={() => setShowHeatmap((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${showHeatmap ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}><Flame className="size-4" /><span className="hidden md:inline">Class Progress</span></button>
        <button onClick={() => setShowSearchFilter((v) => !v)} title="Search & Filter (Ctrl+F)" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showSearchFilter ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Search className="size-4" /><span className="hidden md:inline">Search</span></button>
        <button onClick={() => setShowShareDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"><Share2 className="size-4" />Share</button>
        {isEditorRole && (
          <button onClick={() => { setShowSharingPanel((v) => !v); if (!showSharingPanel) setShowExportSuite(false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showSharingPanel ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Share2 className="size-4" /><span className="hidden md:inline">Share & Export</span></button>
        )}
        <button onClick={openAnalyticsPanel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"><BarChart3 className="size-4" />Analytics</button>
        <button onClick={openRealtimeDashboard} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showRealtimeDashboard ? 'bg-[#0033A0] text-white border-[#0033A0]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Activity className="size-4" /><span className="hidden md:inline">Live</span></button>
        <button onClick={openActivityFeed} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"><Activity className="size-4" />Activity</button>
        <button onClick={() => openCommentPanel()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors relative">
          <span className="flex items-center gap-1.5"><span className="size-4">💬</span>Comments</span>
          {totalCommentCount > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#0033A0] text-[10px] font-bold text-white">{totalCommentCount}</span>}
        </button>
        <button onClick={() => setShowAnnotationPanel((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${showAnnotationPanel ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Layers className="size-4" />Annotations{totalAnnotationCount > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{totalAnnotationCount}</span>}</button>
        <button onClick={() => { setShowMilestonePanel((v) => !v); fetchMilestones?.() }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${showMilestonePanel ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Flag className="size-4" />Milestones{milestoneTotal > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">{milestoneTotal}</span>}</button>
        <button onClick={() => { setWhiteboardActive((v) => !v); if (!whiteboardActive) setAnnotationLayerActive(() => false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${whiteboardActive ? 'bg-[#0033A0] text-white border-[#0033A0]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><PenTool className="size-4" /><span className="hidden md:inline">Whiteboard</span></button>
        <button onClick={() => { setAnnotationLayerActive((v) => !v); if (!annotationLayerActive) setWhiteboardActive(() => false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${annotationLayerActive ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><StickyNote className="size-4" /><span className="hidden md:inline">Annotate</span>{annotationNodeCounts.size > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">{Array.from(annotationNodeCounts.values()).reduce((a, b) => a + b, 0)}</span>}</button>
        <button onClick={() => { setShowTeachingAssistant((v) => !v); if (!showTeachingAssistant) setShowSmartSuggestions(() => false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showTeachingAssistant ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Brain className="size-4" /><span className="hidden md:inline">AI Assistant</span></button>
        <button onClick={() => { setShowSmartSuggestions((v) => !v); if (!showSmartSuggestions) setShowTeachingAssistant(() => false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showSmartSuggestions ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Zap className="size-4" /><span className="hidden md:inline">Suggestions</span></button>
        {isEditorRole && <button onClick={() => { setShowExportSuite(!showExportSuite); if (!showExportSuite) setShowReportingDashboard(() => false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showExportSuite ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Download className="size-4" /><span className="hidden md:inline">Export</span></button>}
        {isEditorRole && <button onClick={() => { setShowReportingDashboard((v) => !v); if (!showReportingDashboard) setShowExportSuite(false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showReportingDashboard ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><FileBarChart className="size-4" /><span className="hidden md:inline">Reports</span></button>}
        {isEditorRole && <button onClick={() => setShowPluginMarketplace((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${showPluginMarketplace ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Package className="size-4" /><span className="hidden md:inline">Plugins</span>{pluginEntries.filter((p) => p.status === 'enabled').length > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">{pluginEntries.filter((p) => p.status === 'enabled').length}</span>}</button>}
        {isEditorRole && <button onClick={() => { setShowAIAssistant((v) => !v); if (!showAIAssistant) setShowSmartAutomation(() => false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showAIAssistant ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Brain className="size-4" /><span className="hidden md:inline">AI Map</span></button>}
        {isEditorRole && <button onClick={() => { setShowSmartAutomation((v) => !v); if (!showSmartAutomation) setShowAIAssistant(() => false) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${showSmartAutomation ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}><Activity className="size-4" /><span className="hidden md:inline">Smart Auto</span></button>}
        <button onClick={openHealthPanel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative" style={{ backgroundColor: healthData ? healthData.overallScore >= 80 ? '#f0fdf4' : healthData.overallScore >= 60 ? '#fffbeb' : '#fef2f2' : '#f9fafb', color: healthData ? healthData.overallScore >= 80 ? '#15803d' : healthData.overallScore >= 60 ? '#b45309' : '#dc2626' : '#374151', borderColor: healthData ? healthData.overallScore >= 80 ? '#bbf7d0' : healthData.overallScore >= 60 ? '#fde68a' : '#fecaca' : '#e5e7eb' }}><Heart className="size-4" />{healthData ? `${healthData.overallScore}` : 'Health'}</button>
        <button onClick={runTemplateSuggestions} disabled={templateSuggestLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50">{templateSuggestLoading ? <Loader2 className="size-4 animate-spin" /> : <LayoutTemplate className="size-4" />}<span className="hidden md:inline">{templateSuggestLoading ? 'Analyzing...' : 'Suggest Template'}</span></button>
        <button onClick={() => { setShowCanvasSyncDialog(true); setCanvasSyncResult(null); setCanvasSyncError(null); fetch(`/api/courses/${courseId}/course-map/canvas-sync-status`, { headers: { 'x-demo-user-email': userEmail } }).then((r) => r.ok ? r.json() : null).then((d) => { if (d) setCanvasSyncStatus(d) }).catch(() => {}) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"><RefreshCw className="size-4" />Canvas Sync</button>
        <button onClick={fetchLmsLinks} disabled={lmsLinksLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50">{lmsLinksLoading ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}<span className="hidden md:inline">Sync LMS Links</span></button>
        {/* Export dropdown */}
        <div className="relative print:hidden">
          <button onClick={() => setShowExportDropdown((v) => !v)} aria-expanded={showExportDropdown} aria-haspopup="true" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"><Download className="size-4" />{t('courseMap.export.title')}</button>
          {showExportDropdown && (
            <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <button onClick={() => exportAsPng()} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><ImageDown className="size-4 text-gray-400" />Export as PNG</button>
              <button onClick={() => exportAs('svg')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><ExternalLink className="size-4 text-gray-400" />Export as SVG</button>
              <button onClick={() => exportAs('csv')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><FileText className="size-4 text-gray-400" />Export as CSV</button>
              <button onClick={() => exportAs('json')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><Code className="size-4 text-gray-400" />Export as JSON</button>
              <div className="border-t border-gray-100" />
              <button onClick={() => { setShowExportDropdown(() => false); window.open(`/api/courses/${courseId}/course-map/export?format=pdf`, '_blank') }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><FileText className="size-4 text-gray-400" />Export as PDF</button>
              <button onClick={handlePrint} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><Printer className="size-4 text-gray-400" />Print</button>
              <div className="border-t border-gray-100" />
              <button onClick={() => { setShowExportDropdown(() => false); setShowReportModal(true) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 font-semibold"><FileBarChart className="size-4 text-[#0033A0]" />Generate Report</button>
              <div className="border-t border-gray-100" />
              <button onClick={() => { setShowExportDropdown(() => false); if (graphMap) { const md = exportToMarkdown({ id: graphMap.id, courseId: graphMap.id, nodes: graphMap.nodes, edges: graphMap.edges, units: graphMap.units }); downloadText(md, `course-map-${courseId}.md`, 'text/markdown') } }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><FileCode className="size-4 text-gray-400" />Export as Markdown</button>
              <button onClick={async () => { setShowExportDropdown(() => false); if (graphMap) { const scorm = exportToSCORM({ id: graphMap.id, courseId: graphMap.id, nodes: graphMap.nodes, edges: graphMap.edges, units: graphMap.units }, graphMap.units[0]?.label || 'Course Map'); await downloadScormPackage(scorm, `course-map-${courseId}-scorm.zip`) } }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><Package className="size-4 text-gray-400" />Export as SCORM</button>
              <button onClick={async () => { setShowExportDropdown(() => false); if (userEmail) { try { const result = await generateTimeLimitedShareLink(courseId, userEmail); await navigator.clipboard.writeText(result.url); addCollabToast('Shareable link copied!') } catch { addCollabToast('Failed to generate link') } } }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"><Link2 className="size-4 text-gray-400" />Shareable Link</button>
            </div>
          )}
        </div>
        <button onClick={() => { setShowCourseCompare(true); setCourseComparisonResult(null); setCompareTargetCourseId(''); fetchCompareCourses() }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"><ArrowLeftRight className="size-4" /><span className="hidden md:inline">Compare Courses</span></button>
        <button onClick={runGapAnalysis} disabled={gapLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50">{gapLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}<span className="hidden md:inline">{gapLoading ? 'Analyzing...' : 'Gap Analysis'}</span></button>
        <button onClick={runPrereqValidation} disabled={prereqValidLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-50">{prereqValidLoading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}<span className="hidden md:inline">{prereqValidLoading ? 'Validating...' : 'Validate Prerequisites'}</span></button>
        <button onClick={runSuggestEdges} disabled={suggestLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50">{suggestLoading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}<span className="hidden md:inline">{suggestLoading ? 'Suggesting...' : 'Suggest Edges'}</span></button>
        <button onClick={runAiSuggestions} disabled={aiSuggestionsLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-50">{aiSuggestionsLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}<span className="hidden md:inline">{aiSuggestionsLoading ? 'Analyzing...' : 'AI Suggestions'}</span></button>
        {/* NL Edit */}
        <div className="relative">
          <button onClick={() => setNlEditOpen(!nlEditOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"><Wand2 className="size-4" /><span className="hidden md:inline">AI Edit</span></button>
          {nlEditOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-lg z-50">
              <h4 className="text-sm font-extrabold text-gray-900 mb-2">Describe your changes</h4>
              <textarea value={nlEditInstruction} onChange={(e) => setNlEditInstruction(e.target.value)} placeholder="e.g., Add a prerequisite from Week 1 Lecture to Week 2 Lab..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" rows={3} maxLength={2000} />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{nlEditInstruction.length}/2000</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setNlEditOpen(false); setNlEditInstruction('') }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button onClick={submitNlEdit} disabled={nlEditLoading || !nlEditInstruction.trim()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                    {nlEditLoading ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}{nlEditLoading ? 'Processing...' : 'Submit'}
                  </button>
                </div>
              </div>
              {nlEditChanges.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-600 mb-2">{nlEditSummary}</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {nlEditChanges.map((change, i) => (
                      <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 text-xs text-emerald-800"><CheckCircle className="size-3 shrink-0 mt-0.5 text-emerald-500" />{change.description}</div>
                    ))}
                  </div>
                  <button onClick={applyNlChanges} disabled={nlEditApplying} className="flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                    {nlEditApplying ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}{nlEditApplying ? 'Applying...' : `Apply All (${nlEditChanges.length} changes)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setShowSaveTemplateDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"><LayoutTemplate className="size-4" /><span className="hidden md:inline">Save as Template</span></button>
        <button onClick={() => { setShowDuplicateDialog(true); fetch('/api/courses', { headers: { 'x-demo-user-email': userEmail } }).then(r => r.json()).then(data => { const courses = (data.courses || data || []).filter((c: { id: string }) => c.id !== courseId).map((c: { id: string; courseCode?: string; title?: string }) => ({ id: c.id, courseCode: c.courseCode || '', title: c.title || 'Untitled' })); setUserCourses(courses) }).catch(() => setUserCourses([])) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"><CopyPlus className="size-4" /><span className="hidden md:inline">Duplicate to Course</span></button>
      </div>
    </div>
  )
}
