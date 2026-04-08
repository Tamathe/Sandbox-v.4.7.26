'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  X,
  FileText,
  Calendar,
  GripVertical,
  Pencil,
  ClipboardList,
  Target,
  Layers,
  GitFork,
  Upload,
  Circle,
  MousePointer,
  Link as LinkIcon,
  Trash2,
  Sparkles,
  Wand2,
  Check,
  Loader2,
  Route,
  Camera,
  History,
  RotateCcw,
  Users,
  Share2,
  Copy,
  ExternalLink,
  Download,
  Printer,
  Lock,
  LayoutTemplate,
  CopyPlus,
  GitCompare,
  GitMerge,
  Plus,
  Minus,
  MoveHorizontal,
  Activity,
  ChevronRight,
  User,
  BarChart3,
  Heart,
  TrendingUp,
  RefreshCw,
  Code,
  MessageSquare,
  Send,
  Reply,
  CheckCircle2,
  Eye,
  EyeOff,
  SplitSquareHorizontal,
  Bell,
  Globe,
  Zap,
  CalendarDays,
  Flame,
  Brain,
  ShieldCheck,
  StickyNote,
  Highlighter,
  PenTool,
  UsersRound,
  Flag,
  Trophy,
  PartyPopper,
  FileBarChart,
  ArrowLeftRight,
  Settings,
  CheckCheck,
  Clock,
  Inbox,
  WifiOff,
  Wifi,
  CloudOff,
  ImageDown,
  Package,
  Maximize2,
  Group,
  Search,
  FileCode,
  Link2,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart as RePieChart, Pie,
} from '../../../components/DynamicChart'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import { useCourseMapKeyboard } from '../../../hooks/useCourseMapKeyboard'
import { useT } from '../../../lib/i18n/locale-context'
import { useCourseMapVirtualization } from '../../../hooks/useCourseMapVirtualization'
import { useCourseMapOffline } from '../../../hooks/useCourseMapOffline'
import { subscribeToPush, unsubscribeFromPush, isPushEnabled } from '../../../lib/course-map/push-notifications'
import ServiceWorkerUpdatePrompt from '../../../components/ServiceWorkerUpdatePrompt'
import LiveCursors from '../../../components/course-map/LiveCursors'
import type { RemoteCursorData } from '../../../components/course-map/LiveCursors'
import PresenceBadges from '../../../components/course-map/PresenceBadges'
import type { EditingBadge } from '../../../components/course-map/PresenceBadges'
import PresenceBar from '../../../components/course-map/PresenceBar'
import EditLockIndicator from '../../../components/course-map/EditLockIndicator'
import type { EditLockInfo } from '../../../components/course-map/EditLockIndicator'
import ConflictResolutionDialog from '../../../components/course-map/ConflictResolutionDialog'
import ChangeNotificationToast from '../../../components/course-map/ChangeNotificationToast'
import BranchSwitcher from '../../../components/course-map/BranchSwitcher'
import BranchComparisonView from '../../../components/course-map/BranchComparisonView'
import MergeBranchDialog from '../../../components/course-map/MergeBranchDialog'
import { BranchManager } from '../../../lib/course-map/branch-service'
import type { BranchInfo, BranchSnapshot, BranchDiffResult } from '../../../lib/course-map/branch-service'
import { MergeEngine } from '../../../lib/course-map/merge-engine'
import type { MergePreview, MergeHistoryEntry, CherryPickItem, MergeExecutionResult } from '../../../lib/course-map/merge-engine'
import { PresenceManager } from '../../../lib/course-map/presence-service'
import type { PresenceUser } from '../../../lib/course-map/presence-service'
import { CollabEngine } from '../../../lib/course-map/collab-engine'
import type { ConflictData, ConflictStrategy, RemoteEditNotification } from '../../../lib/course-map/collab-engine'
import PluginMarketplace from '../../../components/course-map/PluginMarketplace'
import PluginDetailCard from '../../../components/course-map/PluginDetailCard'
import PluginSettingsPanel from '../../../components/course-map/PluginSettingsPanel'
import { PluginRegistry } from '../../../lib/course-map/plugin-registry'
import type { PluginEntry, PluginManifest } from '../../../lib/course-map/plugin-registry'
import { PluginAPI } from '../../../lib/course-map/plugin-api'
import type { PluginAPICallbacks } from '../../../lib/course-map/plugin-api'
import { SAMPLE_PLUGINS, getAvailablePlugins, getSamplePlugin } from '../../../lib/course-map/sample-plugins'
import AIAssistantPanel from '../../../components/course-map/AIAssistantPanel'
import SmartAutomationPanel from '../../../components/course-map/SmartAutomationPanel'
import { type MapAction } from '../../../lib/course-map/ai-assistant-service'
import { type FixAction } from '../../../lib/course-map/smart-automation-service'
import AnalyticsDashboardPanel from '../../../components/course-map/AnalyticsDashboardPanel'
import PerfOverlay from '../../../components/course-map/PerfOverlay'
import WhiteboardOverlay from '../../../components/course-map/WhiteboardOverlay'
import AnnotationLayer from '../../../components/course-map/AnnotationLayer'
import TeachingAssistantPanel from '../../../components/course-map/TeachingAssistantPanel'
import SmartSuggestionsPanel from '../../../components/course-map/SmartSuggestionsPanel'
import ExportSuitePanel from '../../../components/course-map/ExportSuitePanel'
import SharingPanel from '../../../components/course-map/SharingPanel'
import SearchFilterPanel from '../../../components/course-map/SearchFilterPanel'
import {
  exportToSCORM,
  exportToMarkdown,
  generateTimeLimitedShareLink,
  downloadScormPackage,
  downloadText,
} from '../../../lib/course-map/export-service'
import ReportingDashboardPanel from '../../../components/course-map/ReportingDashboardPanel'
import AccessibilityOverlay from '../../../components/course-map/AccessibilityOverlay'
import LocaleSwitcher from '../../../components/course-map/LocaleSwitcher'
import MinimapNavigator from '../../../components/course-map/MinimapNavigator'
import NodeGroupOverlay from '../../../components/course-map/NodeGroupOverlay'
import {
  VisualizationService,
  type EdgeRoutingMode,
  type VisNode,
  type GroupedNodeSet,
} from '../../../lib/course-map/visualization-service'
import { PerformanceService, type RenderMetrics } from '../../../lib/course-map/performance-service'
import { useCourseMapA11y } from '../../../hooks/useCourseMapA11y'
import { useLocale } from '../../../lib/i18n/locale-context'
import { isRtlLocale } from '../../../lib/i18n/rtl-support'
import { RealtimeAnalyticsManager, type NodeHeatmapEntry } from '../../../lib/course-map/realtime-analytics'
import {
  trackRenderTime,
  trackApiLatency,
  initWebVitalsObserver,
  getPerformanceReport,
  checkPerformanceBudget,
  collectMetricsBatch,
  type PerformanceReport as PerfReport,
  type BudgetViolation,
} from '../../../lib/course-map/perf-monitor'

// ── Types ────────────────────────────────────────────────────────────────────

interface CourseLessonItem {
  id: string
  label: string
  rawSourceText: string | null
  dueDate: string | null
  dateConfidence: number | null
}

interface CourseModule {
  id: string
  label: string
  description: string | null
  lessons: CourseLessonItem[]
}

interface CourseUnit {
  id: string
  label: string
  description: string | null
  unitType: string
  startDate: string | null
  endDate: string | null
  dateConfidence: number | null
  rawSourceText: string | null
  position: number
  modules: CourseModule[]
}

interface MapNode {
  id: string
  courseMapId: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

interface MapEdge {
  id: string
  courseMapId: string
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
}

interface GraphMap {
  id: string
  courseId: string
  units: CourseUnit[]
  nodes: MapNode[]
  edges: MapEdge[]
}

interface ValidationError {
  rule: string
  message: string
  severity: 'error' | 'warning'
  nodeLabel?: string
}

interface ValidationReport {
  status: 'PASS' | 'WARN' | 'BLOCK'
  errors: ValidationError[]
  warnings: ValidationError[]
  canAutoPublish: boolean
}

// ── Gap analysis types ──────────────────────────────────────────────────────

interface GapFinding {
  nodeId: string
  issue: string
  suggestion: string
  severity: 'error' | 'warning'
}

interface EdgeSuggestion {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
  reason: string
}

// ── AI study recommendation types ──────────────────────────────────────────

interface StudyRecommendation {
  nodeId: string
  nodeLabel: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
}

// ── Prerequisite validation types ──────────────────────────────────────────

interface PrereqValidation {
  nodeId: string
  nodeLabel: string
  prerequisiteNodeId: string
  prerequisiteLabel: string
  status: 'ok' | 'gap' | 'partial'
  suggestion: string
}

// ── Progress types ──────────────────────────────────────────────────────────

type NodeProgressStatus = 'completed' | 'in-progress' | 'not-started'

interface LessonProgressEntry {
  lessonId: string
  completed: boolean
}

interface NodeProgress {
  nodeId: string
  courseUnitId: string
  status: NodeProgressStatus
  totalLessons: number
  completedLessons: number
  lessons: LessonProgressEntry[]
}

// ── Learning path types ──────────────────────────────────────────────────────

interface LearningPathEntry {
  nodeId: string
  position: number
  status: 'completed' | 'in-progress' | 'not-started'
  dueDate: string | null
  label: string
}

// ── Collab types ────────────────────────────────────────────────────────────

interface ActiveEditor {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  joinedAt: string
  lastSeenAt: string
}

interface RemoteCursor {
  userId: string
  userName: string
  x: number
  y: number
  lastUpdated: number
}

interface RemoteEditingNode {
  userId: string
  userName: string
  nodeId: string
}

interface ConflictInfo {
  editorName: string
  label?: string
  unitType?: string
}

interface SnapshotSummary {
  id: string
  name: string | null
  createdById: string | null
  createdAt: string
  nodeCount: number
  edgeCount: number
}

interface CollabToast {
  id: string
  message: string
  timestamp: number
}

interface SnapshotNodeData {
  id: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

interface SnapshotEdgeData {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface DiffResult {
  addedNodes: SnapshotNodeData[]
  removedNodes: SnapshotNodeData[]
  movedNodes: { node: SnapshotNodeData; fromX: number; fromY: number; toX: number; toY: number }[]
  modifiedNodes: { node: SnapshotNodeData; oldLabel: string; newLabel: string }[]
  unchangedNodes: SnapshotNodeData[]
  addedEdges: SnapshotEdgeData[]
  removedEdges: SnapshotEdgeData[]
  unchangedEdges: SnapshotEdgeData[]
}

interface MergeConflict {
  nodeId: string
  field: string
  baseValue: string | number
  sourceValue: string | number
  targetValue: string | number
}

interface MergeResult {
  mergedNodes: SnapshotNodeData[]
  mergedEdges: SnapshotEdgeData[]
  conflicts: MergeConflict[]
}

// ── Activity entry type ──────────────────────────────────────────────────────

interface ActivityEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  editType: string
  description: string
  payload: unknown
  createdAt: string
}

// ── Comment types ───────────────────────────────────────────────────────────

interface CommentEntry {
  id: string
  courseMapId: string
  nodeId: string | null
  edgeId: string | null
  parentId: string | null
  userId: string
  userName: string
  userEmail: string
  content: string
  resolved: boolean
  resolvedById: string | null
  resolvedByName: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  replies: CommentEntry[]
}

// ── Annotation types ────────────────────────────────────────────────────────

interface AnnotationLayerData {
  id: string
  name: string
  color: string
  createdById: string
  metadata: Record<string, unknown> | null
  _count: { annotations: number }
}

interface AnnotationData {
  id: string
  layerId: string
  type: 'note' | 'highlight' | 'drawing'
  content: string
  positionX: number
  positionY: number
  targetNodeId: string | null
  layer: { id: string; name: string; color: string }
}

// ── Study group types ───────────────────────────────────────────────────────

interface StudyGroupSummary {
  id: string
  name: string
  nodeId: string
  nodeLabel: string | null
  memberCount: number
  createdById: string
  createdAt: string
}

interface StudyGroupDetail {
  id: string
  name: string
  nodeId: string
  courseId: string
  members: Array<{ userId: string; name: string; avatarUrl: string | null; joinedAt: string }>
  createdById: string
  createdAt: string
}

interface GroupMessage {
  id: string
  userId: string
  userName: string
  avatarUrl: string | null
  content: string
  createdAt: string
}

interface GroupProgress {
  nodeId: string
  totalMembers: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  completionRate: number
}

// ── Milestone types ─────────────────────────────────────────────────────────

interface MilestoneData {
  id: string
  courseId: string
  nodeId: string
  nodeLabel: string | null
  label: string
  description: string | null
  position: number
  achieved: boolean
  achievedAt: string | null
}

interface MilestoneSummary {
  total: number
  achieved: number
  milestones: MilestoneData[]
  newlyAchieved?: Array<{ milestoneId: string; label: string; nodeLabel: string | null }>
}

// ── Snapshot comparison types ───────────────────────────────────────────────

interface SnapshotComparisonResult {
  added: { nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] }
  removed: { nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] }
  modified: {
    nodes: Array<{ id: string; field: string; oldValue: string | number | boolean; newValue: string | number | boolean; node: SnapshotNodeData }>
    edges: Array<{ id: string; field: string; oldValue: string; newValue: string; edge: SnapshotEdgeData }>
  }
  summary: string
}

// ── Editor colors for collab indicators ─────────────────────────────────────

const EDITOR_COLORS = [
  '#dc2626', '#2563eb', '#9333ea', '#059669', '#d97706', '#db2777',
  '#0891b2', '#4f46e5', '#ea580c', '#65a30d',
]

function getEditorColor(index: number): string {
  return EDITOR_COLORS[index % EDITOR_COLORS.length]
}

// ── Edge color map ───────────────────────────────────────────────────────────

const EDGE_COLORS: Record<string, string> = {
  PREREQUISITE: '#dc2626', // red
  SEQUENCE: '#2563eb',     // blue
  CONCURRENT: '#9333ea',   // purple
}

const EDGE_LABELS: Record<string, string> = {
  PREREQUISITE: 'Prerequisite',
  SEQUENCE: 'Sequence',
  CONCURRENT: 'Concurrent',
}

// ── Unit type badge colors ───────────────────────────────────────────────────

const UNIT_TYPE_COLORS: Record<string, string> = {
  LECTURE: 'bg-blue-100 text-blue-700',
  LAB: 'bg-green-100 text-green-700',
  EXAM: 'bg-red-100 text-red-700',
  QUIZ: 'bg-amber-100 text-amber-700',
  ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
  DISCUSSION: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

// ── Progress border/indicator colors ────────────────────────────────────────

const PROGRESS_BORDER: Record<NodeProgressStatus, string> = {
  'completed': 'border-green-500',
  'in-progress': 'border-amber-500',
  'not-started': 'border-gray-200',
}

// ── Confidence dot ───────────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: number | null }) {
  if (confidence == null) return null
  const color =
    confidence >= 0.95
      ? 'bg-green-500'
      : confidence >= 0.8
        ? 'bg-amber-500'
        : 'bg-red-500'
  const label =
    confidence >= 0.95 ? 'High' : confidence >= 0.8 ? 'Medium' : 'Low'
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <span className={`size-2 rounded-full ${color}`} />
      {label} ({Math.round(confidence * 100)}%)
    </span>
  )
}

// ── Validation banner ────────────────────────────────────────────────────────

