'use client'

import { X, Check, Users, Flag, MessageCircle, Clock, DollarSign, Building2, FileCheck, DoorOpen, FileText, UserPlus, AlertTriangle, MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import PriorityBadge from './PriorityBadge'
import type { ActionItem } from './ActionItemRow'

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
  escalation: 'Escalation',
  custom: 'Custom',
}

interface ActionItemDetailProps {
  item: ActionItem
  onClose: () => void
  onResolve: (id: string, action: string) => void
  onDelegate: (id: string) => void
  onSnooze: (id: string) => void
  resolving?: string | null
}

export default function ActionItemDetail({ item, onClose, onResolve, onDelegate, onSnooze, resolving }: ActionItemDetailProps) {
  const Icon = TYPE_ICONS[item.type] ?? MoreHorizontal
  const isResolving = resolving === item.id
  const meta = item.metadata ?? {}

  const handleAskSandy = () => {
    window.dispatchEvent(
      new CustomEvent('sandy-open-with-context', {
        detail: { message: `Tell me about this action item: "${item.title}"` },
      })
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gray-50">
              <Icon className="size-5 text-[#0033A0]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {TYPE_LABELS[item.type] ?? item.type}
              </p>
              <h3 className="text-base font-extrabold text-gray-900 leading-snug">{item.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Escalation hint */}
          {((item.type === 'purchase-approval' && item.amount != null && item.amount > 5000) || item.type === 'hr-action') && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="size-4 flex-shrink-0" />
                <span className="text-sm font-semibold">Escalation may be required</span>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('sandy-prefill', {
                    detail: {
                      message: `I need to escalate this ${item.type}: "${item.title}". Amount: ${item.amount ? '$' + item.amount.toLocaleString() : 'N/A'}. Please help me draft an escalation message.`,
                      autoSend: true,
                    },
                  }))
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors flex-shrink-0"
              >
                <AlertTriangle className="size-3.5" />
                Escalate to VP
              </button>
            </div>
          )}

          {/* Priority + Status */}
          <div className="flex items-center gap-2">
            <PriorityBadge priority={item.priority} />
            <span className="text-xs text-gray-400 font-medium capitalize">{item.status}</span>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            {item.amount != null && (
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <DollarSign className="size-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Amount</span>
                </div>
                <p className="text-lg font-extrabold text-gray-900">
                  {item.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
            {item.department && (
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Building2 className="size-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Department</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.department}</p>
              </div>
            )}
            {item.deadline && (
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Clock className="size-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Deadline</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {format(new Date(item.deadline), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
            {item.submitter?.name && (
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <UserPlus className="size-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Submitted by</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.submitter.name}</p>
              </div>
            )}
          </div>

          {/* Full description */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Metadata */}
          {Object.keys(meta).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Details</p>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                {Object.entries(meta).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-medium text-gray-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center gap-2">
          {(item.type === 'purchase-approval' || item.type === 'room-request' || item.type === 'hr-action') && (
            <button
              onClick={() => onResolve(item.id, 'approved')}
              disabled={isResolving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Check className="size-4" />
              Approve
            </button>
          )}
          {(item.type === 'purchase-approval' || item.type === 'hr-action') && (
            <button
              onClick={() => onResolve(item.id, 'rejected')}
              disabled={isResolving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <X className="size-4" />
              Reject
            </button>
          )}
          <button
            onClick={() => onDelegate(item.id)}
            disabled={isResolving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Users className="size-4" />
            Delegate
          </button>
          <button
            onClick={() => onSnooze(item.id)}
            disabled={isResolving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            <Clock className="size-4" />
            Snooze 24h
          </button>
          <button
            onClick={() => onResolve(item.id, 'flagged')}
            disabled={isResolving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            <Flag className="size-4" />
            Flag
          </button>
          <div className="flex-1" />
          <button
            onClick={handleAskSandy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0033A0] text-[#0033A0] text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            <MessageCircle className="size-4" />
            Ask Sandy
          </button>
        </div>
      </div>
    </div>
  )
}
