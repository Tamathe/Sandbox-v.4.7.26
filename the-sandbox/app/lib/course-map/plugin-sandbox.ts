'use client'

import type { PluginPermission } from './types'
import type { PluginAPI } from './plugin-api'

// ── Types ──────────────────────────────────────────────────────────────────

interface SandboxContext {
  pluginId: string
  permissions: PluginPermission[]
  api: PluginAPI
  active: boolean
}

// ── Permission guards ──────────────────────────────────────────────────────

const READ_PERMISSIONS: PluginPermission[] = ['read-map', 'read-nodes']
const WRITE_PERMISSIONS: PluginPermission[] = ['write-map', 'write-nodes']

function hasPermission(granted: PluginPermission[], required: PluginPermission): boolean {
  return granted.includes(required)
}

function hasAnyPermission(granted: PluginPermission[], required: PluginPermission[]): boolean {
  return required.some((p) => granted.includes(p))
}

// ── Plugin Sandbox ─────────────────────────────────────────────────────────

export class PluginSandbox {
  private sandboxes = new Map<string, SandboxContext>()

  /** Create an isolated execution context for a plugin */
  createSandbox(pluginId: string, permissions: PluginPermission[], api: PluginAPI): void {
    if (this.sandboxes.has(pluginId)) {
      this.destroySandbox(pluginId)
    }
    this.sandboxes.set(pluginId, {
      pluginId,
      permissions,
      api,
      active: true,
    })
  }

  /** Run plugin code in sandbox with permission checks */
  async executeInSandbox<T>(
    pluginId: string,
    fn: (api: SandboxedAPI) => T | Promise<T>,
  ): Promise<T> {
    const ctx = this.sandboxes.get(pluginId)
    if (!ctx) throw new Error(`No sandbox found for plugin: ${pluginId}`)
    if (!ctx.active) throw new Error(`Sandbox for plugin ${pluginId} is inactive`)

    const sandboxedApi = this.createSandboxedAPI(ctx)

    try {
      return await fn(sandboxedApi)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Plugin execution error'
      throw new Error(`Plugin ${pluginId} error: ${message}`)
    }
  }

  /** Clean up sandbox resources */
  destroySandbox(pluginId: string): void {
    const ctx = this.sandboxes.get(pluginId)
    if (ctx) {
      ctx.active = false
      this.sandboxes.delete(pluginId)
    }
  }

  /** Check if a sandbox exists and is active */
  hasSandbox(pluginId: string): boolean {
    const ctx = this.sandboxes.get(pluginId)
    return !!ctx && ctx.active
  }

  /** Destroy all sandboxes */
  destroyAll(): void {
    for (const id of this.sandboxes.keys()) {
      this.destroySandbox(id)
    }
  }

  /** Create permission-gated API for a plugin */
  private createSandboxedAPI(ctx: SandboxContext): SandboxedAPI {
    const { permissions, api } = ctx

    return {
      // Read operations — require read-map or read-nodes
      getNodes: () => {
        if (!hasAnyPermission(permissions, READ_PERMISSIONS)) {
          throw new Error('Permission denied: read-map or read-nodes required')
        }
        return api.getNodes()
      },
      getEdges: () => {
        if (!hasAnyPermission(permissions, READ_PERMISSIONS)) {
          throw new Error('Permission denied: read-map or read-nodes required')
        }
        return api.getEdges()
      },
      getSelectedNode: () => {
        if (!hasAnyPermission(permissions, READ_PERMISSIONS)) {
          throw new Error('Permission denied: read-map or read-nodes required')
        }
        return api.getSelectedNode()
      },
      getMapMetadata: () => {
        if (!hasPermission(permissions, 'read-map')) {
          throw new Error('Permission denied: read-map required')
        }
        return api.getMapMetadata()
      },

      // Write operations — require write-map or write-nodes
      addNode: (data) => {
        if (!hasAnyPermission(permissions, WRITE_PERMISSIONS)) {
          throw new Error('Permission denied: write-map or write-nodes required')
        }
        return api.addNode(data)
      },
      updateNode: (id, data) => {
        if (!hasPermission(permissions, 'write-nodes')) {
          throw new Error('Permission denied: write-nodes required')
        }
        return api.updateNode(id, data)
      },
      removeNode: (id) => {
        if (!hasPermission(permissions, 'write-nodes')) {
          throw new Error('Permission denied: write-nodes required')
        }
        return api.removeNode(id)
      },
      addEdge: (data) => {
        if (!hasAnyPermission(permissions, WRITE_PERMISSIONS)) {
          throw new Error('Permission denied: write-map or write-nodes required')
        }
        return api.addEdge(data)
      },
      removeEdge: (id) => {
        if (!hasAnyPermission(permissions, WRITE_PERMISSIONS)) {
          throw new Error('Permission denied: write-map or write-nodes required')
        }
        return api.removeEdge(id)
      },

      // UI operations — always available
      showNotification: (message, type) => api.showNotification(message, type),
      openPanel: (config) => api.openPanel(config),
      closePanel: () => api.closePanel(),
      addToolbarButton: (config) => api.addToolbarButton(config),

      // Event subscriptions — always available
      on: (event, callback) => api.on(event, callback),
      off: (event, callback) => api.off(event, callback),
    }
  }
}

// ── Sandboxed API type (permission-gated subset) ───────────────────────────

export interface SandboxedAPI {
  getNodes: () => PluginNodeData[]
  getEdges: () => PluginEdgeData[]
  getSelectedNode: () => PluginNodeData | null
  getMapMetadata: () => PluginMapMetadata
  addNode: (data: Partial<PluginNodeData>) => void
  updateNode: (id: string, data: Partial<PluginNodeData>) => void
  removeNode: (id: string) => void
  addEdge: (data: { fromNodeId: string; toNodeId: string; edgeType?: string }) => void
  removeEdge: (id: string) => void
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  openPanel: (config: { title: string; content: string; width?: number }) => void
  closePanel: () => void
  addToolbarButton: (config: { id: string; label: string; icon?: string; onClick: () => void }) => void
  on: (event: PluginEvent, callback: PluginEventCallback) => void
  off: (event: PluginEvent, callback: PluginEventCallback) => void
}

export interface PluginNodeData {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
  archived: boolean
}

export interface PluginEdgeData {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

export interface PluginMapMetadata {
  id: string
  courseId: string
  nodeCount: number
  edgeCount: number
}

export type PluginEvent = 'node-selected' | 'node-added' | 'edge-added' | 'map-loaded'
export type PluginEventCallback = (data: unknown) => void
