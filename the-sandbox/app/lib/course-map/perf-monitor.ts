/**
 * Course Map Performance Monitor (Client-side)
 *
 * Lightweight collector for render times, API latencies, and Core Web Vitals.
 * Stores metrics in-memory and provides aggregation (p50/p95/p99).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PerfEntry {
  name: string
  duration: number
  timestamp: number
}

export interface PerfBucket {
  entries: PerfEntry[]
  p50: number
  p95: number
  p99: number
  avg: number
  count: number
}

export interface PerformanceReport {
  renders: Record<string, PerfBucket>
  api: Record<string, PerfBucket & { errorRate: number }>
  webVitals: {
    lcp: number | null
    fid: number | null
    cls: number | null
  }
  budgetViolations: BudgetViolation[]
}

export interface BudgetViolation {
  metric: string
  threshold: number
  actual: number
  severity: 'warning' | 'critical'
}

export interface PerformanceBudgets {
  maxRenderMs?: number
  maxApiMs?: number
  maxLcpMs?: number
  maxCls?: number
}

// ── Storage ──────────────────────────────────────────────────────────────────

const renderMetrics = new Map<string, PerfEntry[]>()
const apiMetrics = new Map<string, (PerfEntry & { status: number })[]>()
const webVitals: { lcp: number | null; fid: number | null; cls: number | null } = {
  lcp: null,
  fid: null,
  cls: null,
}

const MAX_ENTRIES_PER_KEY = 200

// ── Percentile helper ────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function buildBucket(entries: PerfEntry[]): PerfBucket {
  const durations = entries.map((e) => e.duration).sort((a, b) => a - b)
  const sum = durations.reduce((s, d) => s + d, 0)
  return {
    entries,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    avg: durations.length > 0 ? Math.round((sum / durations.length) * 100) / 100 : 0,
    count: durations.length,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a component render time.
 */
export function trackRenderTime(component: string, duration: number): void {
  const list = renderMetrics.get(component) || []
  list.push({ name: component, duration, timestamp: Date.now() })
  if (list.length > MAX_ENTRIES_PER_KEY) list.shift()
  renderMetrics.set(component, list)
}

/**
 * Record an API call's latency and status.
 */
export function trackApiLatency(endpoint: string, duration: number, status: number): void {
  const list = apiMetrics.get(endpoint) || []
  list.push({ name: endpoint, duration, timestamp: Date.now(), status })
  if (list.length > MAX_ENTRIES_PER_KEY) list.shift()
  apiMetrics.set(endpoint, list)
}

/**
 * Build a full performance report with all collected metrics.
 */
export function getPerformanceReport(): PerformanceReport {
  const renders: Record<string, PerfBucket> = {}
  for (const [key, entries] of renderMetrics) {
    renders[key] = buildBucket(entries)
  }

  const api: Record<string, PerfBucket & { errorRate: number }> = {}
  for (const [key, entries] of apiMetrics) {
    const bucket = buildBucket(entries)
    const errors = entries.filter((e) => e.status >= 400).length
    api[key] = { ...bucket, errorRate: entries.length > 0 ? Math.round((errors / entries.length) * 1000) / 10 : 0 }
  }

  return {
    renders,
    api,
    webVitals: { ...webVitals },
    budgetViolations: [],
  }
}

/**
 * Check metrics against performance budgets. Returns violations.
 */
export function checkPerformanceBudget(budgets: PerformanceBudgets): BudgetViolation[] {
  const violations: BudgetViolation[] = []

  if (budgets.maxRenderMs) {
    for (const [component, entries] of renderMetrics) {
      const bucket = buildBucket(entries)
      if (bucket.p95 > budgets.maxRenderMs) {
        violations.push({
          metric: `render:${component}`,
          threshold: budgets.maxRenderMs,
          actual: bucket.p95,
          severity: bucket.p95 > budgets.maxRenderMs * 2 ? 'critical' : 'warning',
        })
      }
    }
  }

  if (budgets.maxApiMs) {
    for (const [endpoint, entries] of apiMetrics) {
      const bucket = buildBucket(entries)
      if (bucket.p95 > budgets.maxApiMs) {
        violations.push({
          metric: `api:${endpoint}`,
          threshold: budgets.maxApiMs,
          actual: bucket.p95,
          severity: bucket.p95 > budgets.maxApiMs * 2 ? 'critical' : 'warning',
        })
      }
    }
  }

  if (budgets.maxLcpMs && webVitals.lcp !== null && webVitals.lcp > budgets.maxLcpMs) {
    violations.push({
      metric: 'webVitals:LCP',
      threshold: budgets.maxLcpMs,
      actual: webVitals.lcp,
      severity: webVitals.lcp > budgets.maxLcpMs * 1.5 ? 'critical' : 'warning',
    })
  }

  if (budgets.maxCls && webVitals.cls !== null && webVitals.cls > budgets.maxCls) {
    violations.push({
      metric: 'webVitals:CLS',
      threshold: budgets.maxCls,
      actual: webVitals.cls,
      severity: webVitals.cls > budgets.maxCls * 2 ? 'critical' : 'warning',
    })
  }

  return violations
}

/**
 * Initialize Core Web Vitals observers.
 * Call once on mount in a client component.
 */
export function initWebVitalsObserver(): (() => void) | undefined {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return undefined

  const observers: PerformanceObserver[] = []

  try {
    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      if (entries.length > 0) {
        webVitals.lcp = Math.round(entries[entries.length - 1].startTime)
      }
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    observers.push(lcpObserver)
  } catch { /* unsupported */ }

  try {
    // FID (first-input)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      if (entries.length > 0) {
        const first = entries[0] as PerformanceEventTiming
        webVitals.fid = Math.round(first.processingStart - first.startTime)
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })
    observers.push(fidObserver)
  } catch { /* unsupported */ }

  try {
    // CLS
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        if (!layoutShift.hadRecentInput && layoutShift.value) {
          clsValue += layoutShift.value
          webVitals.cls = Math.round(clsValue * 1000) / 1000
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
    observers.push(clsObserver)
  } catch { /* unsupported */ }

  return () => {
    for (const o of observers) o.disconnect()
  }
}

/**
 * Collect metrics as a JSON-serializable batch for sending to server.
 */
export function collectMetricsBatch(): {
  renders: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number }>
  api: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number; errorRate: number }>
  webVitals: { lcp: number | null; fid: number | null; cls: number | null }
} {
  const report = getPerformanceReport()
  const renders: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number }> = {}
  for (const [k, v] of Object.entries(report.renders)) {
    renders[k] = { p50: v.p50, p95: v.p95, p99: v.p99, avg: v.avg, count: v.count }
  }
  const api: Record<string, { p50: number; p95: number; p99: number; avg: number; count: number; errorRate: number }> = {}
  for (const [k, v] of Object.entries(report.api)) {
    api[k] = { p50: v.p50, p95: v.p95, p99: v.p99, avg: v.avg, count: v.count, errorRate: v.errorRate }
  }
  return { renders, api, webVitals: report.webVitals }
}
