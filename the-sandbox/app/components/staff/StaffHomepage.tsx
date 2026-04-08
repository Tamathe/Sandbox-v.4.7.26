'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../lib/auth-context'
import { Bot, RefreshCw, Briefcase, Info } from 'lucide-react'
import StaffBriefingLayout from './StaffBriefingLayout'
import QuickActionsBar from './QuickActionsBar'
import ActionQueueCard from './ActionQueueCard'
import KPIStrip from './KPIStrip'
import BriefingInsightsCard from './BriefingInsightsCard'
import BudgetPulseCard from './BudgetPulseCard'
import SandyRecommendationsCard from './SandyRecommendationsCard'
import FiresCard from './FiresCard'
import EmailBrief from '../briefing/EmailBrief'
import CalendarBrief from '../briefing/CalendarBrief'
import TaskBrief from '../briefing/TaskBrief'
import { useBriefing } from '../../hooks/useBriefing'

interface DailyBriefing {
  greeting: string
  date: string
  schedule: { id: string; title: string; startTime: string; endTime: string; location?: string; attendees?: string[] }[]
  actionQueue: {
    total: number
    byPriority: { P0: number; P1: number; P2: number; P3: number }
    items: ActionItem[]
    oldestPending: { title: string; daysOld: number } | null
  }
  insights: BriefingInsight[]
  budgetPulse: {
    totalRemaining: number
    percentThroughYear: number
    percentBudgetSpent: number
    onTrack: boolean
    flaggedVariances: { category: string; amount: number; direction: string; percentOver: number; unitName: string }[]
    units: BudgetSnapshot[]
  }
  alerts: StaffAlert[]
  recommendations: SandyRecommendation[]
}

import type { ActionItem } from './ActionItemRow'
export type { ActionItem }

export interface BriefingInsight {
  id: string
  category: string
  title: string
  narrative: string
  delta: string | null
  sentiment: string | null
  dataPoints: Record<string, unknown> | null
  isRead: boolean
}

export interface BudgetSnapshot {
  id: string
  unitName: string
  fiscalYear: string
  totalBudget: number
  spent: number
  committed: number
  remaining: number
  burnRate: number
  categories: Record<string, { budget: number; spent: number; remaining: number }>
  variances: { category: string; amount: number; direction: string; percentOver: number }[] | null
}

export interface StaffAlert {
  id: string
  alertType: string
  severity: string
  title: string
  body: string
  actionUrl: string | null
  expiresAt: string | null
}

export interface SandyRecommendation {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  actionLabel?: string
  actionType?: string
  relatedItemIds?: string[]
}

interface BriefingDelta {
  resolvedSince: number
  newSince: number
  meetingsCompleted: number
  meetingsRemaining: number
  budgetChanged: boolean
  newAlerts: number
  greeting: string
  narrative: string
  timeMode: 'morning' | 'afternoon' | 'evening'
  kpiCounts: {
    actionTotal: number
    actionP0: number
    actionP1: number
    meetingsToday: number
    meetingsRemaining: number
    budgetOnTrack: boolean
    budgetFlaggedVariances: number
    budgetRemainingFormatted: string
    alertsTotal: number
    alertsCritical: number
  }
}

const DELTA_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

interface KPICache {
  actions: { total: number; p0: number; p1: number }
  meetings: { total: number; remaining: number }
  budget: { onTrack: boolean; flaggedVariances: number; remainingFormatted: string }
  alerts: { total: number; critical: number }
}

const STAFF_KPI_CACHE_KEY = 'staff-kpi-cache'

