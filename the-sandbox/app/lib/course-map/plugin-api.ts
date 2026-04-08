'use client'

import type {
  PluginNodeData,
  PluginEdgeData,
  PluginMapMetadata,
  PluginEvent,
  PluginEventCallback,
} from './plugin-sandbox'

// ── Types ──────────────────────────────────────────────────────────────────

interface MapNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
  archived: boolean
}

interface MapEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface ToolbarButtonConfig {
  id: string
  label: string
  icon?: string
  onClick: () => void
}

interface PanelConfig {
  title: string
  content: string
  width?: number
}

export interface PluginAPICallbacks {
  getNodes: () => MapNode[]
  getEdges: () => MapEdge[]
  getSelectedNodeId: () => string | null
  getMapId: () => string
  getCourseId: () => string
  onAddNode?: (data: Partial<PluginNodeData>) => void
  onUpdateNode?: (id: string, data: Partial<PluginNodeData>) => void
  onRemoveNode?: (id: string) => void
  onAddEdge?: (data: { fromNodeId: string; toNodeId: string; edgeType?: string }) => void
  onRemoveEdge?: (id: string) => void
  onShowNotification?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  onOpenPanel?: (config: PanelConfig) => void
  onClosePanel?: () => void
  onAddToolbarButton?: (config: ToolbarButtonConfig) => void
}

// ── Plugin API ─────────────────────────────────────────────────────────────

export class PluginAPI {
  private callbacks: PluginAPICallbacks
  private eventListeners = new Map<PluginEvent, Set<PluginEventCallback>>()

  constructor(callbacks: PluginAPICallbacks) {
    this.callbacks = callbacks
  }

  // ── Read Operations ────────────────────────────────────────────────────

  getNodes(): PluginNodeData[] {
    return this.callbacks.getNodes().map((n) => ({
      id: n.id,
      label: n.label,
      nodeType: n.nodeType,
      xPos: n.xPos,
      yPos: n.yPos,
      courseUnitId: n.courseUnitId,
      archived: n.archived,
    }))
  }

  getEdges(): PluginEdgeData[] {
    return this.callbacks.getEdges().map((e) => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      edgeType: e.edgeType,
    }))
  }

  getSelectedNode(): PluginNodeData | null {
    const selectedId = this.callbacks.getSelectedNodeId()
    if (!selectedId) return null
    const node = this.callbacks.getNodes().find((n) => n.id === selectedId)
    if (!node) return null
    return {
      id: node.id,
      label: node.label,
      nodeType: node.nodeType,
      xPos: node.xPos,
      yPos: node.yPos,
      courseUnitId: node.courseUnitId,
      archived: node.archived,
    }
  }

  getMapMetadata(): PluginMapMetadata {
    return {
      id: this.callbacks.getMapId(),
      courseId: this.callbacks.getCourseId(),
      nodeCount: this.callbacks.getNodes().length,
      edgeCount: this.callbacks.getEdges().length,
    }
  }

  // ── Write Operations ───────────────────────────────────────────────────

  addNode(data: Partial<PluginNodeData>): void {
    this.callbacks.onAddNode?.(data)
  }

  updateNode(id: string, data: Partial<PluginNodeData>): void {
    this.callbacks.onUpdateNode?.(id, data)
  }

  removeNode(id: string): void {
    this.callbacks.onRemoveNode?.(id)
  }

  addEdge(data: { fromNodeId: string; toNodeId: string; edgeType?: string }): void {
    this.callbacks.onAddEdge?.(data)
  }

  removeEdge(id: string): void {
    this.callbacks.onRemoveEdge?.(id)
  }

  // ── UI Operations ──────────────────────────────────────────────────────

  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void {
    this.callbacks.onShowNotification?.(message, type)
  }

  openPanel(config: PanelConfig): void {
    this.callbacks.onOpenPanel?.(config)
  }

  closePanel(): void {
    this.callbacks.onClosePanel?.()
  }

  addToolbarButton(config: ToolbarButtonConfig): void {
    this.callbacks.onAddToolbarButton?.(config)
  }

  // ── Event Subscriptions ────────────────────────────────────────────────

  on(event: PluginEvent, callback: PluginEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: PluginEvent, callback: PluginEventCallback): void {
    this.eventListeners.get(event)?.delete(callback)
  }

  /** Emit an event to all subscribers (called by the host, not by plugins) */
  emit(event: PluginEvent, data: unknown): void {
    const listeners = this.eventListeners.get(event)
    if (!listeners) return
    for (const cb of listeners) {
      try {
        cb(data)
      } catch {
        // ignore per-listener errors
      }
    }
  }

  /** Clean up all event listeners */
  destroy(): void {
    this.eventListeners.clear()
  }
}
