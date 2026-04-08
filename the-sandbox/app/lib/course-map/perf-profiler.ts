/**
 * Performance Profiler for Course Map
 *
 * Extends perf-monitor.ts with render profiling, bottleneck detection,
 * render budget analysis, Web Vitals snapshots, and report generation.
 */

import {
  getPerformanceReport,
  checkPerformanceBudget,
  type PerformanceReport,
  type BudgetViolation,
} from './perf-monitor'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RenderProfile {
  component: string
  renderTimeMs: number
  timestamp: number
}

export interface Bottleneck {
  name: string
  type: 'render' | 'api' | 'layout' | 'long-task'
  avgMs: number
  p95Ms: number
  count: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface RenderBudgetStatus {
  budgetMs: number
  lastFrameMs: number
  avgFrameMs: number
  percentUsed: number
  overBudget: boolean
  recentFrames: number[]
}

export interface WebVitalsSnapshot {
  lcp: number | null
  fid: number | null
  cls: number | null
  ttfb: number | null
  inp: number | null
}

export interface ProfileReport {
  timestamp: string
  webVitals: WebVitalsSnapshot
  renderBudget: RenderBudgetStatus
  bottlenecks: Bottleneck[]
  perfReport: PerformanceReport
  budgetViolations: BudgetViolation[]
  fps: number
  recommendations: string[]
}

// ── Profiler Class ───────────────────────────────────────────────────────────

export class PerformanceProfiler {
  private renderProfiles: RenderProfile[] = []
  private frameTimes: number[] = []
  private lastFrameTime = 0
  private rafId: number | null = null
  private running = false
  private ttfb: number | null = null
  private inp: number | null = null
  private longTasks: { startTime: number; duration: number }[] = []
  private observers: PerformanceObserver[] = []

  private static readonly MAX_PROFILES = 500
  private static readonly MAX_FRAMES = 120
  private static readonly FRAME_BUDGET_MS = 16.67 // 60fps

  start(): void {
    if (this.running) return
    this.running = true
    this.measureFrames()
    this.initObservers()
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    for (const obs of this.observers) {
      try { obs.disconnect() } catch { /* ok */ }
    }
    this.observers = []
  }

  // ── Public API ─────────────────────────────────────────────────────────

  captureRenderProfile(component: string, durationMs: number): void {
    this.renderProfiles.push({ component, renderTimeMs: durationMs, timestamp: Date.now() })
    if (this.renderProfiles.length > PerformanceProfiler.MAX_PROFILES) {
      this.renderProfiles = this.renderProfiles.slice(-PerformanceProfiler.MAX_PROFILES)
    }
  }

