'use client'

import { FileCheck, DoorOpen, DollarSign, FileText, UserPlus, AlertTriangle, MoreHorizontal, Clock, Check, X, Users, Flag } from 'lucide-react'
import { differenceInHours } from 'date-fns'
import PriorityBadge from './PriorityBadge'

export interface ActionItem {
  id: string
  type: string
  priority: string
  status: string
  title: string
  description: string
  amount: number | null
  department: string | null
  deadline: string | null
  metadata: Record<string, unknown> | null
  submitter?: { name: string } | null
  snoozedUntil?: string | null
  resolution?: string | null
  resolvedAt?: string | null
  createdAt: string
}

const TYPE_ICONS: Record<string, typeof FileCheck> = {
  'purchase-approval': FileCheck,
  'room-request': DoorOpen,
  'budget-review': DollarSign,
  'document-review': FileText,
  'hr-action': UserPlus,
  escalation: AlertTriangle,
  custom: MoreHorizontal,
}

const TYPE_LABELS: Record<string, string> = {
  'purchase-approval': 'Purchase Approval',
  'room-request': 'Room Request',
  'budget-review': 'Budget Review',
  'document-review': 'Document Review',
  'hr-action': 'HR Action',
  'communication-approval': 'Communication Approval',
  escalation: 'Escalation',
  custom: 'Custom',
}

function formatAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const now = new Date()
  const dl = new Date(deadline)
  const hoursLeft = differenceInHours(dl, now)

  let color = 'text-gray-500 bg-gray-50'
  if (hoursLeft < 24) color = 'text-red-700 bg-red-50'
  else if (hoursLeft < 72) color = 'text-amber-700 bg-amber-50'

  const label =
    hoursLeft < 0
      ? 'Overdue'
      : hoursLeft < 24
        ? `${Math.max(0, hoursLeft)}h left`
        : hoursLeft < 72
          ? `${Math.ceil(hoursLeft / 24)}d left`
          : dl.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      <Clock className="size-3" />
      {label}
    </span>
  )
}

function AmountBadge({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
      {amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  )
}

function formatCountdown(snoozedUntil: string): string {
  const ms = new Date(snoozedUntil).getTime() - Date.now()
  if (ms <= 0) return 'Returning soon'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return remainingHours > 0 ? `Returns in ${days}d ${remainingHours}h` : `Returns in ${days}d`
  }
  if (hours > 0) return `Returns in ${hours}h ${minutes}m`
  return `Returns in ${minutes}m`
}

interface ActionItemRowProps {
  item: ActionItem
  onSelect: (item: ActionItem) => void
  onResolve: (id: string, action: string) => void
  onDelegate: (id: string) => void
  resolving?: string | null
  selected?: boolean
  onToggleSelect?: (id: string) => void
  showCheckbox?: boolean
  snoozedMode?: boolean
  onUnsnooze?: (id: string) => void
}

export default function ActionItemRow({ item, onSelect, onResolve, onDelegate, resolving, selected, onToggleSelect, showCheckbox, snoozedMode, onUnsnooze }: ActionItemRowProps) {
  const Icon = TYPE_ICONS[item.type] ?? MoreHorizontal
  const isResolving = resolving === item.id

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-2xl border-2 bg-white hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer ${
        selected ? 'border-[#0033A0]/30 bg-[#0033A0]/[0.02]' : 'border-gray-100'
      } ${isResolving ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={() => onSelect(item)}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onToggleSelect?.(item.id)}
            className="size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0] cursor-pointer"
          />
        </div>
      )}

      {/* Priority */}
      <div className="flex flex-col items-center gap-1.5 pt-0.5">
        <PriorityBadge priority={item.priority} />
        <Icon className="size-4 text-gray-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-snug truncate">{item.title}</p>

        {/* Inline context: type label · submitter · age */}
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          <span className="text-[10px] font-semibold text-[#0033A0]/70 bg-[#0033A0]/5 px-1.5 py-0.5 rounded">
            {TYPE_LABELS[item.type] ?? item.type}
          </span>
          {item.submitter?.name && (
            <>
              <span className="text-xs text-gray-300">&middot;</span>
              <span className="text-xs text-gray-400">From: {item.submitter.name}</span>
            </>
          )}
          <span className="text-xs text-gray-300">&middot;</span>
          <span className="text-xs text-gray-400">{formatAge(item.createdAt)}</span>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{item.description}</p>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {item.amount != null && <AmountBadge amount={item.amount} />}
          {item.deadline && !snoozedMode && <DeadlineBadge deadline={item.deadline} />}
          {snoozedMode && item.snoozedUntil && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium">
              <Clock className="size-3" />
              {formatCountdown(item.snoozedUntil)}
            </span>
          )}
          {item.department && (
            <span className="text-[10px] text-gray-400 font-medium">{item.department}</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div
        className={`flex items-center gap-1 flex-shrink-0 ${snoozedMode ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
        onClick={(e) => e.stopPropagation()}
      >
        {snoozedMode ? (
          <button
            onClick={() => onUnsnooze?.(item.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0033A0] text-white text-xs font-semibold hover:bg-[#002580] transition-colors"
            title="Restore to queue"
          >
            <Clock className="size-3.5" />
            Un-snooze
          </button>
        ) : (
          <>
            {(item.type === 'purchase-approval' || item.type === 'room-request' || item.type === 'hr-action') && (
              <button
                onClick={() => onResolve(item.id, 'approved')}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                title="Approve"
              >
                <Check className="size-3.5" />
              </button>
            )}
            {(item.type === 'purchase-approval' || item.type === 'hr-action') && (
              <button
                onClick={() => onResolve(item.id, 'rejected')}
                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                title="Reject"
              >
                <X className="size-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelegate(item.id)}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="Delegate"
            >
              <Users className="size-3.5" />
            </button>
            <button
              onClick={() => onResolve(item.id, 'flagged')}
              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
              title="Flag for follow-up"
            >
              <Flag className="size-3.5" />
            </button>
            <button
              onClick={() => onResolve(item.id, 'dismissed')}
              className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
              title="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
