'use client'

import { useState } from 'react'
import {
  Inbox,
  Users,
  CheckCircle,
  ListTodo,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Check,
  X,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

export interface UnifiedActionItem {
  id: string
  source: 'action_queue' | 'committee' | 'approval' | 'task'
  sourceId: string
  title: string
  description?: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  category: string
  dueDate?: string
  status: 'pending' | 'overdue' | 'done'
  actionUrl: string
  resolveUrl?: string
  createdAt: string
}

interface UnifiedActionListProps {
  actions: UnifiedActionItem[]
  onResolve: (source: string, sourceId: string, resolution: string) => Promise<void>
  resolving: string | null
}

// ── Priority / Source Helpers ────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-blue-100 text-blue-700',
  P3: 'bg-gray-100 text-gray-500',
}

const SOURCE_ICONS: Record<string, typeof Inbox> = {
  action_queue: Inbox,
  committee: Users,
  approval: CheckCircle,
  task: ListTodo,
}

const SOURCE_LABELS: Record<string, string> = {
  action_queue: 'Action Queue',
  committee: 'Committee',
  approval: 'Approval',
  task: 'Task',
}

function getAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Group Actions Into Sections ──────────────────────────────

interface ActionGroup {
  label: string
  accent: string
  items: UnifiedActionItem[]
  defaultOpen: boolean
}

function groupActions(actions: UnifiedActionItem[]): ActionGroup[] {
  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  weekEnd.setHours(23, 59, 59, 999)

  const overdue: UnifiedActionItem[] = []
  const dueToday: UnifiedActionItem[] = []
  const thisWeek: UnifiedActionItem[] = []
  const later: UnifiedActionItem[] = []

  for (const action of actions) {
    if (action.status === 'overdue') {
      overdue.push(action)
    } else if (action.dueDate) {
      const due = new Date(action.dueDate)
      if (due <= todayEnd) {
        dueToday.push(action)
      } else if (due <= weekEnd) {
        thisWeek.push(action)
      } else {
        later.push(action)
      }
    } else {
      later.push(action)
    }
  }

  const groups: ActionGroup[] = []
  if (overdue.length > 0) groups.push({ label: 'Overdue', accent: 'border-l-red-500', items: overdue, defaultOpen: true })
  if (dueToday.length > 0) groups.push({ label: 'Due Today', accent: 'border-l-amber-500', items: dueToday, defaultOpen: true })
  if (thisWeek.length > 0) groups.push({ label: 'This Week', accent: 'border-l-blue-500', items: thisWeek, defaultOpen: true })
  if (later.length > 0) groups.push({ label: 'Later', accent: 'border-l-gray-300', items: later, defaultOpen: true })

  return groups
}

// ── Component ────────────────────────────────────────────────

export default function UnifiedActionList({ actions, onResolve, resolving }: UnifiedActionListProps) {
  const groups = groupActions(actions)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  if (actions.length === 0) {
    return (
      <div className="border rounded-2xl shadow-sm bg-white p-8 text-center">
        <CheckCircle className="size-10 mx-auto text-emerald-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">All clear! No pending actions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.label)
        return (
          <div key={group.label} className={`border rounded-2xl shadow-sm bg-white overflow-hidden border-l-4 ${group.accent}`}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                <span className="text-sm font-extrabold text-gray-900">{group.label}</span>
                <span className="text-xs font-medium text-gray-400">({group.items.length})</span>
              </div>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {group.items.map((action) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    onResolve={onResolve}
                    isResolving={resolving === action.id}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Action Row ───────────────────────────────────────────────

function ActionRow({
  action,
  onResolve,
  isResolving,
}: {
  action: UnifiedActionItem
  onResolve: (source: string, sourceId: string, resolution: string) => Promise<void>
  isResolving: boolean
}) {
  const SourceIcon = SOURCE_ICONS[action.source] ?? ListTodo
  const isSimple = action.source === 'task' || action.source === 'action_queue'

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
      {/* Source icon */}
      <div className="shrink-0">
        <SourceIcon className="size-4 text-gray-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{action.title}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${PRIORITY_COLORS[action.priority]}`}>
            {action.priority}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded">
            {SOURCE_LABELS[action.source]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {action.category && <span className="truncate">{action.category}</span>}
          {action.dueDate && (
            <span className={`flex items-center gap-1 ${action.status === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
              <Clock className="size-3" />
              {formatDueDate(action.dueDate)}
            </span>
          )}
          <span>{getAge(action.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isSimple ? (
          <>
            {action.source === 'approval' ? (
              <>
                <button
                  onClick={() => onResolve(action.source, action.sourceId, 'approved')}
                  disabled={isResolving}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <Check className="size-3" /> Approve
                </button>
                <button
                  onClick={() => onResolve(action.source, action.sourceId, 'rejected')}
                  disabled={isResolving}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X className="size-3" /> Reject
                </button>
              </>
            ) : (
              <button
                onClick={() => onResolve(action.source, action.sourceId, action.source === 'action_queue' ? 'approved' : 'done')}
                disabled={isResolving}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002580] transition-colors disabled:opacity-50"
              >
                <Check className="size-3" /> {action.source === 'task' ? 'Done' : 'Resolve'}
              </button>
            )}
          </>
        ) : action.source === 'approval' ? (
          <>
            <button
              onClick={() => onResolve(action.source, action.sourceId, 'approved')}
              disabled={isResolving}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <Check className="size-3" /> Approve
            </button>
            <button
              onClick={() => onResolve(action.source, action.sourceId, 'rejected')}
              disabled={isResolving}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <X className="size-3" /> Reject
            </button>
          </>
        ) : (
          <a
            href={action.actionUrl}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0033A0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="size-3" /> View
          </a>
        )}
      </div>
    </div>
  )
}