  detectBottlenecks(): Bottleneck[] {
    const report = getPerformanceReport()
    const bottlenecks: Bottleneck[] = []

    // Analyze render bottlenecks
    for (const [name, bucket] of Object.entries(report.renders)) {
      if (bucket.p95 > 16) {
        bottlenecks.push({
          name,
          type: 'render',
          avgMs: bucket.avg,
          p95Ms: bucket.p95,
          count: bucket.count,
          severity: bucket.p95 > 100 ? 'critical' : bucket.p95 > 50 ? 'high' : bucket.p95 > 32 ? 'medium' : 'low',
        })
      }
    }

    // Analyze API bottlenecks
    for (const [name, bucket] of Object.entries(report.api)) {
      if (bucket.p95 > 1000) {
        bottlenecks.push({
          name,
          type: 'api',
          avgMs: bucket.avg,
          p95Ms: bucket.p95,
          count: bucket.count,
          severity: bucket.p95 > 5000 ? 'critical' : bucket.p95 > 3000 ? 'high' : bucket.p95 > 2000 ? 'medium' : 'low',
        })
      }
    }

    // Analyze long tasks
    if (this.longTasks.length > 0) {
      const avgLT = this.longTasks.reduce((s, t) => s + t.duration, 0) / this.longTasks.length
      const sorted = this.longTasks.map((t) => t.duration).sort((a, b) => a - b)
      const p95idx = Math.ceil(0.95 * sorted.length) - 1
      bottlenecks.push({
        name: 'Long Tasks',
        type: 'long-task',
        avgMs: Math.round(avgLT),
        p95Ms: sorted[Math.max(0, p95idx)],
        count: this.longTasks.length,
        severity: avgLT > 200 ? 'critical' : avgLT > 100 ? 'high' : 'medium',
      })
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return bottlenecks
  }

  getRenderBudgetStatus(): RenderBudgetStatus {
    const budget = PerformanceProfiler.FRAME_BUDGET_MS
    const recent = this.frameTimes.slice(-60)
    const avg = recent.length > 0 ? recent.reduce((s, f) => s + f, 0) / recent.length : 0
    const last = recent.length > 0 ? recent[recent.length - 1] : 0

    return {
      budgetMs: budget,
      lastFrameMs: Math.round(last * 100) / 100,
      avgFrameMs: Math.round(avg * 100) / 100,
      percentUsed: Math.round((avg / budget) * 100),
      overBudget: avg > budget,
      recentFrames: recent.slice(-30).map((f) => Math.round(f * 100) / 100),
    }
  }

  getWebVitalsSnapshot(): WebVitalsSnapshot {
    const report = getPerformanceReport()
    return {
      lcp: report.webVitals.lcp,
      fid: report.webVitals.fid,
      cls: report.webVitals.cls,
      ttfb: this.ttfb,
      inp: this.inp,
    }
  }

  getFps(): number {
    const recent = this.frameTimes.slice(-60)
    if (recent.length < 2) return 0
    const avg = recent.reduce((s, f) => s + f, 0) / recent.length
    return avg > 0 ? Math.round(1000 / avg) : 0
  }

  generateProfileReport(): ProfileReport {
    const webVitals = this.getWebVitalsSnapshot()
    const renderBudget = this.getRenderBudgetStatus()
    const bottlenecks = this.detectBottlenecks()
    const perfReport = getPerformanceReport()
    const budgetViolations = checkPerformanceBudget({
      maxRenderMs: 100,
      maxApiMs: 2000,
      maxLcpMs: 2500,
      maxCls: 0.1,
    })

    const recommendations: string[] = []

    // Generate recommendations
    if (webVitals.lcp !== null && webVitals.lcp > 2500) {
      recommendations.push(`LCP is ${Math.round(webVitals.lcp)}ms (target <2500ms). Consider lazy-loading below-fold content or optimizing server response.`)
    }
    if (webVitals.cls !== null && webVitals.cls > 0.1) {
      recommendations.push(`CLS is ${webVitals.cls.toFixed(3)} (target <0.1). Set explicit dimensions on images/embeds to prevent layout shifts.`)
    }
    if (webVitals.fid !== null && webVitals.fid > 100) {
      recommendations.push(`FID is ${Math.round(webVitals.fid)}ms (target <100ms). Break up long tasks or defer non-critical JavaScript.`)
    }
    if (renderBudget.overBudget) {
      recommendations.push(`Avg frame time ${renderBudget.avgFrameMs}ms exceeds 16.67ms budget. Consider memoizing expensive renders or virtualizing large lists.`)
    }
    if (this.longTasks.length > 5) {
      recommendations.push(`${this.longTasks.length} long tasks detected. Consider code-splitting or using web workers for heavy computation.`)
    }
    const renderBottlenecks = bottlenecks.filter((b) => b.type === 'render' && b.severity !== 'low')
    if (renderBottlenecks.length > 0) {
      recommendations.push(`${renderBottlenecks.length} slow component(s): ${renderBottlenecks.map((b) => b.name).join(', ')}. Profile with React DevTools to identify unnecessary re-renders.`)
    }
    if (recommendations.length === 0) {
      recommendations.push('All metrics within acceptable thresholds. Performance looks good!')
    }

    return {
      timestamp: new Date().toISOString(),
      webVitals,
      renderBudget,
      bottlenecks,
      perfReport,
      budgetViolations,
      fps: this.getFps(),
      recommendations,
    }
  }

  destroy(): void {
    this.stop()
    this.renderProfiles = []
    this.frameTimes = []
    this.longTasks = []
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private measureFrames(): void {
    if (!this.running) return
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime
      this.frameTimes.push(delta)
      if (this.frameTimes.length > PerformanceProfiler.MAX_FRAMES) {
        this.frameTimes.shift()
      }
    }
    this.lastFrameTime = now
    this.rafId = requestAnimationFrame(() => this.measureFrames())
  }

  private initObservers(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return

    // TTFB via navigation timing
    try {
      const nav = performance.getEntriesByType('navigation')
      if (nav.length > 0) {
        const navEntry = nav[0] as PerformanceNavigationTiming
        this.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart)
      }
    } catch { /* ok */ }

    // Long tasks
    try {
      const ltObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTasks.push({ startTime: entry.startTime, duration: entry.duration })
          if (this.longTasks.length > 100) this.longTasks.shift()
        }
      })
      ltObs.observe({ type: 'longtask', buffered: true })
      this.observers.push(ltObs)
    } catch { /* unsupported */ }

    // INP (Interaction to Next Paint)
    try {
      const inpObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const evt = entry as PerformanceEventTiming
          const duration = evt.processingEnd - evt.startTime
          if (this.inp === null || duration > this.inp) {
            this.inp = Math.round(duration)
          }
        }
      })
      inpObs.observe({ type: 'event', buffered: true })
      this.observers.push(inpObs)
    } catch { /* unsupported */ }
  }
}
