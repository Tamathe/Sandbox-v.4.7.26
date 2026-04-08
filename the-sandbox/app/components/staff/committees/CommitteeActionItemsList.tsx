'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Circle, AlertTriangle, ListChecks, Plus } from 'lucide-react'
import { format } from 'date-fns'

export interface CommitteeActionItem {
  id: string
  action: string
  ownerName: string
  dueDate: string | null
  priority: string
  status: string
  notes: string | null
  meetingId: string
  meetingNumber?: number
}

interface CommitteeActionItemsListProps {
  items: CommitteeActionItem[]
  loading?: boolean
  onToggleComplete: (id: string, complete: boolean) => void
  onUpdateNotes: (id: string, notes: string) => void
  onAddToTasks?: (item: CommitteeActionItem) => void
}

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  complete: CheckCircle2,
  'in-progress': Clock,
  open: Circle,
  'carried-forward': AlertTriangle,
}

const STATUS_COLORS: Record<string, string> = {
  complete: 'text-green-600',
  'in-progress': 'text-blue-600',
  open: 'text-gray-400',
  'carried-forward': 'text-amber-500',
  cancelled: 'text-gray-300',
}

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

export default function CommitteeActionItemsList({
  items,
  loading,
  onToggleComplete,
  onUpdateNotes,
  onAddToTasks,
}: CommitteeActionItemsListProps) {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-100 p-3">
            <div className="flex items-start gap-3">
              <div className="size-5 bg-gray-200 rounded-full mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <ListChecks className="size-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-600">No action items</p>
        <p className="text-xs text-gray-400 mt-0.5">Action items from meetings will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = STATUS_ICON[item.status] ?? Circle
        const isComplete = item.status === 'complete'
        const isEditing = editingNotesId === item.id

        return (
          <div
            key={item.id}
            className={`rounded-xl border border-gray-100 p-3 transition-colors ${
              isComplete ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggleComplete(item.id, !isComplete)}
                className="mt-0.5 shrink-0"
              >
                <Icon className={`size-5 ${STATUS_COLORS[item.status] ?? 'text-gray-400'} hover:opacity-70 transition-opacity`} />
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isComplete ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.action}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{item.ownerName}</span>
                  {item.dueDate && (
                    <span className="text-xs text-gray-500">
                      Due {format(new Date(item.dueDate), 'MMM d')}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium}`}>
                    {item.priority}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-gray-100 ${STATUS_COLORS[item.status] ?? 'text-gray-500'}`}>
                    {item.status.replace('-', ' ')}
                  </span>
                </div>

                {/* Notes */}
                {isEditing ? (
                  <div className="mt-2 flex gap-1.5">
                    <input
                      type="text"
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add a note..."
                      className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUpdateNotes(item.id, notesValue)
                          setEditingNotesId(null)
                        } else if (e.key === 'Escape') {
                          setEditingNotesId(null)
                        }
                      }}
                    />
                    <button
                      onClick={() => { onUpdateNotes(item.id, notesValue); setEditingNotesId(null) }}
                      className="text-xs font-semibold text-[#0033A0] hover:underline px-1"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingNotesId(item.id); setNotesValue(item.notes ?? '') }}
                    className="mt-1.5 text-[10px] text-gray-400 hover:text-gray-600"
                  >
                    {item.notes ? item.notes : '+ Add note'}
                  </button>
                )}

                {/* Add to My Tasks */}
                {onAddToTasks && !isComplete && (
                  <button
                    onClick={() => onAddToTasks(item)}
                    className="inline-flex items-center gap-0.5 mt-1.5 text-[10px] font-semibold text-[#0033A0] hover:underline"
                  >
                    <Plus className="size-2.5" />
                    Add to My Tasks
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
