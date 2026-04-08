// ─── Course Map Shared Types ─────────────────────────────────
// Types used across multiple files in the course-map directory.
// Import via: import type { ... } from './types'

// ─── Branch Service ─────────────────────────────────────────

export interface BranchInfo {
  id: string
  name: string
  description: string | null
  creatorEmail: string
  creatorName: string
  createdAt: string
  updatedAt: string
  nodeCount: number
  edgeCount: number
  isDefault: boolean
  parentBranchId: string | null
}

export interface BranchSnapshot {
  nodes: BranchNodeData[]
  edges: BranchEdgeData[]
}

export interface BranchNodeData {
  id: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

export interface BranchEdgeData {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

export interface BranchDiffResult {
  addedNodes: BranchNodeData[]
  removedNodes: BranchNodeData[]
  modifiedNodes: { node: BranchNodeData; oldLabel: string; newLabel: string; oldX: number; oldY: number; newX: number; newY: number }[]
  addedEdges: BranchEdgeData[]
  removedEdges: BranchEdgeData[]
  stats: { added: number; removed: number; modified: number; addedEdges: number; removedEdges: number }
}

// ─── Merge Engine ───────────────────────────────────────────

export interface MergeConflictItem {
  nodeId: string
  nodeLabel: string
  field: string
  sourceValue: string | number
  targetValue: string | number
  resolution?: 'source' | 'target' | 'manual'
  manualValue?: string | number
}

export interface MergePreview {
  diff: BranchDiffResult
  conflicts: MergeConflictItem[]
  canAutoMerge: boolean
  sourceBranchName: string
  targetBranchName: string
}

export interface MergeHistoryEntry {
  id: string
  sourceBranchId: string
  sourceBranchName: string
  targetBranchId: string
  targetBranchName: string
  mergedByEmail: string
  mergedByName: string
  mergedAt: string
  conflictsResolved: number
  nodesAdded: number
  nodesRemoved: number
  nodesModified: number
  canRollback: boolean
}

export interface MergeExecutionResult {
  success: boolean
  mergeId: string
  nodesAdded: number
  nodesRemoved: number
  nodesModified: number
  conflictsResolved: number
}

export interface CherryPickItem {
  type: 'node-add' | 'node-remove' | 'node-modify' | 'edge-add' | 'edge-remove'
  id: string
  label: string
  selected: boolean
}

// ─── Collab Engine ──────────────────────────────────────────

export interface EditLock {
  nodeId: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  token: string
  acquiredAt: number
  /** Is this lock owned by the current user? */
  isMine: boolean
}

export interface EditOperation {
  type: 'node_update' | 'node_move' | 'edge_create' | 'edge_delete'
  nodeId?: string
  edgeId?: string
  payload: Record<string, unknown>
  timestamp: number
}

export interface ConflictData {
  localOp: EditOperation
  remoteOp: EditOperation
  nodeId: string
  nodeLabel: string
  localValues: Record<string, unknown>
  remoteValues: Record<string, unknown>
}

export type ConflictStrategy = 'keep_mine' | 'keep_theirs' | 'merge_both'

export interface RemoteEditNotification {
  userId: string
  userName: string
  type: 'moved' | 'renamed' | 'updated' | 'created_edge' | 'deleted_edge'
  nodeId?: string
  nodeLabel?: string
  description: string
  timestamp: number
}

// ─── Plugin Registry ────────────────────────────────────────

export type PluginPermission = 'read-map' | 'write-map' | 'read-nodes' | 'write-nodes' | 'api-access'

export interface PluginConfigField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select'
  default: string | number | boolean
  options?: { label: string; value: string }[]
  description?: string
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  author: string
  description: string
  category: 'Node Types' | 'Calculators' | 'Trackers' | 'Visualizations' | 'Integrations'
  icon: string
  entryPoint: string
  permissions: PluginPermission[]
  configSchema: PluginConfigField[]
}

export interface PluginLifecycleHooks {
  onLoad?: () => void | Promise<void>
  onUnload?: () => void | Promise<void>
  onEnable?: () => void | Promise<void>
  onDisable?: () => void | Promise<void>
  onMapChange?: (mapData: { nodes: unknown[]; edges: unknown[] }) => void | Promise<void>
}

export interface PluginEntry {
  manifest: PluginManifest
  hooks: PluginLifecycleHooks
  status: 'installed' | 'enabled' | 'disabled' | 'error'
  config: Record<string, string | number | boolean>
  error?: string
  installedAt: string
}
