// ── Shared types for course-map components ──────────────────────────────────

export interface CourseLessonItem {
  id: string
  label: string
  rawSourceText: string | null
  dueDate: string | null
  dateConfidence: number | null
}

export interface CourseModule {
  id: string
  label: string
  description: string | null
  lessons: CourseLessonItem[]
}

export interface CourseUnit {
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

export interface MapNode {
  id: string
  courseMapId: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

export interface MapEdge {
  id: string
  courseMapId: string
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
}

export interface GraphMap {
  id: string
  courseId: string
  units: CourseUnit[]
  nodes: MapNode[]
  edges: MapEdge[]
}

export interface ValidationError {
  rule: string
  message: string
  severity: 'error' | 'warning'
  nodeLabel?: string
}

export interface ValidationReport {
  status: 'PASS' | 'WARN' | 'BLOCK'
  errors: ValidationError[]
  warnings: ValidationError[]
  canAutoPublish: boolean
}

// ── Gap analysis types ──────────────────────────────────────────────────────

export interface GapFinding {
  nodeId: string
  issue: string
  suggestion: string
  severity: 'error' | 'warning'
}

export interface EdgeSuggestion {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
  reason: string
}

// ── AI study recommendation types ──────────────────────────────────────────

export interface StudyRecommendation {
  nodeId: string
  nodeLabel: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
}

// ── Prerequisite validation types ──────────────────────────────────────────

export interface PrereqValidation {
  nodeId: string
  nodeLabel: string
  prerequisiteNodeId: string
  prerequisiteLabel: string
  status: 'ok' | 'gap' | 'partial'
  suggestion: string
}

// ── Progress types ──────────────────────────────────────────────────────────

export type NodeProgressStatus = 'completed' | 'in-progress' | 'not-started'

export interface LessonProgressEntry {
  lessonId: string
  completed: boolean
}

export interface NodeProgress {
  nodeId: string
  courseUnitId: string
  status: NodeProgressStatus
  totalLessons: number
  completedLessons: number
  lessons: LessonProgressEntry[]
}

// ── Learning path types ──────────────────────────────────────────────────────

export interface LearningPathEntry {
  nodeId: string
  position: number
  status: 'completed' | 'in-progress' | 'not-started'
  dueDate: string | null
  label: string
}

// ── Collab types ────────────────────────────────────────────────────────────

export interface ActiveEditor {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  joinedAt: string
  lastSeenAt: string
}

export interface RemoteCursor {
  userId: string
  userName: string
  x: number
  y: number
  lastUpdated: number
}

export interface RemoteEditingNode {
  userId: string
  userName: string
  nodeId: string
}

export interface ConflictInfo {
  editorName: string
  label?: string
  unitType?: string
}

export interface SnapshotSummary {
  id: string
  name: string | null
  createdById: string | null
  createdAt: string
  nodeCount: number
  edgeCount: number
}

export interface CollabToast {
  id: string
  message: string
  timestamp: number
}

export interface SnapshotNodeData {
  id: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

export interface SnapshotEdgeData {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

export interface DiffResult {
  addedNodes: SnapshotNodeData[]
  removedNodes: SnapshotNodeData[]
  movedNodes: { node: SnapshotNodeData; fromX: number; fromY: number; toX: number; toY: number }[]
  modifiedNodes: { node: SnapshotNodeData; oldLabel: string; newLabel: string }[]
  unchangedNodes: SnapshotNodeData[]
  addedEdges: SnapshotEdgeData[]
  removedEdges: SnapshotEdgeData[]
  unchangedEdges: SnapshotEdgeData[]
}

export interface MergeConflict {
  nodeId: string
  field: string
  baseValue: string | number
  sourceValue: string | number
  targetValue: string | number
}

export interface MergeResult {
  mergedNodes: SnapshotNodeData[]
  mergedEdges: SnapshotEdgeData[]
  conflicts: MergeConflict[]
}

// ── Activity entry type ──────────────────────────────────────────────────────

export interface ActivityEntry {
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

export interface CommentEntry {
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

export interface AnnotationLayerData {
  id: string
  name: string
  color: string
  createdById: string
  metadata: Record<string, unknown> | null
  _count: { annotations: number }
}

export interface AnnotationData {
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

export interface StudyGroupSummary {
  id: string
  name: string
  nodeId: string
  nodeLabel: string | null
  memberCount: number
  createdById: string
  createdAt: string
}

export interface StudyGroupDetail {
  id: string
  name: string
  nodeId: string
  courseId: string
  members: Array<{ userId: string; name: string; avatarUrl: string | null; joinedAt: string }>
  createdById: string
  createdAt: string
}

export interface GroupMessage {
  id: string
  userId: string
  userName: string
  avatarUrl: string | null
  content: string
  createdAt: string
}

export interface GroupProgress {
  nodeId: string
  totalMembers: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  completionRate: number
}

// ── Milestone types ─────────────────────────────────────────────────────────

export interface MilestoneData {
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

export interface MilestoneSummary {
  total: number
  achieved: number
  milestones: MilestoneData[]
  newlyAchieved?: Array<{ milestoneId: string; label: string; nodeLabel: string | null }>
}

// ── Snapshot comparison types ───────────────────────────────────────────────

export interface SnapshotComparisonResult {
  added: { nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] }
  removed: { nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] }
  modified: {
    nodes: Array<{ id: string; field: string; oldValue: string | number | boolean; newValue: string | number | boolean; node: SnapshotNodeData }>
    edges: Array<{ id: string; field: string; oldValue: string; newValue: string; edge: SnapshotEdgeData }>
  }
  summary: string
}

// ── Notification types ──────────────────────────────────────────────────────

export type NotifType = 'edit' | 'comment' | 'milestone_achieved' | 'health_change' | 'snapshot' | 'collaboration'

export interface NotifEntry {
  id: string; courseId: string; userId: string; userName: string; type: NotifType
  title: string; description: string; nodeId: string | null; readBy: string[]; createdAt: string
}

// ── Webhook types ───────────────────────────────────────────────────────────

export interface WebhookEntry { id: string; url: string; secret: string; events: string[]; active: boolean }

export interface WebhookDelivery {
  id: string; webhookId: string; event: string; status: number | null
  responseTimeMs: number | null; requestBody: unknown; responseBody: string | null
  error: string | null; createdAt: string
}

// ── Study plan types ────────────────────────────────────────────────────────

export interface StudyPlanEntry { id: string; nodeId: string; targetDate: string; completedAt: string | null; status: 'planned' | 'overdue' | 'completed' }

// ── Heatmap types ───────────────────────────────────────────────────────────

export interface HeatmapEntry { nodeId: string; completionRate: number; totalStudents: number; completedCount?: number; inProgressCount?: number; notStartedCount?: number }

// ── Canvas mode ─────────────────────────────────────────────────────────────

export type CanvasMode = 'select' | 'connect'

// ── Constants ───────────────────────────────────────────────────────────────

export const EDITOR_COLORS = [
  '#dc2626', '#2563eb', '#9333ea', '#059669', '#d97706', '#db2777',
  '#0891b2', '#4f46e5', '#ea580c', '#65a30d',
]

export function getEditorColor(index: number): string {
  return EDITOR_COLORS[index % EDITOR_COLORS.length]
}

export const EDGE_COLORS: Record<string, string> = {
  PREREQUISITE: '#dc2626', // red
  SEQUENCE: '#2563eb',     // blue
  CONCURRENT: '#9333ea',   // purple
}

export const EDGE_LABELS: Record<string, string> = {
  PREREQUISITE: 'Prerequisite',
  SEQUENCE: 'Sequence',
  CONCURRENT: 'Concurrent',
}

export const UNIT_TYPE_COLORS: Record<string, string> = {
  LECTURE: 'bg-blue-100 text-blue-700',
  LAB: 'bg-green-100 text-green-700',
  EXAM: 'bg-red-100 text-red-700',
  QUIZ: 'bg-amber-100 text-amber-700',
  ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
  DISCUSSION: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

export const PROGRESS_BORDER: Record<NodeProgressStatus, string> = {
  'completed': 'border-green-500',
  'in-progress': 'border-amber-500',
  'not-started': 'border-gray-200',
}

export const NODE_WIDTH = 240
export const NODE_HEIGHT = 80

export const GRID_SIZE = 20

export function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}
