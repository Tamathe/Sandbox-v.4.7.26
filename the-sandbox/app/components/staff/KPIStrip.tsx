'use client'

type Status = 'green' | 'amber' | 'red'

interface KPIStripProps {
  actions: { total: number; p0: number; p1: number }
  meetings: { total: number; remaining: number }
  budget: { onTrack: boolean; flaggedVariances: number; remainingFormatted: string }
  alerts: { total: number; critical: number }
}

// ─── Pure status functions ────────────────────────────────────

function getActionStatus(p0: number, p1: number, total: number): Status {
  if (p0 > 0) return 'red'
  if (p1 > 0 || total > 5) return 'amber'
  return 'green'
}

function getMeetingStatus(total: number): Status {
  if (total >= 5) return 'red'
  if (total >= 3) return 'amber'
  return 'green'
}

function getBudgetStatus(onTrack: boolean, flaggedVariances: number): Status {
  if (!onTrack) return 'red'
  if (flaggedVariances > 0) return 'amber'
  return 'green'
}

function getAlertStatus(critical: number, total: number): Status {
  if (critical > 0) return 'red'
  if (total > 0) return 'amber'
  return 'green'
}

// ─── Style maps ───────────────────────────────────────────────

const BORDER_COLOR: Record<Status, string> = {
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
}

const BG_TINT: Record<Status, string> = {
  green: 'bg-emerald-50/50',
  amber: 'bg-amber-50/50',
  red: 'bg-red-50/50',
}

const TEXT_COLOR: Record<Status, string> = {
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
}

// ─── Scroll helper ────────────────────────────────────────────

function scrollToCard(target: string) {
  document.querySelector(`[data-card="${target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─── Tile component ───────────────────────────────────────────

function Tile({
  label,
  value,
  statusLabel,
  status,
  scrollTarget,
}: {
  label: string
  value: string | number
  statusLabel: string
  status: Status
  scrollTarget: string
}) {
  return (
    <button
      type="button"
      data-scroll-target={scrollTarget}
      onClick={() => scrollToCard(scrollTarget)}
      className={`border border-gray-200 border-l-4 ${BORDER_COLOR[status]} ${BG_TINT[status]} rounded-xl p-3 text-left cursor-pointer hover:shadow-md transition-shadow`}
    >
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="text-xl font-extrabold text-gray-900">{value}</div>
      <div className={`text-xs font-medium mt-0.5 ${TEXT_COLOR[status]}`}>{statusLabel}</div>
    </button>
  )
}

// ─── KPIStrip ─────────────────────────────────────────────────

export default function KPIStrip({ actions, meetings, budget, alerts }: KPIStripProps) {
  const actionStatus = getActionStatus(actions.p0, actions.p1, actions.total)
  const meetingStatus = getMeetingStatus(meetings.total)
  const budgetStatus = getBudgetStatus(budget.onTrack, budget.flaggedVariances)
  const alertStatus = getAlertStatus(alerts.critical, alerts.total)

  // Status labels
  const actionLabel = actionStatus === 'red'
    ? `${actions.p0} critical — act now`
    : actionStatus === 'amber'
      ? `${actions.total} pending`
      : 'All clear'

  const meetingLabel = meetingStatus === 'red'
    ? `Heavy day — ${meetings.total} meetings`
    : `${meetings.total} today`

  const budgetLabel = budgetStatus === 'red'
    ? 'Over pace'
    : budgetStatus === 'amber'
      ? `${budget.flaggedVariances} variance${budget.flaggedVariances !== 1 ? 's' : ''} flagged`
      : 'On track'

  const alertLabel = alertStatus === 'red'
    ? `${alerts.critical} critical`
    : alertStatus === 'amber'
      ? `${alerts.total} active`
      : 'No alerts'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Tile
        label="Action Items"
        value={actions.total}
        statusLabel={actionLabel}
        status={actionStatus}
        scrollTarget="action-queue"
      />
      <Tile
        label="Today's Meetings"
        value={meetings.total}
        statusLabel={meetingLabel}
        status={meetingStatus}
        scrollTarget="next-up"
      />
      <Tile
        label="Budget Remaining"
        value={budget.remainingFormatted}
        statusLabel={budgetLabel}
        status={budgetStatus}
        scrollTarget="budget-pulse"
      />
      <Tile
        label="Active Alerts"
        value={alerts.total}
        statusLabel={alertLabel}
        status={alertStatus}
        scrollTarget="fires"
      />
    </div>
  )
}
