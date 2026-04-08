'use client'

import { Users, AlertTriangle, Activity, ShieldCheck } from 'lucide-react'
import type { AdminKPI } from './useAdminHome'

type Status = 'green' | 'amber' | 'red'

// ─── Color maps ────────────────────────────────────────────

const ICON_BG: Record<Status, string> = {
  green: 'bg-emerald-50',
  amber: 'bg-amber-50',
  red: 'bg-red-50',
}

const ICON_COLOR: Record<Status, string> = {
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
}

// Active users always UK blue
const UK_BLUE_BG = 'bg-blue-50'
const UK_BLUE_ICON = 'text-[#0033A0]'

// ─── Status derivation ─────────────────────────────────────

function getPendingStatus(value: number): Status {
  return value > 0 ? 'amber' : 'green'
}

function getHealthStatus(value: number): Status {
  if (value >= 95) return 'green'
  if (value >= 85) return 'amber'
  return 'red'
}

// ─── Trend arrow ────────────────────────────────────────────

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <span className="text-emerald-500 text-xs font-medium ml-1">▲</span>
  if (trend === 'down') return <span className="text-red-500 text-xs font-medium ml-1">▼</span>
  return <span className="text-gray-400 text-xs font-medium ml-1">—</span>
}

// ─── Component ──────────────────────────────────────────────

interface AdminKPIStripProps {
  kpi: AdminKPI
}

export default function AdminKPIStrip({ kpi }: AdminKPIStripProps) {
  const pendingStatus = getPendingStatus(kpi.pendingActions.value)
  const healthStatus = getHealthStatus(kpi.platformHealth.value)
  const complianceStatus = kpi.complianceStatus.urgency

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Users */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`${UK_BLUE_BG} rounded-full size-8 flex items-center justify-center`}>
            <Users className={`size-4 ${UK_BLUE_ICON}`} />
          </div>
          <span className="text-xs text-gray-500">Active Users</span>
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-extrabold text-gray-900">{kpi.activeUsersToday.value}</span>
          <TrendArrow trend={kpi.activeUsersToday.trend} />
        </div>
      </div>

      {/* Pending Actions */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`${ICON_BG[pendingStatus]} rounded-full size-8 flex items-center justify-center`}>
            <AlertTriangle className={`size-4 ${ICON_COLOR[pendingStatus]}`} />
          </div>
          <span className="text-xs text-gray-500">Pending Actions</span>
        </div>
        <div className="text-2xl font-extrabold text-gray-900">{kpi.pendingActions.value}</div>
        <div className="text-xs text-gray-400">
          {kpi.pendingActions.breakdown.approvals} approvals · {kpi.pendingActions.breakdown.flags} flags · {kpi.pendingActions.breakdown.compliance} compliance
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`${ICON_BG[healthStatus]} rounded-full size-8 flex items-center justify-center`}>
            <Activity className={`size-4 ${ICON_COLOR[healthStatus]}`} />
          </div>
          <span className="text-xs text-gray-500">Platform Health</span>
        </div>
        <div className="text-2xl font-extrabold text-gray-900">{kpi.platformHealth.value}%</div>
        <div className="text-xs text-gray-400">{kpi.platformHealth.label}</div>
      </div>

      {/* Compliance */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`${ICON_BG[complianceStatus]} rounded-full size-8 flex items-center justify-center`}>
            <ShieldCheck className={`size-4 ${ICON_COLOR[complianceStatus]}`} />
          </div>
          <span className="text-xs text-gray-500">Compliance</span>
        </div>
        <div className="text-2xl font-extrabold text-gray-900">{kpi.complianceStatus.daysUntil} days</div>
        <div className="text-xs text-gray-400">{kpi.complianceStatus.label}</div>
      </div>
    </div>
  )
}
