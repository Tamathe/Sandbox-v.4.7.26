'use client'

import { useState, useEffect } from 'react'
import { useAdminHome } from './useAdminHome'
import AdminKPIStrip from './AdminKPIStrip'
import AdminBriefingLayout from './AdminBriefingLayout'
import ActionPriorityQueue from './ActionPriorityQueue'
import PlatformPulseCards from './PlatformPulseCards'
import ComplianceRadar from './ComplianceRadar'
import AdminQuickLinks from './AdminQuickLinks'
import EmailBrief from '../briefing/EmailBrief'
import CalendarBrief from '../briefing/CalendarBrief'
import TaskBrief from '../briefing/TaskBrief'
import { useBriefing } from '../../hooks/useBriefing'

// ─── Easter egg: Sandy idle comment on admin dashboard ──────────────
function AdminIdleSecret() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(idleTimer)
      setShow(false)
      idleTimer = setTimeout(() => setShow(true), 60000) // 60s idle
    }
    reset()
    window.addEventListener('mousemove', reset, { passive: true })
    window.addEventListener('keydown', reset, { passive: true })
    return () => {
      clearTimeout(idleTimer)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [])
  if (!show) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 ee-fade-in">
      <div className="bg-white border border-blue-100 rounded-xl px-4 py-2 shadow-md text-sm text-gray-500 max-w-xs">
        I&apos;m watching the metrics so you don&apos;t have to. ☕
        <span className="block text-[10px] text-gray-300 mt-0.5">— Sandy</span>
      </div>
    </div>
  )
}

export default function AdminHomePage() {
  const {
    greeting,
    dateLabel,
    narrative,
    kpi,
    actions,
    deadlines,
    usageTrend,
    topTools,
    quickLinks,
  } = useAdminHome()
  const { briefing, loading: briefingLoading } = useBriefing()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ═══ Header ═══ */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">{greeting}</h1>
        <p className="text-sm text-gray-500 mt-1">{dateLabel}</p>
        <p className="text-sm text-gray-400 mt-2">{narrative}</p>
      </div>

      {/* ═══ KPI Strip ═══ */}
      <AdminKPIStrip kpi={kpi} />

      {/* ═══ Email / Calendar / Tasks ═══ */}
      {briefingLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><div className="h-48 animate-pulse rounded-2xl bg-gray-100" /></div>
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>
      ) : briefing ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EmailBrief emails={briefing.emails} />
          </div>
          <div className="space-y-4">
            <CalendarBrief events={briefing.calendar} />
            <TaskBrief tasks={briefing.tasks} />
          </div>
        </div>
      ) : null}

      {/* ═══ Main 2-column layout ═══ */}
      <AdminBriefingLayout
        left={
          <ActionPriorityQueue actions={actions} />
        }
        right={
          <>
            <PlatformPulseCards usageTrend={usageTrend} topTools={topTools} />
            <ComplianceRadar deadlines={deadlines} />
            <AdminQuickLinks links={quickLinks} />
          </>
        }
      />

      {/* Easter egg: Sandy idle comment */}
      <AdminIdleSecret />
    </div>
  )
}
