'use client'

// ─── KPI Strip ──────────────────────────────────────────────
// Personal productivity stats bar at the top of the faculty homepage.
// Powered by /api/briefing data — no additional API call needed.

import { Mail, Calendar, CheckSquare, AlertTriangle } from 'lucide-react'
import type { BriefingStats } from './briefing-utils'

interface KPIStripProps {
  stats: BriefingStats
  urgentEmailCount?: number
}

export default function KPIStrip({ stats, urgentEmailCount }: KPIStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KPICard
        icon={<Mail className="size-5" />}
        value={stats.unreadEmails}
        label="Unread emails"
        color={stats.unreadEmails > 0 ? 'blue' : 'green'}
        badge={urgentEmailCount && urgentEmailCount > 0 ? `${urgentEmailCount} urgent` : undefined}
        badgeColor="red"
      />
      <KPICard
        icon={<Calendar className="size-5" />}
        value={stats.todayEvents}
        label="Today's events"
        color="slate"
      />
      <KPICard
        icon={<CheckSquare className="size-5" />}
        value={stats.pendingTasks}
        label="Pending tasks"
        color="slate"
      />
      <KPICard
        icon={<AlertTriangle className="size-5" />}
        value={stats.overdueTasks}
        label="Overdue"
        color={stats.overdueTasks > 0 ? 'red' : 'green'}
      />
    </div>
  )
}

function KPICard({ icon, value, label, color, badge, badgeColor }: {
  icon: React.ReactNode
  value: number
  label: string
  color: 'blue' | 'red' | 'green' | 'slate'
  badge?: string
  badgeColor?: 'red' | 'amber'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  const badgeColorMap = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorMap[color]}`}>
      {icon}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold leading-none">{value}</span>
          {badge && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColorMap[badgeColor ?? 'red']}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5 opacity-80">{label}</div>
      </div>
    </div>
  )
}
