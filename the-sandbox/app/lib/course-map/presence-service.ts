// ── Presence Service — Real-Time Cursor & Editing Indicators (Task 91) ──────

export interface PresenceUser {
  userId: string
  userName: string
  email: string
  avatarUrl: string | null
  cursorX: number | null
  cursorY: number | null
  editingNodeId: string | null
  lastSeenAt: number
  status: 'online' | 'idle'
}

export interface PresenceUpdate {
  users: PresenceUser[]
}

type PresenceCallback = (update: PresenceUpdate) => void

/**
 * PresenceManager — manages heartbeat, cursor broadcasting, and presence subscriptions.
 * Uses the existing SSE stream for receiving; POST to edits endpoint for sending.
 */
export class PresenceManager {
  private courseId: string
  private userEmail: string
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private cursorCleanupInterval: ReturnType<typeof setInterval> | null = null
  private listeners: Set<PresenceCallback> = new Set()
  private users: Map<string, PresenceUser> = new Map()
  private destroyed = false

  // Throttle cursor broadcasts
  private lastCursorBroadcast = 0
  private readonly CURSOR_THROTTLE_MS = 200
  private readonly HEARTBEAT_INTERVAL_MS = 5000
  private readonly IDLE_THRESHOLD_MS = 10000
  private readonly STALE_THRESHOLD_MS = 15000

  constructor(courseId: string, userEmail: string) {
    this.courseId = courseId
    this.userEmail = userEmail
    this.startHeartbeat()
    this.startCursorCleanup()
  }

  private startHeartbeat(): void {
    // Send an immediate heartbeat
    this.sendHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (!this.destroyed) this.sendHeartbeat()
    }, this.HEARTBEAT_INTERVAL_MS)
  }

  private startCursorCleanup(): void {
    this.cursorCleanupInterval = setInterval(() => {
      const now = Date.now()
      let changed = false
      for (const [userId, user] of this.users) {
        const age = now - user.lastSeenAt
        if (age > this.STALE_THRESHOLD_MS) {
          this.users.delete(userId)
          changed = true
        } else if (age > this.IDLE_THRESHOLD_MS && user.status !== 'idle') {
          this.users.set(userId, { ...user, status: 'idle' })
          changed = true
        }
      }
      if (changed) this.notifyListeners()
    }, 2000)
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      await fetch(`/api/courses/${this.courseId}/course-map/edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': this.userEmail,
        },
        body: JSON.stringify({ type: 'heartbeat' }),
      })
    } catch {
      // Silent — network may be unavailable
    }
  }

  /**
   * Broadcast cursor position to other editors. Throttled to max 5/s.
   */
  broadcastCursorPosition(x: number, y: number): void {
    if (this.destroyed) return
    const now = Date.now()
    if (now - this.lastCursorBroadcast < this.CURSOR_THROTTLE_MS) return
    this.lastCursorBroadcast = now

    fetch(`/api/courses/${this.courseId}/course-map/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': this.userEmail,
      },
      body: JSON.stringify({ type: 'cursor_moved', payload: { x, y } }),
    }).catch(() => {})
  }

  /**
   * Announce which node the user is currently editing (or null to clear).
   */
  broadcastEditingNode(nodeId: string | null): void {
    if (this.destroyed) return
    fetch(`/api/courses/${this.courseId}/course-map/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': this.userEmail,
      },
      body: JSON.stringify({ type: 'editing_node', payload: { nodeId } }),
    }).catch(() => {})
  }

  /**
   * Handle incoming SSE event — called from page's SSE handler.
   */
  handleEvent(event: { type: string; payload: Record<string, unknown> }): void {
    switch (event.type) {
      case 'editors_snapshot': {
        const editors = (event.payload as { editors: Array<{
          userId: string; name: string; email: string; avatarUrl: string | null
          joinedAt: string; lastSeenAt: string
        }> }).editors
        this.users.clear()
        for (const ed of editors) {
          if (ed.email === this.userEmail) continue
          this.users.set(ed.userId, {
            userId: ed.userId,
            userName: ed.name,
            email: ed.email,
            avatarUrl: ed.avatarUrl,
            cursorX: null,
            cursorY: null,
            editingNodeId: null,
            lastSeenAt: Date.now(),
            status: 'online',
          })
        }
        this.notifyListeners()
        break
      }
      case 'editor_joined': {
        const ed = event.payload as unknown as {
          userId: string; name: string; email: string; avatarUrl: string | null
        }
        if (ed.email === this.userEmail) break
        this.users.set(ed.userId, {
          userId: ed.userId,
          userName: ed.name,
          email: ed.email,
          avatarUrl: ed.avatarUrl,
          cursorX: null,
          cursorY: null,
          editingNodeId: null,
          lastSeenAt: Date.now(),
          status: 'online',
        })
        this.notifyListeners()
        break
      }
      case 'editor_left': {
        const { userId } = event.payload as { userId: string }
        this.users.delete(userId)
        this.notifyListeners()
        break
      }
      case 'cursor_moved': {
        const { userId, userName, x, y } = event.payload as {
          userId: string; userName: string; x: number; y: number
        }
        const existing = this.users.get(userId)
        if (existing) {
          this.users.set(userId, {
            ...existing,
            cursorX: x,
            cursorY: y,
            lastSeenAt: Date.now(),
            status: 'online',
          })
        } else {
          this.users.set(userId, {
            userId,
            userName,
            email: '',
            avatarUrl: null,
            cursorX: x,
            cursorY: y,
            editingNodeId: null,
            lastSeenAt: Date.now(),
            status: 'online',
          })
        }
        this.notifyListeners()
        break
      }
      case 'editing_node': {
        const { userId, userName, nodeId } = event.payload as {
          userId: string; userName: string; nodeId: string | null
        }
        const existing = this.users.get(userId)
        if (existing) {
          this.users.set(userId, {
            ...existing,
            editingNodeId: nodeId,
            lastSeenAt: Date.now(),
            status: 'online',
          })
        } else if (nodeId) {
          this.users.set(userId, {
            userId,
            userName,
            email: '',
            avatarUrl: null,
            cursorX: null,
            cursorY: null,
            editingNodeId: nodeId,
            lastSeenAt: Date.now(),
            status: 'online',
          })
        }
        this.notifyListeners()
        break
      }
    }
  }

  /**
   * Get all active remote users with their presence data.
   */
  getActivePresence(): PresenceUser[] {
    return Array.from(this.users.values())
  }

  /**
   * Subscribe to presence changes.
   */
  onPresenceUpdate(callback: PresenceCallback): () => void {
    this.listeners.add(callback)
    return () => { this.listeners.delete(callback) }
  }

  private notifyListeners(): void {
    const update: PresenceUpdate = { users: this.getActivePresence() }
    for (const cb of this.listeners) {
      try { cb(update) } catch { /* ignore listener errors */ }
    }
  }

  /**
   * Cleanup heartbeat and listeners.
   */
  destroy(): void {
    this.destroyed = true
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    if (this.cursorCleanupInterval) clearInterval(this.cursorCleanupInterval)
    this.listeners.clear()
    this.users.clear()
  }
}
