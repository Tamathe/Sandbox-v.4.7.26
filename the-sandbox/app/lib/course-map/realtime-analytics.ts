/**
 * Real-Time Analytics Manager for Course Map
 *
 * Manages live session counts, node heatmap data, and engagement metrics
 * with an event emitter pattern for UI updates.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiveSessionData {
  activeSessionCount: number
  activeUsers: { userId: string; name: string; email: string; lastActiveAt: string }[]
}

export interface NodeHeatmapEntry {
  nodeId: string
  label: string
  activityCount: number
  /** 0–1 intensity for color mapping */
  intensity: number
  activeUserCount: number
}

export interface EngagementMetrics {
  avgTimeOnNodeSec: number
  interactionRate: number
  completionVelocity: number
  completionVelocityTrend: { date: string; velocity: number }[]
  totalInteractions: number
  uniqueVisitors7d: number
}

export interface RealtimeAnalyticsSnapshot {
  sessions: LiveSessionData
  heatmap: NodeHeatmapEntry[]
  engagement: EngagementMetrics
  updatedAt: string
}

type AnalyticsEventType = 'update' | 'error' | 'connected' | 'disconnected'
type AnalyticsListener = (data: RealtimeAnalyticsSnapshot) => void
type ErrorListener = (error: Error) => void

// ── Manager Class ────────────────────────────────────────────────────────────

export class RealtimeAnalyticsManager {
  private courseId: string
  private userEmail: string
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private listeners = new Map<AnalyticsEventType, Set<AnalyticsListener | ErrorListener>>()
  private snapshot: RealtimeAnalyticsSnapshot | null = null
  private pollMs: number
  private active = false

  constructor(courseId: string, userEmail: string, pollMs = 10_000) {
    this.courseId = courseId
    this.userEmail = userEmail
    this.pollMs = pollMs
  }

  // ── Event Emitter ──────────────────────────────────────────────────────

  on(event: 'update', listener: AnalyticsListener): void
  on(event: 'error', listener: ErrorListener): void
  on(event: 'connected' | 'disconnected', listener: () => void): void
  on(event: AnalyticsEventType, listener: AnalyticsListener | ErrorListener | (() => void)): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener as AnalyticsListener | ErrorListener)
  }

  off(event: AnalyticsEventType, listener: AnalyticsListener | ErrorListener | (() => void)): void {
    this.listeners.get(event)?.delete(listener as AnalyticsListener | ErrorListener)
  }

  private emit(event: 'update', data: RealtimeAnalyticsSnapshot): void
  private emit(event: 'error', data: Error): void
  private emit(event: 'connected' | 'disconnected'): void
  private emit(event: AnalyticsEventType, data?: RealtimeAnalyticsSnapshot | Error): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      try {
        if (event === 'update') (listener as AnalyticsListener)(data as RealtimeAnalyticsSnapshot)
        else if (event === 'error') (listener as ErrorListener)(data as Error)
        else (listener as () => void)()
      } catch { /* listener error — swallow */ }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  start(): void {
    if (this.active) return
    this.active = true
    this.emit('connected')
    this.poll()
    this.pollInterval = setInterval(() => this.poll(), this.pollMs)
  }

  stop(): void {
    this.active = false
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.emit('disconnected')
  }

  getSnapshot(): RealtimeAnalyticsSnapshot | null {
    return this.snapshot
  }

  async getActiveSessionCount(): Promise<number> {
    const snap = this.snapshot ?? await this.fetchSnapshot()
    return snap?.sessions.activeSessionCount ?? 0
  }

  async getNodeHeatmapData(): Promise<NodeHeatmapEntry[]> {
    const snap = this.snapshot ?? await this.fetchSnapshot()
    return snap?.heatmap ?? []
  }

  async getEngagementMetrics(): Promise<EngagementMetrics | null> {
    const snap = this.snapshot ?? await this.fetchSnapshot()
    return snap?.engagement ?? null
  }

  /** Build heatmap color from intensity (0=cool blue, 1=hot red) */
  static intensityToColor(intensity: number): string {
    const clamped = Math.max(0, Math.min(1, intensity))
    if (clamped < 0.25) {
      // Blue → Cyan
      const t = clamped / 0.25
      const r = 0
      const g = Math.round(100 * t)
      const b = Math.round(180 + 75 * (1 - t))
      return `rgba(${r}, ${g}, ${b}, 0.35)`
    } else if (clamped < 0.5) {
      // Cyan → Yellow
      const t = (clamped - 0.25) / 0.25
      const r = Math.round(220 * t)
      const g = Math.round(100 + 120 * t)
      const b = Math.round(255 * (1 - t))
      return `rgba(${r}, ${g}, ${b}, 0.4)`
    } else if (clamped < 0.75) {
      // Yellow → Orange
      const t = (clamped - 0.5) / 0.25
      const r = Math.round(220 + 35 * t)
      const g = Math.round(220 - 100 * t)
      const b = 0
      return `rgba(${r}, ${g}, ${b}, 0.45)`
    } else {
      // Orange → Red
      const t = (clamped - 0.75) / 0.25
      const r = 255
      const g = Math.round(120 * (1 - t))
      const b = 0
      return `rgba(${r}, ${g}, ${b}, 0.5)`
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    try {
      const snap = await this.fetchSnapshot()
      if (snap) {
        this.snapshot = snap
        this.emit('update', snap)
      }
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
  }

  private async fetchSnapshot(): Promise<RealtimeAnalyticsSnapshot | null> {
    try {
      const res = await fetch(
        `/api/courses/${this.courseId}/course-map/analytics/realtime?range=24h`,
        { headers: { 'x-demo-user-email': this.userEmail } },
      )
      if (!res.ok) return null
      const data = await res.json()

      // Map server response to our snapshot shape
      const sessions: LiveSessionData = {
        activeSessionCount: data.activeUserCount ?? 0,
        activeUsers: (data.activeUsers ?? []).map((u: { userId: string; name: string; lastActiveAt: string }) => ({
          userId: u.userId,
          name: u.name,
          email: '',
          lastActiveAt: u.lastActiveAt,
        })),
      }

      const heatmap: NodeHeatmapEntry[] = (data.heatmap ?? []).map((h: { nodeId: string; label: string; editCount: number; intensity: number }) => ({
        nodeId: h.nodeId,
        label: h.label,
        activityCount: h.editCount,
        intensity: h.intensity,
        activeUserCount: 0,
      }))

      const engagement: EngagementMetrics = {
        avgTimeOnNodeSec: (data.engagement?.avgSessionDurationMin ?? 0) * 60,
        interactionRate: data.engagement?.editsPerSession ?? 0,
        completionVelocity: data.engagement?.totalSessions ?? 0,
        completionVelocityTrend: (data.timeSeries ?? []).map((ts: { timestamp: string; edits: number }) => ({
          date: ts.timestamp,
          velocity: ts.edits,
        })),
        totalInteractions: data.liveEditCount ?? 0,
        uniqueVisitors7d: data.engagement?.uniqueEditors7d ?? 0,
      }

      return {
        sessions,
        heatmap,
        engagement,
        updatedAt: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  destroy(): void {
    this.stop()
    this.listeners.clear()
    this.snapshot = null
  }
}
