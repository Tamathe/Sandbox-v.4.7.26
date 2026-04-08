'use client'

// ─── Briefing Header ─────────────────────────────────────────
// Big greeting + date + quick stats row. The "OS boot screen" feel.

import { Mail, Calendar, CheckSquare, AlertTriangle } from 'lucide-react'

interface BriefingHeaderProps {
  greeting: string
  date: string
  stats: {
    unreadEmails: number
    todayEvents: number
    pendingTasks: number
    overdueTasks: number
  }
}

export default function BriefingHeader({ greeting, date, stats }: BriefingHeaderProps) {
  return (
    <div className="mb-8">
      {/* Greeting */}
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
        {greeting}
      </h1>
      <p className="text-lg text-gray-500 mt-1">{date}</p>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatCard
          icon={<Mail className="size-5" />}
          label="Unread emails"
          value={stats.unreadEmails}
          color={stats.unreadEmails > 0 ? 'blue' : 'green'}
        />
        <StatCard
          icon={<Calendar className="size-5" />}
          label="Today's events"
          value={stats.todayEvents}
          color="slate"
        />
        <StatCard
          icon={<CheckSquare className="size-5" />}
          label="Pending tasks"
          value={stats.pendingTasks}
          color="slate"
        />
        <StatCard
          icon={<AlertTriangle className="size-5" />}
          label="Overdue"
          value={stats.overdueTasks}
          color={stats.overdueTasks > 0 ? 'red' : 'green'}
        />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'red' | 'green' | 'slate'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorMap[color]}`}>
      {icon}
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs mt-0.5 opacity-80">{label}</div>
      </div>
    </div>
  )
}