function readKPICache(): KPICache | null {
  try {
    const raw = sessionStorage.getItem(STAFF_KPI_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeKPICache(cache: KPICache): void {
  try {
    sessionStorage.setItem(STAFF_KPI_CACHE_KEY, JSON.stringify(cache))
  } catch { /* private browsing */ }
}

// ─── Sandy Briefing Narrative ────────────────────────────────
// Generates a 1-2 sentence context-aware summary so the staff
// member immediately knows the shape of their day.
function buildBriefingNarrative(b: DailyBriefing): string {
  const parts: string[] = []

  // Critical items
  if (b.actionQueue.byPriority.P0 > 0) {
    parts.push(`${b.actionQueue.byPriority.P0} critical item${b.actionQueue.byPriority.P0 > 1 ? 's' : ''} need${b.actionQueue.byPriority.P0 === 1 ? 's' : ''} your attention`)
  }

  // Schedule density
  if (b.schedule.length >= 5) {
    parts.push(`heavy meeting day (${b.schedule.length} scheduled)`)
  } else if (b.schedule.length > 0) {
    parts.push(`${b.schedule.length} meeting${b.schedule.length > 1 ? 's' : ''} today`)
  }

  // Budget flag
  if (!b.budgetPulse.onTrack) {
    parts.push('budget pace is ahead of plan')
  }

  // Stale items
  if (b.actionQueue.oldestPending && b.actionQueue.oldestPending.daysOld >= 3) {
    parts.push(`oldest pending item is ${b.actionQueue.oldestPending.daysOld} days old`)
  }

  // Critical alerts
  const criticalAlerts = b.alerts.filter(a => a.severity === 'critical')
  if (criticalAlerts.length > 0) {
    parts.push(`${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? 's' : ''} active`)
  }

  if (parts.length === 0) {
    return 'All clear today. No critical items or flags.'
  }

  // Capitalize first part, join with commas
  const sentence = parts[0].charAt(0).toUpperCase() + parts[0].slice(1) +
    (parts.length > 1 ? ', ' + parts.slice(1).join(', ') + '.' : '.')

  return sentence
}

// ─── Recommendation Action Router ────────────────────────────
function handleRecommendationAction(rec: SandyRecommendation) {
  switch (rec.actionType) {
    case 'batch-approve-routine':
    case 'filter-critical':
      // Scroll to action queue (it's the first card in the left column)
      document.querySelector('[data-card="action-queue"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      break
    case 'view-budget-detail':
    case 'review-budget':
      document.querySelector('[data-card="budget-pulse"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      break
    default:
      // Open Sandy with context about the recommendation
      window.dispatchEvent(
        new CustomEvent('sandy-open-with-context', {
          detail: { message: rec.text },
        }),
      )
  }
}

export default function StaffHomepage() {
  const { currentUser } = useAuth()
  const { briefing: personalBriefing, loading: personalBriefingLoading } = useBriefing()
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cachedKPI] = useState<KPICache | null>(() => readKPICache())
  const [briefingTimestamp, setBriefingTimestamp] = useState<string | null>(null)
  const [delta, setDelta] = useState<BriefingDelta | null>(null)
  const briefingTimestampRef = useRef<string | null>(null)

  const fetchBriefing = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/staff/briefing', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error('Failed to load briefing')
      const data = await res.json()
      setBriefing(data.briefing)
      const ts = new Date().toISOString()
      setBriefingTimestamp(ts)
      briefingTimestampRef.current = ts
      setDelta(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load briefing')
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    fetchBriefing()
  }, [fetchBriefing])


  const handleResolveAction = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/staff/action-items/${id}/resolve`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) void fetchBriefing()
    } catch { /* ignore */ }
  }, [currentUser.email, fetchBriefing])

  const handleDismissAlert = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/staff/alerts/${id}/dismiss`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) void fetchBriefing()
    } catch { /* ignore */ }
  }, [currentUser.email, fetchBriefing])

  // Dispatch briefing context to Sandy ambient sidebar
  useEffect(() => {
    if (!briefing) return
    window.dispatchEvent(
      new CustomEvent('sandy-briefing-context', {
        detail: {
          role: 'STAFF',
          summary: buildBriefingNarrative(briefing),
          actionCount: briefing.actionQueue.total,
          criticalCount: briefing.actionQueue.byPriority.P0,
          meetingCount: briefing.schedule.length,
          budgetOnTrack: briefing.budgetPulse.onTrack,
          alertCount: briefing.alerts.length,
        },
      }),
    )
  }, [briefing])

  // Cache KPI values to sessionStorage for instant render on next visit
  useEffect(() => {
    if (!briefing) return
    writeKPICache({
      actions: {
        total: briefing.actionQueue.total,
        p0: briefing.actionQueue.byPriority.P0,
        p1: briefing.actionQueue.byPriority.P1,
      },
      meetings: {
        total: briefing.schedule.length,
        remaining: briefing.schedule.length,
      },
      budget: {
        onTrack: briefing.budgetPulse.onTrack,
        flaggedVariances: briefing.budgetPulse.flaggedVariances.length,
        remainingFormatted: `$${Math.round(briefing.budgetPulse.totalRemaining / 1000)}K`,
      },
      alerts: {
        total: briefing.alerts.length,
        critical: briefing.alerts.filter(a => a.severity === 'critical').length,
      },
    })
  }, [briefing])

  // ─── Delta fetch ────────────────────────────────────────────
  const fetchDelta = useCallback(async () => {
    const ts = briefingTimestampRef.current
    if (!ts) return
    try {
      const res = await fetch(`/api/staff/briefing?mode=delta&since=${encodeURIComponent(ts)}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) return
      const data = await res.json()
      const d = data.delta as BriefingDelta
      setDelta(d)
      // Update sessionStorage KPI cache with delta values
      writeKPICache({
        actions: { total: d.kpiCounts.actionTotal, p0: d.kpiCounts.actionP0, p1: d.kpiCounts.actionP1 },
        meetings: { total: d.kpiCounts.meetingsToday, remaining: d.kpiCounts.meetingsRemaining },
        budget: { onTrack: d.kpiCounts.budgetOnTrack, flaggedVariances: d.kpiCounts.budgetFlaggedVariances, remainingFormatted: d.kpiCounts.budgetRemainingFormatted },
        alerts: { total: d.kpiCounts.alertsTotal, critical: d.kpiCounts.alertsCritical },
      })
    } catch { /* silently ignore — keep existing state */ }
  }, [currentUser.email])

  // 30-minute interval for delta refresh
  useEffect(() => {
    if (!briefingTimestamp) return
    const id = setInterval(fetchDelta, DELTA_INTERVAL_MS)
    return () => clearInterval(id)
  }, [briefingTimestamp, fetchDelta])

  // Tab-refocus: fetch delta if 30+ min elapsed
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const ts = briefingTimestampRef.current
      if (!ts) return
      if (Date.now() - new Date(ts).getTime() >= DELTA_INTERVAL_MS) {
        void fetchDelta()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchDelta])

  // Dispatch updated Sandy context when delta arrives
  useEffect(() => {
    if (!delta) return
    window.dispatchEvent(
      new CustomEvent('sandy-briefing-context', {
        detail: {
          role: 'STAFF',
          summary: delta.narrative,
          actionCount: delta.kpiCounts.actionTotal,
          criticalCount: delta.kpiCounts.actionP0,
          meetingCount: delta.kpiCounts.meetingsToday,
          budgetOnTrack: delta.kpiCounts.budgetOnTrack,
          alertCount: delta.kpiCounts.alertsTotal,
          timeMode: delta.timeMode,
        },
      }),
    )
  }, [delta])

  // Time-based greeting for progressive loading
  const timeGreeting = (() => {
    const hour = new Date().getHours()
    const name = currentUser.name?.split(' ')[0] ?? ''
    if (hour < 12) return `Good morning, ${name}`
    if (hour < 17) return `Good afternoon, ${name}`
    return `Good evening, ${name}`
  })()

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header — show greeting immediately */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{timeGreeting}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* KPI Strip — cached values or skeleton */}
        <div className="mb-5">
          {cachedKPI ? (
            <KPIStrip
              actions={cachedKPI.actions}
              meetings={cachedKPI.meetings}
              budget={cachedKPI.budget}
              alerts={cachedKPI.alerts}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          )}
        </div>

        {/* Content skeleton */}
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded-xl w-80" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-2xl" />
              <div className="h-48 bg-gray-200 rounded-2xl" />
            </div>
            <div className="space-y-6">
              {/* Sandy card skeleton */}
              <div className="h-48 bg-gray-200 rounded-2xl" />
              {/* NextUp card skeleton */}
              <div className="border rounded-2xl shadow-sm bg-white p-4 space-y-3">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !briefing) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="border-2 border-gray-200 rounded-2xl p-8 text-center">
          <Briefcase className="size-10 mx-auto text-gray-300 mb-3" />
          <h2 className="text-base font-extrabold text-gray-900 mb-2">Welcome to Staff Operations</h2>
          <p className="text-sm text-gray-500 mb-4">{error || 'No briefing data available. Run the staff seed to get started.'}</p>
          <button
            onClick={fetchBriefing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-medium rounded-lg hover:bg-[#002580] transition-colors"
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const morningNarrative = buildBriefingNarrative(briefing)
  const activeTimeMode = delta?.timeMode ?? 'morning'
  const displayGreeting = delta?.greeting ?? briefing.greeting

  // KPI values: prefer delta when available
  const kpiActions = delta
    ? { total: delta.kpiCounts.actionTotal, p0: delta.kpiCounts.actionP0, p1: delta.kpiCounts.actionP1 }
    : { total: briefing.actionQueue.total, p0: briefing.actionQueue.byPriority.P0, p1: briefing.actionQueue.byPriority.P1 }
  const kpiMeetings = delta
    ? { total: delta.kpiCounts.meetingsToday, remaining: delta.kpiCounts.meetingsRemaining }
    : { total: briefing.schedule.length, remaining: briefing.schedule.length }
  const kpiBudget = delta
    ? { onTrack: delta.kpiCounts.budgetOnTrack, flaggedVariances: delta.kpiCounts.budgetFlaggedVariances, remainingFormatted: delta.kpiCounts.budgetRemainingFormatted }
    : { onTrack: briefing.budgetPulse.onTrack, flaggedVariances: briefing.budgetPulse.flaggedVariances.length, remainingFormatted: `$${Math.round(briefing.budgetPulse.totalRemaining / 1000)}K` }
  const kpiAlerts = delta
    ? { total: delta.kpiCounts.alertsTotal, critical: delta.kpiCounts.alertsCritical }
    : { total: briefing.alerts.length, critical: briefing.alerts.filter(a => a.severity === 'critical').length }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Simulated data banner */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <Info className="size-4 shrink-0" />
        <span><strong>Simulated data</strong> — Staff briefing, action items, and budget figures shown are demo data from the seed script.</span>
      </div>

      {/* ═══ Header — Greeting + Sandy Briefing Narrative ═══ */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{displayGreeting}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{briefing.date}</p>
          {/* Sandy's briefing narrative — time-mode aware */}
          <div className="flex items-start gap-2 mt-2 bg-blue-50/60 border border-blue-100 rounded-xl px-3.5 py-2.5 max-w-xl">
            <Bot className="size-4 text-[#0033A0] mt-0.5 shrink-0" />
            <div>
              {activeTimeMode === 'afternoon' && delta ? (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed">{delta.narrative}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{morningNarrative}</p>
                </>
              ) : activeTimeMode === 'evening' && delta ? (
                <p className="text-sm text-gray-700 leading-relaxed">{delta.narrative}</p>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">{morningNarrative}</p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={fetchBriefing}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 mt-1"
          title="Refresh briefing"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* ═══ KPI Strip ═══ */}
      <div className="mb-5">
        <KPIStrip
          actions={kpiActions}
          meetings={kpiMeetings}
          budget={kpiBudget}
          alerts={kpiAlerts}
        />
      </div>

      {/* ═══ Quick Actions — Staff Tool Launcher ═══ */}
      <div className="mb-6">
        <QuickActionsBar />
      </div>

      {/* ═══ Main 2-column layout ═══ */}
      <StaffBriefingLayout
        left={
          <>
            <div data-card="action-queue">
              <ActionQueueCard />
            </div>
            <BriefingInsightsCard
              insights={briefing.insights}
              userEmail={currentUser.email}
            />
            <div data-card="budget-pulse">
              <BudgetPulseCard
                pulse={briefing.budgetPulse}
              />
            </div>
            {personalBriefingLoading ? (
              <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
            ) : personalBriefing ? (
              <EmailBrief emails={personalBriefing.emails} />
            ) : null}
          </>
        }
        right={
          <>
            <SandyRecommendationsCard
              recommendations={briefing.recommendations}
              onAction={(rec) => handleRecommendationAction(rec)}
            />
            {personalBriefingLoading ? (
              <>
                <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
                <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
              </>
            ) : personalBriefing ? (
              <>
                <CalendarBrief events={personalBriefing.calendar} />
                <TaskBrief tasks={personalBriefing.tasks} />
              </>
            ) : null}
            <FiresCard
              p0Actions={briefing.actionQueue.items.filter(i => i.priority === 'P0')}
              criticalAlerts={briefing.alerts.filter(a => a.severity === 'critical')}
              onResolveAction={handleResolveAction}
              onDismissAlert={handleDismissAlert}
            />
          </>
        }
      />
    </div>
  )
}

