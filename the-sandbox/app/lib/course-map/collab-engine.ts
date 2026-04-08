// ── Collaborative Editing Engine — Conflict Resolution & Edit Locks (Task 92) ──

export type { EditLock, EditOperation, ConflictData, ConflictStrategy, RemoteEditNotification } from './types'
import type { EditLock, EditOperation, ConflictData, ConflictStrategy, RemoteEditNotification } from './types'

type ConflictCallback = (conflict: ConflictData) => void
type RemoteEditCallback = (edit: RemoteEditNotification) => void

/**
 * CollabEngine manages edit operations with optimistic local apply,
 * edit locks, and conflict resolution.
 */
export class CollabEngine {
  private courseId: string
  private userEmail: string
  private userId: string
  private userName: string
  private locks: Map<string, EditLock> = new Map()
  private pendingOps: Map<string, EditOperation> = new Map()
  private conflictListeners: Set<ConflictCallback> = new Set()
  private remoteEditListeners: Set<RemoteEditCallback> = new Set()
  private destroyed = false

  constructor(
    courseId: string,
    userEmail: string,
    userId: string,
    userName: string,
  ) {
    this.courseId = courseId
    this.userEmail = userEmail
    this.userId = userId
    this.userName = userName
  }

  /**
   * Request exclusive lock on a node. Returns lock token on success, null on conflict.
   */
  async acquireEditLock(nodeId: string): Promise<EditLock | null> {
    // Check if already locked by someone else
    const existing = this.locks.get(nodeId)
    if (existing && !existing.isMine) return null
    if (existing && existing.isMine) return existing

    try {
      const res = await fetch(`/api/courses/${this.courseId}/course-map/edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': this.userEmail,
        },
        body: JSON.stringify({
          type: 'acquire_lock',
          payload: { nodeId },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const lock: EditLock = {
          nodeId,
          ownerId: this.userId,
          ownerName: this.userName,
          ownerEmail: this.userEmail,
          token: data.token || `lock-${Date.now()}`,
          acquiredAt: Date.now(),
          isMine: true,
        }
        this.locks.set(nodeId, lock)
        return lock
      }

      // Conflict — someone else has the lock
      if (res.status === 409) {
        const data = await res.json()
        const lock: EditLock = {
          nodeId,
          ownerId: data.ownerId || 'unknown',
          ownerName: data.ownerName || 'Another user',
          ownerEmail: data.ownerEmail || '',
          token: '',
          acquiredAt: data.acquiredAt || Date.now(),
          isMine: false,
        }
        this.locks.set(nodeId, lock)
        return null
      }

      // Optimistic fallback — allow editing (no lock infrastructure on server)
      const lock: EditLock = {
        nodeId,
        ownerId: this.userId,
        ownerName: this.userName,
        ownerEmail: this.userEmail,
        token: `optimistic-${Date.now()}`,
        acquiredAt: Date.now(),
        isMine: true,
      }
      this.locks.set(nodeId, lock)
      return lock
    } catch {
      // Network error — grant optimistic lock
      const lock: EditLock = {
        nodeId,
        ownerId: this.userId,
        ownerName: this.userName,
        ownerEmail: this.userEmail,
        token: `optimistic-${Date.now()}`,
        acquiredAt: Date.now(),
        isMine: true,
      }
      this.locks.set(nodeId, lock)
      return lock
    }
  }

  /**
   * Release an edit lock.
   */
  async releaseEditLock(nodeId: string, token: string): Promise<void> {
    this.locks.delete(nodeId)
    this.pendingOps.delete(nodeId)

    try {
      await fetch(`/api/courses/${this.courseId}/course-map/edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': this.userEmail,
        },
        body: JSON.stringify({
          type: 'release_lock',
          payload: { nodeId, token },
        }),
      })
    } catch {
      // Silent — lock will expire server-side
    }
  }

  /**
   * Submit an edit operation with optimistic local apply.
   * Returns true if submitted successfully.
   */
  async submitEdit(operation: EditOperation): Promise<boolean> {
    if (this.destroyed) return false

    // Track pending operation for conflict detection
    const key = operation.nodeId || operation.edgeId || 'unknown'
    this.pendingOps.set(key, operation)

    try {
      const res = await fetch(`/api/courses/${this.courseId}/course-map/edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': this.userEmail,
        },
        body: JSON.stringify({
          type: operation.type,
          payload: operation.payload,
        }),
      })

      this.pendingOps.delete(key)
      return res.ok
    } catch {
      this.pendingOps.delete(key)
      return false
    }
  }

  /**
   * Resolve a conflict between local and remote edits.
   */
  resolveConflict(
    localOp: EditOperation,
    remoteOp: EditOperation,
    strategy: ConflictStrategy,
  ): Record<string, unknown> {
    switch (strategy) {
      case 'keep_mine':
        return localOp.payload
      case 'keep_theirs':
        return remoteOp.payload
      case 'merge_both':
        return { ...remoteOp.payload, ...localOp.payload }
    }
  }

  /**
   * Handle incoming SSE event for remote edit tracking.
   */
  handleEvent(event: { type: string; payload: Record<string, unknown> }): void {
    const userId = event.payload.userId as string
    const userName = event.payload.userName as string

    // Skip own events
    if (userId === this.userId) return

    switch (event.type) {
      case 'node_moved': {
        const { nodeId } = event.payload as { nodeId: string }
        const nodeLabel = (event.payload.nodeLabel as string) || ''

        // Check for conflict with pending local operation
        const pending = this.pendingOps.get(nodeId)
        if (pending) {
          this.notifyConflict({
            localOp: pending,
            remoteOp: {
              type: 'node_move',
              nodeId,
              payload: event.payload,
              timestamp: Date.now(),
            },
            nodeId,
            nodeLabel,
            localValues: pending.payload,
            remoteValues: event.payload,
          })
        }

        this.notifyRemoteEdit({
          userId,
          userName,
          type: 'moved',
          nodeId,
          nodeLabel,
          description: `${userName} moved ${nodeLabel || 'a node'}`,
          timestamp: Date.now(),
        })
        break
      }
      case 'node_updated': {
        const { nodeId, label } = event.payload as { nodeId: string; label?: string }

        const pending = this.pendingOps.get(nodeId)
        if (pending) {
          this.notifyConflict({
            localOp: pending,
            remoteOp: {
              type: 'node_update',
              nodeId,
              payload: event.payload,
              timestamp: Date.now(),
            },
            nodeId,
            nodeLabel: label || '',
            localValues: pending.payload,
            remoteValues: event.payload,
          })
        }

        this.notifyRemoteEdit({
          userId,
          userName,
          type: label ? 'renamed' : 'updated',
          nodeId,
          nodeLabel: label,
          description: label
            ? `${userName} renamed a node to "${label}"`
            : `${userName} updated a node`,
          timestamp: Date.now(),
        })
        break
      }
      case 'edge_created': {
        this.notifyRemoteEdit({
          userId,
          userName,
          type: 'created_edge',
          description: `${userName} created an edge`,
          timestamp: Date.now(),
        })
        break
      }
      case 'edge_deleted': {
        this.notifyRemoteEdit({
          userId,
          userName,
          type: 'deleted_edge',
          description: `${userName} deleted an edge`,
          timestamp: Date.now(),
        })
        break
      }
      case 'lock_acquired': {
        const { nodeId, ownerName, ownerId } = event.payload as {
          nodeId: string; ownerName: string; ownerId: string
        }
        this.locks.set(nodeId, {
          nodeId,
          ownerId,
          ownerName,
          ownerEmail: '',
          token: '',
          acquiredAt: Date.now(),
          isMine: false,
        })
        break
      }
      case 'lock_released': {
        const { nodeId: releasedNodeId } = event.payload as { nodeId: string }
        const lock = this.locks.get(releasedNodeId)
        if (lock && !lock.isMine) {
          this.locks.delete(releasedNodeId)
        }
        break
      }
    }
  }

  /**
   * Get all currently locked nodes with owner info.
   */
  getEditLocks(): EditLock[] {
    return Array.from(this.locks.values())
  }

  /**
   * Check if a specific node is locked by another user.
   */
  isLockedByOther(nodeId: string): EditLock | null {
    const lock = this.locks.get(nodeId)
    if (lock && !lock.isMine) return lock
    return null
  }

  /**
   * Subscribe to conflict events.
   */
  onConflict(callback: ConflictCallback): () => void {
    this.conflictListeners.add(callback)
    return () => { this.conflictListeners.delete(callback) }
  }

  /**
   * Subscribe to remote edit notifications.
   */
  onRemoteEdit(callback: RemoteEditCallback): () => void {
    this.remoteEditListeners.add(callback)
    return () => { this.remoteEditListeners.delete(callback) }
  }

  private notifyConflict(conflict: ConflictData): void {
    for (const cb of this.conflictListeners) {
      try { cb(conflict) } catch { /* ignore */ }
    }
  }

  private notifyRemoteEdit(edit: RemoteEditNotification): void {
    for (const cb of this.remoteEditListeners) {
      try { cb(edit) } catch { /* ignore */ }
    }
  }

  /**
   * Cleanup.
   */
  destroy(): void {
    this.destroyed = true
    this.conflictListeners.clear()
    this.remoteEditListeners.clear()
    this.locks.clear()
    this.pendingOps.clear()
  }
}