function ValidationBanner({ validation }: { validation: ValidationReport }) {
  if (validation.status === 'PASS' && validation.warnings.length === 0) {
    return (
      <div role="status" className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-800">
        <CheckCircle className="size-4 shrink-0" aria-hidden="true" />
        All validation checks passed.
      </div>
    )
  }

  const isBLOCK = validation.status === 'BLOCK'
  const bg = isBLOCK ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
  const text = isBLOCK ? 'text-red-800' : 'text-amber-800'
  const Icon = isBLOCK ? ShieldAlert : AlertTriangle
  const items = [...validation.errors, ...validation.warnings]

  return (
    <div className={`${bg} border rounded-xl px-4 py-3 ${text} text-sm`}>
      <div className="flex items-center gap-2 font-semibold mb-1">
        <Icon className="size-4 shrink-0" />
        {isBLOCK ? 'Validation blocked — issues must be resolved' : 'Validation passed with warnings'}
      </div>
      <ul className="list-disc list-inside space-y-0.5 ml-1">
        {items.map((item, i) => (
          <li key={i}>
            <span className="font-medium">{item.rule}</span>: {item.message}
            {item.nodeLabel && <span className="text-xs ml-1">({item.nodeLabel})</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── SVG edge rendering ───────────────────────────────────────────────────────

const NODE_WIDTH = 240
const NODE_HEIGHT = 80

function computeEdgePath(from: MapNode, to: MapNode, routingMode: EdgeRoutingMode = 'bezier') {
  return VisualizationService.routeEdge(from, to, NODE_WIDTH, NODE_HEIGHT, routingMode)
}

function EdgesSvg({
  edges,
  nodeMap,
  isEditor,
  onDeleteEdge,
  connectingFrom,
  cursorPos,
  routingMode = 'bezier',
}: {
  edges: MapEdge[]
  nodeMap: Map<string, MapNode>
  isEditor: boolean
  onDeleteEdge?: (edgeId: string) => void
  connectingFrom?: MapNode | null
  cursorPos?: { x: number; y: number } | null
  routingMode?: EdgeRoutingMode
}) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  return (
    <svg className="absolute inset-0" role="img" aria-label="Course map connections diagram" style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <defs>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <marker
            key={type}
            id={`arrow-${type}`}
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* Existing edges */}
      {edges.map((edge) => {
        const from = nodeMap.get(edge.fromNodeId)
        const to = nodeMap.get(edge.toNodeId)
        if (!from || !to) return null

        const d = computeEdgePath(from, to, routingMode)
        const color = EDGE_COLORS[edge.edgeType] || '#6b7280'
        const isHovered = hoveredEdge === edge.id
        const edgeLabel = `${EDGE_LABELS[edge.edgeType] || edge.edgeType} connection from ${from.label} to ${to.label}`

        return (
          <g key={edge.id}>
            <title>{edgeLabel}</title>
            {/* Invisible wide hit area for hover/click */}
            {isEditor && (
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteEdge?.(edge.id)
                }}
              />
            )}
            <path
              d={d}
              fill="none"
              stroke={isHovered ? '#ef4444' : color}
              strokeWidth={isHovered ? 3 : 2}
              markerEnd={isHovered ? undefined : `url(#arrow-${edge.edgeType})`}
              opacity={isHovered ? 1 : 0.7}
              style={{ pointerEvents: 'none' }}
            />
            {/* Delete icon on hover */}
            {isHovered && isEditor && (() => {
              const midX = (from.xPos + NODE_WIDTH / 2 + to.xPos + NODE_WIDTH / 2) / 2
              const midY = (from.yPos + NODE_HEIGHT + to.yPos) / 2
              return (
                <g
                  transform={`translate(${midX - 10}, ${midY - 10})`}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  role="button"
                  aria-label={`Delete connection from ${from.label} to ${to.label}`}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteEdge?.(edge.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      e.preventDefault()
                      onDeleteEdge?.(edge.id)
                    }
                  }}
                >
                  <circle cx={10} cy={10} r={10} fill="white" stroke="#ef4444" strokeWidth={1.5} />
                  <line x1={6} y1={6} x2={14} y2={14} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                  <line x1={14} y1={6} x2={6} y2={14} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                </g>
              )
            })()}
          </g>
        )
      })}

      {/* Dashed line from connecting source to cursor */}
      {connectingFrom && cursorPos && (
        <line
          x1={connectingFrom.xPos + NODE_WIDTH / 2}
          y1={connectingFrom.yPos + NODE_HEIGHT / 2}
          x2={cursorPos.x}
          y2={cursorPos.y}
          stroke="#0033A0"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.6}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  )
}

// ── Edge type picker popover ────────────────────────────────────────────────

function EdgeTypePopover({
  position,
  onSelect,
  onCancel,
}: {
  position: { x: number; y: number }
  onSelect: (edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT') => void
  onCancel: () => void
}) {
  const types: Array<{ value: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'; label: string; color: string }> = [
    { value: 'PREREQUISITE', label: 'Prerequisite', color: '#dc2626' },
    { value: 'SEQUENCE', label: 'Sequence', color: '#2563eb' },
    { value: 'CONCURRENT', label: 'Concurrent', color: '#9333ea' },
  ]

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      className="absolute z-50 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-2 space-y-1"
      style={{ left: position.x, top: position.y }}
    >
      <p className="text-xs font-semibold text-gray-500 px-2 py-1">Edge Type</p>
      {types.map((t) => (
        <button
          key={t.value}
          onClick={() => onSelect(t.value)}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors text-left"
        >
          <span className="inline-block size-3 rounded-full" style={{ backgroundColor: t.color }} />
          {t.label}
        </button>
      ))}
      <button
        onClick={onCancel}
        className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition-colors text-center"
      >
        Cancel
      </button>
    </div>
  )
}

// ── Detail drawer ────────────────────────────────────────────────────────────

function NodeDetailDrawer({
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
              {conflictInfo.label && <span>Label → &ldquo;{conflictInfo.label}&rdquo;</span>}
              {conflictInfo.label && conflictInfo.unitType && ', '}
              {conflictInfo.unitType && <span>Type → {conflictInfo.unitType}</span>}
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Unit Type</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors disabled:opacity-50"
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
                className="flex items-center gap-1.5 text-sm text-uk-blue font-semibold hover:underline"
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
            {' → '}
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
            className="flex items-center gap-1.5 text-sm text-uk-blue font-semibold hover:underline"
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

// ── Progress indicator on node card ─────────────────────────────────────────

function NodeProgressIndicator({ progress }: { progress: NodeProgress }) {
  if (progress.status === 'completed') {
    return (
      <div className="flex items-center gap-1 mt-1">
        <CheckCircle className="size-3.5 text-green-500" />
        <span className="text-[10px] text-green-600 font-semibold">Complete</span>
      </div>
    )
  }
  if (progress.status === 'in-progress') {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <div className="size-3.5 relative">
          <svg viewBox="0 0 16 16" className="size-3.5">
            <circle cx="8" cy="8" r="7" fill="none" stroke="#d1d5db" strokeWidth="2" />
            <circle
              cx="8" cy="8" r="7" fill="none" stroke="#f59e0b" strokeWidth="2"
              strokeDasharray={`${(progress.completedLessons / progress.totalLessons) * 44} 44`}
              strokeLinecap="round"
              transform="rotate(-90 8 8)"
            />
          </svg>
        </div>
        <span className="text-[10px] text-amber-600 font-semibold">
          {progress.completedLessons}/{progress.totalLessons}
        </span>
      </div>
    )
  }
  return null
}

// ── Main page ────────────────────────────────────────────────────────────────

// ── Snap helper ─────────────────────────────────────────────────────────────

const GRID_SIZE = 20
function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}

// ── Canvas mode ─────────────────────────────────────────────────────────────

type CanvasMode = 'select' | 'connect'

export default function CourseMapVisualizationPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  const t = useT()
  const { locale, dir } = useLocale()
  const rtl = isRtlLocale(locale)
  const {
    highContrast,
    toggleHighContrast,
    announce: a11yAnnounce,
    containerClassName: a11yContainerClass,
  } = useCourseMapA11y()

  const [graphMap, setGraphMap] = useState<GraphMap | null>(null)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [syllabusStatus, setSyllabusStatus] = useState<{
    assignmentCount: number
    objectiveCount: number
    unitCount: number | null
    edgeCount: number | null
    lastParseDate: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeProgressMap, setNodeProgressMap] = useState<Map<string, NodeProgress>>(new Map())
  const [lessonProgressMap, setLessonProgressMap] = useState<Map<string, boolean>>(new Map())

  // Drag state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Connect mode state
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select')
  const [showAdvancedGraph, setShowAdvancedGraph] = useState(false)
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [edgeTypePopover, setEdgeTypePopover] = useState<{
    fromNodeId: string
    toNodeId: string
    position: { x: number; y: number }
  } | null>(null)

  // Edge delete confirmation
  const [pendingDeleteEdgeId, setPendingDeleteEdgeId] = useState<string | null>(null)

  // Gap analysis state
  const [gapFindings, setGapFindings] = useState<GapFinding[]>([])
  const [gapLoading, setGapLoading] = useState(false)
  const [gapPanelOpen, setGapPanelOpen] = useState(false)
  const [hoveredGapNodeId, setHoveredGapNodeId] = useState<string | null>(null)

  // Edge suggestions state
  const [edgeSuggestions, setEdgeSuggestions] = useState<EdgeSuggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)

  // AI suggestions state (Task 43)
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    id: string
    type: 'reorder' | 'add_prerequisite' | 'regroup' | 'remove_redundant'
    description: string
    affectedNodeIds: string[]
    proposedChanges: { action: string; details: Record<string, unknown> }
  }>>([])
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false)
  const [aiSuggestionsPanelOpen, setAiSuggestionsPanelOpen] = useState(false)
  const [aiSuggestionsSummary, setAiSuggestionsSummary] = useState('')
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null)
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set())

  // Keyboard navigation (Task 45 → Task 67: extracted to hook)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // NL edit state (Task 44)
  const [nlEditOpen, setNlEditOpen] = useState(false)
  const [nlEditInstruction, setNlEditInstruction] = useState('')
  const [nlEditLoading, setNlEditLoading] = useState(false)
  const [nlEditChanges, setNlEditChanges] = useState<Array<{
    action: string
    details: Record<string, unknown>
    description: string
  }>>([])
  const [nlEditSummary, setNlEditSummary] = useState('')
  const [nlEditApplying, setNlEditApplying] = useState(false)

  // Learning path state (students only)
  const [learningPath, setLearningPath] = useState<LearningPathEntry[]>([])
  const [showLearningPath, setShowLearningPath] = useState(true)

  // Collab state
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([])
  const [collabToasts, setCollabToasts] = useState<CollabToast[]>([])
  const collabToastIdRef = useRef(0)

  // Remote cursor state (Task 49)
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])
  const lastCursorBroadcastRef = useRef(0)
  const canvasFocusedRef = useRef(false)

  // Remote editing node state (Task 50)
  const [remoteEditingNodes, setRemoteEditingNodes] = useState<RemoteEditingNode[]>([])
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null)

  // Presence & Collab engine refs (Task 91/92)
  const presenceManagerRef = useRef<PresenceManager | null>(null)
  const collabEngineRef = useRef<CollabEngine | null>(null)
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const [collabConflict, setCollabConflict] = useState<ConflictData | null>(null)
  const [remoteEditNotifications, setRemoteEditNotifications] = useState<RemoteEditNotification[]>([])
  const [editLocks, setEditLocks] = useState<EditLockInfo[]>([])

  // Snapshot state
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [snapshotName, setSnapshotName] = useState('')
  const [savingSnapshot, setSavingSnapshot] = useState(false)
  const [showSnapshotDropdown, setShowSnapshotDropdown] = useState(false)
  const [showSnapshotNameInput, setShowSnapshotNameInput] = useState(false)
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)

  // Diff state
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffSnapshotId, setDiffSnapshotId] = useState<string | null>(null)

  // Merge state
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeBaseId, setMergeBaseId] = useState<string | null>(null)
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [mergeResolutions, setMergeResolutions] = useState<Record<string, string | number>>({})
  const [applyingMerge, setApplyingMerge] = useState(false)

  // Share state
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showSharingPanel, setShowSharingPanel] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareAccessCode, setShareAccessCode] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const [accessCodeInput, setAccessCodeInput] = useState('')

  // Export state
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportIncludeAnnotations, setReportIncludeAnnotations] = useState(true)
  const [reportIncludeMilestones, setReportIncludeMilestones] = useState(true)
  const [reportIncludeHealth, setReportIncludeHealth] = useState(true)
  const [reportIncludeAnalytics, setReportIncludeAnalytics] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)

  // Course comparison state
  const [showCourseCompare, setShowCourseCompare] = useState(false)
  const [compareTargetCourseId, setCompareTargetCourseId] = useState('')
  const [compareCourses, setCompareCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [courseComparisonResult, setCourseComparisonResult] = useState<{
    courseA: { id: string; courseCode: string; title: string }
    courseB: { id: string; courseCode: string; title: string }
    statsA: { nodeCount: number; edgeCount: number; unitTypeDistribution: Record<string, number>; edgeTypeDistribution: Record<string, number> }
    statsB: { nodeCount: number; edgeCount: number; unitTypeDistribution: Record<string, number>; edgeTypeDistribution: Record<string, number> }
    overlaps: Array<{ nodeA: { id: string; label: string }; nodeB: { id: string; label: string }; similarity: number }>
    uniqueToA: Array<{ id: string; label: string; nodeType: string }>
    uniqueToB: Array<{ id: string; label: string; nodeType: string }>
    summary: string[]
  } | null>(null)
  const [courseComparisonLoading, setCourseComparisonLoading] = useState(false)

  // Canvas sync state
  const [showCanvasSyncDialog, setShowCanvasSyncDialog] = useState(false)
  const [canvasCourseIdInput, setCanvasCourseIdInput] = useState('')
  const [canvasSyncing, setCanvasSyncing] = useState(false)
  const [canvasSyncResult, setCanvasSyncResult] = useState<string | null>(null)
  const [canvasSyncError, setCanvasSyncError] = useState<string | null>(null)
  const [canvasSyncStatus, setCanvasSyncStatus] = useState<{
    configured: boolean
    lastSyncAt: string | null
    unitCount: number
    nodeCount: number
  } | null>(null)

  // LMS deep links state
  const [lmsLinks, setLmsLinks] = useState<Map<string, { lmsUrl: string; linkType: string; title: string }>>(new Map())
  const [lmsLinksLoading, setLmsLinksLoading] = useState(false)
  const [lmsLinksConfigured, setLmsLinksConfigured] = useState(false)

  // Embed tab state in share dialog
  const [shareTab, setShareTab] = useState<'share' | 'embed' | 'webhooks'>('share')
  const [embedWidth, setEmbedWidth] = useState(800)
  const [embedHeight, setEmbedHeight] = useState(600)

  // Template state
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Smart template suggestion state (Task 52)
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false)
  const [templateSuggestions, setTemplateSuggestions] = useState<Array<{
    templateId: string; templateName: string; reasoning: string; confidence: number
  }>>([])
  const [templateSuggestLoading, setTemplateSuggestLoading] = useState(false)
  const [applyingPresetId, setApplyingPresetId] = useState<string | null>(null)

  // Notify students state
  const [notifyingStu, setNotifyingStu] = useState(false)
  const [notifyStuResult, setNotifyStuResult] = useState<string | null>(null)

  // Webhook state
  interface WebhookEntry { id: string; url: string; secret: string; events: string[]; active: boolean }
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>([])
  const [addingWebhook, setAddingWebhook] = useState(false)
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)

  // Notification center state (Task 69)
  type NotifType = 'edit' | 'comment' | 'milestone_achieved' | 'health_change' | 'snapshot' | 'collaboration'
  interface NotifEntry {
    id: string; courseId: string; userId: string; userName: string; type: NotifType
    title: string; description: string; nodeId: string | null; readBy: string[]; createdAt: string
  }
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifEntries, setNotifEntries] = useState<NotifEntry[]>([])
  const [notifUnreadCount, setNotifUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifFilterType, setNotifFilterType] = useState<NotifType | 'all'>('all')

  // Webhook dashboard state (Task 70)
  const [showWebhookDashboard, setShowWebhookDashboard] = useState(false)
  const [webhookEditId, setWebhookEditId] = useState<string | null>(null)
  const [webhookEditName, setWebhookEditName] = useState('')
  const [webhookEditUrl, setWebhookEditUrl] = useState('')
  const [webhookEditSecret, setWebhookEditSecret] = useState('')
  const [webhookEditEvents, setWebhookEditEvents] = useState<string[]>([])
  const [webhookEditActive, setWebhookEditActive] = useState(true)
  const [webhookDeliveries, setWebhookDeliveries] = useState<Array<{
    id: string; webhookId: string; event: string; status: number | null
    responseTimeMs: number | null; requestBody: unknown; responseBody: string | null
    error: string | null; createdAt: string
  }>>([])
  const [webhookDeliveriesLoading, setWebhookDeliveriesLoading] = useState(false)
  const [webhookDeliveriesForId, setWebhookDeliveriesForId] = useState<string | null>(null)
  const [webhookExpandedDelivery, setWebhookExpandedDelivery] = useState<string | null>(null)
  const [webhookTestResult, setWebhookTestResult] = useState<{ ok: boolean; status?: number; error?: string } | null>(null)

  // Study plan state (students)
  interface StudyPlanEntry { id: string; nodeId: string; targetDate: string; completedAt: string | null; status: 'planned' | 'overdue' | 'completed' }
  const [showStudyPlan, setShowStudyPlan] = useState(true) // default on for students
  const [studyPlanEntries, setStudyPlanEntries] = useState<StudyPlanEntry[]>([])
  const [studyPlanStats, setStudyPlanStats] = useState<{ planned: number; completed: number; overdue: number }>({ planned: 0, completed: 0, overdue: 0 })
  const [planNodeId, setPlanNodeId] = useState<string | null>(null)
  const [planDate, setPlanDate] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  // Peer progress heatmap state
  interface HeatmapEntry { nodeId: string; completionRate: number; totalStudents: number; completedCount?: number; inProgressCount?: number; notStartedCount?: number }
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapData, setHeatmapData] = useState<Map<string, HeatmapEntry>>(new Map())
  const [heatmapLoading, setHeatmapLoading] = useState(false)

  // AI study recommendations state (Task 59)
  const [studyRecommendations, setStudyRecommendations] = useState<StudyRecommendation[]>([])
  const [studyRecsLoading, setStudyRecsLoading] = useState(false)
  const [studyRecsPanelOpen, setStudyRecsPanelOpen] = useState(false)

  // Prerequisite validation state (Task 60)
  const [prereqValidations, setPrereqValidations] = useState<PrereqValidation[]>([])
  const [prereqValidLoading, setPrereqValidLoading] = useState(false)
  const [prereqValidPanelOpen, setPrereqValidPanelOpen] = useState(false)
  const [hoveredPrereqNodeId, setHoveredPrereqNodeId] = useState<string | null>(null)

  // Annotation layers state (Task 62)
  const [annotationLayers, setAnnotationLayers] = useState<AnnotationLayerData[]>([])
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<'none' | 'note' | 'highlight'>('none')
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(new Set())
  const [newLayerName, setNewLayerName] = useState('')
  const [creatingLayer, setCreatingLayer] = useState(false)
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const [annotationNoteText, setAnnotationNoteText] = useState('')

  // Study groups state (Task 63)
  const [studyGroups, setStudyGroups] = useState<StudyGroupSummary[]>([])
  const [showStudyGroupPanel, setShowStudyGroupPanel] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<StudyGroupDetail | null>(null)
  const [selectedGroupProgress, setSelectedGroupProgress] = useState<GroupProgress | null>(null)
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [groupMessageInput, setGroupMessageInput] = useState('')
  const [sendingGroupMsg, setSendingGroupMsg] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupNodeId, setNewGroupNodeId] = useState<string | null>(null)
  const [nodeGroupCounts, setNodeGroupCounts] = useState<Record<string, number>>({})

  // Milestones state (Task 64)
  const [milestones, setMilestones] = useState<MilestoneData[]>([])
  const [milestoneTotal, setMilestoneTotal] = useState(0)
  const [milestoneAchieved, setMilestoneAchieved] = useState(0)
  const [showMilestonePanel, setShowMilestonePanel] = useState(false)
  const [celebratingMilestone, setCelebratingMilestone] = useState<string | null>(null)
  const [milestoneNodeIds, setMilestoneNodeIds] = useState<Set<string>>(new Set())

  // Duplicate state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [userCourses, setUserCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [duplicateTargetId, setDuplicateTargetId] = useState('')
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateOverwriteConfirm, setDuplicateOverwriteConfirm] = useState(false)

  // Activity feed state
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])
  const [activityCursor, setActivityCursor] = useState<string | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)

  // Analytics panel state
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<{
    editCountByUser: { userId: string; name: string; count: number }[]
    editCountByType: { type: string; count: number }[]
    editsPerDay: { date: string; count: number }[]
    nodeChangeFrequency: { nodeId: string; label: string; changeCount: number }[]
    collaboratorCount: number
    totalEdits: number
    mostActiveDay: string
    averageEditsPerDay: number
  } | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Real-time analytics state (Task 73)
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'realtime' | 'performance'>('overview')
  const [realtimeData, setRealtimeData] = useState<{
    liveEditCount: number
    activeUserCount: number
    activeUsers: { userId: string; name: string; lastActiveAt: string }[]
    heatmap: { nodeId: string; label: string; editCount: number; intensity: number }[]
    engagement: { totalSessions: number; avgSessionDurationMin: number; editsPerSession: number; uniqueEditors7d: number }
    timeSeries: { timestamp: string; edits: number }[]
    timeSeriesRange: '24h' | '7d' | '30d'
  } | null>(null)
  const [realtimeLoading, setRealtimeLoading] = useState(false)
  const [realtimeRange, setRealtimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [heatmapOverlay, setHeatmapOverlay] = useState(false)
  const realtimePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Performance monitoring state (Task 74)
  const [perfReport, setPerfReport] = useState<PerfReport | null>(null)
  const [perfBudgetViolations, setPerfBudgetViolations] = useState<BudgetViolation[]>([])
  const [serverPerfData, setServerPerfData] = useState<{
    renders: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number }>
    api: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number; errorRate: number }>
    webVitals: { lcp: number | null; fid: number | null; cls: number | null }
    updatedAt: string | null
  } | null>(null)

  // Health score state
  const [healthData, setHealthData] = useState<{
    overallScore: number
    grades: { dimension: string; score: number; label: string; detail: string }[]
    recommendations: string[]
  } | null>(null)
  const [showHealthPanel, setShowHealthPanel] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)

  // Comment state
  const [showCommentPanel, setShowCommentPanel] = useState(false)
  const [comments, setComments] = useState<CommentEntry[]>([])
  const [commentCounts, setCommentCounts] = useState<{ nodeCounts: Record<string, number>; edgeCounts: Record<string, number> }>({ nodeCounts: {}, edgeCounts: {} })
  const [commentNodeId, setCommentNodeId] = useState<string | null>(null)
  const [commentEdgeId, setCommentEdgeId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [showResolvedComments, setShowResolvedComments] = useState(false)
  const [commentMentionSearch, setCommentMentionSearch] = useState('')

  // Version comparison state
  const [showCompareView, setShowCompareView] = useState(false)
  const [compareSnapshotA, setCompareSnapshotA] = useState<string>('')
  const [compareSnapshotB, setCompareSnapshotB] = useState<string>('')
  const [comparisonResult, setComparisonResult] = useState<SnapshotComparisonResult | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [compareSnapshotDataA, setCompareSnapshotDataA] = useState<{ nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] } | null>(null)
  const [compareSnapshotDataB, setCompareSnapshotDataB] = useState<{ nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] } | null>(null)

  const isStudent = currentUser?.role === 'STUDENT'
  const isEditorRole = currentUser?.role === 'EDUCATOR' || currentUser?.role === 'ADMIN'

  // Branch management state (Task 93/94)
  const branchManagerRef = useRef<BranchManager | null>(null)
  const mergeEngineRef = useRef<MergeEngine | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [currentBranch, setCurrentBranch] = useState<BranchInfo | null>(null)
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [showBranchComparison, setShowBranchComparison] = useState(false)
  const [branchCompareA, setBranchCompareA] = useState<BranchInfo | null>(null)
  const [branchCompareB, setBranchCompareB] = useState<BranchInfo | null>(null)
  const [branchDiff, setBranchDiff] = useState<BranchDiffResult | null>(null)
  const [branchDiffLoading, setBranchDiffLoading] = useState(false)
  const [showMergeBranchDialog, setShowMergeBranchDialog] = useState(false)
  const [mergeBranchSourceId, setMergeBranchSourceId] = useState('')
  const [mergeBranchTargetId, setMergeBranchTargetId] = useState('')

  // Offline mode & PWA (Task 71/72/79/80)
  const {
    isOffline, queueLength, syncStatus, syncProgress, queueEdit,
    cachedAt, isRevalidating, cacheData, loadCachedData, failedEditCount,
  } = useCourseMapOffline(courseId)
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushToggling, setPushToggling] = useState(false)

  // Real-time analytics dashboard panel (Task 81)
  const [showRealtimeDashboard, setShowRealtimeDashboard] = useState(false)
  const [dashboardHeatmapData, setDashboardHeatmapData] = useState<NodeHeatmapEntry[]>([])

  // Performance profiler overlay (Task 82)
  const [showPerfOverlay, setShowPerfOverlay] = useState(false)

  // Whiteboard overlay (Task 83)
  const [whiteboardActive, setWhiteboardActive] = useState(false)

  // Annotation layer (Task 84)
  const [annotationLayerActive, setAnnotationLayerActive] = useState(false)
  const [annotationNodeCounts, setAnnotationNodeCounts] = useState<Map<string, number>>(new Map())

  // AI Teaching Assistant (Task 85)
  const [showTeachingAssistant, setShowTeachingAssistant] = useState(false)

  // Smart Suggestions (Task 86)
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false)

  // Export Suite (Task 87)
  const [showExportSuite, setShowExportSuite] = useState(false)

  // Reporting Dashboard (Task 88)
  const [showReportingDashboard, setShowReportingDashboard] = useState(false)

  // Plugin system state (Task 95/96)
  const pluginRegistryRef = useRef<PluginRegistry | null>(null)
  const pluginApiRef = useRef<PluginAPI | null>(null)
  const [pluginEntries, setPluginEntries] = useState<PluginEntry[]>([])
  const [showPluginMarketplace, setShowPluginMarketplace] = useState(false)
  const [showPluginSettings, setShowPluginSettings] = useState(false)
  const [selectedPluginManifest, setSelectedPluginManifest] = useState<PluginManifest | null>(null)

  // AI Assistant & Smart Automation state (Task 97/98)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showSmartAutomation, setShowSmartAutomation] = useState(false)

  // Task 103: Search & Filter state
  const [showSearchFilter, setShowSearchFilter] = useState(false)

  // Single-panel-slot: close all side panels before opening a new one
  const closeAllSidePanels = useCallback(() => {
    setShowTeachingAssistant(false)
    setShowSmartSuggestions(false)
    setShowExportSuite(false)
    setShowReportingDashboard(false)
    setShowSharingPanel(false)
    setShowAIAssistant(false)
    setShowSmartAutomation(false)
    setShowSearchFilter(false)
  }, [])
  const [searchHighlightNodeIds, setSearchHighlightNodeIds] = useState<string[]>([])
  const [filteredNodeIds, setFilteredNodeIds] = useState<Set<string> | null>(null)
  const [filteredEdgeIds, setFilteredEdgeIds] = useState<Set<string> | null>(null)

  // Listen for beforeinstallprompt (PWA install)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Ctrl+Shift+P keyboard shortcut for perf overlay (Task 82)
  useEffect(() => {
    const handlePerfShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        if (process.env.NODE_ENV === 'development' || localStorage.getItem('uky-perf-profiler') === 'true') {
          setShowPerfOverlay((v) => !v)
        }
      }
    }
    window.addEventListener('keydown', handlePerfShortcut)
    return () => window.removeEventListener('keydown', handlePerfShortcut)
  }, [])

  // Task 103: Ctrl+F / Cmd+F keyboard shortcut for search panel
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearchFilter((v) => !v)
      }
      if (e.key === 'Escape' && showSearchFilter) {
        setShowSearchFilter(false)
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [showSearchFilter])

  // Initialize push notification state (Task 80)
  useEffect(() => {
    if (courseId) {
      setPushEnabled(isPushEnabled(courseId))
    }
  }, [courseId])

  // Push notification toggle handler (Task 80)
  const handlePushToggle = useCallback(async () => {
    if (!courseId || !currentUser?.email || pushToggling) return
    setPushToggling(true)
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(courseId, currentUser.email)
        setPushEnabled(false)
      } else {
        const ok = await subscribeToPush(courseId, currentUser.email)
        setPushEnabled(ok)
      }
    } finally {
      setPushToggling(false)
    }
  }, [courseId, currentUser?.email, pushEnabled, pushToggling])

  // Scroll-to-node helper for keyboard navigation
  const scrollToNode = useCallback((node: { xPos: number; yPos: number }) => {
    const container = canvasRef.current?.parentElement
    if (!container) return
    const targetX = node.xPos - container.clientWidth / 2 + NODE_WIDTH / 2
    const targetY = node.yPos - container.clientHeight / 2 + NODE_HEIGHT / 2
    container.scrollTo({ left: Math.max(0, targetX), top: Math.max(0, targetY), behavior: 'smooth' })
  }, [])

  // Keyboard navigation hook (Task 67)
  const {
    focusedNodeId,
    announcement,
    handleCanvasKeyDown,
    announce,
    setFocusedNodeId,
  } = useCourseMapKeyboard({
    nodes: graphMap?.nodes || [],
    edges: graphMap?.edges || [],
    milestones,
    isEditorRole: !!isEditorRole,
    disabled: !!nlEditOpen,
    onSelectNode: setSelectedNodeId,
    onFocusNode: () => {}, // synced internally
    selectedNodeId,
    connectSource,
    canvasMode,
    onStartConnect: (nodeId) => {
      setCanvasMode('connect')
      setConnectSource(nodeId)
    },
    onCancelConnect: () => {
      setConnectSource(null)
      setCursorPos(null)
    },
    onScrollToNode: scrollToNode,
  })

  // Canvas virtualization hook (Task 68)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const {
    visibleNodes: virtualizedVisibleNodes,
    visibleEdges: virtualizedVisibleEdges,
    visibleNodeIds: virtualizedVisibleNodeIds,
    totalNodeCount,
    visibleNodeCount,
    showLargeMapWarning,
    nodeCountLabel,
    handleScroll: handleVirtualScroll,
  } = useCourseMapVirtualization({
    nodes: graphMap?.nodes || [],
    edges: graphMap?.edges || [],
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    buffer: 200,
    enabled: true,
  })

  // ── Task 101: Edge routing mode ──────────────────────────────────────────
  const [edgeRoutingMode, setEdgeRoutingMode] = useState<EdgeRoutingMode>('bezier')

  // ── Task 101: Node grouping ──────────────────────────────────────────────
  const [showGroups, setShowGroups] = useState(false)
  const [groupedNodes, setGroupedNodes] = useState<GroupedNodeSet | null>(null)

  // ── Task 102: Performance service ────────────────────────────────────────
  const perfServiceRef = useRef<PerformanceService | null>(null)
  const [perfMetrics, setPerfMetrics] = useState<RenderMetrics | null>(null)

  // Initialize performance service
  useEffect(() => {
    const svc = new PerformanceService()
    perfServiceRef.current = svc
    svc.startTracking(60)
    return () => svc.dispose()
  }, [])

  // Update perf metrics periodically
  useEffect(() => {
    if (!perfServiceRef.current) return
    const interval = setInterval(() => {
      if (!perfServiceRef.current) return
      const metrics = perfServiceRef.current.measureRenderPerformance(
        totalNodeCount,
        visibleNodeCount,
        graphMap?.edges.length || 0,
      )
      setPerfMetrics(metrics)
    }, 2000)
    return () => clearInterval(interval)
  }, [totalNodeCount, visibleNodeCount, graphMap?.edges.length])

  // Recompute groups when nodes or showGroups changes
  useEffect(() => {
    if (!showGroups || !graphMap) {
      setGroupedNodes(null)
      return
    }
    const unitMapForGroups = new Map<string, { unitType: string; label: string }>()
    for (const unit of graphMap.units) {
      unitMapForGroups.set(unit.id, { unitType: unit.unitType, label: unit.label })
    }
    const visNodes: VisNode[] = graphMap.nodes.map((n) => ({
      ...n,
      label: n.label,
      nodeType: n.nodeType,
      courseUnitId: n.courseUnitId,
    }))
    setGroupedNodes(VisualizationService.groupNodes(visNodes, 'unitType', unitMapForGroups))
  }, [showGroups, graphMap])

  // Group toggle handler
  const handleToggleGroup = useCallback((groupId: string) => {
    if (VisualizationService.isGroupCollapsed(groupId)) {
      VisualizationService.expandGroup(groupId)
    } else {
      VisualizationService.collapseGroup(groupId)
    }
    // Re-trigger grouping computation
    if (graphMap) {
      const unitMapForGroups = new Map<string, { unitType: string; label: string }>()
      for (const unit of graphMap.units) {
        unitMapForGroups.set(unit.id, { unitType: unit.unitType, label: unit.label })
      }
      const visNodes: VisNode[] = graphMap.nodes.map((n) => ({
        ...n,
        label: n.label,
        nodeType: n.nodeType,
        courseUnitId: n.courseUnitId,
      }))
      setGroupedNodes(VisualizationService.groupNodes(visNodes, 'unitType', unitMapForGroups))
    }
  }, [graphMap])

  // Zoom-to-fit handler
  const handleZoomToFit = useCallback(() => {
    if (!graphMap || !scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const result = VisualizationService.zoomToFit(
      graphMap.nodes as VisNode[],
      { width: container.clientWidth, height: container.clientHeight },
      60,
    )
    container.scrollTo({
      left: Math.max(0, result.panX),
      top: Math.max(0, result.panY),
      behavior: 'smooth',
    })
  }, [graphMap])

  // Minimap pan handler
  const handleMinimapPan = useCallback((scrollLeft: number, scrollTop: number) => {
    if (!scrollContainerRef.current) return
    scrollContainerRef.current.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'auto' })
  }, [])

  const fetchLmsLinks = useCallback(async () => {
    if (!courseId || !isEditorRole) return
    setLmsLinksLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/lms-links`, {
        headers: { 'x-demo-user-email': currentUser?.email || '' },
      })
      if (!res.ok) return
      const data = await res.json()
      setLmsLinksConfigured(data.configured)
      const map = new Map<string, { lmsUrl: string; linkType: string; title: string }>()
      for (const link of data.links || []) {
        map.set(link.nodeId, { lmsUrl: link.lmsUrl, linkType: link.linkType, title: link.title })
      }
      setLmsLinks(map)
    } catch {
      // silent
    } finally {
      setLmsLinksLoading(false)
    }
  }, [courseId, isEditorRole, currentUser?.email])

  const fetchData = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    const fetchStart = performance.now()
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/courses/${courseId}/course-map`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch(`/api/courses/${courseId}/syllabus-status`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ]

      // Fetch progress for students
      if (isStudent) {
        fetches.push(
          fetch(`/api/courses/${courseId}/course-map/progress`, {
            headers: { 'x-demo-user-email': currentUser.email },
          })
        )
      }

      const results = await Promise.all(fetches)
      trackApiLatency('course-map/fetch', performance.now() - fetchStart, results[0].status)
      const [mapRes, statusRes] = results

      if (!mapRes.ok) {
        if (mapRes.status === 403) {
          setError('forbidden')
        } else {
          setError('fetch')
        }
        return
      }
      const data = await mapRes.json()
      setGraphMap(data.graphMap || null)
      setValidation(data.validation || null)

      if (statusRes.ok) {
        const status = await statusRes.json()
        setSyllabusStatus({
          assignmentCount: status.assignmentCount ?? 0,
          objectiveCount: status.objectiveCount ?? 0,
          unitCount: status.unitCount ?? null,
          edgeCount: status.edgeCount ?? null,
          lastParseDate: status.lastParseDate ?? null,
        })
      }

      // Process student progress
      if (isStudent && results[2]?.ok) {
        const progressData = await results[2].json()
        const npMap = new Map<string, NodeProgress>()
        const lpMap = new Map<string, boolean>()

        if (progressData.nodeProgress) {
          for (const np of progressData.nodeProgress as NodeProgress[]) {
            npMap.set(np.nodeId, np)
            for (const lp of np.lessons) {
              lpMap.set(lp.lessonId, lp.completed)
            }
          }
        }
        setNodeProgressMap(npMap)
        setLessonProgressMap(lpMap)

        // Fetch learning path
        try {
          const pathRes = await fetch(`/api/courses/${courseId}/course-map/learning-path`, {
            headers: { 'x-demo-user-email': currentUser!.email },
          })
          if (pathRes.ok) {
            const pathData = await pathRes.json()
            setLearningPath(pathData.path || [])
          }
        } catch {
          // Silently fail — learning path is supplementary
        }
      }
    } catch {
      setError('fetch')
    } finally {
      setLoading(false)
    }
  }, [courseId, currentUser?.email, isStudent])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Annotation layers fetch (educators only) ─────────────────────────────

  const fetchAnnotations = useCallback(async () => {
    if (!courseId || !currentUser?.email || !isEditorRole) return
    try {
      const [layersRes, annsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch(`/api/courses/${courseId}/course-map/annotations`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])
      if (layersRes.ok) {
        const data = await layersRes.json()
        setAnnotationLayers(data.layers || [])
        if (!activeLayerId && data.layers?.length > 0) {
          setActiveLayerId(data.layers[0].id)
        }
      }
      if (annsRes.ok) {
        const data = await annsRes.json()
        setAnnotations(data.annotations || [])
      }
    } catch {
      // silent — annotations are supplementary
    }
  }, [courseId, currentUser?.email, isEditorRole, activeLayerId])

  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  // ── Study groups fetch ──────────────────────────────────────────────────────

  const fetchStudyGroups = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const [groupsRes, countsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/course-map/study-groups`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch(`/api/courses/${courseId}/course-map/study-groups?nodeCounts=true`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])
      if (groupsRes.ok) {
        const data = await groupsRes.json()
        setStudyGroups(data.groups || [])
      }
      if (countsRes.ok) {
        const data = await countsRes.json()
        setNodeGroupCounts(data.counts || {})
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email])

  useEffect(() => {
    fetchStudyGroups()
  }, [fetchStudyGroups])

  // ── Milestones fetch ────────────────────────────────────────────────────────

  const fetchMilestones = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const check = isStudent ? '&check=true' : ''
      const res = await fetch(`/api/courses/${courseId}/course-map/milestones?${check}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data: MilestoneSummary = await res.json()
        setMilestones(data.milestones || [])
        setMilestoneTotal(data.total)
        setMilestoneAchieved(data.achieved)
        setMilestoneNodeIds(new Set(data.milestones.map((m) => m.nodeId)))
        // Celebrate newly achieved milestones
        if (data.newlyAchieved && data.newlyAchieved.length > 0) {
          setCelebratingMilestone(data.newlyAchieved[0].label)
          setTimeout(() => setCelebratingMilestone(null), 4000)
        }
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, isStudent])

  useEffect(() => {
    fetchMilestones()
  }, [fetchMilestones])

  // ── Collab SSE connection (editors only) ────────────────────────────────

  useEffect(() => {
    if (!isEditorRole || !courseId || !currentUser?.email) return

    // Use fetch-based SSE (EventSource can't set custom headers for demo auth)
    const controller = new AbortController()
    const connectSSE = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/course-map/edits/stream`, {
          headers: { 'x-demo-user-email': currentUser!.email },
          signal: controller.signal,
        })
        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6))
                handleCollabEvent(event)
              } catch {
                // skip malformed
              }
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[Collab SSE] connection error:', err)
        }
      }
    }

    connectSSE()

    return () => {
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorRole, courseId, currentUser?.email])

  // ── Presence Manager & Collab Engine lifecycle (Task 91/92) ────────────────

  useEffect(() => {
    if (!isEditorRole || !courseId || !currentUser?.email || !currentUser?.id) return

    const pm = new PresenceManager(courseId, currentUser.email)
    presenceManagerRef.current = pm
    const unsubPresence = pm.onPresenceUpdate((update) => {
      setPresenceUsers(update.users)
    })

    const ce = new CollabEngine(courseId, currentUser.email, currentUser.id, currentUser.name || 'You')
    collabEngineRef.current = ce
    const unsubConflict = ce.onConflict((conflict) => {
      setCollabConflict(conflict)
    })
    const unsubRemoteEdit = ce.onRemoteEdit((edit) => {
      setRemoteEditNotifications((prev) => [...prev.slice(-9), edit])
    })

    return () => {
      unsubPresence()
      unsubConflict()
      unsubRemoteEdit()
      pm.destroy()
      ce.destroy()
      presenceManagerRef.current = null
      collabEngineRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorRole, courseId, currentUser?.email, currentUser?.id])

  // Handle incoming collab events
  const handleCollabEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    // Forward to PresenceManager & CollabEngine (Task 91/92)
    presenceManagerRef.current?.handleEvent(event)
    collabEngineRef.current?.handleEvent(event)

    // Sync edit locks from collab engine
    if (collabEngineRef.current) {
      const locks = collabEngineRef.current.getEditLocks()
      setEditLocks(locks.map((l) => ({ nodeId: l.nodeId, ownerName: l.ownerName, isMine: l.isMine })))
    }

    switch (event.type) {
      case 'editors_snapshot': {
        const editors = (event.payload as { editors: ActiveEditor[] }).editors
        setActiveEditors(editors.filter((e) => e.email !== currentUser?.email))
        break
      }
      case 'editor_joined': {
        const editor = event.payload as unknown as ActiveEditor
        if (editor.email !== currentUser?.email) {
          setActiveEditors((prev) => [...prev.filter((e) => e.userId !== editor.userId), editor])
          addCollabToast(`${editor.name} joined the map`)
        }
        break
      }
      case 'editor_left': {
        const { userId } = event.payload as { userId: string }
        setActiveEditors((prev) => {
          const leaving = prev.find((e) => e.userId === userId)
          if (leaving) addCollabToast(`${leaving.name} left the map`)
          return prev.filter((e) => e.userId !== userId)
        })
        // Clean up cursor and editing state for departing editor
        setRemoteCursors((prev) => prev.filter((c) => c.userId !== userId))
        setRemoteEditingNodes((prev) => prev.filter((e) => e.userId !== userId))
        break
      }
      case 'node_moved': {
        const { nodeId, xPos, yPos, userId, userName } = event.payload as {
          nodeId: string; xPos: number; yPos: number; userId: string; userName: string
        }
        if (userId !== currentUser?.id) {
          setGraphMap((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === nodeId ? { ...n, xPos, yPos } : n
              ),
            }
          })
          addCollabToast(`${userName} moved a node`)
        }
        break
      }
      case 'node_updated': {
        const { nodeId, label, unitType, userId, userName } = event.payload as {
          nodeId: string; label?: string; unitType?: string; userId: string; userName: string
        }
        if (userId !== currentUser?.id) {
          // Check if we're currently editing this same node in the detail drawer
          if (selectedNodeId === nodeId) {
            setConflictInfo({ editorName: userName, label, unitType })
          }
          fetchData()
          addCollabToast(`${userName} updated a node`)
        }
        break
      }
      case 'edge_created': {
        const { userId, userName } = event.payload as { userId: string; userName: string }
        if (userId !== currentUser?.id) {
          fetchData()
          addCollabToast(`${userName} created an edge`)
        }
        break
      }
      case 'edge_deleted': {
        const { edgeId, userId, userName } = event.payload as {
          edgeId: string; userId: string; userName: string
        }
        if (userId !== currentUser?.id) {
          setGraphMap((prev) => {
            if (!prev) return prev
            return { ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }
          })
          addCollabToast(`${userName} deleted an edge`)
        }
        break
      }
      case 'cursor_moved': {
        const { userId, userName, x, y } = event.payload as {
          userId: string; userName: string; x: number; y: number
        }
        if (userId !== currentUser?.id) {
          setRemoteCursors((prev) => {
            const filtered = prev.filter((c) => c.userId !== userId)
            return [...filtered, { userId, userName, x, y, lastUpdated: Date.now() }]
          })
        }
        break
      }
      case 'editing_node': {
        const { userId, userName, nodeId } = event.payload as {
          userId: string; userName: string; nodeId: string | null
        }
        if (userId !== currentUser?.id) {
          setRemoteEditingNodes((prev) => {
            const filtered = prev.filter((e) => e.userId !== userId)
            if (nodeId) {
              return [...filtered, { userId, userName, nodeId }]
            }
            return filtered
          })
          // Check conflict: if another editor updated the node we're currently editing
          if (event.type === 'editing_node') {
            // No conflict check here — conflict check is in node_updated
          }
        }
        break
      }
    }
  }, [currentUser?.email, currentUser?.id, fetchData, selectedNodeId])

  const addCollabToast = useCallback((message: string) => {
    const id = String(++collabToastIdRef.current)
    setCollabToasts((prev) => [...prev.slice(-4), { id, message, timestamp: Date.now() }])
    // Auto-remove after 4s
    setTimeout(() => {
      setCollabToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  // ── Activity feed helpers ────────────────────────────────────────────────

  const fetchActivity = useCallback(async (reset = false) => {
    if (!courseId || !currentUser?.email) return
    setActivityLoading(true)
    try {
      const cursorParam = reset ? '' : (activityCursor ? `&cursor=${activityCursor}` : '')
      const res = await fetch(
        `/api/courses/${courseId}/course-map/activity?limit=20${cursorParam}`,
        { headers: { 'x-demo-user-email': currentUser.email } },
      )
      if (res.ok) {
        const data = await res.json()
        if (reset) {
          setActivityEntries(data.entries)
        } else {
          setActivityEntries((prev) => [...prev, ...data.entries])
        }
        setActivityCursor(data.nextCursor)
      }
    } catch (err) {
      console.error('[fetchActivity]', err)
    } finally {
      setActivityLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser?.email, activityCursor])

  const openActivityFeed = useCallback(() => {
    setShowActivityFeed(true)
    setActivityEntries([])
    setActivityCursor(null)
    // Fetch fresh on open — use setTimeout so state resets first
    setTimeout(() => {
      if (!courseId || !currentUser?.email) return
      fetch(`/api/courses/${courseId}/course-map/activity?limit=20`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setActivityEntries(data.entries)
            setActivityCursor(data.nextCursor)
          }
        })
        .catch(console.error)
    }, 0)
  }, [courseId, currentUser?.email])

  // ── Analytics panel helpers ─────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/analytics`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        setAnalyticsData(await res.json())
      }
    } catch (err) {
      console.error('[fetchAnalytics]', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [courseId, currentUser?.email])

  // ── Real-time analytics helpers (Task 73) ──────────────────────────────

  const fetchRealtimeAnalytics = useCallback(async (range?: '24h' | '7d' | '30d') => {
    if (!courseId || !currentUser?.email) return
    setRealtimeLoading(true)
    const r = range || realtimeRange
    const start = performance.now()
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/analytics/realtime?range=${r}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      trackApiLatency('analytics/realtime', performance.now() - start, res.status)
      if (res.ok) {
        setRealtimeData(await res.json())
      }
    } catch (err) {
      console.error('[fetchRealtimeAnalytics]', err)
    } finally {
      setRealtimeLoading(false)
    }
  }, [courseId, currentUser?.email, realtimeRange])

  const fetchServerPerfData = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/analytics/performance`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) setServerPerfData(await res.json())
    } catch { /* silent */ }
  }, [courseId, currentUser?.email])

  const sendPerfBatch = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    const batch = collectMetricsBatch()
    try {
      await fetch(`/api/courses/${courseId}/course-map/analytics/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify(batch),
      })
    } catch { /* silent */ }
  }, [courseId, currentUser?.email])

  const refreshPerfReport = useCallback(() => {
    const report = getPerformanceReport()
    setPerfReport(report)
    const violations = checkPerformanceBudget({ maxRenderMs: 100, maxApiMs: 2000, maxLcpMs: 2500, maxCls: 0.1 })
    setPerfBudgetViolations(violations)
  }, [])

  const openAnalyticsPanel = useCallback(() => {
    setShowAnalyticsPanel(true)
    setShowActivityFeed(false)
    setShowHealthPanel(false)
    setShowRealtimeDashboard(false)
    fetchAnalytics()
  }, [fetchAnalytics])

  const openRealtimeDashboard = useCallback(() => {
    setShowRealtimeDashboard(true)
    setShowAnalyticsPanel(false)
    setShowActivityFeed(false)
    setShowHealthPanel(false)
    setHeatmapOverlay(false)
  }, [])

  // Start/stop real-time polling when analytics panel is open on realtime tab
  useEffect(() => {
    if (showAnalyticsPanel && analyticsTab === 'realtime') {
      fetchRealtimeAnalytics()
      realtimePollRef.current = setInterval(() => fetchRealtimeAnalytics(), 15_000)
    }
    return () => {
      if (realtimePollRef.current) {
        clearInterval(realtimePollRef.current)
        realtimePollRef.current = null
      }
    }
  }, [showAnalyticsPanel, analyticsTab, fetchRealtimeAnalytics])

  // Init Web Vitals observer once
  useEffect(() => {
    const cleanup = initWebVitalsObserver()
    return () => cleanup?.()
  }, [])

  // Refresh perf report when performance tab is open
  useEffect(() => {
    if (showAnalyticsPanel && analyticsTab === 'performance') {
      refreshPerfReport()
      fetchServerPerfData()
    }
  }, [showAnalyticsPanel, analyticsTab, refreshPerfReport, fetchServerPerfData])

  // Send perf batch periodically when panel is open
  useEffect(() => {
    if (!showAnalyticsPanel || analyticsTab !== 'performance') return
    const interval = setInterval(() => {
      sendPerfBatch()
      refreshPerfReport()
    }, 30_000)
    return () => clearInterval(interval)
  }, [showAnalyticsPanel, analyticsTab, sendPerfBatch, refreshPerfReport])

  // ── Health score helpers ────────────────────────────────────────────────

  const fetchHealth = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setHealthLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/health`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        setHealthData(await res.json())
      }
    } catch (err) {
      console.error('[fetchHealth]', err)
    } finally {
      setHealthLoading(false)
    }
  }, [courseId, currentUser?.email])

  const openHealthPanel = useCallback(() => {
    setShowHealthPanel(true)
    setShowActivityFeed(false)
    setShowAnalyticsPanel(false)
    fetchHealth()
  }, [fetchHealth])

  // ── Comment helpers ────────────────────────────────────────────────────────

  const fetchComments = useCallback(async (nodeId?: string, edgeId?: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      const qp = new URLSearchParams()
      if (nodeId) qp.set('nodeId', nodeId)
      if (edgeId) qp.set('edgeId', edgeId)
      const res = await fetch(`/api/courses/${courseId}/course-map/comments?${qp.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments ?? [])
        setCommentCounts(data.counts ?? { nodeCounts: {}, edgeCounts: {} })
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email])

  const fetchCommentCounts = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setCommentCounts(data.counts ?? { nodeCounts: {}, edgeCounts: {} })
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email])

  useEffect(() => {
    if (isEditorRole) fetchCommentCounts()
  }, [isEditorRole, fetchCommentCounts])

  const openCommentPanel = useCallback((nodeId?: string, edgeId?: string) => {
    setShowCommentPanel(true)
    setShowActivityFeed(false)
    setShowAnalyticsPanel(false)
    setShowHealthPanel(false)
    setCommentNodeId(nodeId ?? null)
    setCommentEdgeId(edgeId ?? null)
    setNewCommentText('')
    setReplyingTo(null)
    setReplyText('')
    fetchComments(nodeId, edgeId)
  }, [fetchComments])

  const postComment = useCallback(async () => {
    if (!courseId || !currentUser?.email || !newCommentText.trim()) return
    setPostingComment(true)
    try {
      const body: Record<string, string> = { content: newCommentText.trim() }
      if (commentNodeId) body.nodeId = commentNodeId
      if (commentEdgeId) body.edgeId = commentEdgeId
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setNewCommentText('')
        fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
      }
    } catch { /* silent */ }
    setPostingComment(false)
  }, [courseId, currentUser?.email, newCommentText, commentNodeId, commentEdgeId, fetchComments])

  const postReply = useCallback(async (parentId: string) => {
    if (!courseId || !currentUser?.email || !replyText.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ content: replyText.trim(), parentId }),
      })
      if (res.ok) {
        setReplyText('')
        setReplyingTo(null)
        fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
      }
    } catch { /* silent */ }
    setPostingComment(false)
  }, [courseId, currentUser?.email, replyText, commentNodeId, commentEdgeId, fetchComments])

  const resolveCommentHandler = useCallback(async (commentId: string, action: 'resolve' | 'unresolve') => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ action }),
      })
      fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, commentNodeId, commentEdgeId, fetchComments])

  const deleteCommentHandler = useCallback(async (commentId: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      fetchComments(commentNodeId ?? undefined, commentEdgeId ?? undefined)
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, commentNodeId, commentEdgeId, fetchComments])

  // ── Version comparison helpers ────────────────────────────────────────────

  const runComparison = useCallback(async () => {
    if (!courseId || !currentUser?.email || !compareSnapshotA || !compareSnapshotB) return
    setComparisonLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/course-map/snapshots/compare?a=${compareSnapshotA}&b=${compareSnapshotB}`,
        { headers: { 'x-demo-user-email': currentUser.email } },
      )
      if (res.ok) {
        const data = await res.json() as SnapshotComparisonResult
        setComparisonResult(data)

        // Load snapshot data for visual display
        const snapA = snapshots.find((s) => s.id === compareSnapshotA)
        const snapB = snapshots.find((s) => s.id === compareSnapshotB)
        // We need to fetch snapshots data — we'll use the existing snapshots list for labels only
        // and rely on the comparison result for the detailed diff
        if (snapA && snapB) {
          // The comparison result already has all the diff data we need
          // Reconstruct basic node/edge sets from diff data for the visual
          setCompareSnapshotDataA(null) // Not needed for diff view
          setCompareSnapshotDataB(null)
        }
      }
    } catch { /* silent */ }
    setComparisonLoading(false)
  }, [courseId, currentUser?.email, compareSnapshotA, compareSnapshotB, snapshots])

  const closeComparison = useCallback(() => {
    setShowCompareView(false)
    setCompareSnapshotA('')
    setCompareSnapshotB('')
    setComparisonResult(null)
    setCompareSnapshotDataA(null)
    setCompareSnapshotDataB(null)
  }, [])

  const restoreSnapshotFromComparison = useCallback(async (snapshotId: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots/${snapshotId}/restore`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        closeComparison()
        addCollabToast('Snapshot restored')
        // Re-fetch the map data
        fetchData()
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, closeComparison, fetchData])

  // ── Snapshot helpers ──────────────────────────────────────────────────────

  const fetchSnapshots = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || [])
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  useEffect(() => {
    if (isEditorRole) fetchSnapshots()
  }, [isEditorRole, fetchSnapshots])

  const saveSnapshot = useCallback(async () => {
    if (!courseId || !currentUser?.email || !snapshotName.trim()) return
    setSavingSnapshot(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ name: snapshotName.trim() }),
      })
      if (res.ok) {
        setSnapshotName('')
        setShowSnapshotNameInput(false)
        fetchSnapshots()
        addCollabToast('Snapshot saved')
      }
    } catch {
      // Silently fail
    } finally {
      setSavingSnapshot(false)
    }
  }, [courseId, currentUser?.email, snapshotName, fetchSnapshots, addCollabToast])

  const restoreSnapshot = useCallback(async (snapshotId: string) => {
    if (!courseId || !currentUser?.email) return
    setPendingRestoreId(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots/${snapshotId}/restore`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        fetchData()
        addCollabToast('Snapshot restored')
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email, fetchData, addCollabToast])

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/snapshots/${snapshotId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        fetchSnapshots()
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email, fetchSnapshots])

  // ── Diff helpers ──────────────────────────────────────────────────────

  const runDiff = useCallback(async (snapshotId: string) => {
    if (!courseId || !currentUser?.email) return
    setDiffLoading(true)
    setDiffSnapshotId(snapshotId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ snapshotIdA: snapshotId }),
      })
      if (res.ok) {
        const data = await res.json()
        setDiffResult(data)
        setShowSnapshotDropdown(false)
      }
    } catch {
      // Silently fail
    }
    setDiffLoading(false)
  }, [courseId, currentUser?.email])

  const closeDiff = useCallback(() => {
    setDiffResult(null)
    setDiffSnapshotId(null)
  }, [])

  // ── Merge helpers ─────────────────────────────────────────────────────

  const runMerge = useCallback(async (baseId: string, sourceId: string) => {
    if (!courseId || !currentUser?.email) return
    setMergeLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ baseSnapshotId: baseId, sourceSnapshotId: sourceId }),
      })
      if (res.ok) {
        const data: MergeResult = await res.json()
        setMergeResult(data)
        setMergeBaseId(baseId)
        setMergeSourceId(sourceId)
        setMergeResolutions({})
        setShowSnapshotDropdown(false)
        setShowMergeDialog(true)
      }
    } catch {
      // Silently fail
    }
    setMergeLoading(false)
  }, [courseId, currentUser?.email])

  const applyMerge = useCallback(async () => {
    if (!courseId || !currentUser?.email || !mergeResult) return
    setApplyingMerge(true)
    try {
      const resolutions = Object.entries(mergeResolutions).map(([key, value]) => {
        const [nodeId, field] = key.split('::')
        return { nodeId, field, chosenValue: value }
      })
      const res = await fetch(`/api/courses/${courseId}/course-map/merge/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({
          mergedNodes: mergeResult.mergedNodes,
          mergedEdges: mergeResult.mergedEdges,
          resolutions,
        }),
      })
      if (res.ok) {
        setShowMergeDialog(false)
        setMergeResult(null)
        setMergeBaseId(null)
        setMergeSourceId(null)
        setMergeResolutions({})
        fetchData()
        addCollabToast('Merge applied successfully')
      }
    } catch {
      addCollabToast('Failed to apply merge')
    }
    setApplyingMerge(false)
  }, [courseId, currentUser?.email, mergeResult, mergeResolutions, fetchData, addCollabToast])

  // ── Branch management helpers (Task 93/94) ─────────────────────────────

  const fetchBranches = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    if (!branchManagerRef.current) {
      branchManagerRef.current = new BranchManager(courseId, currentUser.email)
    }
    if (!mergeEngineRef.current) {
      mergeEngineRef.current = new MergeEngine(courseId, currentUser.email)
    }
    setBranchesLoading(true)
    try {
      const [branchList, current] = await Promise.all([
        branchManagerRef.current.listBranches(),
        branchManagerRef.current.getCurrentBranch(),
      ])
      setBranches(branchList)
      setCurrentBranch(current)
    } catch {
      // Silently fail
    }
    setBranchesLoading(false)
  }, [courseId, currentUser?.email])

  useEffect(() => {
    if (isEditorRole) fetchBranches()
  }, [isEditorRole, fetchBranches])

  // ── Plugin system initialization (Task 95/96) ───────────────────────────

  useEffect(() => {
    if (!courseId || !graphMap) return

    const registry = new PluginRegistry()
    pluginRegistryRef.current = registry

    const apiCallbacks: PluginAPICallbacks = {
      getNodes: () => graphMap.nodes,
      getEdges: () => graphMap.edges,
      getSelectedNodeId: () => selectedNodeId,
      getMapId: () => graphMap.id,
      getCourseId: () => courseId,
      onShowNotification: (message) => {
        addCollabToast(message)
      },
    }
    const api = new PluginAPI(apiCallbacks)
    pluginApiRef.current = api

    // Register all sample plugins
    const init = async () => {
      for (const sample of SAMPLE_PLUGINS) {
        await registry.registerPlugin(sample.manifest, sample.hooks)
      }
      setPluginEntries(registry.listPlugins())
    }
    init()

    const unsub = registry.subscribe(() => {
      setPluginEntries(registry.listPlugins())
    })

    return () => {
      unsub()
      api.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, !!graphMap])

  const handlePluginInstall = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    const sample = getSamplePlugin(pluginId)
    if (!sample) return
    await registry.registerPlugin(sample.manifest, sample.hooks)
    await registry.enablePlugin(pluginId)
  }, [])

  const handlePluginUninstall = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    await registry.unregisterPlugin(pluginId)
  }, [])

  const handlePluginEnable = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    await registry.enablePlugin(pluginId)
  }, [])

  const handlePluginDisable = useCallback(async (pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    await registry.disablePlugin(pluginId)
  }, [])

  const handlePluginUpdateConfig = useCallback((pluginId: string, config: Record<string, string | number | boolean>) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    registry.updateConfig(pluginId, config)
  }, [])

  const handlePluginClearData = useCallback((pluginId: string) => {
    const registry = pluginRegistryRef.current
    if (!registry) return
    registry.clearPluginData(pluginId)
  }, [])

  // ── AI Assistant & Smart Automation handlers (Task 97/98) ─────────────────
  const handleAIAssistantActions = useCallback((actions: MapAction[]) => {
    if (!graphMap) return
    for (const action of actions) {
      if (action.type === 'addEdge') {
        const p = action.payload as { fromNodeId: string; toNodeId: string; edgeType: string }
        // Use existing edge creation API
        fetch(`/api/courses/${courseId}/course-map/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email || '' },
          body: JSON.stringify({ fromNodeId: p.fromNodeId, toNodeId: p.toNodeId, edgeType: p.edgeType }),
        }).then(() => fetchData())
      } else if (action.type === 'moveNode') {
        const p = action.payload as { nodeId: string; xPos: number; yPos: number }
        fetch(`/api/courses/${courseId}/course-map/nodes/${p.nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email || '' },
          body: JSON.stringify({ xPos: p.xPos, yPos: p.yPos }),
        }).then(() => fetchData())
      } else if (action.type === 'removeNode') {
        const p = action.payload as { nodeId: string }
        fetch(`/api/courses/${courseId}/course-map/nodes/${p.nodeId}`, {
          method: 'DELETE',
          headers: { 'x-demo-user-email': currentUser?.email || '' },
        }).then(() => fetchData())
      } else if (action.type === 'updateNode') {
        const p = action.payload as { nodeId: string; label: string }
        fetch(`/api/courses/${courseId}/course-map/nodes/${p.nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email || '' },
          body: JSON.stringify({ label: p.label }),
        }).then(() => fetchData())
      }
    }
  }, [graphMap, courseId, currentUser?.email, fetchData])

  const handleSmartAutomationFix = useCallback((action: FixAction) => {
    if (action.type === 'addEdge') {
      fetch(`/api/courses/${courseId}/course-map/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email || '' },
        body: JSON.stringify({ fromNodeId: action.fromNodeId, toNodeId: action.toNodeId, edgeType: action.edgeType }),
      }).then(() => fetchData())
    } else if (action.type === 'moveNode') {
      fetch(`/api/courses/${courseId}/course-map/nodes/${action.nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email || '' },
        body: JSON.stringify({ xPos: action.xPos, yPos: action.yPos }),
      }).then(() => fetchData())
    } else if (action.type === 'removeNode') {
      fetch(`/api/courses/${courseId}/course-map/nodes/${action.nodeId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser?.email || '' },
      }).then(() => fetchData())
    }
  }, [courseId, currentUser?.email, fetchData])

  const handleCreateBranch = useCallback(async (name: string, description: string) => {
    if (!branchManagerRef.current) return
    await branchManagerRef.current.createBranch(name, description)
    await fetchBranches()
    addCollabToast(`Branch "${name}" created`)
  }, [fetchBranches, addCollabToast])

  const handleSwitchBranch = useCallback(async (branchId: string) => {
    if (!branchManagerRef.current) return
    const snapshot = await branchManagerRef.current.switchBranch(branchId)
    await fetchBranches()
    // Reload map data after switch
    await fetchData()
    addCollabToast('Switched branch')
  }, [fetchBranches, fetchData, addCollabToast])

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (!branchManagerRef.current) return
    await branchManagerRef.current.deleteBranch(branchId)
    await fetchBranches()
    addCollabToast('Branch deleted')
  }, [fetchBranches, addCollabToast])

  const handleCompareBranches = useCallback(async (branchAId: string, branchBId: string) => {
    if (!branchManagerRef.current) return
    const a = branches.find((b) => b.id === branchAId)
    const b = branches.find((b) => b.id === branchBId)
    if (!a || !b) return
    setBranchCompareA(a)
    setBranchCompareB(b)
    setBranchDiffLoading(true)
    setShowBranchComparison(true)
    try {
      const diff = await branchManagerRef.current.compareBranches(branchAId, branchBId)
      setBranchDiff(diff)
    } catch {
      setBranchDiff(null)
    }
    setBranchDiffLoading(false)
  }, [branches])

  const handleOpenMergeDialog = useCallback((sourceId: string, targetId: string) => {
    setMergeBranchSourceId(sourceId)
    setMergeBranchTargetId(targetId)
    setShowMergeBranchDialog(true)
  }, [])

  const handleMergeBranchPreview = useCallback(async (sourceId: string, targetId: string) => {
    if (!mergeEngineRef.current) throw new Error('Not initialized')
    return mergeEngineRef.current.getMergePreview(sourceId, targetId)
  }, [])

  const handleMergeBranchExecute = useCallback(async (
    sourceId: string,
    targetId: string,
    resolutions: Record<string, { resolution: 'source' | 'target' | 'manual'; manualValue?: string | number }>
  ) => {
    if (!mergeEngineRef.current) throw new Error('Not initialized')
    const result = await mergeEngineRef.current.mergeBranch(sourceId, targetId, resolutions)
    await fetchBranches()
    await fetchData()
    addCollabToast('Branches merged successfully')
    return result
  }, [fetchBranches, fetchData, addCollabToast])

  const handleCherryPick = useCallback(async (sourceId: string, targetId: string, changes: CherryPickItem[]) => {
    if (!mergeEngineRef.current) throw new Error('Not initialized')
    const result = await mergeEngineRef.current.cherryPick(sourceId, targetId, changes)
    await fetchBranches()
    await fetchData()
    addCollabToast('Cherry-pick applied')
    return result
  }, [fetchBranches, fetchData, addCollabToast])

  const handleGetMergeHistory = useCallback(async (branchId: string) => {
    if (!mergeEngineRef.current) return []
    return mergeEngineRef.current.getMergeHistory(branchId)
  }, [])

  const handleRollbackMerge = useCallback(async (mergeId: string) => {
    if (!mergeEngineRef.current) return
    await mergeEngineRef.current.rollbackMerge(mergeId)
    await fetchBranches()
    await fetchData()
    addCollabToast('Merge rolled back')
  }, [fetchBranches, fetchData, addCollabToast])

  // ── Share helpers ──────────────────────────────────────────────────────

  const fetchShareStatus = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setShareToken(data.shareToken)
        setShareAccessCode(data.shareAccessCode)
        setShareUrl(data.shareUrl)
        setAccessCodeInput(data.shareAccessCode || '')
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  const enableSharing = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setShareToken(data.shareToken)
        setShareAccessCode(data.shareAccessCode)
        setShareUrl(data.shareUrl)
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  const disableSharing = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        setShareToken(null)
        setShareAccessCode(null)
        setShareUrl(null)
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  const updateAccessCode = useCallback(async (code: string | null) => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/share`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ accessCode: code }),
      })
      setShareAccessCode(code)
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  const copyToClipboard = useCallback(async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setter(true)
      setTimeout(() => setter(false), 2000)
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    if (isEditorRole && showShareDialog) fetchShareStatus()
  }, [isEditorRole, showShareDialog, fetchShareStatus])

  // ── Notify Students helper ──────────────────────────────────────────────

  const handleNotifyStudents = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setNotifyingStu(true)
    setNotifyStuResult(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/notify`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      const data = await res.json()
      if (res.ok) {
        setNotifyStuResult(`Notified ${data.notified} student${data.notified !== 1 ? 's' : ''}`)
        setTimeout(() => setNotifyStuResult(null), 4000)
      } else {
        setNotifyStuResult('Failed to notify students')
        setTimeout(() => setNotifyStuResult(null), 4000)
      }
    } catch {
      setNotifyStuResult('Failed to notify students')
      setTimeout(() => setNotifyStuResult(null), 4000)
    }
    setNotifyingStu(false)
  }, [courseId, currentUser?.email])

  // ── Webhook helpers ─────────────────────────────────────────────────────

  const fetchWebhooks = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setWebhooksLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch { /* silently fail */ }
    setWebhooksLoading(false)
  }, [courseId, currentUser?.email])

  const handleAddWebhook = useCallback(async () => {
    if (!courseId || !currentUser?.email || !webhookUrl.trim() || !webhookSecret.trim()) return
    setAddingWebhook(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ url: webhookUrl.trim(), secret: webhookSecret.trim(), events: webhookEvents }),
      })
      if (res.ok) {
        setWebhookUrl('')
        setWebhookSecret('')
        setWebhookEvents([])
        fetchWebhooks()
      }
    } catch { /* silently fail */ }
    setAddingWebhook(false)
  }, [courseId, currentUser?.email, webhookUrl, webhookSecret, webhookEvents, fetchWebhooks])

  const handleDeleteWebhook = useCallback(async (whId: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/webhooks/${whId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      setWebhooks((prev) => prev.filter((w) => w.id !== whId))
    } catch { /* silently fail */ }
  }, [courseId, currentUser?.email])

  const handleTestWebhook = useCallback(async (whId: string) => {
    if (!courseId || !currentUser?.email) return
    setTestingWebhookId(whId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ action: 'test', webhookId: whId }),
      })
      const data = await res.json()
      addCollabToast(data.ok ? `Webhook test: ${data.status} OK` : `Webhook test failed: ${data.error || 'unknown error'}`)
    } catch {
      addCollabToast('Webhook test failed')
    }
    setTestingWebhookId(null)
  }, [courseId, currentUser?.email, addCollabToast])

  useEffect(() => {
    if (isEditorRole && showShareDialog && shareTab === 'webhooks') fetchWebhooks()
  }, [isEditorRole, showShareDialog, shareTab, fetchWebhooks])

  // ── Notification center helpers (Task 69) ────────────────────────────────

  const fetchNotifications = useCallback(async (filterType?: NotifType | 'all') => {
    if (!courseId || !currentUser?.email) return
    setNotifLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filterType && filterType !== 'all') params.set('type', filterType)
      const res = await fetch(`/api/courses/${courseId}/course-map/notifications?${params}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setNotifEntries(data.notifications || [])
        setNotifUnreadCount(data.unreadCount ?? 0)
      }
    } catch { /* silently fail */ }
    setNotifLoading(false)
  }, [courseId, currentUser?.email])

  const handleMarkNotifRead = useCallback(async (notifId: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/notifications/${notifId}`, {
        method: 'PATCH',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      setNotifEntries((prev) => prev.map((n) =>
        n.id === notifId ? { ...n, readBy: [...n.readBy, currentUser?.id || ''] } : n
      ))
      setNotifUnreadCount((c) => Math.max(0, c - 1))
    } catch { /* silently fail */ }
  }, [courseId, currentUser?.email, currentUser?.id])

  const handleMarkAllNotifsRead = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      setNotifEntries((prev) => prev.map((n) => ({
        ...n,
        readBy: n.readBy.includes(currentUser?.id || '') ? n.readBy : [...n.readBy, currentUser?.id || ''],
      })))
      setNotifUnreadCount(0)
    } catch { /* silently fail */ }
  }, [courseId, currentUser?.email, currentUser?.id])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!courseId || !currentUser?.email) return
    fetchNotifications(notifFilterType)
    const interval = setInterval(() => {
      fetchNotifications(notifFilterType)
    }, 30_000)
    return () => clearInterval(interval)
  }, [courseId, currentUser?.email, notifFilterType, fetchNotifications])

  // ── Webhook dashboard helpers (Task 70) ──────────────────────────────────

  const fetchWebhookDeliveries = useCallback(async (webhookId: string) => {
    if (!courseId || !currentUser?.email) return
    setWebhookDeliveriesLoading(true)
    setWebhookDeliveriesForId(webhookId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/webhooks/${webhookId}/deliveries?limit=50`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setWebhookDeliveries(data.deliveries || [])
      }
    } catch { /* silently fail */ }
    setWebhookDeliveriesLoading(false)
  }, [courseId, currentUser?.email])

  const openWebhookDashboard = useCallback(() => {
    setShowWebhookDashboard(true)
    fetchWebhooks()
  }, [fetchWebhooks])

  const WEBHOOK_EVENT_OPTIONS = [
    'node.created', 'node.updated', 'node.deleted',
    'edge.created', 'edge.deleted',
    'snapshot.created', 'health.computed', 'milestone.achieved',
  ] as const

  // ── Study Plan helpers ──────────────────────────────────────────────────

  const fetchStudyPlan = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-plan`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setStudyPlanEntries(data.entries || [])
        setStudyPlanStats(data.stats || { planned: 0, completed: 0, overdue: 0 })
      }
    } catch { /* silently fail */ }
  }, [courseId, currentUser?.email])

  const handleSavePlanEntry = useCallback(async () => {
    if (!courseId || !currentUser?.email || !planNodeId || !planDate) return
    setSavingPlan(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ nodeId: planNodeId, targetDate: planDate }),
      })
      if (res.ok) {
        fetchStudyPlan()
        setPlanNodeId(null)
        setPlanDate('')
      }
    } catch { /* silently fail */ }
    setSavingPlan(false)
  }, [courseId, currentUser?.email, planNodeId, planDate, fetchStudyPlan])

  const handleRemovePlanEntry = useCallback(async (nodeId: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-plan/${nodeId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      setStudyPlanEntries((prev) => prev.filter((e) => e.nodeId !== nodeId))
      setStudyPlanStats((prev) => ({ ...prev, planned: Math.max(0, prev.planned - 1) }))
    } catch { /* silently fail */ }
  }, [courseId, currentUser?.email])

  const handleCompletePlanEntry = useCallback(async (nodeId: string) => {
    if (!courseId || !currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ nodeId, complete: true }),
      })
      fetchStudyPlan()
    } catch { /* silently fail */ }
  }, [courseId, currentUser?.email, fetchStudyPlan])

  useEffect(() => {
    if (isStudent && showStudyPlan) fetchStudyPlan()
  }, [isStudent, showStudyPlan, fetchStudyPlan])

  // Study plan lookup map
  const studyPlanMap = new Map(studyPlanEntries.map((e) => [e.nodeId, e]))

  // ── Peer Progress Heatmap helpers ───────────────────────────────────────

  const fetchHeatmap = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setHeatmapLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/peer-progress`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        const map = new Map<string, HeatmapEntry>()
        for (const entry of (data.heatmap || [])) {
          map.set(entry.nodeId, entry)
        }
        setHeatmapData(map)
      }
    } catch { /* silently fail */ }
    setHeatmapLoading(false)
  }, [courseId, currentUser?.email])

  useEffect(() => {
    if (showHeatmap) fetchHeatmap()
  }, [showHeatmap, fetchHeatmap])

  // ── Export helpers ─────────────────────────────────────────────────────

  const exportAs = useCallback(async (format: 'csv' | 'svg' | 'json') => {
    if (!courseId || !currentUser?.email) return
    setShowExportDropdown(false)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/export?format=${format}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `course-map.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  const exportAsPng = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setShowExportDropdown(false)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/export?format=png`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const { svg, width, height } = await res.json() as { svg: string; width: number; height: number }

      // Render SVG to canvas then export as PNG
      const canvas = document.createElement('canvas')
      const scale = 2 // 2x resolution for crisp output
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(scale, scale)

      const img = new Image()
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return
          const pngUrl = URL.createObjectURL(pngBlob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = `course-map.png`
          a.click()
          URL.revokeObjectURL(pngUrl)
        }, 'image/png')
      }
      img.src = url
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  const handlePrint = useCallback(() => {
    setShowExportDropdown(false)
    document.body.classList.add('course-map-printing')
    window.print()
    // Remove class after print dialog closes
    const cleanup = () => {
      document.body.classList.remove('course-map-printing')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
  }, [])

  // ── Report helpers ──────────────────────────────────────────────────────

  const openReportInTab = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setReportLoading(true)
    try {
      const params = new URLSearchParams({ format: 'html' })
      if (!reportIncludeAnnotations) params.set('annotations', 'false')
      if (!reportIncludeMilestones) params.set('milestones', 'false')
      if (!reportIncludeHealth) params.set('health', 'false')
      if (!reportIncludeAnalytics) params.set('analytics', 'false')
      window.open(`/api/courses/${courseId}/course-map/report?${params}`, '_blank')
    } finally {
      setReportLoading(false)
    }
  }, [courseId, currentUser?.email, reportIncludeAnnotations, reportIncludeMilestones, reportIncludeHealth, reportIncludeAnalytics])

  const downloadReportHtml = useCallback(async () => {
    if (!courseId || !currentUser?.email) return
    setReportLoading(true)
    try {
      const params = new URLSearchParams({ format: 'html' })
      if (!reportIncludeAnnotations) params.set('annotations', 'false')
      if (!reportIncludeMilestones) params.set('milestones', 'false')
      if (!reportIncludeHealth) params.set('health', 'false')
      if (!reportIncludeAnalytics) params.set('analytics', 'false')
      const res = await fetch(`/api/courses/${courseId}/course-map/report?${params}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'course-map-report.html'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setReportLoading(false)
    }
  }, [courseId, currentUser?.email, reportIncludeAnnotations, reportIncludeMilestones, reportIncludeHealth, reportIncludeAnalytics])

  // ── Course comparison helpers ──────────────────────────────────────────

  const fetchCompareCourses = useCallback(async () => {
    if (!currentUser?.email) return
    try {
      const res = await fetch('/api/courses', { headers: { 'x-demo-user-email': currentUser.email } })
      if (!res.ok) return
      const data = await res.json()
      const courses = (data.courses || data || [])
        .filter((c: { id: string }) => c.id !== courseId)
        .map((c: { id: string; courseCode?: string; title?: string }) => ({
          id: c.id,
          courseCode: c.courseCode || '',
          title: c.title || 'Untitled',
        }))
      setCompareCourses(courses)
    } catch {
      setCompareCourses([])
    }
  }, [courseId, currentUser?.email])

  const runCourseComparison = useCallback(async () => {
    if (!courseId || !currentUser?.email || !compareTargetCourseId) return
    setCourseComparisonLoading(true)
    setCourseComparisonResult(null)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/course-map/compare?targetCourseId=${compareTargetCourseId}`,
        { headers: { 'x-demo-user-email': currentUser.email } },
      )
      if (!res.ok) return
      const data = await res.json()
      setCourseComparisonResult(data.comparison)
    } finally {
      setCourseComparisonLoading(false)
    }
  }, [courseId, currentUser?.email, compareTargetCourseId])

  // ── Drag-and-drop handlers ──────────────────────────────────────────────

  const handleDragStart = useCallback((nodeId: string, clientX: number, clientY: number) => {
    if (!isEditorRole || !graphMap || canvasMode !== 'select' || whiteboardActive) return
    const node = graphMap.nodes.find((n) => n.id === nodeId)
    if (!node) return
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    const scrollLeft = canvasRef.current?.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current?.parentElement?.scrollTop || 0
    setDragOffset({
      x: clientX - canvasRect.left + scrollLeft - node.xPos,
      y: clientY - canvasRect.top + scrollTop - node.yPos,
    })
    setDraggingNodeId(nodeId)
  }, [isEditorRole, graphMap, canvasMode, whiteboardActive])

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingNodeId || !graphMap || !canvasRef.current) return
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const scrollLeft = canvasRef.current.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current.parentElement?.scrollTop || 0
    const rawX = clientX - canvasRect.left + scrollLeft - dragOffset.x
    const rawY = clientY - canvasRect.top + scrollTop - dragOffset.y
    const newX = snapToGrid(Math.max(0, rawX))
    const newY = snapToGrid(Math.max(0, rawY))

    setGraphMap((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === draggingNodeId ? { ...n, xPos: newX, yPos: newY } : n
        ),
      }
    })
  }, [draggingNodeId, graphMap, dragOffset])

  const handleDragEnd = useCallback(async () => {
    if (!draggingNodeId || !graphMap || !currentUser?.email) {
      setDraggingNodeId(null)
      return
    }
    const node = graphMap.nodes.find((n) => n.id === draggingNodeId)
    setDraggingNodeId(null)
    if (!node) return

    // Persist position to server + broadcast via collab edits
    try {
      await fetch(`/api/courses/${courseId}/course-map/edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          editType: 'node_moved',
          payload: { nodeId: node.id, xPos: node.xPos, yPos: node.yPos },
        }),
      })
    } catch {
      // Silently fail — position was already updated optimistically
    }
  }, [draggingNodeId, graphMap, courseId, currentUser?.email])

  // Global mouse/touch move and up listeners for drag
  useEffect(() => {
    if (!draggingNodeId) return

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY)
    const onMouseUp = () => handleDragEnd()
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault()
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const onTouchEnd = () => handleDragEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [draggingNodeId, handleDragMove, handleDragEnd])

  // ── Connect mode: cursor tracking ───────────────────────────────────────

  useEffect(() => {
    if (canvasMode !== 'connect' || !connectSource) return
    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const scrollLeft = canvasRef.current.parentElement?.scrollLeft || 0
      const scrollTop = canvasRef.current.parentElement?.scrollTop || 0
      setCursorPos({
        x: e.clientX - rect.left + scrollLeft,
        y: e.clientY - rect.top + scrollTop,
      })
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectSource(null)
        setCursorPos(null)
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onEscape)
    }
  }, [canvasMode, connectSource])

  // Reset connect state when switching modes
  useEffect(() => {
    if (canvasMode === 'select') {
      setConnectSource(null)
      setCursorPos(null)
      setEdgeTypePopover(null)
    }
  }, [canvasMode])

  // ── Remote cursor broadcast on canvas mouse move (Task 49) ──────────────

  const broadcastCursorMove = useCallback((clientX: number, clientY: number) => {
    if (!isEditorRole || !courseId || !currentUser?.email || !canvasFocusedRef.current) return
    if (!canvasRef.current) return
    const now = Date.now()
    // Throttle to max 5/second (200ms interval)
    if (now - lastCursorBroadcastRef.current < 200) return
    lastCursorBroadcastRef.current = now

    const rect = canvasRef.current.getBoundingClientRect()
    const scrollLeft = canvasRef.current.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current.parentElement?.scrollTop || 0
    const x = clientX - rect.left + scrollLeft
    const y = clientY - rect.top + scrollTop

    fetch(`/api/courses/${courseId}/course-map/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({
        editType: 'cursor_moved',
        payload: { x, y },
      }),
    }).catch(() => { /* silent */ })
  }, [isEditorRole, courseId, currentUser?.email])

  // Fade out remote cursors after 5s of inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setRemoteCursors((prev) => prev.filter((c) => now - c.lastUpdated < 5000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Broadcast editing_node when detail drawer opens/closes (Task 50)
  useEffect(() => {
    if (!isEditorRole || !courseId || !currentUser?.email) return
    fetch(`/api/courses/${courseId}/course-map/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({
        editType: 'editing_node',
        payload: { nodeId: selectedNodeId },
      }),
    }).catch(() => { /* silent */ })
  }, [selectedNodeId, isEditorRole, courseId, currentUser?.email])

  // Clear conflict when drawer closes
  useEffect(() => {
    if (!selectedNodeId) setConflictInfo(null)
  }, [selectedNodeId])

  // ── Connect mode: node click handler ────────────────────────────────────

  const handleNodeClickConnect = useCallback((nodeId: string, clientX: number, clientY: number) => {
    if (!connectSource) {
      setConnectSource(nodeId)
      return
    }
    if (connectSource === nodeId) {
      // Self-loop — cancel
      setConnectSource(null)
      setCursorPos(null)
      return
    }
    // Show edge type popover
    const rect = canvasRef.current?.getBoundingClientRect()
    const scrollLeft = canvasRef.current?.parentElement?.scrollLeft || 0
    const scrollTop = canvasRef.current?.parentElement?.scrollTop || 0
    setEdgeTypePopover({
      fromNodeId: connectSource,
      toNodeId: nodeId,
      position: {
        x: clientX - (rect?.left || 0) + scrollLeft,
        y: clientY - (rect?.top || 0) + scrollTop,
      },
    })
  }, [connectSource])

  // ── Edge CRUD ───────────────────────────────────────────────────────────

  const createEdge = useCallback(async (fromNodeId: string, toNodeId: string, edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT') => {
    if (!currentUser?.email) return
    setEdgeTypePopover(null)
    setConnectSource(null)
    setCursorPos(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/edges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ fromNodeId, toNodeId, edgeType }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email, fetchData])

  const deleteEdge = useCallback(async (edgeId: string) => {
    if (!currentUser?.email) return
    setPendingDeleteEdgeId(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/edges/${edgeId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        // Optimistically remove from state
        setGraphMap((prev) => {
          if (!prev) return prev
          return { ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }
        })
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email])

  // ── Gap Analysis handler ─────────────────────────────────────────────────

  const runGapAnalysis = useCallback(async () => {
    if (!currentUser?.email) return
    setGapLoading(true)
    setGapFindings([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/gap-analysis`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setGapFindings(data.findings || [])
        setGapPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setGapLoading(false)
    }
  }, [courseId, currentUser?.email])

  // ── Suggest Edges handler ──────────────────────────────────────────────

  const runSuggestEdges = useCallback(async () => {
    if (!currentUser?.email) return
    setSuggestLoading(true)
    setEdgeSuggestions([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/suggest-edges`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setEdgeSuggestions(data.suggestions || [])
      }
    } catch {
      // Silently fail
    } finally {
      setSuggestLoading(false)
    }
  }, [courseId, currentUser?.email])

  // ── Study Recommendations handler (Task 59) ──────────────────────────────

  const fetchStudyRecommendations = useCallback(async () => {
    if (!currentUser?.email) return
    setStudyRecsLoading(true)
    setStudyRecommendations([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-recommendations`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setStudyRecommendations(data.recommendations || [])
        setStudyRecsPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setStudyRecsLoading(false)
    }
  }, [courseId, currentUser?.email])

  // ── Prerequisite Validation handler (Task 60) ───────────────────────────

  const runPrereqValidation = useCallback(async () => {
    if (!currentUser?.email) return
    setPrereqValidLoading(true)
    setPrereqValidations([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/prerequisite-validation`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setPrereqValidations(data.validations || [])
        setPrereqValidPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setPrereqValidLoading(false)
    }
  }, [courseId, currentUser?.email])

  // ── Annotation handlers (Task 62) ──────────────────────────────────────────

  const createAnnotationLayer = useCallback(async (name: string) => {
    if (!currentUser?.email || !name.trim()) return
    setCreatingLayer(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnnotationLayers((prev) => [...prev, data.layer])
        setActiveLayerId(data.layer.id)
        setNewLayerName('')
      }
    } catch { /* silent */ } finally {
      setCreatingLayer(false)
    }
  }, [courseId, currentUser?.email])

  const deleteAnnotationLayerHandler = useCallback(async (layerId: string) => {
    if (!currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ layerId, action: 'delete' }),
      })
      setAnnotationLayers((prev) => prev.filter((l) => l.id !== layerId))
      setAnnotations((prev) => prev.filter((a) => a.layerId !== layerId))
      if (activeLayerId === layerId) {
        setActiveLayerId(annotationLayers.find((l) => l.id !== layerId)?.id ?? null)
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, activeLayerId, annotationLayers])

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setHiddenLayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return next
    })
    // Fire-and-forget: persist to server
    if (currentUser?.email) {
      const visible = hiddenLayerIds.has(layerId) // toggling to visible
      fetch(`/api/courses/${courseId}/course-map/annotation-layers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ layerId, action: 'toggleVisibility', visible }),
      }).catch(() => {})
    }
  }, [courseId, currentUser?.email, hiddenLayerIds])

  const addAnnotationToCanvas = useCallback(async (
    type: 'note' | 'highlight',
    positionX: number,
    positionY: number,
    content: string,
    targetNodeId?: string,
  ) => {
    if (!currentUser?.email || !activeLayerId) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ layerId: activeLayerId, type, content, positionX, positionY, targetNodeId }),
      })
      if (res.ok) {
        const data = await res.json()
        const layer = annotationLayers.find((l) => l.id === activeLayerId)
        setAnnotations((prev) => [...prev, {
          ...data.annotation,
          layer: layer ? { id: layer.id, name: layer.name, color: layer.color } : { id: activeLayerId, name: '', color: '#3B82F6' },
        }])
        setAnnotationLayers((prev) => prev.map((l) =>
          l.id === activeLayerId ? { ...l, _count: { annotations: l._count.annotations + 1 } } : l
        ))
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, activeLayerId, annotationLayers])

  const deleteAnnotationHandler = useCallback(async (annotationId: string) => {
    if (!currentUser?.email) return
    const ann = annotations.find((a) => a.id === annotationId)
    try {
      await fetch(`/api/courses/${courseId}/course-map/annotations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ annotationId }),
      })
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
      if (ann) {
        setAnnotationLayers((prev) => prev.map((l) =>
          l.id === ann.layerId ? { ...l, _count: { annotations: Math.max(0, l._count.annotations - 1) } } : l
        ))
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, annotations])

  const handleAnnotationCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (annotationMode === 'none' || !activeLayerId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft
    const y = e.clientY - rect.top + e.currentTarget.scrollTop

    if (annotationMode === 'note') {
      setAnnotationNoteText('')
      // Place a temporary note at the click position
      const tempId = `temp-${Date.now()}`
      const layer = annotationLayers.find((l) => l.id === activeLayerId)
      setAnnotations((prev) => [...prev, {
        id: tempId,
        layerId: activeLayerId,
        type: 'note',
        content: '',
        positionX: x,
        positionY: y,
        targetNodeId: null,
        layer: layer ? { id: layer.id, name: layer.name, color: layer.color } : { id: activeLayerId, name: '', color: '#3B82F6' },
      }])
      setEditingAnnotationId(tempId)
    } else if (annotationMode === 'highlight') {
      // For highlights, find nearest node
      const nodes = graphMap?.nodes || []
      let nearestNode: MapNode | null = null
      let minDist = 60 // max distance to "snap" to a node
      for (const node of nodes) {
        const dist = Math.sqrt((node.xPos - x) ** 2 + (node.yPos - y) ** 2)
        if (dist < minDist) {
          minDist = dist
          nearestNode = node
        }
      }
      if (nearestNode) {
        addAnnotationToCanvas('highlight', nearestNode.xPos, nearestNode.yPos, '', nearestNode.id)
      }
    }
  }, [annotationMode, activeLayerId, annotationLayers, graphMap?.nodes, addAnnotationToCanvas])

  const saveAnnotationNote = useCallback(async (tempId: string, content: string) => {
    if (!content.trim()) {
      // Remove the temp annotation
      setAnnotations((prev) => prev.filter((a) => a.id !== tempId))
      setEditingAnnotationId(null)
      return
    }
    const tempAnn = annotations.find((a) => a.id === tempId)
    if (!tempAnn) return
    // Remove temp, create real
    setAnnotations((prev) => prev.filter((a) => a.id !== tempId))
    await addAnnotationToCanvas('note', tempAnn.positionX, tempAnn.positionY, content.trim())
    setEditingAnnotationId(null)
    setAnnotationNoteText('')
  }, [annotations, addAnnotationToCanvas])

  const totalAnnotationCount = annotationLayers.reduce((sum, l) => sum + l._count.annotations, 0)

  // ── Study group handlers (Task 63) ─────────────────────────────────────────

  const openGroupDetail = useCallback(async (groupId: string) => {
    if (!currentUser?.email) return
    setSelectedGroupId(groupId)
    try {
      const [detailRes, msgsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/course-map/study-groups?groupId=${groupId}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
        fetch(`/api/courses/${courseId}/course-map/study-groups/${groupId}/messages`, {
          headers: { 'x-demo-user-email': currentUser.email },
        }),
      ])
      if (detailRes.ok) {
        const data = await detailRes.json()
        setSelectedGroupDetail(data.group)
        setSelectedGroupProgress(data.progress)
      }
      if (msgsRes.ok) {
        const data = await msgsRes.json()
        setGroupMessages(data.messages || [])
      }
    } catch { /* silent */ }
  }, [courseId, currentUser?.email])

  const handleCreateGroup = useCallback(async () => {
    if (!currentUser?.email || !newGroupName.trim() || !newGroupNodeId) return
    setCreatingGroup(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ action: 'create', nodeId: newGroupNodeId, name: newGroupName.trim() }),
      })
      if (res.ok) {
        setNewGroupName('')
        setNewGroupNodeId(null)
        fetchStudyGroups()
      }
    } catch { /* silent */ } finally {
      setCreatingGroup(false)
    }
  }, [courseId, currentUser?.email, newGroupName, newGroupNodeId, fetchStudyGroups])

  const handleJoinGroup = useCallback(async (groupId: string) => {
    if (!currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ action: 'join', groupId }),
      })
      fetchStudyGroups()
      if (selectedGroupId === groupId) openGroupDetail(groupId)
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, fetchStudyGroups, selectedGroupId, openGroupDetail])

  const handleLeaveGroup = useCallback(async (groupId: string) => {
    if (!currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/study-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ action: 'leave', groupId }),
      })
      fetchStudyGroups()
      if (selectedGroupId === groupId) openGroupDetail(groupId)
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, fetchStudyGroups, selectedGroupId, openGroupDetail])

  const handleSendGroupMessage = useCallback(async () => {
    if (!currentUser?.email || !selectedGroupId || !groupMessageInput.trim()) return
    setSendingGroupMsg(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/study-groups/${selectedGroupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ content: groupMessageInput.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setGroupMessages((prev) => [...prev, data.message])
        setGroupMessageInput('')
      }
    } catch { /* silent */ } finally {
      setSendingGroupMsg(false)
    }
  }, [courseId, currentUser?.email, selectedGroupId, groupMessageInput])

  // ── Milestone handlers (Task 64) ───────────────────────────────────────────

  const handleSetMilestone = useCallback(async (nodeId: string, label: string, description?: string) => {
    if (!currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ nodeId, label, description }),
      })
      fetchMilestones()
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, fetchMilestones])

  const handleRemoveMilestone = useCallback(async (nodeId: string) => {
    if (!currentUser?.email) return
    try {
      await fetch(`/api/courses/${courseId}/course-map/milestones`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ nodeId }),
      })
      fetchMilestones()
    } catch { /* silent */ }
  }, [courseId, currentUser?.email, fetchMilestones])

  const acceptSuggestion = useCallback(async (suggestion: EdgeSuggestion) => {
    if (!currentUser?.email) return
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/edges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          fromNodeId: suggestion.fromNodeId,
          toNodeId: suggestion.toNodeId,
          edgeType: suggestion.edgeType,
        }),
      })
      if (res.ok) {
        // Remove from suggestions and refresh map
        setEdgeSuggestions((prev) => prev.filter((s) =>
          s.fromNodeId !== suggestion.fromNodeId || s.toNodeId !== suggestion.toNodeId
        ))
        fetchData()
      }
    } catch {
      // Silently fail
    }
  }, [courseId, currentUser?.email, fetchData])

  const dismissSuggestion = useCallback((suggestion: EdgeSuggestion) => {
    setEdgeSuggestions((prev) => prev.filter((s) =>
      s.fromNodeId !== suggestion.fromNodeId || s.toNodeId !== suggestion.toNodeId
    ))
  }, [])

  // ── AI Suggestions handler (Task 43) ─────────────────────────────────────

  const runAiSuggestions = useCallback(async () => {
    if (!currentUser?.email) return
    setAiSuggestionsLoading(true)
    setAiSuggestions([])
    setAppliedSuggestionIds(new Set())
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-suggestions`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setAiSuggestions(data.suggestions || [])
        setAiSuggestionsSummary(data.summary || '')
        setAiSuggestionsPanelOpen(true)
      }
    } catch {
      // Silently fail
    } finally {
      setAiSuggestionsLoading(false)
    }
  }, [courseId, currentUser?.email])

  const applyAiSuggestion = useCallback(async (suggestion: typeof aiSuggestions[0]) => {
    if (!currentUser?.email) return
    setApplyingSuggestionId(suggestion.id)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-suggestions/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ suggestion }),
      })
      if (res.ok) {
        setAppliedSuggestionIds((prev) => new Set([...prev, suggestion.id]))
        fetchData()
      }
    } catch {
      // Silently fail
    } finally {
      setApplyingSuggestionId(null)
    }
  }, [courseId, currentUser?.email, fetchData])

  const dismissAiSuggestion = useCallback((id: string) => {
    setAiSuggestions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // ── Smart Template Suggestions (Task 52) ──────────────────────────────────

  const runTemplateSuggestions = useCallback(async () => {
    if (!currentUser?.email || !graphMap) return
    setTemplateSuggestLoading(true)
    setTemplateSuggestions([])
    try {
      // Gather syllabus text from unit labels + descriptions
      const syllabusText = graphMap.units
        .map((u) => `${u.label}${u.description ? ': ' + u.description : ''}`)
        .join('\n')
      // If no existing units, try fetching course materials
      const textToAnalyze = syllabusText.length > 50
        ? syllabusText
        : graphMap.nodes.map((n) => n.label).join('\n')

      if (textToAnalyze.length < 50) {
        setTemplateSuggestLoading(false)
        return
      }

      const res = await fetch(`/api/courses/${courseId}/course-map/suggest-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ syllabusText: textToAnalyze }),
      })
      if (res.ok) {
        const data = await res.json()
        setTemplateSuggestions(data.suggestions || [])
        setShowTemplateSuggestions(true)
      }
    } catch {
      // Silently fail
    } finally {
      setTemplateSuggestLoading(false)
    }
  }, [courseId, currentUser?.email, graphMap])

  const applyPresetTemplate = useCallback(async (presetId: string) => {
    if (!currentUser?.email) return
    setApplyingPresetId(presetId)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/from-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ templateId: presetId, preset: true }),
      })
      if (res.ok) {
        setShowTemplateSuggestions(false)
        setTemplateSuggestions([])
        fetchData()
      }
    } catch {
      // Silently fail
    } finally {
      setApplyingPresetId(null)
    }
  }, [courseId, currentUser?.email, fetchData])

  // ── NL Edit handler (Task 44) ────────────────────────────────────────────

  const submitNlEdit = useCallback(async () => {
    if (!currentUser?.email || !nlEditInstruction.trim()) return
    setNlEditLoading(true)
    setNlEditChanges([])
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ instruction: nlEditInstruction.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setNlEditChanges(data.changes || [])
        setNlEditSummary(data.summary || '')
      }
    } catch {
      // Silently fail
    } finally {
      setNlEditLoading(false)
    }
  }, [courseId, currentUser?.email, nlEditInstruction])

  const applyNlChanges = useCallback(async () => {
    if (!currentUser?.email || nlEditChanges.length === 0) return
    setNlEditApplying(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/course-map/ai-edit/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ changes: nlEditChanges }),
      })
      if (res.ok) {
        setNlEditOpen(false)
        setNlEditInstruction('')
        setNlEditChanges([])
        setNlEditSummary('')
        fetchData()
      }
    } catch {
      // Silently fail
    } finally {
      setNlEditApplying(false)
    }
  }, [courseId, currentUser?.email, nlEditChanges, fetchData])

  // Build node lookup
  const nodeMap = new Map<string, MapNode>()
  const unitMap = new Map<string, CourseUnit>()
  const nodeLabelsMap = new Map<string, string>()
  if (graphMap) {
    for (const n of graphMap.nodes) { nodeMap.set(n.id, n); nodeLabelsMap.set(n.id, n.label) }
    for (const u of graphMap.units) unitMap.set(u.id, u)
  }

  // Learning path lookup
  const pathPositionMap = new Map<string, number>()
  let currentPathNodeId: string | null = null
  for (const entry of learningPath) {
    pathPositionMap.set(entry.nodeId, entry.position)
    if (!currentPathNodeId && (entry.status === 'not-started' || entry.status === 'in-progress')) {
      currentPathNodeId = entry.nodeId
    }
  }

  // Selected node details
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null
  const selectedUnit = selectedNode?.courseUnitId ? unitMap.get(selectedNode.courseUnitId) : null

  // Compute canvas bounds
  let canvasWidth = 800
  let canvasHeight = 600
  if (graphMap && graphMap.nodes.length > 0) {
    const maxX = Math.max(...graphMap.nodes.filter((n) => !n.archived).map((n) => n.xPos))
    const maxY = Math.max(...graphMap.nodes.filter((n) => !n.archived).map((n) => n.yPos))
    canvasWidth = Math.max(800, maxX + NODE_WIDTH + 80)
    canvasHeight = Math.max(600, maxY + NODE_HEIGHT + 80)
  }

  // Track render time (Task 74)
  const renderStart = performance.now()
  useEffect(() => {
    trackRenderTime('CourseMapPage', performance.now() - renderStart)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Course Map" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-400">
          Loading course map...
        </div>
      </div>
    )
  }

  if (error === 'forbidden') {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Course Map" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-500">
          You don&apos;t have access to this course map.
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${a11yContainerClass}`} dir={dir} lang={locale}>
      {/* Accessibility overlay — skip links, high-contrast toggle, keyboard shortcuts dialog (Task 89) */}
      <AccessibilityOverlay
        highContrast={highContrast}
        onToggleHighContrast={toggleHighContrast}
        announce={a11yAnnounce}
      />

      {/* Skip to graph link (Task 45) */}
      <a
        href="#course-map-graph"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-uk-blue focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        {t('courseMap.a11y.skipLink')}
      </a>
      {/* Skip to toolbar link (Task 77 / Task 89) */}
      <a
        href="#course-map-toolbar"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-24 focus:z-50 focus:px-4 focus:py-2 focus:bg-uk-blue focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        {t('courseMap.a11y.skipToToolbar')}
      </a>
      {/* Screen reader announcements (Task 45) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <PageHeader
        title={t('courseMap.nav.title')}
        subtitle={isStudent ? t('courseMap.nav.subtitleStudent') : t('courseMap.nav.subtitleEducator')}
        action={
          <Link
            href={`/courses?course=${courseId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to course
          </Link>
        }
      />

      {/* Offline indicator bar (Task 71) */}
      {isOffline && (
        <div role="status" aria-live="assertive" className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-2">
          <WifiOff className="size-4 text-amber-600" aria-hidden="true" />
          <span className="text-sm font-medium text-amber-800">
            You&apos;re offline — edits are queued locally
          </span>
          {queueLength > 0 && (
            <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-amber-200 text-amber-800 rounded-full">
              {queueLength} pending
            </span>
          )}
        </div>
      )}

      {/* Sync progress indicator (Task 71) */}
      {syncStatus === 'syncing' && syncProgress && (
        <div role="status" aria-live="polite" className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center justify-center gap-2">
          <Loader2 className="size-4 text-blue-600 motion-safe:animate-spin" aria-hidden="true" />
          <span className="text-sm font-medium text-blue-800">
            Syncing queued edits ({syncProgress.completed}/{syncProgress.total})...
          </span>
        </div>
      )}

      {syncStatus === 'synced' && !isOffline && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2.5 flex items-center justify-center gap-2">
          <Wifi className="size-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            All queued edits synced successfully
          </span>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-center gap-2">
          <CloudOff className="size-4 text-red-600" />
          <span className="text-sm font-medium text-red-800">
            Some edits failed to sync — they&apos;ll be retried next time you&apos;re online
          </span>
        </div>
      )}

      {/* Cached data freshness indicator (Task 79) */}
      {cachedAt && !isOffline && isRevalidating && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-center gap-2">
          <Loader2 className="size-3.5 text-gray-500 motion-safe:animate-spin" aria-hidden="true" />
          <span className="text-xs text-gray-600">
            Showing cached data from {formatDistanceToNow(cachedAt, { addSuffix: true })} — refreshing...
          </span>
        </div>
      )}
      {cachedAt && isOffline && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-center gap-2">
          <Clock className="size-3.5 text-gray-500" aria-hidden="true" />
          <span className="text-xs text-gray-600">
            Cached data from {formatDistanceToNow(cachedAt, { addSuffix: true })}
          </span>
        </div>
      )}

      {/* Conflict resolution indicator (Task 79) */}
      {failedEditCount > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex items-center justify-center gap-2">
          <AlertTriangle className="size-4 text-orange-600" aria-hidden="true" />
          <span className="text-sm font-medium text-orange-800">
            {failedEditCount} edit{failedEditCount !== 1 ? 's' : ''} had conflicts — review and retry or discard
          </span>
        </div>
      )}

      {/* PWA install banner (Task 72) */}
      {showInstallBanner && installPrompt && (
        <div className="bg-uk-blue/5 border-b border-uk-blue/20 px-4 py-2.5 flex items-center justify-center gap-3">
          <Download className="size-4 text-uk-blue" />
          <span className="text-sm font-medium text-uk-blue">
            Install Course Map for offline access
          </span>
          <button
            onClick={() => {
              (installPrompt as unknown as { prompt: () => void }).prompt()
              setShowInstallBanner(false)
              setInstallPrompt(null)
            }}
            className="px-3 py-1 text-xs font-semibold bg-uk-blue text-white rounded-lg hover:bg-[#002880] transition-colors"
          >
            Install App
          </button>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* No graph map — empty state */}
        {!graphMap && (
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-12 text-center">
            <FileText className="size-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">{t('courseMap.nodes.noMap')}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {isStudent
                ? t('courseMap.nodes.noMapStudent')
                : t('courseMap.nodes.noMapEducator')}
            </p>
            {isEditorRole && (
              <Link
                href={`/courses/${courseId}/syllabus`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors"
              >
                Import Syllabus
              </Link>
            )}
          </div>
        )}

        {/* Validation banner — educators only */}
        {validation && graphMap && isEditorRole && <ValidationBanner validation={validation} />}

        {/* Syllabus status info strip */}
        {syllabusStatus && graphMap && (
          <div className="flex items-center gap-5 rounded-2xl border-2 border-gray-200 bg-white px-5 py-3 flex-wrap">
            {syllabusStatus.unitCount != null && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Layers className="size-4 text-uk-blue" />
                <strong className="text-gray-900">{syllabusStatus.unitCount}</strong> units
              </div>
            )}
            {syllabusStatus.edgeCount != null && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <GitFork className="size-4 text-uk-blue" />
                <strong className="text-gray-900">{syllabusStatus.edgeCount}</strong> edges
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <ClipboardList className="size-4 text-uk-blue" />
              <strong className="text-gray-900">{syllabusStatus.assignmentCount}</strong> assignments
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Target className="size-4 text-uk-blue" />
              <strong className="text-gray-900">{syllabusStatus.objectiveCount}</strong> objectives
            </div>
            {syllabusStatus.lastParseDate && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
                <Calendar className="size-4" />
                Last imported: {format(new Date(syllabusStatus.lastParseDate), 'MMM d, yyyy')}
              </div>
            )}
            {isEditorRole && (
              <Link
                href={`/courses/${courseId}/syllabus`}
                className="flex items-center gap-1.5 text-sm font-semibold text-uk-blue hover:underline"
              >
                <Upload className="size-4" /> Re-import Syllabus
              </Link>
            )}
          </div>
        )}

        {/* Progress legend + student toolbar — students only */}
        {isStudent && graphMap && graphMap.nodes.length > 0 && (
          <div className="space-y-3">
            {/* Progress legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <span className="font-semibold text-gray-700">Progress:</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-3.5 text-green-500" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 inline-flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="size-3.5">
                    <circle cx="8" cy="8" r="7" fill="none" stroke="#d1d5db" strokeWidth="2" />
                    <circle cx="8" cy="8" r="7" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="22 44" strokeLinecap="round" transform="rotate(-90 8 8)" />
                  </svg>
                </span>
                In Progress
              </span>
              <span className="flex items-center gap-1.5">
                <Circle className="size-3.5 text-gray-300" />
                Not Started
              </span>
            </div>

            {/* Primary actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowStudyPlan((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  showStudyPlan
                    ? 'bg-uk-blue text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-uk-blue/30'
                }`}
              >
                <CalendarDays className="size-3.5" />
                My Plan
              </button>
              {learningPath.length > 0 && (
                <button
                  onClick={() => setShowLearningPath((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    showLearningPath
                      ? 'bg-uk-blue text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-uk-blue/30'
                  }`}
                >
                  <Route className="size-3.5" />
                  Learning Path
                </button>
              )}
              <button
                onClick={fetchStudyRecommendations}
                disabled={studyRecsLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  studyRecsPanelOpen
                    ? 'bg-violet-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-violet-300'
                } disabled:opacity-50`}
              >
                {studyRecsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Brain className="size-3.5" />}
                Sandy Suggests
              </button>

              {/* Secondary actions — separated with a subtle divider */}
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <button
                onClick={() => setShowHeatmap((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  showHeatmap
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Flame className="size-3.5" />
                How&apos;s the Class
              </button>
              <button
                onClick={() => setShowStudyGroupPanel((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  showStudyGroupPanel
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <UsersRound className="size-3.5" />
                Study Groups
                {studyGroups.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-cyan-200 text-cyan-800 rounded-full text-[10px] font-bold">
                    {studyGroups.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setShowMilestonePanel((v) => !v); fetchMilestones() }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  showMilestonePanel
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Flag className="size-3.5" />
                Milestones
                {milestoneTotal > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                    {milestoneAchieved}/{milestoneTotal}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Study plan stats strip — students only */}
        {isStudent && showStudyPlan && (studyPlanStats.planned > 0 || studyPlanStats.completed > 0 || studyPlanStats.overdue > 0) && (
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-blue-600">{studyPlanStats.planned} planned</span>
            <span className="text-green-600">{studyPlanStats.completed} completed</span>
            {studyPlanStats.overdue > 0 && <span className="text-red-600">{studyPlanStats.overdue} overdue</span>}
          </div>
        )}

        {/* Heatmap legend */}
        {showHeatmap && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Class Progress:</span>
            <span className="flex items-center gap-1"><span className="size-3 rounded bg-green-500" /> &gt;75%</span>
            <span className="flex items-center gap-1"><span className="size-3 rounded bg-amber-400" /> 25–75%</span>
            <span className="flex items-center gap-1"><span className="size-3 rounded bg-red-400" /> &lt;25%</span>
            {heatmapLoading && <Loader2 className="size-3.5 animate-spin text-gray-400" />}
          </div>
        )}

        {/* Edge legend */}
        {graphMap && graphMap.edges.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Legend:</span>
            {Object.entries(EDGE_LABELS).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-5 h-0.5 rounded"
                  style={{ backgroundColor: EDGE_COLORS[type] }}
                />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Locale switcher for non-editor roles (Task 90) */}
        {!isEditorRole && graphMap && (
          <div className="flex items-center justify-end print:hidden">
            <LocaleSwitcher />
          </div>
        )}

        {/* Advanced Graph toggle */}
        {graphMap && graphMap.nodes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAdvancedGraph((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
              showAdvancedGraph
                ? 'border-uk-blue bg-blue-50 text-uk-blue'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <GitFork className="size-4" />
            {showAdvancedGraph ? 'Hide Dependency Graph' : 'Show Dependency Graph'}
            <span className="text-xs font-normal text-gray-400">(Advanced)</span>
          </button>
        )}

        {/* Toolbar — editors only, inside advanced graph view */}
        {showAdvancedGraph && isEditorRole && graphMap && graphMap.nodes.length > 0 && (
          <div id="course-map-toolbar" role="toolbar" aria-label={t('courseMap.a11y.toolbarLabel')} className="flex items-center gap-1.5 md:gap-2 flex-wrap print:hidden">
            <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-xl p-1">
              <button
                onClick={() => setCanvasMode('select')}
                title={t('courseMap.toolbar.selectMode')}
                aria-pressed={canvasMode === 'select'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  canvasMode === 'select'
                    ? 'bg-uk-blue text-white'
                    : 'text-gray-600 hover:bg-gray-100'
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
                  canvasMode === 'connect'
                    ? 'bg-uk-blue text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LinkIcon className="size-4" />
                <span className="hidden md:inline">{t('courseMap.toolbar.connect')}</span>
              </button>
            </div>
            {canvasMode === 'connect' && (
              <span className="text-xs text-gray-500" aria-live="polite">
                {connectSource
                  ? t('courseMap.toolbar.connectHintTarget')
                  : t('courseMap.toolbar.connectHintSource')}
              </span>
            )}

            {/* Task 101: Zoom to Fit */}
            <button
              onClick={handleZoomToFit}
              title="Zoom to fit all nodes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <Maximize2 className="size-4" />
              <span className="hidden md:inline">Fit</span>
            </button>

            {/* Task 101: Node grouping toggle */}
            <button
              onClick={() => setShowGroups((v) => !v)}
              title={showGroups ? 'Hide node groups' : 'Group nodes by type'}
              aria-pressed={showGroups}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                showGroups
                  ? 'bg-uk-blue text-white border-uk-blue'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Group className="size-4" />
              <span className="hidden md:inline">Group</span>
            </button>

            {/* Task 101: Edge routing mode selector */}
            <select
              value={edgeRoutingMode}
              onChange={(e) => setEdgeRoutingMode(e.target.value as EdgeRoutingMode)}
              title="Edge routing style"
              className="px-2 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <option value="bezier">Bezier</option>
              <option value="orthogonal">Orthogonal</option>
              <option value="step">Step</option>
            </select>

            {/* Task 102: Performance indicator badge */}
            {perfMetrics && totalNodeCount >= 50 && (
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                  perfMetrics.performanceGrade === 'green'
                    ? 'bg-green-50 text-green-700'
                    : perfMetrics.performanceGrade === 'yellow'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                }`}
                title={`FPS: ${perfMetrics.fps} | Frame: ${perfMetrics.frameTime}ms | Visible: ${perfMetrics.visibleNodeCount}/${perfMetrics.nodeCount}`}
              >
                <Activity className="size-3" />
                {perfMetrics.fps} FPS
              </span>
            )}

            {/* Active editors */}
            {activeEditors.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <Users className="size-4 text-gray-400" />
                <div className="flex -space-x-2">
                  {activeEditors.map((editor, i) => (
                    <div
                      key={editor.userId}
                      className="size-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: getEditorColor(i) }}
                      title={editor.name}
                    >
                      {editor.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-500 ml-1">
                  {activeEditors.length === 1
                    ? `${activeEditors[0].name} is editing`
                    : `${activeEditors.length} editors`}
                </span>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Branch switcher (Task 93) */}
              <BranchSwitcher
                branches={branches}
                currentBranch={currentBranch}
                loading={branchesLoading}
                onCreateBranch={handleCreateBranch}
                onSwitchBranch={handleSwitchBranch}
                onDeleteBranch={handleDeleteBranch}
                onCompareBranches={handleCompareBranches}
                onMergeBranch={handleOpenMergeDialog}
              />

              {/* Locale switcher (Task 90) */}
              <LocaleSwitcher />

              {/* Snapshot controls */}
              <div className="relative">
                {showSnapshotNameInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveSnapshot(); if (e.key === 'Escape') setShowSnapshotNameInput(false) }}
                      placeholder="Snapshot name..."
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-uk-blue"
                      autoFocus
                    />
                    <button
                      onClick={saveSnapshot}
                      disabled={savingSnapshot || !snapshotName.trim()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {savingSnapshot ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={() => { setShowSnapshotNameInput(false); setSnapshotName('') }}
                      className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X className="size-3.5 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSnapshotNameInput(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <Camera className="size-4" />
                    Save Snapshot
                  </button>
                )}
              </div>

              {/* Snapshot list dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSnapshotDropdown((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <History className="size-4" />
                  Snapshots
                  {snapshots.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold">
                      {snapshots.length}
                    </span>
                  )}
                </button>
                {showSnapshotDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 flex items-center justify-between">
                      <span>Saved Snapshots</span>
                      <button onClick={() => setShowSnapshotDropdown(false)} className="p-0.5 rounded hover:bg-gray-100">
                        <X className="size-3.5 text-gray-400" />
                      </button>
                    </div>
                    {snapshots.length >= 2 && (
                      <div className="px-3 py-2 border-b border-gray-100">
                        <button
                          onClick={() => {
                            setShowSnapshotDropdown(false)
                            setShowCompareView(true)
                            setCompareSnapshotA(snapshots[1]?.id || '')
                            setCompareSnapshotB(snapshots[0]?.id || '')
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                        >
                          <SplitSquareHorizontal className="size-4" />
                          Compare Snapshots
                        </button>
                      </div>
                    )}
                    {snapshots.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">
                        No snapshots yet. Save one to create a restore point.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                        {snapshots.map((snap) => (
                          <div key={snap.id} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{snap.name || 'Unnamed'}</p>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(snap.createdAt).toLocaleString()} · {snap.nodeCount} nodes · {snap.edgeCount} edges
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => runDiff(snap.id)}
                                  className="p-1 rounded-lg hover:bg-violet-50 transition-colors"
                                  title="Compare with current"
                                  disabled={diffLoading}
                                >
                                  <GitCompare className="size-3.5 text-violet-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (snapshots.length < 2) {
                                      addCollabToast('Need at least 2 snapshots to merge')
                                      return
                                    }
                                    // Use the oldest snapshot as base, this snapshot as source
                                    const oldest = snapshots[snapshots.length - 1]
                                    runMerge(oldest.id, snap.id)
                                  }}
                                  className="p-1 rounded-lg hover:bg-teal-50 transition-colors"
                                  title="Merge from snapshot"
                                  disabled={mergeLoading}
                                >
                                  <GitMerge className="size-3.5 text-teal-600" />
                                </button>
                                <button
                                  onClick={() => setPendingRestoreId(snap.id)}
                                  className="p-1 rounded-lg hover:bg-blue-50 transition-colors"
                                  title="Restore this snapshot"
                                >
                                  <RotateCcw className="size-3.5 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => deleteSnapshot(snap.id)}
                                  className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Delete snapshot"
                                >
                                  <Trash2 className="size-3.5 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notification bell (Task 69) */}
              <button
                onClick={() => { setShowNotifPanel((v) => !v); if (!showNotifPanel) fetchNotifications(notifFilterType) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors relative"
                title="Notifications"
              >
                <Bell className="size-4" />
                {notifUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] px-1 h-[18px]">
                    {notifUnreadCount > 9 ? notifUnreadCount : ''}
                    {notifUnreadCount <= 9 && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                )}
              </button>

              {/* Push notification toggle (Task 80) */}
              <button
                onClick={handlePushToggle}
                disabled={pushToggling}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  pushEnabled
                    ? 'bg-uk-blue/10 text-uk-blue border border-uk-blue/30'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                } disabled:opacity-50`}
                title={pushEnabled ? 'Disable push notifications for this course map' : 'Enable push notifications for this course map'}
              >
                {pushToggling ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : pushEnabled ? (
                  <Bell className="size-4" />
                ) : (
                  <Bell className="size-4" />
                )}
                <span className="hidden md:inline">{pushEnabled ? 'Alerts On' : 'Alerts'}</span>
              </button>

              {/* Webhook Dashboard (Task 70) */}
              <button
                onClick={openWebhookDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                title="Webhook Management"
              >
                <Settings className="size-4" />
                <span className="hidden md:inline">Webhooks</span>
              </button>

              {/* Notify Students button */}
              <button
                onClick={handleNotifyStudents}
                disabled={notifyingStu}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="Send a notification to all enrolled students"
              >
                {notifyingStu ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
                <span className="hidden md:inline">Notify Students</span>
              </button>
              {notifyStuResult && (
                <span className="text-xs text-green-600 font-medium">{notifyStuResult}</span>
              )}

              {/* Class Progress toggle */}
              <button
                onClick={() => setShowHeatmap((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  showHeatmap
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
                title="Toggle class progress heatmap"
              >
                <Flame className="size-4" />
                <span className="hidden md:inline">Class Progress</span>
              </button>

              {/* Task 103: Search & Filter toggle */}
              <button
                onClick={() => setShowSearchFilter((v) => !v)}
                title="Search & Filter (Ctrl+F)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  showSearchFilter
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Search className="size-4" />
                <span className="hidden md:inline">Search</span>
              </button>

              {/* Share button */}
              <button
                onClick={() => setShowShareDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <Share2 className="size-4" />
                Share
              </button>

              {/* Share & Export panel toggle (Task 100) */}
              {isEditorRole && (
                <button
                  onClick={() => { if (!showSharingPanel) closeAllSidePanels(); setShowSharingPanel((v) => !v) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    showSharingPanel
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Share2 className="size-4" />
                  <span className="hidden md:inline">Share & Export</span>
                </button>
              )}

              {/* Analytics button */}
              <button
                onClick={openAnalyticsPanel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <BarChart3 className="size-4" />
                Analytics
              </button>

              {/* Live dashboard button (Task 81) */}
              <button
                onClick={openRealtimeDashboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  showRealtimeDashboard
                    ? 'bg-uk-blue text-white border-uk-blue'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Activity className="size-4" />
                <span className="hidden md:inline">Live</span>
              </button>

              {/* Activity feed button */}
              <button
                onClick={openActivityFeed}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <Activity className="size-4" />
                Activity
              </button>

              {/* Comments button */}
              <button
                onClick={() => openCommentPanel()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors relative"
              >
                <MessageSquare className="size-4" />
                Comments
                {Object.values(commentCounts.nodeCounts).reduce((a, b) => a + b, 0) + Object.values(commentCounts.edgeCounts).reduce((a, b) => a + b, 0) > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-uk-blue text-[10px] font-bold text-white">
                    {Object.values(commentCounts.nodeCounts).reduce((a, b) => a + b, 0) + Object.values(commentCounts.edgeCounts).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>

              {/* Annotations button (Task 62) */}
              <button
                onClick={() => setShowAnnotationPanel((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${
                  showAnnotationPanel
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Layers className="size-4" />
                Annotations
                {totalAnnotationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {totalAnnotationCount}
                  </span>
                )}
              </button>

              {/* Milestones button — educators (Task 64) */}
              <button
                onClick={() => { setShowMilestonePanel((v) => !v); fetchMilestones() }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${
                  showMilestonePanel
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Flag className="size-4" />
                Milestones
                {milestoneTotal > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {milestoneTotal}
                  </span>
                )}
              </button>

              {/* Whiteboard toggle (Task 83) */}
              <button
                onClick={() => { setWhiteboardActive((v) => !v); if (!whiteboardActive) setAnnotationLayerActive(false) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  whiteboardActive
                    ? 'bg-uk-blue text-white border-uk-blue'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <PenTool className="size-4" />
                <span className="hidden md:inline">Whiteboard</span>
              </button>

              {/* Annotate toggle (Task 84) */}
              <button
                onClick={() => { setAnnotationLayerActive((v) => !v); if (!annotationLayerActive) setWhiteboardActive(false) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${
                  annotationLayerActive
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <StickyNote className="size-4" />
                <span className="hidden md:inline">Annotate</span>
                {annotationNodeCounts.size > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                    {Array.from(annotationNodeCounts.values()).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>

              {/* AI Teaching Assistant toggle (Task 85) */}
              <button
                onClick={() => { if (!showTeachingAssistant) closeAllSidePanels(); setShowTeachingAssistant((v) => !v) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  showTeachingAssistant
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Brain className="size-4" />
                <span className="hidden md:inline">AI Assistant</span>
              </button>

              {/* Smart Suggestions toggle (Task 86) */}
              <button
                onClick={() => { if (!showSmartSuggestions) closeAllSidePanels(); setShowSmartSuggestions((v) => !v) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  showSmartSuggestions
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Zap className="size-4" />
                <span className="hidden md:inline">Suggestions</span>
              </button>

              {/* Export Suite toggle (Task 87) */}
              {isEditorRole && (
                <button
                  onClick={() => { if (!showExportSuite) closeAllSidePanels(); setShowExportSuite((v) => !v) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    showExportSuite
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Download className="size-4" />
                  <span className="hidden md:inline">Export</span>
                </button>
              )}

              {/* Reporting Dashboard toggle (Task 88) */}
              {isEditorRole && (
                <button
                  onClick={() => { if (!showReportingDashboard) closeAllSidePanels(); setShowReportingDashboard((v) => !v) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    showReportingDashboard
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <FileBarChart className="size-4" />
                  <span className="hidden md:inline">Reports</span>
                </button>
              )}

              {/* Plugin Marketplace toggle (Task 95/96) */}
              {isEditorRole && (
                <button
                  onClick={() => setShowPluginMarketplace((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative ${
                    showPluginMarketplace
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Package className="size-4" />
                  <span className="hidden md:inline">Plugins</span>
                  {pluginEntries.filter((p) => p.status === 'enabled').length > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                      {pluginEntries.filter((p) => p.status === 'enabled').length}
                    </span>
                  )}
                </button>
              )}

              {/* AI Map Assistant toggle (Task 97) */}
              {isEditorRole && (
                <button
                  onClick={() => { if (!showAIAssistant) closeAllSidePanels(); setShowAIAssistant((v) => !v) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    showAIAssistant
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Brain className="size-4" />
                  <span className="hidden md:inline">AI Map</span>
                </button>
              )}

              {/* Smart Automation toggle (Task 98) */}
              {isEditorRole && (
                <button
                  onClick={() => { if (!showSmartAutomation) closeAllSidePanels(); setShowSmartAutomation((v) => !v) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    showSmartAutomation
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Activity className="size-4" />
                  <span className="hidden md:inline">Smart Auto</span>
                </button>
              )}

              {/* Health score badge */}
              <button
                onClick={openHealthPanel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors relative"
                style={{
                  backgroundColor: healthData
                    ? healthData.overallScore >= 80 ? '#f0fdf4' : healthData.overallScore >= 60 ? '#fffbeb' : '#fef2f2'
                    : '#f9fafb',
                  color: healthData
                    ? healthData.overallScore >= 80 ? '#15803d' : healthData.overallScore >= 60 ? '#b45309' : '#dc2626'
                    : '#374151',
                  borderColor: healthData
                    ? healthData.overallScore >= 80 ? '#bbf7d0' : healthData.overallScore >= 60 ? '#fde68a' : '#fecaca'
                    : '#e5e7eb',
                }}
              >
                <Heart className="size-4" />
                {healthData ? `${healthData.overallScore}` : 'Health'}
              </button>

              {/* Suggest Template button (Task 52) */}
              <button
                onClick={runTemplateSuggestions}
                disabled={templateSuggestLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="AI-powered template suggestions based on your course content"
              >
                {templateSuggestLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LayoutTemplate className="size-4" />
                )}
                <span className="hidden md:inline">{templateSuggestLoading ? 'Analyzing...' : 'Suggest Template'}</span>
              </button>

              {/* Canvas Sync button */}
              <button
                onClick={() => {
                  setShowCanvasSyncDialog(true)
                  setCanvasSyncResult(null)
                  setCanvasSyncError(null)
                  // Fetch sync status
                  fetch(`/api/courses/${courseId}/course-map/canvas-sync-status`, {
                    headers: { 'x-demo-user-email': currentUser?.email || '' },
                  })
                    .then((r) => r.ok ? r.json() : null)
                    .then((d) => { if (d) setCanvasSyncStatus(d) })
                    .catch(() => {})
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="size-4" />
                Canvas Sync
              </button>

              {/* Sync LMS Links button */}
              <button
                onClick={fetchLmsLinks}
                disabled={lmsLinksLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Load LMS deep links for course map nodes"
              >
                {lmsLinksLoading ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
                <span className="hidden md:inline">Sync LMS Links</span>
              </button>

              {/* Export dropdown */}
              <div className="relative print:hidden">
                <button
                  onClick={() => setShowExportDropdown((v) => !v)}
                  aria-expanded={showExportDropdown}
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <Download className="size-4" />
                  {t('courseMap.export.title')}
                </button>
                {showExportDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <button
                      onClick={() => exportAsPng()}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <ImageDown className="size-4 text-gray-400" />
                      Export as PNG
                    </button>
                    <button
                      onClick={() => exportAs('svg')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="size-4 text-gray-400" />
                      Export as SVG
                    </button>
                    <button
                      onClick={() => exportAs('csv')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="size-4 text-gray-400" />
                      Export as CSV
                    </button>
                    <button
                      onClick={() => exportAs('json')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <Code className="size-4 text-gray-400" />
                      Export as JSON
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => {
                        setShowExportDropdown(false)
                        if (currentUser?.email) {
                          window.open(`/api/courses/${courseId}/course-map/export?format=pdf`, '_blank')
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="size-4 text-gray-400" />
                      Export as PDF
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <Printer className="size-4 text-gray-400" />
                      Print
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => { setShowExportDropdown(false); setShowReportModal(true) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors font-semibold"
                    >
                      <FileBarChart className="size-4 text-uk-blue" />
                      Generate Report
                    </button>
                    <div className="border-t border-gray-100" />
                    {/* Task 104: Enhanced export options */}
                    <button
                      onClick={() => {
                        setShowExportDropdown(false)
                        if (graphMap) {
                          const md = exportToMarkdown({
                            id: graphMap.id,
                            courseId: graphMap.id,
                            nodes: graphMap.nodes,
                            edges: graphMap.edges,
                            units: graphMap.units,
                          })
                          downloadText(md, `course-map-${courseId}.md`, 'text/markdown')
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <FileCode className="size-4 text-gray-400" />
                      Export as Markdown
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportDropdown(false)
                        if (graphMap) {
                          const scorm = exportToSCORM(
                            { id: graphMap.id, courseId: graphMap.id, nodes: graphMap.nodes, edges: graphMap.edges, units: graphMap.units },
                            graphMap.units[0]?.label || 'Course Map',
                          )
                          await downloadScormPackage(scorm, `course-map-${courseId}-scorm.zip`)
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <Package className="size-4 text-gray-400" />
                      Export as SCORM
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportDropdown(false)
                        if (currentUser?.email) {
                          try {
                            const result = await generateTimeLimitedShareLink(courseId, currentUser.email)
                            await navigator.clipboard.writeText(result.url)
                            addCollabToast('Shareable link copied to clipboard!')
                          } catch {
                            addCollabToast('Failed to generate shareable link')
                          }
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <Link2 className="size-4 text-gray-400" />
                      Shareable Link
                    </button>
                  </div>
                )}
              </div>

              {/* Compare Courses button */}
              <button
                onClick={() => {
                  setShowCourseCompare(true)
                  setCourseComparisonResult(null)
                  setCompareTargetCourseId('')
                  fetchCompareCourses()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
              >
                <ArrowLeftRight className="size-4" />
                <span className="hidden md:inline">Compare Courses</span>
              </button>

              <button
                onClick={runGapAnalysis}
                disabled={gapLoading}
                title="Run Gap Analysis"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {gapLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                <span className="hidden md:inline">{gapLoading ? 'Analyzing...' : 'Gap Analysis'}</span>
              </button>
              <button
                onClick={runPrereqValidation}
                disabled={prereqValidLoading}
                title="Validate Prerequisites"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-50"
              >
                {prereqValidLoading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                <span className="hidden md:inline">{prereqValidLoading ? 'Validating...' : 'Validate Prerequisites'}</span>
              </button>
              <button
                onClick={runSuggestEdges}
                disabled={suggestLoading}
                title="Suggest Edges"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {suggestLoading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                <span className="hidden md:inline">{suggestLoading ? 'Suggesting...' : 'Suggest Edges'}</span>
              </button>
              <button
                onClick={runAiSuggestions}
                disabled={aiSuggestionsLoading}
                title="AI Suggestions"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-50"
              >
                {aiSuggestionsLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                <span className="hidden md:inline">{aiSuggestionsLoading ? 'Analyzing...' : 'AI Suggestions'}</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setNlEditOpen(!nlEditOpen)}
                  title="AI Edit — describe changes in plain English"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <Wand2 className="size-4" />
                  <span className="hidden md:inline">AI Edit</span>
                </button>
                {nlEditOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-lg z-50">
                    <h4 className="text-sm font-extrabold text-gray-900 mb-2">Describe your changes</h4>
                    <textarea
                      value={nlEditInstruction}
                      onChange={(e) => setNlEditInstruction(e.target.value)}
                      placeholder="e.g., Add a prerequisite from Week 1 Lecture to Week 2 Lab..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      rows={3}
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{nlEditInstruction.length}/2000</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setNlEditOpen(false); setNlEditInstruction(''); setNlEditChanges([]); setNlEditSummary('') }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitNlEdit}
                          disabled={nlEditLoading || !nlEditInstruction.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          {nlEditLoading ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                          {nlEditLoading ? 'Processing...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                    {nlEditChanges.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-600 mb-2">{nlEditSummary}</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {nlEditChanges.map((change, i) => (
                            <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 text-xs text-emerald-800">
                              <CheckCircle className="size-3 shrink-0 mt-0.5 text-emerald-500" />
                              {change.description}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={applyNlChanges}
                          disabled={nlEditApplying}
                          className="flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          {nlEditApplying ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          {nlEditApplying ? 'Applying...' : `Apply All (${nlEditChanges.length} changes)`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Save as Template */}
              <button
                onClick={() => setShowSaveTemplateDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
              >
                <LayoutTemplate className="size-4" />
                <span className="hidden md:inline">Save as Template</span>
              </button>

              {/* Duplicate to Course */}
              <button
                onClick={() => {
                  setShowDuplicateDialog(true)
                  if (currentUser?.email) {
                    fetch('/api/courses', { headers: { 'x-demo-user-email': currentUser.email } })
                      .then(r => r.json())
                      .then(data => {
                        const courses = (data.courses || data || [])
                          .filter((c: { id: string }) => c.id !== courseId)
                          .map((c: { id: string; courseCode?: string; title?: string }) => ({
                            id: c.id,
                            courseCode: c.courseCode || '',
                            title: c.title || 'Untitled',
                          }))
                        setUserCourses(courses)
                      })
                      .catch(() => setUserCourses([]))
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
              >
                <CopyPlus className="size-4" />
                <span className="hidden md:inline">Duplicate to Course</span>
              </button>
            </div>
          </div>
        )}

        {/* Diff summary panel */}
        {diffResult && isEditorRole && (
          <div className="bg-white border-2 border-violet-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="size-4 text-violet-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Diff — Snapshot vs Current
                </h3>
              </div>
              <button
                onClick={closeDiff}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {diffResult.addedNodes.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 text-green-800">
                  <Plus className="size-3.5" />
                  <span className="font-semibold">{diffResult.addedNodes.length}</span> added
                </div>
              )}
              {diffResult.removedNodes.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-800">
                  <Minus className="size-3.5" />
                  <span className="font-semibold">{diffResult.removedNodes.length}</span> removed
                </div>
              )}
              {diffResult.movedNodes.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800">
                  <MoveHorizontal className="size-3.5" />
                  <span className="font-semibold">{diffResult.movedNodes.length}</span> moved
                </div>
              )}
              {diffResult.modifiedNodes.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800">
                  <Pencil className="size-3.5" />
                  <span className="font-semibold">{diffResult.modifiedNodes.length}</span> modified
                </div>
              )}
              {diffResult.addedEdges.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 text-green-700">
                  <Plus className="size-3.5" />
                  <span className="font-semibold">{diffResult.addedEdges.length}</span> edge{diffResult.addedEdges.length !== 1 ? 's' : ''} added
                </div>
              )}
              {diffResult.removedEdges.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-700">
                  <Minus className="size-3.5" />
                  <span className="font-semibold">{diffResult.removedEdges.length}</span> edge{diffResult.removedEdges.length !== 1 ? 's' : ''} removed
                </div>
              )}
            </div>
            {diffResult.addedNodes.length === 0 && diffResult.removedNodes.length === 0 &&
              diffResult.movedNodes.length === 0 && diffResult.modifiedNodes.length === 0 &&
              diffResult.addedEdges.length === 0 && diffResult.removedEdges.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No differences found</p>
            )}
          </div>
        )}

        {/* Merge conflict resolution dialog */}
        {showMergeDialog && mergeResult && isEditorRole && (
          <div className="bg-white border-2 border-teal-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitMerge className="size-4 text-teal-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Merge Preview
                </h3>
              </div>
              <button
                onClick={() => { setShowMergeDialog(false); setMergeResult(null) }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Result: {mergeResult.mergedNodes.length} nodes, {mergeResult.mergedEdges.length} edges
              {mergeResult.conflicts.length > 0 && (
                <span className="ml-2 text-amber-600 font-semibold">
                  · {mergeResult.conflicts.length} conflict{mergeResult.conflicts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {mergeResult.conflicts.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Resolve Conflicts</p>
                {mergeResult.conflicts.map((conflict) => {
                  const resKey = `${conflict.nodeId}::${conflict.field}`
                  const chosen = mergeResolutions[resKey]
                  const sourceNode = mergeResult.mergedNodes.find((n) => n.id === conflict.nodeId)
                  return (
                    <div key={resKey} className="bg-amber-50 rounded-xl px-3 py-2.5 text-sm">
                      <p className="font-semibold text-amber-900 mb-1.5">
                        {sourceNode?.label || conflict.nodeId} — {conflict.field}
                      </p>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={resKey}
                            checked={chosen === conflict.sourceValue}
                            onChange={() => setMergeResolutions((prev) => ({ ...prev, [resKey]: conflict.sourceValue }))}
                            className="accent-teal-600"
                          />
                          <span className="text-xs">
                            <span className="font-medium text-violet-700">Snapshot:</span>{' '}
                            {String(conflict.sourceValue)}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={resKey}
                            checked={chosen === conflict.targetValue}
                            onChange={() => setMergeResolutions((prev) => ({ ...prev, [resKey]: conflict.targetValue }))}
                            className="accent-teal-600"
                          />
                          <span className="text-xs">
                            <span className="font-medium text-blue-700">Current:</span>{' '}
                            {String(conflict.targetValue)}
                          </span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={applyMerge}
                disabled={applyingMerge || (mergeResult.conflicts.length > 0 && Object.keys(mergeResolutions).length < mergeResult.conflicts.length)}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {applyingMerge ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Apply Merge
              </button>
              <button
                onClick={() => { setShowMergeDialog(false); setMergeResult(null) }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Gap analysis results panel */}
        {gapPanelOpen && gapFindings.length > 0 && isEditorRole && (
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-amber-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Gap Analysis — {gapFindings.length} finding{gapFindings.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <button
                onClick={() => { setGapPanelOpen(false); setGapFindings([]) }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {gapFindings.map((finding, i) => {
                const node = nodeMap.get(finding.nodeId)
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-3 py-2 rounded-xl text-sm ${
                      finding.severity === 'error'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                    onMouseEnter={() => setHoveredGapNodeId(finding.nodeId)}
                    onMouseLeave={() => setHoveredGapNodeId(null)}
                  >
                    <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${
                      finding.severity === 'error' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <div>
                      <span className="font-semibold">{node?.label || finding.nodeId}</span>
                      <span className="mx-1">—</span>
                      {finding.issue}
                      <p className="text-xs mt-0.5 opacity-80">{finding.suggestion}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Edge suggestions panel */}
        {edgeSuggestions.length > 0 && isEditorRole && (
          <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="size-4 text-blue-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Suggested Edges — {edgeSuggestions.length} suggestion{edgeSuggestions.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <button
                onClick={() => setEdgeSuggestions([])}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {edgeSuggestions.map((suggestion, i) => {
                const fromNode = nodeMap.get(suggestion.fromNodeId)
                const toNode = nodeMap.get(suggestion.toNodeId)
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-50 text-sm text-blue-800">
                    <div className="flex-1">
                      <span className="font-semibold">{fromNode?.label || suggestion.fromNodeId}</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold">{toNode?.label || suggestion.toNodeId}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        suggestion.edgeType === 'PREREQUISITE' ? 'bg-red-100 text-red-700'
                          : suggestion.edgeType === 'SEQUENCE' ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                      }`}>{suggestion.edgeType}</span>
                      <p className="text-xs mt-0.5 opacity-80">{suggestion.reason}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => acceptSuggestion(suggestion)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition-colors"
                      >
                        <Check className="size-3" /> Accept
                      </button>
                      <button
                        onClick={() => dismissSuggestion(suggestion)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                      >
                        <X className="size-3" /> Dismiss
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sandy Suggests — AI study recommendations panel (Task 59) */}
        {studyRecsPanelOpen && studyRecommendations.length > 0 && isStudent && (
          <div className="bg-white border-2 border-violet-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-violet-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Sandy Suggests — {studyRecommendations.length} recommendation{studyRecommendations.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <button
                onClick={() => { setStudyRecsPanelOpen(false); setStudyRecommendations([]) }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {studyRecommendations.map((rec, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const node = graphMap?.nodes.find((n) => n.id === rec.nodeId)
                    if (node) {
                      setSelectedNodeId(node.id)
                    }
                  }}
                  className="flex items-start gap-3 px-3 py-2 rounded-xl text-sm text-left w-full hover:ring-2 hover:ring-violet-300 transition-all bg-violet-50 text-violet-900"
                >
                  <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    rec.urgency === 'high' ? 'bg-red-100 text-red-700'
                      : rec.urgency === 'medium' ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                  }`}>{rec.urgency}</span>
                  <div>
                    <span className="font-semibold">{rec.nodeLabel}</span>
                    <p className="text-xs mt-0.5 opacity-80">{rec.reason}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Study Groups panel (Task 63) */}
        {showStudyGroupPanel && isStudent && (
          <div className="bg-white border-2 border-cyan-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UsersRound className="size-4 text-cyan-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  {selectedGroupId ? (selectedGroupDetail?.name ?? 'Study Group') : 'Study Groups'}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {selectedGroupId && (
                  <button
                    onClick={() => { setSelectedGroupId(null); setSelectedGroupDetail(null); setGroupMessages([]) }}
                    className="px-2 py-1 text-xs text-cyan-600 font-semibold hover:bg-cyan-50 rounded-lg transition-colors"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={() => { setShowStudyGroupPanel(false); setSelectedGroupId(null) }}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="size-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Group detail view */}
            {selectedGroupId && selectedGroupDetail ? (
              <div className="space-y-3">
                {/* Progress bar */}
                {selectedGroupProgress && selectedGroupProgress.totalMembers > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Group Progress</span>
                      <span>{Math.round(selectedGroupProgress.completionRate * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all"
                        style={{ width: `${selectedGroupProgress.completionRate * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Members */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Members ({selectedGroupDetail.members.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGroupDetail.members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-1.5 px-2 py-1 bg-cyan-50 rounded-lg text-xs text-cyan-800 font-medium">
                        <div className="size-5 rounded-full bg-cyan-200 flex items-center justify-center text-[10px] font-bold text-cyan-700">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        {m.name}
                      </div>
                    ))}
                  </div>
                  {!selectedGroupDetail.members.find((m) => m.userId === currentUser?.id) ? (
                    <button
                      onClick={() => handleJoinGroup(selectedGroupId!)}
                      className="mt-2 px-3 py-1.5 text-xs font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                      Join Group
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLeaveGroup(selectedGroupId!)}
                      className="mt-2 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Leave Group
                    </button>
                  )}
                </div>

                {/* Chat */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Chat</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 mb-2">
                    {groupMessages.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">No messages yet. Start the conversation!</p>
                    ) : groupMessages.map((msg) => (
                      <div key={msg.id} className="flex items-start gap-2 text-xs">
                        <div className="size-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                          {msg.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">{msg.userName}</span>{' '}
                          <span className="text-gray-500">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                          <p className="text-gray-800 mt-0.5">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={groupMessageInput}
                      onChange={(e) => setGroupMessageInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendGroupMessage() }}
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    />
                    <button
                      onClick={handleSendGroupMessage}
                      disabled={sendingGroupMsg || !groupMessageInput.trim()}
                      className="p-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
                    >
                      {sendingGroupMsg ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Group list view */
              <div className="space-y-3">
                {/* Create group form */}
                <div className="border border-cyan-100 rounded-xl p-3 bg-cyan-50/50">
                  <p className="text-xs font-semibold text-cyan-700 mb-2">Create Study Group</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name..."
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    />
                    <select
                      value={newGroupNodeId ?? ''}
                      onChange={(e) => setNewGroupNodeId(e.target.value || null)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white"
                    >
                      <option value="">Select a topic node...</option>
                      {graphMap?.nodes.filter((n) => !n.archived).map((n) => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateGroup}
                      disabled={creatingGroup || !newGroupName.trim() || !newGroupNodeId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
                    >
                      {creatingGroup ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      Create
                    </button>
                  </div>
                </div>

                {/* Group list */}
                {studyGroups.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No study groups yet. Create one above!</p>
                ) : studyGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => openGroupDetail(group.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-cyan-50 transition-colors"
                  >
                    <div className="size-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <UsersRound className="size-4 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{group.name}</p>
                      <p className="text-[10px] text-gray-500">{group.nodeLabel ?? 'Unknown node'} · {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight className="size-4 text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Milestones panel (Task 64) — students */}
        {showMilestonePanel && isStudent && (
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flag className="size-4 text-amber-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Milestones — {milestoneAchieved}/{milestoneTotal}
                </h3>
              </div>
              <button
                onClick={() => setShowMilestonePanel(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>

            {/* Progress bar */}
            {milestoneTotal > 0 && (
              <div className="mb-3">
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${milestoneTotal > 0 ? (milestoneAchieved / milestoneTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {milestones.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No milestones set for this course yet.</p>
            ) : (
              <div className="space-y-1.5">
                {milestones.map((ms) => (
                  <div
                    key={ms.id}
                    onClick={() => {
                      const node = graphMap?.nodes.find((n) => n.id === ms.nodeId)
                      if (node) setSelectedNodeId(node.id)
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      ms.achieved ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {ms.achieved ? (
                      <Trophy className="size-4 text-green-500 shrink-0" />
                    ) : (
                      <Flag className="size-4 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${ms.achieved ? 'text-green-800' : 'text-gray-900'}`}>{ms.label}</p>
                      <p className="text-[10px] text-gray-500">{ms.nodeLabel ?? 'Unknown node'}{ms.description ? ` — ${ms.description}` : ''}</p>
                    </div>
                    {ms.achieved && ms.achievedAt && (
                      <span className="text-[10px] text-green-600 font-medium shrink-0">
                        {formatDistanceToNow(new Date(ms.achievedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Prerequisite validation results panel (Task 60) */}
        {prereqValidPanelOpen && prereqValidations.length > 0 && isEditorRole && (
          <div className="bg-white border-2 border-teal-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-teal-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Prerequisite Validation — {prereqValidations.length} check{prereqValidations.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <button
                onClick={() => { setPrereqValidPanelOpen(false); setPrereqValidations([]) }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {prereqValidations.map((v, i) => {
                const targetNode = nodeMap.get(v.nodeId)
                const prereqNode = nodeMap.get(v.prerequisiteNodeId)
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-3 py-2 rounded-xl text-sm ${
                      v.status === 'gap'
                        ? 'bg-red-50 text-red-800'
                        : v.status === 'partial'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-green-50 text-green-800'
                    }`}
                    onMouseEnter={() => setHoveredPrereqNodeId(v.nodeId)}
                    onMouseLeave={() => setHoveredPrereqNodeId(null)}
                  >
                    <ShieldCheck className={`size-4 shrink-0 mt-0.5 ${
                      v.status === 'gap' ? 'text-red-500'
                        : v.status === 'partial' ? 'text-amber-500'
                          : 'text-green-500'
                    }`} />
                    <div>
                      <span className="font-semibold">{prereqNode?.label || v.prerequisiteLabel}</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold">{targetNode?.label || v.nodeLabel}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        v.status === 'gap' ? 'bg-red-100 text-red-700'
                          : v.status === 'partial' ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}>{v.status}</span>
                      <p className="text-xs mt-0.5 opacity-80">{v.suggestion}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Template Suggestions panel (Task 52) */}
        {showTemplateSuggestions && templateSuggestions.length > 0 && isEditorRole && (
          <div className="bg-white border-2 border-teal-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="size-4 text-teal-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Suggested Templates
                </h3>
              </div>
              <button
                onClick={() => setShowTemplateSuggestions(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {templateSuggestions.map((s) => (
                <div
                  key={s.templateId}
                  className="flex items-start gap-3 bg-teal-50 rounded-xl px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{s.templateName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-700">
                        {Math.round(s.confidence * 100)}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{s.reasoning}</p>
                  </div>
                  <button
                    onClick={() => applyPresetTemplate(s.templateId)}
                    disabled={applyingPresetId === s.templateId}
                    className="shrink-0 px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {applyingPresetId === s.templateId ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Check className="size-3" />
                    )}
                    Apply
                  </button>
                </div>
              ))}
            </div>
            <a
              href="/course-map-templates"
              className="inline-flex items-center gap-1 mt-3 text-xs text-teal-700 font-semibold hover:underline"
            >
              Browse all templates →
            </a>
          </div>
        )}

        {/* Annotation layer management panel (Task 62) */}
        {showAnnotationPanel && isEditorRole && (
          <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-gray-900">Annotation Layers</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Annotation mode buttons */}
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                  <button
                    onClick={() => setAnnotationMode(annotationMode === 'note' ? 'none' : 'note')}
                    title="Add Note — click on canvas to place"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                      annotationMode === 'note' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <StickyNote className="size-3.5" />
                    Note
                  </button>
                  <button
                    onClick={() => setAnnotationMode(annotationMode === 'highlight' ? 'none' : 'highlight')}
                    title="Highlight — click near a node to highlight it"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                      annotationMode === 'highlight' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Highlighter className="size-3.5" />
                    Highlight
                  </button>
                </div>
                <button
                  onClick={() => setShowAnnotationPanel(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="size-4 text-gray-400" />
                </button>
              </div>
            </div>

            {annotationMode !== 'none' && (
              <div className="mb-3 px-3 py-2 bg-indigo-50 rounded-lg text-xs text-indigo-700 font-medium">
                {annotationMode === 'note'
                  ? 'Click anywhere on the canvas to place a sticky note'
                  : 'Click near a node to add a highlight ring'}
                {' '}<button onClick={() => setAnnotationMode('none')} className="underline font-bold">Cancel</button>
              </div>
            )}

            {/* Create layer */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createAnnotationLayer(newLayerName) }}
                placeholder="New layer name..."
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => createAnnotationLayer(newLayerName)}
                disabled={creatingLayer || !newLayerName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {creatingLayer ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Add
              </button>
            </div>

            {/* Layer list */}
            {annotationLayers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No layers yet. Create one above.</p>
            ) : (
              <div className="space-y-1.5">
                {annotationLayers.map((layer) => {
                  const isActive = activeLayerId === layer.id
                  const isHidden = hiddenLayerIds.has(layer.id)
                  return (
                    <div
                      key={layer.id}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isActive ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                      <span className={`text-sm font-medium flex-1 truncate ${isHidden ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {layer.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{layer._count.annotations}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id) }}
                        className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                        title={isHidden ? 'Show layer' : 'Hide layer'}
                      >
                        {isHidden ? <EyeOff className="size-3.5 text-gray-400" /> : <Eye className="size-3.5 text-gray-500" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAnnotationLayerHandler(layer.id) }}
                        className="p-0.5 rounded hover:bg-red-100 transition-colors"
                        title="Delete layer"
                      >
                        <Trash2 className="size-3.5 text-red-400" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Milestones management panel — educators (Task 64) */}
        {showMilestonePanel && isEditorRole && (
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flag className="size-4 text-amber-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  Milestones — {milestoneTotal} defined
                </h3>
              </div>
              <button
                onClick={() => setShowMilestonePanel(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Select a node in the map and use the detail drawer to set milestones. Students see these as progress markers.
            </p>
            {milestones.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No milestones defined yet.</p>
            ) : (
              <div className="space-y-1.5">
                {milestones.map((ms) => (
                  <div key={ms.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-50">
                    <Flag className="size-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{ms.label}</p>
                      <p className="text-[10px] text-gray-500">{ms.nodeLabel ?? 'Unknown node'}{ms.description ? ` — ${ms.description}` : ''}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMilestone(ms.nodeId)}
                      className="p-0.5 rounded hover:bg-red-100 transition-colors"
                      title="Remove milestone"
                    >
                      <Trash2 className="size-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Suggestions panel (Task 43) */}
        {aiSuggestionsPanelOpen && aiSuggestions.length > 0 && isEditorRole && (
          <div className="bg-white border-2 border-violet-200 rounded-2xl p-4 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-40 max-md:rounded-b-none max-md:max-h-[50vh] max-md:overflow-y-auto max-md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  AI Suggestions — {aiSuggestions.length} improvement{aiSuggestions.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <button
                onClick={() => { setAiSuggestionsPanelOpen(false); setAiSuggestions([]) }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            {aiSuggestionsSummary && (
              <p className="text-xs text-gray-600 mb-3">{aiSuggestionsSummary}</p>
            )}
            <div className="space-y-2">
              {aiSuggestions.map((suggestion) => {
                const isApplied = appliedSuggestionIds.has(suggestion.id)
                const isApplying = applyingSuggestionId === suggestion.id
                const typeIcon = suggestion.type === 'add_prerequisite' ? '🔗'
                  : suggestion.type === 'reorder' ? '↕️'
                  : suggestion.type === 'regroup' ? '📦'
                  : '✂️'
                return (
                  <div
                    key={suggestion.id}
                    className={`flex items-start gap-3 px-3 py-2 rounded-xl text-sm ${
                      isApplied ? 'bg-green-50 text-green-800' : 'bg-violet-50 text-violet-800'
                    } transition-colors`}
                  >
                    <span className="text-base shrink-0">{typeIcon}</span>
                    <div className="flex-1">
                      <span className="font-semibold capitalize">{suggestion.type.replace(/_/g, ' ')}</span>
                      <p className="text-xs mt-0.5 opacity-80">{suggestion.description}</p>
                    </div>
                    {isApplied ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold shrink-0">
                        <Check className="size-3" /> Applied
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => applyAiSuggestion(suggestion)}
                          disabled={isApplying}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold hover:bg-violet-200 transition-colors disabled:opacity-50"
                        >
                          {isApplying ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Apply
                        </button>
                        <button
                          onClick={() => dismissAiSuggestion(suggestion.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                        >
                          <X className="size-3" /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Large map warning (Task 68) */}
        {showAdvancedGraph && graphMap && showLargeMapWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="size-4 shrink-0" />
            This map has {totalNodeCount} nodes. Consider using filters to narrow your view for better performance.
          </div>
        )}

        {/* Presence bar (Task 91) */}
        {showAdvancedGraph && isEditorRole && presenceUsers.length > 0 && (
          <PresenceBar users={presenceUsers} nodeLabels={nodeLabelsMap} />
        )}

        {/* Graph canvas */}
        {showAdvancedGraph && graphMap && graphMap.nodes.length > 0 && (
          <div
            ref={scrollContainerRef}
            className="bg-white border-2 border-gray-200 rounded-2xl overflow-auto touch-pan-x touch-pan-y"
            onScroll={handleVirtualScroll}
          >
            {/* Node count indicator (Task 68) */}
            {totalNodeCount >= 50 && (
              <div className="sticky top-0 left-0 z-30 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border-b border-gray-100 text-xs text-gray-500">
                <Layers className="size-3" />
                {nodeCountLabel}
              </div>
            )}
            <div
              ref={canvasRef}
              id="course-map-graph"
              role="application"
              aria-label={t('courseMap.a11y.graphLabel')}
              tabIndex={0}
              className="relative focus:outline-none"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                minWidth: '100%',
                cursor: annotationMode === 'note' ? 'crosshair' : annotationMode === 'highlight' ? 'pointer' : undefined,
              }}
              onKeyDown={handleCanvasKeyDown}
              onMouseMove={(e) => broadcastCursorMove(e.clientX, e.clientY)}
              onFocus={() => { canvasFocusedRef.current = true }}
              onBlur={() => { canvasFocusedRef.current = false }}
              onMouseEnter={() => { canvasFocusedRef.current = true }}
              onMouseLeave={() => { canvasFocusedRef.current = false }}
              onClick={(e) => {
                // Annotation mode intercepts clicks
                if (annotationMode !== 'none') { handleAnnotationCanvasClick(e); return }
                // Cancel connect mode if clicking empty canvas
                if (canvasMode === 'connect' && connectSource) {
                  setConnectSource(null)
                  setCursorPos(null)
                }
              }}
            >
              {/* SVG edges */}
              {/* Node group overlays (Task 101) — rendered behind nodes */}
              {showGroups && groupedNodes && (
                <NodeGroupOverlay
                  groups={groupedNodes.groups}
                  onToggleGroup={handleToggleGroup}
                  nodeWidth={NODE_WIDTH}
                  nodeHeight={NODE_HEIGHT}
                />
              )}

              <EdgesSvg
                edges={graphMap.edges}
                nodeMap={nodeMap}
                isEditor={!!isEditorRole}
                onDeleteEdge={(edgeId) => setPendingDeleteEdgeId(edgeId)}
                connectingFrom={connectSource ? nodeMap.get(connectSource) || null : null}
                cursorPos={cursorPos}
                routingMode={edgeRoutingMode}
              />

              {/* Suggested edges — dashed lines */}
              {edgeSuggestions.length > 0 && (
                <svg className="absolute inset-0" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                  {edgeSuggestions.map((suggestion, i) => {
                    const from = nodeMap.get(suggestion.fromNodeId)
                    const to = nodeMap.get(suggestion.toNodeId)
                    if (!from || !to) return null
                    const d = computeEdgePath(from, to, edgeRoutingMode)
                    const color = EDGE_COLORS[suggestion.edgeType] || '#6b7280'
                    return (
                      <path
                        key={`suggestion-${i}`}
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        opacity={0.5}
                        style={{ pointerEvents: 'none' }}
                      />
                    )
                  })}
                </svg>
              )}

              {/* Diff edges — dashed green (added) and red (removed) lines */}
              {diffResult && (
                <svg className="absolute inset-0" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                  {diffResult.addedEdges.map((edge, i) => {
                    const from = nodeMap.get(edge.fromNodeId)
                    const to = nodeMap.get(edge.toNodeId)
                    if (!from || !to) return null
                    const d = computeEdgePath(from, to)
                    return (
                      <path
                        key={`diff-add-${i}`}
                        d={d}
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        strokeDasharray="8 4"
                        opacity={0.7}
                        style={{ pointerEvents: 'none' }}
                      />
                    )
                  })}
                  {diffResult.removedEdges.map((edge, i) => {
                    const from = nodeMap.get(edge.fromNodeId)
                    const to = nodeMap.get(edge.toNodeId)
                    if (!from || !to) return null
                    const d = computeEdgePath(from, to)
                    return (
                      <path
                        key={`diff-rm-${i}`}
                        d={d}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth={2.5}
                        strokeDasharray="8 4"
                        opacity={0.7}
                        style={{ pointerEvents: 'none' }}
                      />
                    )
                  })}
                </svg>
              )}

              {/* Node cards — virtualized for large maps (Task 68) */}
              {graphMap.nodes
                .filter((n) => !n.archived)
                .map((node) => {
                  const isVisible = virtualizedVisibleNodeIds.has(node.id)
                  const unit = node.courseUnitId ? unitMap.get(node.courseUnitId) : null
                  const isSelected = selectedNodeId === node.id
                  const isFocused = focusedNodeId === node.id
                  const isDragging = draggingNodeId === node.id
                  const isConnectSource = connectSource === node.id

                  // Task 103: Search highlight and filter dimming
                  const isSearchHighlighted = searchHighlightNodeIds.includes(node.id)
                  const isFilteredOut = filteredNodeIds !== null && !filteredNodeIds.has(node.id)

                  // Off-screen placeholder for virtualized nodes (Task 68)
                  if (!isVisible && !isSelected && !isFocused) {
                    return (
                      <div
                        key={node.id}
                        style={{
                          position: 'absolute',
                          left: node.xPos,
                          top: node.yPos,
                          width: NODE_WIDTH,
                          height: NODE_HEIGHT,
                        }}
                        aria-hidden="true"
                      />
                    )
                  }
                  const progress = isStudent ? nodeProgressMap.get(node.id) : null
                  const gapFinding = gapFindings.find((f) => f.nodeId === node.id)
                  const isGapHovered = hoveredGapNodeId === node.id

                  const isCurrentPathNode = isStudent && showLearningPath && currentPathNodeId === node.id
                  const pathPosition = isStudent && showLearningPath ? pathPositionMap.get(node.id) : undefined

                  // Remote editing indicator (Task 50)
                  const remoteEditor = remoteEditingNodes.find((e) => e.nodeId === node.id)
                  const remoteEditorColorIdx = remoteEditor
                    ? activeEditors.findIndex((e) => e.userId === remoteEditor.userId)
                    : -1

                  // Diff overlay border coloring
                  const diffNodeType = diffResult
                    ? diffResult.addedNodes.some((n) => n.id === node.id) ? 'added'
                    : diffResult.modifiedNodes.some((n) => n.node.id === node.id) ? 'modified'
                    : diffResult.movedNodes.some((n) => n.node.id === node.id) ? 'moved'
                    : null
                    : null

                  const borderClass = diffNodeType
                    ? diffNodeType === 'added' ? 'border-green-500'
                    : diffNodeType === 'modified' ? 'border-blue-500'
                    : 'border-amber-500'
                    : progress
                    ? PROGRESS_BORDER[progress.status]
                    : gapFinding
                      ? gapFinding.severity === 'error'
                        ? 'border-red-500'
                        : 'border-amber-500'
                      : 'border-gray-200'

                  const gapAnimation = diffNodeType
                    ? diffNodeType === 'added' ? 'ring-2 ring-green-300'
                    : diffNodeType === 'modified' ? 'ring-2 ring-blue-300'
                    : 'ring-2 ring-amber-300'
                    : gapFinding
                    ? gapFinding.severity === 'error'
                      ? 'animate-pulse ring-2 ring-red-300'
                      : 'animate-pulse ring-2 ring-amber-300'
                    : isCurrentPathNode
                      ? 'ring-2 ring-uk-blue/40 shadow-[0_0_12px_rgba(0,51,160,0.25)]'
                      : ''

                  // Study plan overlay (students)
                  const planEntry = showStudyPlan ? studyPlanMap.get(node.id) : null
                  const planRing = planEntry
                    ? planEntry.status === 'completed' ? 'ring-2 ring-green-400'
                    : planEntry.status === 'overdue' ? 'ring-2 ring-red-400 animate-pulse'
                    : 'ring-2 ring-blue-400'
                    : ''

                  // Heatmap overlay
                  const heatEntry = showHeatmap ? heatmapData.get(node.id) : null
                  const heatBg = heatEntry
                    ? heatEntry.completionRate >= 0.75 ? 'bg-green-50'
                    : heatEntry.completionRate >= 0.25 ? 'bg-amber-50'
                    : 'bg-red-50'
                    : ''

                  const cursorStyle = canvasMode === 'connect'
                    ? 'cursor-crosshair'
                    : isEditorRole
                      ? isDragging ? 'cursor-grabbing' : 'cursor-grab'
                      : 'cursor-pointer'

                  // Heatmap overlay intensity for this node (realtime tab)
                  const heatmapEntry = heatmapOverlay && realtimeData?.heatmap.find((h) => h.nodeId === node.id)
                  // Dashboard heatmap overlay (Task 81)
                  const dashHeatEntry = showRealtimeDashboard ? dashboardHeatmapData.find((h) => h.nodeId === node.id) : null
                  const heatmapStyle = heatmapEntry
                    ? { boxShadow: `0 0 ${Math.round(heatmapEntry.intensity * 16)}px ${Math.round(heatmapEntry.intensity * 8)}px rgba(234, 88, 12, ${heatmapEntry.intensity * 0.6})` }
                    : dashHeatEntry
                      ? { boxShadow: `0 0 ${Math.round(dashHeatEntry.intensity * 16)}px ${Math.round(dashHeatEntry.intensity * 8)}px ${RealtimeAnalyticsManager.intensityToColor(dashHeatEntry.intensity)}` }
                      : undefined

                  return (
                    <div
                      key={node.id}
                      className="group"
                      style={{
                        position: 'absolute',
                        left: node.xPos,
                        top: node.yPos,
                        width: NODE_WIDTH,
                        ...heatmapStyle,
                        // Task 103: dim filtered-out nodes
                        ...(isFilteredOut ? { opacity: 0.25, pointerEvents: 'none' as const } : {}),
                        // Task 103: golden ring for search matches
                        ...(isSearchHighlighted ? { boxShadow: '0 0 0 3px #f59e0b, 0 0 12px rgba(245, 158, 11, 0.4)' } : {}),
                      }}
                      onMouseEnter={() => { if (gapFinding) setHoveredGapNodeId(node.id) }}
                      onMouseLeave={() => { if (gapFinding) setHoveredGapNodeId(null) }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`${node.label}, ${unit?.unitType || node.nodeType} node, ${graphMap.edges.filter((e) => e.fromNodeId === node.id || e.toNodeId === node.id).length} connections`}
                        onMouseDown={(e) => {
                          if (canvasMode === 'connect') return
                          e.preventDefault()
                          handleDragStart(node.id, e.clientX, e.clientY)
                        }}
                        onTouchStart={(e) => {
                          if (canvasMode === 'connect') return
                          if (e.touches.length === 1) {
                            handleDragStart(node.id, e.touches[0].clientX, e.touches[0].clientY)
                            // Long-press for mobile: open drawer after 600ms (Task 46)
                            longPressTimerRef.current = setTimeout(() => {
                              setSelectedNodeId(node.id)
                              setFocusedNodeId(node.id)
                            }, 600)
                          }
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current)
                            longPressTimerRef.current = null
                          }
                        }}
                        onTouchMove={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current)
                            longPressTimerRef.current = null
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setFocusedNodeId(node.id)
                          if (canvasMode === 'connect' && isEditorRole) {
                            handleNodeClickConnect(node.id, e.clientX, e.clientY)
                            return
                          }
                          if (!isDragging) {
                            setSelectedNodeId(isSelected ? null : node.id)
                          }
                        }}
                        className={`${heatBg || 'bg-white'} border-2 rounded-2xl px-4 py-3 text-left hover:shadow-md select-none ${cursorStyle} ${
                          isSelected
                            ? 'border-uk-blue shadow-md ring-2 ring-uk-blue/20'
                            : isFocused
                              ? 'border-uk-blue ring-2 ring-uk-blue/40 shadow-sm'
                              : isConnectSource
                                ? 'border-uk-blue ring-2 ring-uk-blue/30 shadow-md'
                                : `${borderClass} ${planRing || gapAnimation}`
                        } ${isDragging ? 'shadow-lg z-20 opacity-90' : 'transition-shadow'}`}
                        style={{
                          minHeight: NODE_HEIGHT,
                          borderRadius: VisualizationService.getShapeBorderRadius(
                            VisualizationService.getNodeShape(unit?.unitType || node.nodeType),
                          ),
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {pathPosition != null && (
                              <span className={`shrink-0 inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
                                isCurrentPathNode
                                  ? 'bg-uk-blue text-white'
                                  : progress?.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                              }`}>
                                {pathPosition}
                              </span>
                            )}
                            <span className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">
                              {node.label}
                            </span>
                          </div>
                          {progress?.status === 'completed' && (
                            <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {unit && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${UNIT_TYPE_COLORS[unit.unitType] || UNIT_TYPE_COLORS.OTHER}`}>
                              {unit.unitType}
                            </span>
                          )}
                          {unit && !isStudent && <ConfidenceDot confidence={unit.dateConfidence} />}
                        </div>
                        {unit && (unit.startDate || unit.endDate) && (
                          <div className="text-[10px] text-gray-400 mt-1 truncate">
                            {unit.startDate ? new Date(unit.startDate).toLocaleDateString() : '—'}
                            {' – '}
                            {unit.endDate ? new Date(unit.endDate).toLocaleDateString() : '—'}
                          </div>
                        )}
                        {progress && <NodeProgressIndicator progress={progress} />}
                        {/* Study plan badge */}
                        {planEntry && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <CalendarDays className="size-3 text-blue-500" />
                            <span className={`text-[10px] font-medium ${
                              planEntry.status === 'overdue' ? 'text-red-600' : planEntry.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {planEntry.status === 'completed' ? 'Completed' : new Date(planEntry.targetDate).toLocaleDateString()}
                            </span>
                            {planEntry.status !== 'completed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCompletePlanEntry(node.id) }}
                                className="text-[9px] text-green-600 hover:underline"
                              >
                                Done
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePlanEntry(node.id) }}
                              className="text-[9px] text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        {/* Active user count badge (Task 81) */}
                        {showRealtimeDashboard && dashHeatEntry && dashHeatEntry.activeUserCount > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-semibold text-green-700">{dashHeatEntry.activeUserCount} active</span>
                          </div>
                        )}
                        {/* Plan this topic link for students */}
                        {isStudent && showStudyPlan && !planEntry && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPlanNodeId(node.id) }}
                            className="text-[10px] text-blue-500 hover:underline mt-1"
                          >
                            + Plan this topic
                          </button>
                        )}
                        {/* Heatmap tooltip */}
                        {heatEntry && (
                          <div className="text-[10px] mt-1 font-medium" style={{
                            color: heatEntry.completionRate >= 0.75 ? '#15803d' : heatEntry.completionRate >= 0.25 ? '#b45309' : '#dc2626',
                          }}>
                            {Math.round(heatEntry.completionRate * 100)}% of class completed
                            {!isStudent && heatEntry.completedCount != null && (
                              <span className="text-gray-400 ml-1">
                                ({heatEntry.completedCount}/{heatEntry.totalStudents})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Comment badge on node */}
                      {isEditorRole && commentCounts.nodeCounts[node.id] > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openCommentPanel(node.id) }}
                          className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 rounded-full bg-uk-blue px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm hover:bg-[#002880] transition-colors"
                        >
                          <MessageSquare className="size-3" />
                          {commentCounts.nodeCounts[node.id]}
                        </button>
                      )}
                      {/* LMS deep link icon */}
                      {lmsLinks.has(node.id) && lmsLinks.get(node.id)!.linkType === 'assignment' && (
                        <a
                          href={lmsLinks.get(node.id)!.lmsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -bottom-2 -right-2 z-10 flex items-center justify-center size-6 rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-colors"
                          title={`Open in Canvas: ${lmsLinks.get(node.id)!.title}`}
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      {/* Milestone flag badge (Task 64) */}
                      {milestoneNodeIds.has(node.id) && (
                        <div
                          className={`absolute -top-2 -left-2 z-10 flex items-center justify-center size-6 rounded-full shadow-sm ${
                            milestones.find((m) => m.nodeId === node.id)?.achieved
                              ? 'bg-green-500 text-white'
                              : 'bg-amber-400 text-white'
                          }`}
                          title={milestones.find((m) => m.nodeId === node.id)?.label ?? 'Milestone'}
                        >
                          {milestones.find((m) => m.nodeId === node.id)?.achieved
                            ? <Trophy className="size-3" />
                            : <Flag className="size-3" />
                          }
                        </div>
                      )}
                      {/* Study group count badge (Task 63) */}
                      {nodeGroupCounts[node.id] > 0 && (
                        <div
                          className="absolute -bottom-2 -left-2 z-10 flex items-center gap-0.5 rounded-full bg-cyan-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                          title={`${nodeGroupCounts[node.id]} study group${nodeGroupCounts[node.id] !== 1 ? 's' : ''}`}
                        >
                          <UsersRound className="size-3" />
                          {nodeGroupCounts[node.id]}
                        </div>
                      )}
                      {/* Gap analysis popover on hover */}
                      {gapFinding && isGapHovered && (
                        <div className={`absolute left-0 top-full mt-1 z-30 w-60 rounded-xl border-2 px-3 py-2 text-xs shadow-lg ${
                          gapFinding.severity === 'error'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <p className="font-semibold">{gapFinding.issue}</p>
                          <p className="mt-1 opacity-80">{gapFinding.suggestion}</p>
                        </div>
                      )}
                      {/* Remote editing indicator (Task 50 → Task 91: PresenceBadges) */}
                      {remoteEditor && (
                        <>
                          <div
                            className="absolute inset-0 rounded-2xl pointer-events-none"
                            style={{
                              boxShadow: `0 0 0 3px ${getEditorColor(remoteEditorColorIdx >= 0 ? remoteEditorColorIdx : 0)}40`,
                              borderColor: getEditorColor(remoteEditorColorIdx >= 0 ? remoteEditorColorIdx : 0),
                            }}
                          />
                          <PresenceBadges
                            editors={remoteEditingNodes
                              .filter((e) => e.nodeId === node.id)
                              .map((e) => ({
                                userId: e.userId,
                                userName: e.userName,
                                colorIndex: Math.max(0, activeEditors.findIndex((a) => a.userId === e.userId)),
                              }))}
                            offsetX={-6}
                            offsetY={-6}
                          />
                          <span
                            className="absolute -bottom-2.5 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: getEditorColor(remoteEditorColorIdx >= 0 ? remoteEditorColorIdx : 0) }}
                          >
                            {remoteEditor.userName}
                          </span>
                        </>
                      )}
                      {/* Edit lock indicator (Task 92) */}
                      {(() => {
                        const lock = editLocks.find((l) => l.nodeId === node.id)
                        return lock ? <EditLockIndicator lock={lock} /> : null
                      })()}
                    </div>
                  )
                })}

              {/* Edge type popover */}
              {edgeTypePopover && (
                <EdgeTypePopover
                  position={edgeTypePopover.position}
                  onSelect={(edgeType) => createEdge(edgeTypePopover.fromNodeId, edgeTypePopover.toNodeId, edgeType)}
                  onCancel={() => {
                    setEdgeTypePopover(null)
                    setConnectSource(null)
                    setCursorPos(null)
                  }}
                />
              )}

              {/* Annotation overlays (Task 62) */}
              {annotations
                .filter((ann) => !hiddenLayerIds.has(ann.layerId))
                .map((ann) => {
                  if (ann.type === 'note') {
                    const isEditing = editingAnnotationId === ann.id
                    return (
                      <div
                        key={`ann-${ann.id}`}
                        className="absolute z-20 group"
                        style={{ left: ann.positionX, top: ann.positionY }}
                      >
                        <div
                          className="min-w-[120px] max-w-[200px] rounded-lg p-2 shadow-md border-2 text-xs"
                          style={{
                            backgroundColor: `${ann.layer.color}15`,
                            borderColor: `${ann.layer.color}60`,
                          }}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <textarea
                                autoFocus
                                value={annotationNoteText}
                                onChange={(e) => setAnnotationNoteText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    saveAnnotationNote(ann.id, annotationNoteText)
                                  }
                                  if (e.key === 'Escape') {
                                    if (ann.id.startsWith('temp-')) {
                                      setAnnotations((prev) => prev.filter((a) => a.id !== ann.id))
                                    }
                                    setEditingAnnotationId(null)
                                  }
                                }}
                                className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                rows={2}
                                placeholder="Add a note..."
                              />
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => {
                                    if (ann.id.startsWith('temp-')) {
                                      setAnnotations((prev) => prev.filter((a) => a.id !== ann.id))
                                    }
                                    setEditingAnnotationId(null)
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveAnnotationNote(ann.id, annotationNoteText)}
                                  className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded"
                                  style={{ backgroundColor: ann.layer.color }}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start gap-1">
                                <StickyNote className="size-3 shrink-0 mt-0.5" style={{ color: ann.layer.color }} />
                                <p className="text-gray-800 leading-snug">{ann.content || 'Empty note'}</p>
                              </div>
                              {isEditorRole && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteAnnotationHandler(ann.id) }}
                                  className="absolute -right-1.5 -top-1.5 size-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="size-2.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  }

                  if (ann.type === 'highlight' && ann.targetNodeId) {
                    const node = graphMap?.nodes.find((n) => n.id === ann.targetNodeId)
                    if (!node) return null
                    return (
                      <div
                        key={`ann-hl-${ann.id}`}
                        className="absolute z-10 pointer-events-none rounded-2xl"
                        style={{
                          left: node.xPos - 8,
                          top: node.yPos - 8,
                          width: 176,
                          height: 76,
                          boxShadow: `0 0 0 4px ${ann.layer.color}50`,
                          border: `2px solid ${ann.layer.color}80`,
                        }}
                      />
                    )
                  }

                  return null
                })}

              {/* Remote cursors (Task 49 → Task 91: LiveCursors component) */}
              <LiveCursors
                cursors={remoteCursors.map((cursor) => ({
                  userId: cursor.userId,
                  userName: cursor.userName,
                  x: cursor.x,
                  y: cursor.y,
                  lastUpdated: cursor.lastUpdated,
                  colorIndex: Math.max(0, activeEditors.findIndex((e) => e.userId === cursor.userId)),
                }))}
                fadeAfterMs={10000}
              />
            </div>
          </div>
        )}

        {/* Task 101: Minimap navigator */}
        {showAdvancedGraph && graphMap && graphMap.nodes.length > 0 && (
          <MinimapNavigator
            nodes={graphMap.nodes as VisNode[]}
            edges={graphMap.edges}
            canvasSize={{ width: canvasWidth, height: canvasHeight }}
            viewportRect={{
              scrollLeft: scrollContainerRef.current?.scrollLeft || 0,
              scrollTop: scrollContainerRef.current?.scrollTop || 0,
              width: scrollContainerRef.current?.clientWidth || 1200,
              height: scrollContainerRef.current?.clientHeight || 800,
            }}
            zoom={1}
            onPan={handleMinimapPan}
          />
        )}

        {/* Edge delete confirmation */}
        {pendingDeleteEdgeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" role="dialog" aria-modal="true" aria-labelledby="delete-edge-title">
            <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-6 max-w-sm mx-4">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="size-5 text-red-500" />
                <h3 id="delete-edge-title" className="text-lg font-extrabold text-gray-900">Delete Edge?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                This will remove the relationship between these two nodes. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setPendingDeleteEdgeId(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteEdge(pendingDeleteEdgeId)}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedNode && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedNodeId(null)}
            aria-hidden="true"
          />
          <NodeDetailDrawer
            key={selectedNode.id}
            node={selectedNode}
            unit={selectedUnit || null}
            courseId={courseId}
            userEmail={currentUser?.email || ''}
            readOnly={isStudent}
            lessonProgress={lessonProgressMap}
            onClose={() => setSelectedNodeId(null)}
            onUpdated={() => {
              setSelectedNodeId(null)
              fetchData()
            }}
            onAddComment={isEditorRole ? (nodeId) => {
              setSelectedNodeId(null)
              openCommentPanel(nodeId)
            } : undefined}
            conflictInfo={conflictInfo}
            onConflictResolve={(resolution) => {
              if (!conflictInfo) return
              if (resolution === 'use-theirs') {
                // Reload from server — discard local edits
                setConflictInfo(null)
                setSelectedNodeId(null)
                fetchData()
              } else if (resolution === 'merge') {
                // Merge: if they changed label, concatenate; otherwise keep mine
                // We signal the drawer to merge by re-setting selectedNode with merged data
                if (conflictInfo.label) {
                  // Trigger refetch so the drawer reopens with merged label
                  fetchData().then(() => {
                    setConflictInfo(null)
                  })
                } else {
                  setConflictInfo(null)
                }
              } else {
                // Keep mine — just dismiss the banner
                setConflictInfo(null)
              }
            }}
            remoteEditingUsers={remoteEditingNodes.filter((e) => e.nodeId === selectedNode.id)}
            isMilestoneNode={milestoneNodeIds.has(selectedNode.id)}
            onSetMilestone={isEditorRole ? handleSetMilestone : undefined}
            onRemoveMilestone={isEditorRole ? handleRemoveMilestone : undefined}
          />
        </>
      )}

      {/* Milestone celebration overlay (Task 64) */}
      {celebratingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 border-2 border-amber-300 rounded-2xl shadow-2xl p-8 text-center motion-safe:animate-bounce pointer-events-auto max-w-sm mx-4" role="alert">
            <PartyPopper className="size-12 text-amber-500 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Milestone Achieved!</h2>
            <p className="text-sm text-gray-600">{celebratingMilestone}</p>
          </div>
        </div>
      )}

      {/* Snapshot restore confirmation dialog */}
      {pendingRestoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="size-5 text-blue-600" />
              <h3 className="text-lg font-extrabold text-gray-900">Restore Snapshot?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will replace all current nodes and edges with the snapshot&apos;s saved state.
              Any unsaved changes will be lost. Consider saving a snapshot first.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingRestoreId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreSnapshot(pendingRestoreId)}
                className="px-4 py-2 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share dialog (with Share + Embed tabs) */}
      {showShareDialog && isEditorRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="size-5 text-uk-blue" />
                <h3 className="text-lg font-extrabold text-gray-900">Share Course Map</h3>
              </div>
              <button onClick={() => { setShowShareDialog(false); setShareTab('share') }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="size-5 text-gray-400" />
              </button>
            </div>

            {/* Tab strip */}
            <div className="flex border-b border-gray-200 mb-4" role="tablist">
              <button
                role="tab"
                aria-selected={shareTab === 'share'}
                onClick={() => setShareTab('share')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  shareTab === 'share' ? 'border-uk-blue text-uk-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Share
              </button>
              <button
                role="tab"
                aria-selected={shareTab === 'embed'}
                onClick={() => setShareTab('embed')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  shareTab === 'embed' ? 'border-uk-blue text-uk-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Code className="size-3.5" />
                Embed
              </button>
              <button
                role="tab"
                aria-selected={shareTab === 'webhooks'}
                onClick={() => setShareTab('webhooks')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  shareTab === 'webhooks' ? 'border-uk-blue text-uk-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Globe className="size-3.5" />
                Webhooks
              </button>
            </div>

            {/* Share tab */}
            {shareTab === 'share' && (
              <>
                {/* Enable/disable toggle */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Public sharing</p>
                    <p className="text-xs text-gray-500">Anyone with the link can view the graph (read-only)</p>
                  </div>
                  <button
                    onClick={() => shareToken ? disableSharing() : enableSharing()}
                    className={`relative w-11 h-6 rounded-full transition-colors ${shareToken ? 'bg-uk-blue' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${shareToken ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {shareToken && shareUrl && (
                  <div className="mt-4 space-y-4">
                    {/* Share link */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Share link</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-700 truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(shareUrl, setShareCopied)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-uk-blue text-white hover:bg-[#002880] transition-colors"
                        >
                          {shareCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          {shareCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Access code */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                        <Lock className="size-3" /> Access code (optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={accessCodeInput}
                          onChange={(e) => setAccessCodeInput(e.target.value)}
                          placeholder="Leave empty for open access"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                        />
                        <button
                          onClick={() => updateAccessCode(accessCodeInput.trim() || null)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          {shareAccessCode === (accessCodeInput.trim() || null) ? 'Saved' : 'Set'}
                        </button>
                      </div>
                      {shareAccessCode && (
                        <p className="text-[10px] text-green-600 mt-1">Access code is active</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Embed tab */}
            {shareTab === 'embed' && (
              <div className="space-y-4">
                {!shareToken ? (
                  <div className="text-center py-6">
                    <Code className="size-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Enable public sharing first to generate an embed code.</p>
                    <button
                      onClick={() => { enableSharing(); setShareTab('share') }}
                      className="mt-3 px-4 py-2 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors"
                    >
                      Enable Sharing
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Width/Height config */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Width (px)</label>
                        <input
                          type="number"
                          value={embedWidth}
                          onChange={(e) => setEmbedWidth(Math.max(300, parseInt(e.target.value) || 800))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Height (px)</label>
                        <input
                          type="number"
                          value={embedHeight}
                          onChange={(e) => setEmbedHeight(Math.max(200, parseInt(e.target.value) || 600))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                        />
                      </div>
                    </div>

                    {/* Iframe snippet */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Embed code</label>
                      <div className="relative">
                        <pre className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                          {`<iframe src="${window.location.origin}/courses/${courseId}/course-map/embed?token=${shareToken}" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(
                            `<iframe src="${window.location.origin}/courses/${courseId}/course-map/embed?token=${shareToken}" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`,
                            setEmbedCopied,
                          )}
                          className="absolute top-1 right-1 p-1 rounded hover:bg-gray-200 transition-colors"
                          title="Copy embed code"
                        >
                          {embedCopied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5 text-gray-400" />}
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Preview</label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50" style={{ height: Math.min(embedHeight, 300) }}>
                        <iframe
                          src={`/courses/${courseId}/course-map/embed?token=${shareToken}`}
                          width="100%"
                          height="100%"
                          style={{ border: 'none' }}
                          title="Course map embed preview"
                        />
                      </div>
                    </div>

                    {/* Direct embed link */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Embed page URL</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/courses/${courseId}/course-map/embed?token=${shareToken}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-700 truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(
                            `${window.location.origin}/courses/${courseId}/course-map/embed?token=${shareToken}`,
                            setShareCopied,
                          )}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-uk-blue text-white hover:bg-[#002880] transition-colors"
                        >
                          {shareCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          {shareCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Webhooks tab */}
            {shareTab === 'webhooks' && (
              <div className="space-y-4">
                {/* Existing webhooks */}
                {webhooksLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-gray-400" />
                  </div>
                ) : webhooks.length > 0 ? (
                  <div className="space-y-2">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <Globe className="size-4 text-gray-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{wh.url}</p>
                          <p className="text-[10px] text-gray-400">
                            {wh.events.length > 0 ? wh.events.join(', ') : 'All events'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleTestWebhook(wh.id)}
                          disabled={testingWebhookId === wh.id}
                          className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          {testingWebhookId === wh.id ? <Loader2 className="size-3 animate-spin" /> : 'Test'}
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove webhook"
                        >
                          <Trash2 className="size-3.5 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Globe className="size-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No webhooks configured yet.</p>
                  </div>
                )}

                {/* Add new webhook */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-600">Add a webhook</p>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Endpoint URL</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://example.com/webhook"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Secret (for HMAC signing)</label>
                    <input
                      type="text"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="my-webhook-secret"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Events (leave empty for all)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['node_updated', 'node_moved', 'edge_created', 'edge_deleted'].map((evt) => (
                        <button
                          key={evt}
                          onClick={() => setWebhookEvents((prev) =>
                            prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
                          )}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            webhookEvents.includes(evt)
                              ? 'bg-uk-blue text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {evt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddWebhook}
                    disabled={addingWebhook || !webhookUrl.trim() || !webhookSecret.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-uk-blue text-white hover:bg-[#002880] transition-colors disabled:opacity-50"
                  >
                    {addingWebhook ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                    Add Webhook
                  </button>
                </div>

                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Webhooks POST JSON events to your endpoint with an <code className="font-mono">X-Signature-256</code> HMAC-SHA256 header for verification. Up to 3 retries on failure.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Study Plan date picker dialog */}
      {planNodeId && isStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-5 max-w-xs mx-4 w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-gray-900">Plan This Topic</h3>
              </div>
              <button onClick={() => { setPlanNodeId(null); setPlanDate('') }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Set a target date to study: <span className="font-semibold text-gray-700">
                {graphMap?.nodes.find((n) => n.id === planNodeId)?.label || 'this topic'}
              </span>
            </p>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
            />
            <button
              onClick={handleSavePlanEntry}
              disabled={savingPlan || !planDate}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {savingPlan ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
              Save to Plan
            </button>
          </div>
        </div>
      )}

      {/* Canvas Sync dialog */}
      {showCanvasSyncDialog && isEditorRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-5 text-uk-blue" />
                <h3 className="text-lg font-extrabold text-gray-900">Canvas LMS Sync</h3>
              </div>
              <button onClick={() => setShowCanvasSyncDialog(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="size-5 text-gray-400" />
              </button>
            </div>

            {/* Sync status */}
            {canvasSyncStatus && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`size-2 rounded-full ${canvasSyncStatus.configured ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-xs font-semibold text-gray-700">
                    {canvasSyncStatus.configured ? 'Canvas configured' : 'Canvas not configured'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 space-y-0.5">
                  <p>{canvasSyncStatus.unitCount} units, {canvasSyncStatus.nodeCount} nodes in map</p>
                  {canvasSyncStatus.lastSyncAt && (
                    <p>Last updated: {new Date(canvasSyncStatus.lastSyncAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            {/* Canvas Course ID input */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Canvas Course ID</label>
              <input
                type="text"
                value={canvasCourseIdInput}
                onChange={(e) => setCanvasCourseIdInput(e.target.value)}
                placeholder="e.g. 12345"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
              />
              <p className="text-[10px] text-gray-400 mt-1">Found in your Canvas course URL</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                disabled={canvasSyncing || !canvasCourseIdInput.trim()}
                onClick={async () => {
                  setCanvasSyncing(true)
                  setCanvasSyncResult(null)
                  setCanvasSyncError(null)
                  try {
                    const res = await fetch(`/api/courses/${courseId}/course-map/import-from-canvas`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-demo-user-email': currentUser?.email || '',
                      },
                      body: JSON.stringify({ canvasCourseId: canvasCourseIdInput.trim() }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Import failed')
                    setCanvasSyncResult(`Imported: ${data.unitsCreated} units, ${data.nodesCreated} nodes, ${data.lessonsCreated} items`)
                  } catch (err) {
                    setCanvasSyncError(err instanceof Error ? err.message : 'Import failed')
                  } finally {
                    setCanvasSyncing(false)
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors disabled:opacity-50"
              >
                {canvasSyncing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Import from Canvas
              </button>
              <button
                disabled={canvasSyncing || !canvasCourseIdInput.trim()}
                onClick={async () => {
                  setCanvasSyncing(true)
                  setCanvasSyncResult(null)
                  setCanvasSyncError(null)
                  try {
                    const res = await fetch(`/api/courses/${courseId}/course-map/export-to-canvas`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-demo-user-email': currentUser?.email || '',
                      },
                      body: JSON.stringify({ canvasCourseId: canvasCourseIdInput.trim() }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Export failed')
                    setCanvasSyncResult(`Exported: ${data.modulesCreated} modules, ${data.itemsCreated} items`)
                  } catch (err) {
                    setCanvasSyncError(err instanceof Error ? err.message : 'Export failed')
                  } finally {
                    setCanvasSyncing(false)
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {canvasSyncing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Export to Canvas
              </button>
            </div>

            {/* Result / error feedback */}
            {canvasSyncResult && (
              <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700">{canvasSyncResult}</p>
              </div>
            )}
            {canvasSyncError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-700">{canvasSyncError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save as Template dialog */}
      {showSaveTemplateDialog && isEditorRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="size-5 text-purple-600" />
                <h3 className="text-lg font-extrabold text-gray-900">Save as Template</h3>
              </div>
              <button onClick={() => setShowSaveTemplateDialog(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="size-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Save this course map as a reusable template that can be applied to other courses.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Template name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. 16-Week STEM Course"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Description</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Category</label>
                <input
                  type="text"
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  placeholder="e.g. STEM, Humanities, Business"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => {
                  setShowSaveTemplateDialog(false)
                  setTemplateName('')
                  setTemplateDescription('')
                  setTemplateCategory('')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={savingTemplate || !templateName.trim()}
                onClick={async () => {
                  if (!currentUser?.email || !courseId) return
                  setSavingTemplate(true)
                  try {
                    const res = await fetch('/api/course-map-templates', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
                      body: JSON.stringify({
                        courseId,
                        name: templateName.trim(),
                        description: templateDescription.trim() || undefined,
                        category: templateCategory.trim() || undefined,
                      }),
                    })
                    if (res.ok) {
                      addCollabToast('Template saved successfully')
                      setShowSaveTemplateDialog(false)
                      setTemplateName('')
                      setTemplateDescription('')
                      setTemplateCategory('')
                    } else {
                      const err = await res.json()
                      addCollabToast(`Error: ${err.error || 'Failed to save template'}`)
                    }
                  } catch {
                    addCollabToast('Failed to save template')
                  }
                  setSavingTemplate(false)
                }}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {savingTemplate ? <Loader2 className="size-4 animate-spin inline mr-1" /> : null}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate to Course dialog */}
      {showDuplicateDialog && isEditorRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CopyPlus className="size-5 text-green-600" />
                <h3 className="text-lg font-extrabold text-gray-900">Duplicate to Course</h3>
              </div>
              <button onClick={() => { setShowDuplicateDialog(false); setDuplicateTargetId(''); setDuplicateOverwriteConfirm(false) }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="size-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Copy all nodes, edges, units, modules, and lessons to another course you own.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Target course</label>
                {userCourses.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Loading courses...</p>
                ) : (
                  <select
                    value={duplicateTargetId}
                    onChange={(e) => { setDuplicateTargetId(e.target.value); setDuplicateOverwriteConfirm(false) }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a course...</option>
                    {userCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.courseCode ? `${c.courseCode} — ` : ''}{c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {duplicateOverwriteConfirm && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="size-4 inline mr-1" />
                  Target course already has a map. Duplicating will <strong>replace</strong> it. Continue?
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => { setShowDuplicateDialog(false); setDuplicateTargetId(''); setDuplicateOverwriteConfirm(false) }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={duplicating || !duplicateTargetId}
                onClick={async () => {
                  if (!currentUser?.email || !courseId || !duplicateTargetId) return
                  setDuplicating(true)
                  try {
                    const res = await fetch(`/api/courses/${courseId}/course-map/duplicate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
                      body: JSON.stringify({
                        targetCourseId: duplicateTargetId,
                        overwrite: duplicateOverwriteConfirm,
                      }),
                    })
                    if (res.ok) {
                      addCollabToast('Map duplicated successfully')
                      setShowDuplicateDialog(false)
                      setDuplicateTargetId('')
                      setDuplicateOverwriteConfirm(false)
                    } else if (res.status === 409) {
                      setDuplicateOverwriteConfirm(true)
                    } else {
                      const err = await res.json()
                      addCollabToast(`Error: ${err.error || 'Failed to duplicate'}`)
                    }
                  } catch {
                    addCollabToast('Failed to duplicate map')
                  }
                  setDuplicating(false)
                }}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {duplicating ? <Loader2 className="size-4 animate-spin inline mr-1" /> : null}
                {duplicateOverwriteConfirm ? 'Overwrite & Duplicate' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics side panel (enhanced with tabs: Overview / Real-time / Performance) */}
      {showAnalyticsPanel && isEditorRole && (
        <div className="fixed inset-y-0 right-0 z-50 w-[28rem] bg-white border-l-2 border-gray-200 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-uk-blue" />
              <h3 className="text-sm font-extrabold text-gray-900">Course Map Analytics</h3>
            </div>
            <button onClick={() => { setShowAnalyticsPanel(false); setHeatmapOverlay(false) }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 px-2">
            {([
              { key: 'overview' as const, label: 'Overview' },
              { key: 'realtime' as const, label: 'Real-time' },
              { key: 'performance' as const, label: 'Performance' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAnalyticsTab(tab.key)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  analyticsTab === tab.key
                    ? 'border-uk-blue text-uk-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* ──────── Overview Tab (original analytics) ──────── */}
            {analyticsTab === 'overview' && (
              <>
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 animate-spin text-gray-400" />
                  </div>
                ) : analyticsData ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Edits', value: analyticsData.totalEdits, icon: Pencil },
                        { label: 'Collaborators', value: analyticsData.collaboratorCount, icon: Users },
                        { label: 'Avg Edits/Day', value: analyticsData.averageEditsPerDay, icon: TrendingUp },
                        { label: 'Most Active', value: analyticsData.mostActiveDay ? format(new Date(analyticsData.mostActiveDay + 'T00:00:00'), 'MMM d') : '—', icon: Calendar },
                      ].map((kpi) => (
                        <div key={kpi.label} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <kpi.icon className="size-3.5 text-gray-400" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
                          </div>
                          <p className="text-lg font-extrabold text-gray-900">{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                    {analyticsData.editCountByUser.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Edits by User</h4>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <ResponsiveContainer width="100%" height={Math.max(120, analyticsData.editCountByUser.length * 36)}>
                            <BarChart data={analyticsData.editCountByUser} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Bar dataKey="count" fill="#0033A0" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    {analyticsData.editsPerDay.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Activity Timeline (30 days)</h4>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={analyticsData.editsPerDay} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 9 }}
                                tickFormatter={(d: string) => format(new Date(d + 'T00:00:00'), 'M/d')}
                                interval={Math.max(0, Math.floor(analyticsData.editsPerDay.length / 6))}
                              />
                              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                labelFormatter={(d) => format(new Date(String(d) + 'T00:00:00'), 'MMM d, yyyy')}
                              />
                              <Line type="monotone" dataKey="count" stroke="#0033A0" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    {analyticsData.nodeChangeFrequency.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Most Edited Nodes</h4>
                        <div className="space-y-1.5">
                          {analyticsData.nodeChangeFrequency.map((n, i) => (
                            <div key={n.nodeId} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-gray-400 shrink-0">{i + 1}.</span>
                                <span className="text-sm text-gray-800 truncate">{n.label}</span>
                              </div>
                              <span className="text-xs font-bold bg-uk-blue text-white px-2 py-0.5 rounded-full shrink-0">{n.changeCount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {analyticsData.editCountByType.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Edit Type Breakdown</h4>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <ResponsiveContainer width="100%" height={200}>
                            <RePieChart>
                              <Pie
                                data={analyticsData.editCountByType}
                                dataKey="count"
                                nameKey="type"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                labelLine={false}
                                fontSize={10}
                              >
                                {analyticsData.editCountByType.map((_, idx) => {
                                  const COLORS = ['#0033A0', '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2']
                                  return <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                })}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-12 text-center text-sm text-gray-400">No analytics data available.</div>
                )}
              </>
            )}

            {/* ──────── Real-time Tab (Task 73) ──────── */}
            {analyticsTab === 'realtime' && (
              <>
                {realtimeLoading && !realtimeData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 animate-spin text-gray-400" />
                  </div>
                ) : realtimeData ? (
                  <>
                    {/* Live counters */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Activity className="size-3.5 text-green-500" />
                          <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Live Edits (15m)</span>
                        </div>
                        <p className="text-lg font-extrabold text-gray-900">{realtimeData.liveEditCount}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Users className="size-3.5 text-blue-500" />
                          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Active Now</span>
                        </div>
                        <p className="text-lg font-extrabold text-gray-900">{realtimeData.activeUserCount}</p>
                      </div>
                    </div>

                    {/* Active users list */}
                    {realtimeData.activeUsers.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Active Users</h4>
                        <div className="space-y-1.5">
                          {realtimeData.activeUsers.map((u) => (
                            <div key={u.userId} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm text-gray-800">{u.name}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(u.lastActiveAt), { addSuffix: true })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Engagement metrics */}
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Engagement (30d)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Sessions', value: realtimeData.engagement.totalSessions },
                          { label: 'Avg Duration', value: `${realtimeData.engagement.avgSessionDurationMin}m` },
                          { label: 'Edits/Session', value: realtimeData.engagement.editsPerSession },
                          { label: 'Editors (7d)', value: realtimeData.engagement.uniqueEditors7d },
                        ].map((m) => (
                          <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{m.label}</span>
                            <p className="text-base font-extrabold text-gray-900">{m.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Heatmap toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Node Heatmap</h4>
                        <button
                          onClick={() => setHeatmapOverlay(!heatmapOverlay)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${
                            heatmapOverlay ? 'bg-uk-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {heatmapOverlay ? 'Overlay ON' : 'Show Overlay'}
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {realtimeData.heatmap.slice(0, 10).map((h) => (
                          <div key={h.nodeId} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                            <span className="text-xs text-gray-700 truncate flex-1 mr-2">{h.label}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="h-2 rounded-full bg-gray-200 w-16">
                                <div
                                  className="h-full rounded-full bg-orange-500 transition-all"
                                  style={{ width: `${Math.round(h.intensity * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-gray-500 w-6 text-right">{h.editCount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Time-series chart */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Edit Activity</h4>
                        <div className="flex gap-1">
                          {(['24h', '7d', '30d'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => { setRealtimeRange(r); fetchRealtimeAnalytics(r) }}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                                realtimeRange === r ? 'bg-uk-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={realtimeData.timeSeries} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                            <XAxis
                              dataKey="timestamp"
                              tick={{ fontSize: 9 }}
                              tickFormatter={(t: string) =>
                                realtimeRange === '24h'
                                  ? format(new Date(t), 'HH:mm')
                                  : format(new Date(t + (t.includes('T') ? '' : 'T00:00:00')), 'M/d')
                              }
                              interval={realtimeRange === '24h' ? 3 : Math.max(0, Math.floor(realtimeData.timeSeries.length / 6))}
                            />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ fontSize: 12, borderRadius: 8 }}
                              labelFormatter={(t) =>
                                realtimeRange === '24h'
                                  ? format(new Date(String(t)), 'MMM d, HH:mm')
                                  : format(new Date(String(t) + (String(t).includes('T') ? '' : 'T00:00:00')), 'MMM d, yyyy')
                              }
                            />
                            <Line type="monotone" dataKey="edits" stroke="#0033A0" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-400 text-center">Auto-refreshes every 15 seconds</p>
                  </>
                ) : (
                  <div className="px-4 py-12 text-center text-sm text-gray-400">No real-time data available.</div>
                )}
              </>
            )}

            {/* ──────── Performance Tab (Task 74) ──────── */}
            {analyticsTab === 'performance' && (
              <>
                {/* Budget status */}
                <div>
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Performance Budget</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: 'Render',
                        threshold: '100ms',
                        status: perfBudgetViolations.some((v) => v.metric.startsWith('render:'))
                          ? perfBudgetViolations.find((v) => v.metric.startsWith('render:'))!.severity
                          : 'ok',
                      },
                      {
                        label: 'API',
                        threshold: '2s',
                        status: perfBudgetViolations.some((v) => v.metric.startsWith('api:'))
                          ? perfBudgetViolations.find((v) => v.metric.startsWith('api:'))!.severity
                          : 'ok',
                      },
                      {
                        label: 'CLS',
                        threshold: '0.1',
                        status: perfBudgetViolations.some((v) => v.metric.includes('CLS'))
                          ? perfBudgetViolations.find((v) => v.metric.includes('CLS'))!.severity
                          : 'ok',
                      },
                    ].map((b) => (
                      <div
                        key={b.label}
                        className={`border rounded-xl px-3 py-2 text-center ${
                          b.status === 'ok'
                            ? 'bg-green-50 border-green-200'
                            : b.status === 'warning'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div
                          className={`size-2 rounded-full mx-auto mb-1 ${
                            b.status === 'ok' ? 'bg-green-500' : b.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-[10px] font-semibold text-gray-700">{b.label}</span>
                        <p className="text-[9px] text-gray-400">&lt; {b.threshold}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Core Web Vitals */}
                <div>
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Core Web Vitals</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'LCP', value: perfReport?.webVitals.lcp, unit: 'ms', good: 2500 },
                      { label: 'FID', value: perfReport?.webVitals.fid, unit: 'ms', good: 100 },
                      { label: 'CLS', value: perfReport?.webVitals.cls, unit: '', good: 0.1 },
                    ].map((v) => {
                      const val = v.value ?? null
                      const status = val === null ? 'pending' : val <= v.good ? 'good' : val <= v.good * 2 ? 'needs-improvement' : 'poor'
                      return (
                        <div key={v.label} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-center">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase">{v.label}</span>
                          <p className={`text-base font-extrabold ${
                            status === 'good' ? 'text-green-600' : status === 'needs-improvement' ? 'text-amber-600' : status === 'poor' ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {val !== null ? `${v.label === 'CLS' ? val.toFixed(3) : Math.round(val)}${v.unit}` : '—'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Render times */}
                {perfReport && Object.keys(perfReport.renders).length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Render Times</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <ResponsiveContainer width="100%" height={Math.max(100, Object.keys(perfReport.renders).length * 32)}>
                        <BarChart
                          data={Object.entries(perfReport.renders).map(([name, b]) => ({ name, p50: Math.round(b.p50), p95: Math.round(b.p95) }))}
                          layout="vertical"
                          margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                        >
                          <XAxis type="number" tick={{ fontSize: 10 }} unit="ms" />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="p50" fill="#0033A0" radius={[0, 4, 4, 0]} name="p50" />
                          <Bar dataKey="p95" fill="#7c3aed" radius={[0, 4, 4, 0]} name="p95" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* API latencies */}
                {perfReport && Object.keys(perfReport.api).length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">API Latency</h4>
                    <div className="space-y-1.5">
                      {Object.entries(perfReport.api).map(([endpoint, b]) => (
                        <div key={endpoint} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-700 truncate">{endpoint}</span>
                            <span className="text-[10px] text-gray-400">{b.count} calls</span>
                          </div>
                          <div className="flex gap-3 text-[10px]">
                            <span className="text-gray-500">p50: <span className="font-bold text-gray-700">{Math.round(b.p50)}ms</span></span>
                            <span className="text-gray-500">p95: <span className="font-bold text-gray-700">{Math.round(b.p95)}ms</span></span>
                            <span className="text-gray-500">err: <span className={`font-bold ${b.errorRate > 0 ? 'text-red-600' : 'text-green-600'}`}>{b.errorRate}%</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget violations */}
                {perfBudgetViolations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-red-700 uppercase tracking-wider mb-2">Budget Violations</h4>
                    <div className="space-y-1.5">
                      {perfBudgetViolations.map((v, i) => (
                        <div key={i} className={`px-3 py-2 border rounded-lg ${v.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`size-3.5 ${v.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                            <span className="text-xs text-gray-800">{v.metric}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {Math.round(v.actual)}ms &gt; {v.threshold}ms threshold
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!perfReport || (Object.keys(perfReport.renders).length === 0 && Object.keys(perfReport.api).length === 0) ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    Performance data collecting... Interact with the course map to generate metrics.
                  </div>
                ) : null}

                <button
                  onClick={() => { refreshPerfReport(); sendPerfBatch() }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className="size-3.5" />
                  Refresh Metrics
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Health score side panel */}
      {showHealthPanel && isEditorRole && (
        <div className="fixed inset-y-0 right-0 z-50 w-[28rem] bg-white border-l-2 border-gray-200 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Heart className="size-5 text-uk-blue" />
              <h3 className="text-sm font-extrabold text-gray-900">Course Map Health</h3>
            </div>
            <button onClick={() => setShowHealthPanel(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {healthLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-gray-400" />
              </div>
            ) : healthData ? (
              <>
                {/* Overall score ring */}
                <div className="flex flex-col items-center gap-2 py-4">
                  <div
                    className="relative flex items-center justify-center size-28 rounded-full border-[6px]"
                    style={{
                      borderColor: healthData.overallScore >= 80 ? '#22c55e' : healthData.overallScore >= 60 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-gray-900">{healthData.overallScore}</p>
                      <p className="text-xs font-bold text-gray-500">
                        {healthData.overallScore >= 90 ? 'A' : healthData.overallScore >= 80 ? 'B' : healthData.overallScore >= 70 ? 'C' : healthData.overallScore >= 60 ? 'D' : 'F'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">
                    {healthData.overallScore >= 80 ? 'Healthy course map' : healthData.overallScore >= 60 ? 'Needs improvement' : 'Attention required'}
                  </p>
                </div>

                {/* Dimension breakdown */}
                <div>
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3">Dimension Scores</h4>
                  <div className="space-y-3">
                    {healthData.grades.map((g) => (
                      <div key={g.dimension}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800">{g.dimension}</span>
                          <span className="text-xs font-bold" style={{
                            color: g.score >= 80 ? '#15803d' : g.score >= 60 ? '#b45309' : '#dc2626',
                          }}>
                            {g.score}/100 · {g.label}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${g.score}%`,
                              backgroundColor: g.score >= 80 ? '#22c55e' : g.score >= 60 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{g.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI recommendations */}
                {healthData.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">AI Recommendations</h4>
                    <div className="space-y-2">
                      {healthData.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <Sparkles className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-900">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Refresh */}
                <button
                  onClick={fetchHealth}
                  disabled={healthLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {healthLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                  Recalculate Health Score
                </button>
              </>
            ) : (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                No health data available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity feed side panel */}
      {showActivityFeed && isEditorRole && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white border-l-2 border-gray-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-uk-blue" />
              <h3 className="text-sm font-extrabold text-gray-900">Activity Feed</h3>
            </div>
            <button
              onClick={() => setShowActivityFeed(false)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          {/* Activity list */}
          <div className="flex-1 overflow-y-auto">
            {activityEntries.length === 0 && !activityLoading ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                No activity yet. Changes to the course map will appear here.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activityEntries.map((entry) => {
                  const isAdd = entry.editType === 'edge_created' || entry.editType === 'node_updated' || entry.editType === 'ADD_WEEK' || entry.editType === 'snapshot_created'
                  const isRemove = entry.editType === 'edge_deleted' || entry.editType === 'REMOVE_WEEK'
                  const isMove = entry.editType === 'node_moved' || entry.editType === 'REORDER'
                  const isMerge = entry.editType === 'merge_applied'
                  const isRestore = entry.editType === 'snapshot_restored'

                  let iconColor = 'text-blue-500'
                  let IconComponent = Pencil
                  if (isAdd) { iconColor = 'text-green-600'; IconComponent = Plus }
                  if (isRemove) { iconColor = 'text-red-500'; IconComponent = Minus }
                  if (isMove) { iconColor = 'text-amber-500'; IconComponent = MoveHorizontal }
                  if (isMerge) { iconColor = 'text-teal-600'; IconComponent = GitMerge }
                  if (isRestore) { iconColor = 'text-violet-600'; IconComponent = RotateCcw }

                  return (
                    <div key={entry.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex items-center justify-center size-7 rounded-full bg-gray-100 shrink-0">
                          <IconComponent className={`size-3.5 ${iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3 text-gray-400 shrink-0" />
                            <span className="text-xs font-semibold text-gray-900 truncate">{entry.userName}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-0.5">{entry.description}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activityLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-gray-400" />
              </div>
            )}

            {!activityLoading && activityCursor && (
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => fetchActivity(false)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="size-3.5" />
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comment thread side panel */}
      {showCommentPanel && isEditorRole && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-uk-blue" />
              <h2 className="text-lg font-extrabold text-gray-900">
                {commentNodeId ? `Comments on Node` : commentEdgeId ? `Comments on Edge` : 'All Comments'}
              </h2>
            </div>
            <button onClick={() => setShowCommentPanel(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          {/* Filter bar */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={() => setShowResolvedComments(!showResolvedComments)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                showResolvedComments ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {showResolvedComments ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              {showResolvedComments ? 'Showing resolved' : 'Show resolved'}
            </button>
            {(commentNodeId || commentEdgeId) && (
              <button
                onClick={() => { setCommentNodeId(null); setCommentEdgeId(null); fetchComments() }}
                className="text-xs text-uk-blue font-semibold hover:underline"
              >
                View all
              </button>
            )}
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto">
            {comments.filter((c) => showResolvedComments || !c.resolved).length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                No comments yet. Start a discussion below.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {comments
                  .filter((c) => showResolvedComments || !c.resolved)
                  .map((comment) => (
                    <div key={comment.id} className={`px-4 py-3 ${comment.resolved ? 'bg-gray-50' : ''}`}>
                      {/* Root comment */}
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex items-center justify-center size-7 rounded-full bg-uk-blue/10 shrink-0">
                          <User className="size-3.5 text-uk-blue" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-900">{comment.userName}</span>
                            <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className={`text-sm mt-0.5 ${comment.resolved ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {comment.content}
                          </p>
                          {comment.resolved && comment.resolvedByName && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Resolved by {comment.resolvedByName}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {!comment.resolved && (
                              <button
                                onClick={() => resolveCommentHandler(comment.id, 'resolve')}
                                className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 hover:underline"
                              >
                                <CheckCircle2 className="size-3" /> Resolve
                              </button>
                            )}
                            {comment.resolved && (
                              <button
                                onClick={() => resolveCommentHandler(comment.id, 'unresolve')}
                                className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 hover:underline"
                              >
                                <RotateCcw className="size-3" /> Reopen
                              </button>
                            )}
                            {!comment.resolved && (
                              <button
                                onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText('') }}
                                className="flex items-center gap-0.5 text-[10px] font-semibold text-gray-500 hover:underline"
                              >
                                <Reply className="size-3" /> Reply
                              </button>
                            )}
                            {comment.userId === currentUser?.id && (
                              <button
                                onClick={() => deleteCommentHandler(comment.id)}
                                className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500 hover:underline"
                              >
                                <Trash2 className="size-3" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <div className="ml-9 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <div className="mt-0.5 flex items-center justify-center size-5 rounded-full bg-gray-100 shrink-0">
                                <User className="size-3 text-gray-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-semibold text-gray-800">{reply.userName}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{reply.content}</p>
                                {reply.userId === currentUser?.id && (
                                  <button
                                    onClick={() => deleteCommentHandler(reply.id)}
                                    className="text-[10px] font-semibold text-red-500 hover:underline mt-0.5"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      {replyingTo === comment.id && (
                        <div className="ml-9 mt-2 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postReply(comment.id) } }}
                            placeholder="Write a reply... Use @email to mention"
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-uk-blue"
                            autoFocus
                          />
                          <button
                            onClick={() => postReply(comment.id)}
                            disabled={postingComment || !replyText.trim()}
                            className="shrink-0 rounded-lg bg-uk-blue p-1.5 text-white hover:bg-[#002880] disabled:opacity-50"
                          >
                            <Send className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* New comment input */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() } }}
                placeholder="Add a comment... Use @email to mention"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
              />
              <button
                onClick={postComment}
                disabled={postingComment || !newCommentText.trim()}
                className="shrink-0 rounded-lg bg-uk-blue px-3 py-2 text-white text-sm font-semibold hover:bg-[#002880] disabled:opacity-50 transition-colors"
              >
                {postingComment ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version comparison overlay */}
      {showCompareView && isEditorRole && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <SplitSquareHorizontal className="size-5 text-violet-600" />
              <h2 className="text-lg font-extrabold text-gray-900">Compare Snapshots</h2>
            </div>
            <button
              onClick={closeComparison}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X className="size-4" />
              Close
            </button>
          </div>

          {/* Snapshot pickers */}
          <div className="border-b border-gray-200 px-6 py-3 flex items-center gap-4 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Snapshot A:</span>
              <select
                value={compareSnapshotA}
                onChange={(e) => { setCompareSnapshotA(e.target.value); setComparisonResult(null) }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select...</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || 'Unnamed'} ({new Date(s.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Snapshot B:</span>
              <select
                value={compareSnapshotB}
                onChange={(e) => { setCompareSnapshotB(e.target.value); setComparisonResult(null) }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select...</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || 'Unnamed'} ({new Date(s.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runComparison}
              disabled={!compareSnapshotA || !compareSnapshotB || compareSnapshotA === compareSnapshotB || comparisonLoading}
              className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {comparisonLoading ? <Loader2 className="size-4 animate-spin" /> : 'Compare'}
            </button>
          </div>

          {/* Comparison result */}
          <div className="flex-1 overflow-y-auto">
            {!comparisonResult && !comparisonLoading && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Select two snapshots and click Compare to see differences.
              </div>
            )}
            {comparisonLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-violet-500" />
              </div>
            )}
            {comparisonResult && (
              <div className="p-6 space-y-6">
                {/* Summary */}
                <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-4">
                  <h3 className="text-sm font-extrabold text-violet-900 mb-1">Change Summary</h3>
                  <p className="text-sm text-violet-700">{comparisonResult.summary}</p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => restoreSnapshotFromComparison(compareSnapshotA)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors"
                  >
                    <RotateCcw className="size-4" />
                    Restore to A
                  </button>
                  <button
                    onClick={() => restoreSnapshotFromComparison(compareSnapshotB)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors"
                  >
                    <RotateCcw className="size-4" />
                    Restore to B
                  </button>
                </div>

                {/* Added nodes */}
                {comparisonResult.added.nodes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-green-700 mb-2 flex items-center gap-1.5">
                      <Plus className="size-4" />
                      Added Nodes ({comparisonResult.added.nodes.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {comparisonResult.added.nodes.map((n) => (
                        <div key={n.id} className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                          <p className="text-sm font-semibold text-green-900">{n.label}</p>
                          <p className="text-[10px] text-green-600">{n.nodeType}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed nodes */}
                {comparisonResult.removed.nodes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-red-700 mb-2 flex items-center gap-1.5">
                      <Minus className="size-4" />
                      Removed Nodes ({comparisonResult.removed.nodes.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {comparisonResult.removed.nodes.map((n) => (
                        <div key={n.id} className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                          <p className="text-sm font-semibold text-red-900 line-through">{n.label}</p>
                          <p className="text-[10px] text-red-600">{n.nodeType}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modified nodes */}
                {comparisonResult.modified.nodes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-700 mb-2 flex items-center gap-1.5">
                      <Pencil className="size-4" />
                      Modified Nodes ({comparisonResult.modified.nodes.length})
                    </h3>
                    <div className="space-y-2">
                      {comparisonResult.modified.nodes.map((m, i) => (
                        <div key={`${m.id}-${i}`} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          <p className="text-sm font-semibold text-amber-900">{m.node.label}</p>
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <span className="text-red-600 line-through">{String(m.oldValue)}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 font-semibold">{String(m.newValue)}</span>
                            <span className="text-gray-400">({m.field})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Added edges */}
                {comparisonResult.added.edges.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-green-700 mb-2 flex items-center gap-1.5">
                      <Plus className="size-4" />
                      Added Edges ({comparisonResult.added.edges.length})
                    </h3>
                    <div className="space-y-1">
                      {comparisonResult.added.edges.map((e) => (
                        <div key={e.id} className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800">
                          {e.fromNodeId.slice(0, 8)}... → {e.toNodeId.slice(0, 8)}... ({e.edgeType})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed edges */}
                {comparisonResult.removed.edges.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-red-700 mb-2 flex items-center gap-1.5">
                      <Minus className="size-4" />
                      Removed Edges ({comparisonResult.removed.edges.length})
                    </h3>
                    <div className="space-y-1">
                      {comparisonResult.removed.edges.map((e) => (
                        <div key={e.id} className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-800">
                          {e.fromNodeId.slice(0, 8)}... → {e.toNodeId.slice(0, 8)}... ({e.edgeType})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modified edges */}
                {comparisonResult.modified.edges.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-700 mb-2 flex items-center gap-1.5">
                      <Pencil className="size-4" />
                      Modified Edges ({comparisonResult.modified.edges.length})
                    </h3>
                    <div className="space-y-1">
                      {comparisonResult.modified.edges.map((m, i) => (
                        <div key={`${m.id}-${i}`} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                          <span className="text-red-600 line-through">{m.oldValue}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-green-600 font-semibold">{m.newValue}</span>
                          <span className="text-gray-400 ml-1">({m.field})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report preview modal */}
      {showReportModal && isEditorRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileBarChart className="size-5 text-uk-blue" />
                <h2 className="text-lg font-extrabold text-gray-900">Generate Report</h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600">Select sections to include in the report:</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={reportIncludeHealth} onChange={(e) => setReportIncludeHealth(e.target.checked)} className="rounded border-gray-300 text-uk-blue focus:ring-uk-blue" />
                <span className="text-sm font-medium text-gray-700">Health Score</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={reportIncludeMilestones} onChange={(e) => setReportIncludeMilestones(e.target.checked)} className="rounded border-gray-300 text-uk-blue focus:ring-uk-blue" />
                <span className="text-sm font-medium text-gray-700">Milestones</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={reportIncludeAnnotations} onChange={(e) => setReportIncludeAnnotations(e.target.checked)} className="rounded border-gray-300 text-uk-blue focus:ring-uk-blue" />
                <span className="text-sm font-medium text-gray-700">Annotations</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={reportIncludeAnalytics} onChange={(e) => setReportIncludeAnalytics(e.target.checked)} className="rounded border-gray-300 text-uk-blue focus:ring-uk-blue" />
                <span className="text-sm font-medium text-gray-700">Edit Activity</span>
              </label>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={openReportInTab}
                disabled={reportLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-uk-blue text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors disabled:opacity-50"
              >
                {reportLoading ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                Print
              </button>
              <button
                onClick={downloadReportHtml}
                disabled={reportLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {reportLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="ml-auto px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course comparison panel */}
      {showCourseCompare && isEditorRole && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="size-5 text-indigo-600" />
              <h2 className="text-lg font-extrabold text-gray-900">Compare Courses</h2>
            </div>
            <button
              onClick={() => { setShowCourseCompare(false); setCourseComparisonResult(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X className="size-4" />
              Close
            </button>
          </div>

          {/* Course selector */}
          <div className="border-b border-gray-200 px-6 py-3 flex items-center gap-4 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Compare with:</span>
              <select
                value={compareTargetCourseId}
                onChange={(e) => { setCompareTargetCourseId(e.target.value); setCourseComparisonResult(null) }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[250px]"
              >
                <option value="">Select a course...</option>
                {compareCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode}: {c.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runCourseComparison}
              disabled={!compareTargetCourseId || courseComparisonLoading}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {courseComparisonLoading ? <Loader2 className="size-4 animate-spin" /> : 'Compare'}
            </button>
          </div>

          {/* Comparison result */}
          <div className="flex-1 overflow-y-auto">
            {!courseComparisonResult && !courseComparisonLoading && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Select a course and click Compare to see structural differences.
              </div>
            )}
            {courseComparisonLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-indigo-500" />
              </div>
            )}
            {courseComparisonResult && (
              <div className="p-6 space-y-6 max-w-5xl mx-auto">
                {/* Summary */}
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4">
                  <h3 className="text-sm font-extrabold text-indigo-900 mb-2">Key Findings</h3>
                  <ul className="space-y-1">
                    {courseComparisonResult.summary.map((s, i) => (
                      <li key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                        <CheckCircle className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Side-by-side stats */}
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: courseComparisonResult.courseA.courseCode, stats: courseComparisonResult.statsA },
                    { label: courseComparisonResult.courseB.courseCode, stats: courseComparisonResult.statsB },
                  ].map((side) => (
                    <div key={side.label} className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                      <h3 className="text-sm font-extrabold text-gray-900 mb-3">{side.label}</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                          <div className="text-lg font-bold text-uk-blue">{side.stats.nodeCount}</div>
                          <div className="text-[10px] text-gray-500">Nodes</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                          <div className="text-lg font-bold text-uk-blue">{side.stats.edgeCount}</div>
                          <div className="text-[10px] text-gray-500">Edges</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(side.stats.unitTypeDistribution).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{type}</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overlap matches */}
                {courseComparisonResult.overlaps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-green-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="size-4" />
                      Matching Topics ({courseComparisonResult.overlaps.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {courseComparisonResult.overlaps.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                          <span className="text-sm font-semibold text-green-900 flex-1">{m.nodeA.label}</span>
                          <span className="text-xs text-green-600 px-2 py-0.5 rounded-full bg-green-100 font-semibold">{Math.round(m.similarity * 100)}%</span>
                          <span className="text-sm font-semibold text-green-900 flex-1 text-right">{m.nodeB.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unique to A */}
                {courseComparisonResult.uniqueToA.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-700 mb-2">
                      Unique to {courseComparisonResult.courseA.courseCode} ({courseComparisonResult.uniqueToA.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {courseComparisonResult.uniqueToA.map((n) => (
                        <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          <p className="text-sm font-semibold text-amber-900">{n.label}</p>
                          <p className="text-[10px] text-amber-600">{n.nodeType}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unique to B */}
                {courseComparisonResult.uniqueToB.length > 0 && (
                  <div>
                    <h3 className="text-sm font-extrabold text-blue-700 mb-2">
                      Unique to {courseComparisonResult.courseB.courseCode} ({courseComparisonResult.uniqueToB.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {courseComparisonResult.uniqueToB.map((n) => (
                        <div key={n.id} className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                          <p className="text-sm font-semibold text-blue-900">{n.label}</p>
                          <p className="text-[10px] text-blue-600">{n.nodeType}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Center Panel (Task 69) */}
      {showNotifPanel && (
        <div className="fixed right-0 top-0 bottom-0 w-[400px] max-w-full z-50 bg-white border-l-2 border-gray-200 shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-uk-blue" />
              <h3 className="text-sm font-extrabold text-gray-900">Notifications</h3>
              {notifUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                  {notifUnreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifUnreadCount > 0 && (
                <button
                  onClick={handleMarkAllNotifsRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowNotifPanel(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 overflow-x-auto">
            {(['all', 'edit', 'comment', 'milestone_achieved', 'health_change', 'snapshot', 'collaboration'] as const).map((ft) => {
              const labels: Record<string, string> = {
                all: 'All', edit: 'Edits', comment: 'Comments',
                milestone_achieved: 'Milestones', health_change: 'Health',
                snapshot: 'Snapshots', collaboration: 'Collab',
              }
              return (
                <button
                  key={ft}
                  onClick={() => { setNotifFilterType(ft); fetchNotifications(ft) }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    notifFilterType === ft
                      ? 'bg-uk-blue text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {labels[ft] || ft}
                </button>
              )
            })}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {notifLoading && notifEntries.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-gray-400" />
              </div>
            ) : notifEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <Inbox className="size-10 text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Course map events like edits, comments, and milestones will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifEntries.map((notif) => {
                  const isUnread = !notif.readBy.includes(currentUser?.id || '')
                  const icons: Record<string, typeof Bell> = {
                    edit: Pencil, comment: MessageSquare, milestone_achieved: Trophy,
                    health_change: Heart, snapshot: Camera, collaboration: Users,
                  }
                  const NotifIcon = icons[notif.type] || Bell
                  const iconColors: Record<string, string> = {
                    edit: 'text-blue-500', comment: 'text-green-500', milestone_achieved: 'text-amber-500',
                    health_change: 'text-red-500', snapshot: 'text-violet-500', collaboration: 'text-cyan-500',
                  }
                  return (
                    <button
                      key={notif.id}
                      onClick={() => {
                        if (isUnread) handleMarkNotifRead(notif.id)
                        if (notif.nodeId && graphMap) {
                          const node = graphMap.nodes.find((n) => n.id === notif.nodeId)
                          if (node) {
                            setSelectedNodeId(node.id)
                            scrollToNode(node)
                          }
                        }
                        setShowNotifPanel(false)
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                        isUnread ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className={`shrink-0 mt-0.5 ${iconColors[notif.type] || 'text-gray-400'}`}>
                        <NotifIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="size-3 text-gray-400" />
                          <span className="text-[10px] text-gray-400">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </span>
                          <span className="text-[10px] text-gray-400">by {notif.userName}</span>
                        </div>
                      </div>
                      {isUnread && (
                        <span className="shrink-0 size-2 rounded-full bg-uk-blue mt-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhook Management Dashboard (Task 70) */}
      {showWebhookDashboard && isEditorRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Settings className="size-5 text-uk-blue" />
                <h2 className="text-base font-extrabold text-gray-900">Webhook Management</h2>
              </div>
              <button
                onClick={() => { setShowWebhookDashboard(false); setWebhookDeliveriesForId(null); setWebhookEditId(null); setWebhookTestResult(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="size-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Webhook list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-extrabold text-gray-900">Configured Webhooks</h3>
                  <button
                    onClick={() => {
                      setWebhookEditId('new')
                      setWebhookEditName('')
                      setWebhookEditUrl('')
                      setWebhookEditSecret('')
                      setWebhookEditEvents([])
                      setWebhookEditActive(true)
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-uk-blue text-white hover:bg-[#002880] transition-colors"
                  >
                    <Plus className="size-3.5" />
                    New Webhook
                  </button>
                </div>

                {webhooksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-gray-400" />
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                    <Globe className="size-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No webhooks configured yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Create one to receive course map events at your endpoint.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="border-2 border-gray-200 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className={`size-2.5 rounded-full shrink-0 ${wh.active !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{wh.url}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {wh.events.length > 0 ? wh.events.map((evt) => (
                                <span key={evt} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
                                  {evt}
                                </span>
                              )) : (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">All events</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => fetchWebhookDeliveries(wh.id)}
                              className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              title="View delivery log"
                            >
                              <Clock className="size-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                setTestingWebhookId(wh.id)
                                setWebhookTestResult(null)
                                try {
                                  const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email || '' },
                                    body: JSON.stringify({ action: 'test', webhookId: wh.id }),
                                  })
                                  const data = await res.json()
                                  setWebhookTestResult(data)
                                } catch {
                                  setWebhookTestResult({ ok: false, error: 'Network error' })
                                }
                                setTestingWebhookId(null)
                              }}
                              disabled={testingWebhookId === wh.id}
                              className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              {testingWebhookId === wh.id ? <Loader2 className="size-3 animate-spin" /> : 'Test'}
                            </button>
                            <button
                              onClick={() => handleDeleteWebhook(wh.id)}
                              className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete webhook"
                            >
                              <Trash2 className="size-3.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                        {/* Inline test result */}
                        {webhookTestResult && testingWebhookId === null && webhookDeliveriesForId !== wh.id && (
                          <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                            webhookTestResult.ok
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {webhookTestResult.ok
                              ? `Test successful (HTTP ${webhookTestResult.status})`
                              : `Test failed: ${webhookTestResult.error || 'Unknown error'}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create/Edit webhook form */}
              {webhookEditId && (
                <div className="border-2 border-uk-blue/20 rounded-xl p-4 bg-blue-50/30">
                  <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                    {webhookEditId === 'new' ? 'Create Webhook' : 'Edit Webhook'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Endpoint URL</label>
                      <input
                        type="url"
                        value={webhookEditUrl}
                        onChange={(e) => setWebhookEditUrl(e.target.value)}
                        placeholder="https://example.com/webhook"
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Secret (for HMAC signing)</label>
                      <input
                        type="password"
                        value={webhookEditSecret}
                        onChange={(e) => setWebhookEditSecret(e.target.value)}
                        placeholder="my-webhook-secret"
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uk-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Event Types</label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEBHOOK_EVENT_OPTIONS.map((evt) => (
                          <button
                            key={evt}
                            onClick={() => setWebhookEditEvents((prev) =>
                              prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
                            )}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              webhookEditEvents.includes(evt)
                                ? 'bg-uk-blue text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {evt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Active</label>
                      <button
                        onClick={() => setWebhookEditActive((v) => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          webhookEditActive ? 'bg-uk-blue' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                          webhookEditActive ? 'translate-x-4' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={async () => {
                          if (!webhookEditUrl.trim() || !webhookEditSecret.trim()) return
                          setAddingWebhook(true)
                          try {
                            const res = await fetch(`/api/courses/${courseId}/course-map/webhooks`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email || '' },
                              body: JSON.stringify({ url: webhookEditUrl.trim(), secret: webhookEditSecret.trim(), events: webhookEditEvents }),
                            })
                            if (res.ok) {
                              setWebhookEditId(null)
                              fetchWebhooks()
                            }
                          } catch { /* silently fail */ }
                          setAddingWebhook(false)
                        }}
                        disabled={addingWebhook || !webhookEditUrl.trim() || !webhookEditSecret.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-uk-blue text-white hover:bg-[#002880] transition-colors disabled:opacity-50"
                      >
                        {addingWebhook ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Save
                      </button>
                      <button
                        onClick={() => setWebhookEditId(null)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery log viewer */}
              {webhookDeliveriesForId && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-gray-500" />
                      <h3 className="text-sm font-extrabold text-gray-900">Delivery Log</h3>
                    </div>
                    <button
                      onClick={() => { setWebhookDeliveriesForId(null); setWebhookDeliveries([]); setWebhookExpandedDelivery(null) }}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  {webhookDeliveriesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-gray-400" />
                    </div>
                  ) : webhookDeliveries.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-500">No deliveries recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {webhookDeliveries.map((d) => (
                        <div key={d.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setWebhookExpandedDelivery(webhookExpandedDelivery === d.id ? null : d.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={`size-2 rounded-full shrink-0 ${
                              d.status && d.status >= 200 && d.status < 300 ? 'bg-green-500'
                                : d.status && d.status >= 300 && d.status < 500 ? 'bg-amber-500'
                                  : 'bg-red-500'
                            }`} />
                            <span className="text-xs font-medium text-gray-900 min-w-0 flex-1 truncate">{d.event}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {d.status ? `HTTP ${d.status}` : 'Failed'}
                            </span>
                            {d.responseTimeMs != null && (
                              <span className="text-[10px] text-gray-400 shrink-0">{d.responseTimeMs}ms</span>
                            )}
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                            </span>
                          </button>
                          {webhookExpandedDelivery === d.id && (
                            <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 space-y-2">
                              {d.error && (
                                <div className="text-xs text-red-600 font-medium">Error: {d.error}</div>
                              )}
                              <div>
                                <p className="text-[10px] font-semibold text-gray-500 mb-1">Request Body</p>
                                <pre className="text-[10px] text-gray-700 bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto max-h-32">
                                  {JSON.stringify(d.requestBody, null, 2)}
                                </pre>
                              </div>
                              {d.responseBody && (
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Response Body</p>
                                  <pre className="text-[10px] text-gray-700 bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto max-h-32">
                                    {d.responseBody}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-gray-400 leading-relaxed">
                Webhooks POST JSON events to your endpoint with an <code className="font-mono">X-Signature-256</code> HMAC-SHA256 header for verification. Up to 3 retries on 5xx errors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collab toast notifications (Task 91 basic + Task 92 ChangeNotificationToast) */}
      {remoteEditNotifications.length > 0 ? (
        <ChangeNotificationToast
          notifications={remoteEditNotifications}
          onNavigateToNode={(nodeId) => {
            setSelectedNodeId(nodeId)
            // Scroll node into view
            const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`)
            if (nodeEl) nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
          onDismiss={(index) => {
            setRemoteEditNotifications((prev) => prev.filter((_, i) => i !== index))
          }}
        />
      ) : (
        <div role="status" aria-live="polite" aria-label={t('courseMap.a11y.toastRegion')} className="fixed bottom-6 right-6 z-50 space-y-2 print:hidden">
          {collabToasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-2.5 text-sm text-gray-700 flex items-center gap-2 motion-safe:animate-[slideIn_0.3s_ease-out]"
            >
              <Users className="size-4 text-uk-blue shrink-0" />
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Conflict resolution dialog (Task 92) */}
      {collabConflict && (
        <ConflictResolutionDialog
          conflict={collabConflict}
          onResolve={(strategy, mergedValues) => {
            if (collabEngineRef.current) {
              collabEngineRef.current.resolveConflict(
                collabConflict.localOp,
                collabConflict.remoteOp,
                strategy,
              )
            }
            // Apply merged values — refetch data to get latest state
            fetchData()
            setCollabConflict(null)
          }}
          onDismiss={() => setCollabConflict(null)}
        />
      )}

      {/* ── Print Layout ─────────────────────────────────────────────────── */}
      {graphMap && (
        <div className="hidden print:block">
          {/* Print header */}
          <div className="border-b-2 border-uk-blue pb-3 mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900">
              {t('courseMap.print.header')}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('courseMap.print.stats', { nodeCount: graphMap.nodes.length, edgeCount: graphMap.edges.length, unitCount: graphMap.units.length })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t('courseMap.print.generatedAt', { date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() })}
            </p>
          </div>

          {/* Print node list grouped by unit type */}
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-uk-blue mb-3">Units &amp; Nodes</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Node</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Type</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Unit</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Dates</th>
                </tr>
              </thead>
              <tbody>
                {graphMap.nodes.filter((n) => !n.archived).map((node) => {
                  const unit = node.courseUnitId ? unitMap.get(node.courseUnitId) : null
                  return (
                    <tr key={node.id} className="even:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-1">{node.label}</td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">{node.nodeType}</td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">
                        {unit ? `${unit.label} (${unit.unitType})` : '—'}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-500 text-xs">
                        {unit?.startDate ? new Date(unit.startDate).toLocaleDateString() : '—'}
                        {unit?.endDate ? ` – ${new Date(unit.endDate).toLocaleDateString()}` : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Print edge list */}
          <div className="mb-6 break-before-auto">
            <h2 className="text-lg font-extrabold text-uk-blue mb-3">Connections</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">From</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold w-8"></th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">To</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {graphMap.edges.map((edge) => {
                  const fromNode = nodeMap.get(edge.fromNodeId)
                  const toNode = nodeMap.get(edge.toNodeId)
                  return (
                    <tr key={edge.id} className="even:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-1">{fromNode?.label || edge.fromNodeId}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-gray-400">&rarr;</td>
                      <td className="border border-gray-300 px-2 py-1">{toNode?.label || edge.toNodeId}</td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">{edge.edgeType}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Print legend */}
          <div className="mb-6 break-before-auto">
            <h2 className="text-lg font-extrabold text-uk-blue mb-3">Legend</h2>
            <div className="flex flex-wrap gap-6 text-xs">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Node Types</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><span className="inline-block size-3 rounded bg-blue-100 border border-blue-300" /> LECTURE</div>
                  <div className="flex items-center gap-2"><span className="inline-block size-3 rounded bg-green-100 border border-green-300" /> LAB</div>
                  <div className="flex items-center gap-2"><span className="inline-block size-3 rounded bg-red-100 border border-red-300" /> EXAM</div>
                  <div className="flex items-center gap-2"><span className="inline-block size-3 rounded bg-yellow-100 border border-yellow-300" /> QUIZ</div>
                  <div className="flex items-center gap-2"><span className="inline-block size-3 rounded bg-indigo-100 border border-indigo-300" /> ASSIGNMENT</div>
                  <div className="flex items-center gap-2"><span className="inline-block size-3 rounded bg-purple-100 border border-purple-300" /> DISCUSSION</div>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Edge Types</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><span className="inline-block w-6 h-0.5 bg-red-600" /> PREREQUISITE</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-6 h-0.5 bg-blue-600" /> SEQUENCE</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-6 h-0.5 bg-purple-600" /> CONCURRENT</div>
                </div>
              </div>
            </div>
          </div>

          {/* Print footer */}
          <div className="border-t border-gray-300 pt-3 mt-8 text-center text-xs text-gray-400">
            {t('courseMap.print.footer')}
          </div>
        </div>
      )}

      {/* Accessibility & print styles — injected as a regular style element */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        @media (forced-colors: active) {
          #course-map-graph [role="button"] {
            border: 2px solid ButtonText !important;
          }
          #course-map-graph svg path {
            stroke: LinkText !important;
          }
          #course-map-graph svg circle {
            stroke: ButtonText !important;
            fill: ButtonFace !important;
          }
        }
        @media print {
          @page {
            size: landscape;
            margin: 0.5in;
          }
          body.course-map-printing nav,
          body.course-map-printing header,
          body.course-map-printing [data-concierge],
          body.course-map-printing .fixed,
          body.course-map-printing [role="dialog"],
          body.course-map-printing [aria-modal="true"] {
            display: none !important;
          }
          body.course-map-printing #course-map-graph {
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          body.course-map-printing #course-map-graph button,
          body.course-map-printing #course-map-graph [role="tooltip"] {
            display: none !important;
          }
          body.course-map-printing table {
            page-break-inside: auto;
          }
          body.course-map-printing tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          body.course-map-printing thead {
            display: table-header-group;
          }
          body.course-map-printing * {
            box-shadow: none !important;
          }
          body.course-map-printing .bg-gray-50 {
            background: white !important;
          }
        }
      ` }} />

      {/* Whiteboard overlay (Task 83) */}
      {whiteboardActive && isEditorRole && currentUser && graphMap && (
        <WhiteboardOverlay
          active={whiteboardActive}
          onClose={() => setWhiteboardActive(false)}
          userEmail={currentUser.email}
          userName={currentUser.name || currentUser.email}
          courseMapId={graphMap.id}
        />
      )}

      {/* Annotation layer (Task 84) */}
      {annotationLayerActive && isEditorRole && currentUser && graphMap && (
        <AnnotationLayer
          active={annotationLayerActive}
          courseMapId={graphMap.id}
          userEmail={currentUser.email}
          userName={currentUser.name || currentUser.email}
          onAnnotationCountChange={setAnnotationNodeCounts}
        />
      )}

      {/* Real-time analytics dashboard panel (Task 81) */}
      {showRealtimeDashboard && isEditorRole && currentUser && (
        <AnalyticsDashboardPanel
          courseId={courseId}
          userEmail={currentUser.email}
          onClose={() => { setShowRealtimeDashboard(false); setDashboardHeatmapData([]) }}
          onHeatmapData={setDashboardHeatmapData}
        />
      )}

      {/* Performance profiler overlay — dev only (Task 82) */}
      <PerfOverlay
        visible={showPerfOverlay}
        onClose={() => setShowPerfOverlay(false)}
      />

      {/* AI Teaching Assistant panel (Task 85) */}
      {showTeachingAssistant && isEditorRole && currentUser && graphMap && (
        <TeachingAssistantPanel
          graphMap={graphMap}
          selectedNodeId={selectedNodeId}
          userEmail={currentUser.email}
          onClose={() => setShowTeachingAssistant(false)}
        />
      )}

      {/* Smart Suggestions panel (Task 86) */}
      {showSmartSuggestions && isEditorRole && currentUser && graphMap && (
        <SmartSuggestionsPanel
          graphMap={graphMap}
          userEmail={currentUser.email}
          onClose={() => setShowSmartSuggestions(false)}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
        />
      )}

      {/* Export Suite panel (Task 87) */}
      {showExportSuite && isEditorRole && currentUser && graphMap && (
        <ExportSuitePanel
          graphMap={graphMap}
          userEmail={currentUser.email}
          onClose={() => setShowExportSuite(false)}
        />
      )}

      {/* Reporting Dashboard panel (Task 88) */}
      {showReportingDashboard && isEditorRole && currentUser && graphMap && (
        <ReportingDashboardPanel
          graphMap={graphMap}
          userEmail={currentUser.email}
          onClose={() => setShowReportingDashboard(false)}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
        />
      )}

      {/* Branch comparison view (Task 93) */}
      {showBranchComparison && branchCompareA && branchCompareB && branchDiff && (
        <BranchComparisonView
          branchA={branchCompareA}
          branchB={branchCompareB}
          diff={branchDiff}
          loading={branchDiffLoading}
          onClose={() => { setShowBranchComparison(false); setBranchDiff(null) }}
          onMerge={(srcId, tgtId) => { setShowBranchComparison(false); handleOpenMergeDialog(srcId, tgtId) }}
        />
      )}

      {/* Merge branch dialog (Task 94) */}
      {showMergeBranchDialog && (
        <MergeBranchDialog
          branches={branches}
          initialSourceId={mergeBranchSourceId}
          initialTargetId={mergeBranchTargetId}
          onClose={() => setShowMergeBranchDialog(false)}
          onGetPreview={handleMergeBranchPreview}
          onMerge={handleMergeBranchExecute}
          onCherryPick={handleCherryPick}
          onGetHistory={handleGetMergeHistory}
          onRollback={handleRollbackMerge}
        />
      )}

      {/* AI Map Assistant Panel (Task 97) */}
      {showAIAssistant && isEditorRole && graphMap && (
        <AIAssistantPanel
          nodes={graphMap.nodes}
          edges={graphMap.edges}
          units={graphMap.units.map((u) => ({ id: u.id, label: u.label, position: u.position }))}
          selectedNodeId={selectedNodeId}
          onClose={() => setShowAIAssistant(false)}
          onApplyActions={handleAIAssistantActions}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
        />
      )}

      {/* Smart Automation Panel (Task 98) */}
      {showSmartAutomation && isEditorRole && graphMap && (
        <SmartAutomationPanel
          nodes={graphMap.nodes}
          edges={graphMap.edges}
          units={graphMap.units.map((u) => ({ id: u.id, label: u.label, position: u.position, startDate: u.startDate || null, endDate: u.endDate || null }))}
          onClose={() => setShowSmartAutomation(false)}
          onApplyFix={handleSmartAutomationFix}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
        />
      )}

      {/* Plugin Marketplace (Task 95/96) */}
      {showPluginMarketplace && isEditorRole && (
        <PluginMarketplace
          installedPlugins={pluginEntries}
          availablePlugins={getAvailablePlugins(pluginEntries.map((p) => p.manifest.id)).length > 0
            ? getAvailablePlugins(pluginEntries.map((p) => p.manifest.id))
            : []}
          onInstall={handlePluginInstall}
          onUninstall={handlePluginUninstall}
          onSelectPlugin={(manifest) => setSelectedPluginManifest(manifest)}
          onClose={() => setShowPluginMarketplace(false)}
        />
      )}

      {/* Plugin Detail Card (Task 96) */}
      {selectedPluginManifest && (
        <PluginDetailCard
          manifest={selectedPluginManifest}
          pluginEntry={pluginEntries.find((p) => p.manifest.id === selectedPluginManifest.id)}
          onInstall={handlePluginInstall}
          onUninstall={handlePluginUninstall}
          onEnable={handlePluginEnable}
          onDisable={handlePluginDisable}
          onUpdateConfig={handlePluginUpdateConfig}
          onClose={() => setSelectedPluginManifest(null)}
        />
      )}

      {/* Plugin Settings Panel (Task 96) */}
      {showPluginSettings && isEditorRole && (
        <PluginSettingsPanel
          plugins={pluginEntries}
          onEnable={handlePluginEnable}
          onDisable={handlePluginDisable}
          onUpdateConfig={handlePluginUpdateConfig}
          onClearData={handlePluginClearData}
          onClose={() => setShowPluginSettings(false)}
        />
      )}

      {/* Sharing & Collaboration Panel (Task 100) */}
      {showSharingPanel && isEditorRole && currentUser && graphMap && (
        <SharingPanel
          graphMap={graphMap}
          userEmail={currentUser.email}
          canvasRef={canvasRef}
          onClose={() => setShowSharingPanel(false)}
          onImport={(data) => {
            // Merge imported nodes/edges into the current map
            setGraphMap((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                nodes: [...prev.nodes, ...data.nodes.map((n) => ({
                  ...n,
                  courseMapId: prev.id,
                }))],
                edges: [...prev.edges, ...data.edges.map((e) => ({
                  ...e,
                  courseMapId: prev.id,
                  edgeType: e.edgeType as MapEdge['edgeType'],
                }))],
              }
            })
          }}
        />
      )}

      {/* Task 103: Search & Filter Panel */}
      {showSearchFilter && graphMap && (
        <SearchFilterPanel
          nodes={graphMap.nodes.map((n) => {
            const unit = n.courseUnitId ? graphMap.units.find((u) => u.id === n.courseUnitId) : null
            return { ...n, unitType: unit?.unitType, startDate: unit?.startDate, endDate: unit?.endDate }
          })}
          edges={graphMap.edges}
          progressMap={isStudent ? nodeProgressMap : undefined}
          isStudent={isStudent}
          onSelectNode={(nodeId) => {
            setSelectedNodeId(nodeId)
            const node = graphMap?.nodes.find((n) => n.id === nodeId)
            if (node) scrollToNode(node)
          }}
          onFiltersChange={(nodeIds, edgeIds) => { setFilteredNodeIds(nodeIds); setFilteredEdgeIds(edgeIds) }}
          onSearchHighlight={setSearchHighlightNodeIds}
          onClose={() => setShowSearchFilter(false)}
        />
      )}

      {/* Service worker update prompt (Task 80) */}
      <ServiceWorkerUpdatePrompt />
    </div>
  )
}
