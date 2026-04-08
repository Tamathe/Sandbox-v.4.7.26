'use client'

import { useState } from 'react'
import { CheckSquare, Square, Trash2, Calendar, Tag } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

export interface TaskItem {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  dueDate: string | null
  tags: string[]
  source: string
  sourceId: string | null
  completedAt: string | null
  createdAt: string
}

const PRIORITY_BADGE: Record<string, string> = {
  P0: 'bg-red-100 text-red-800',
  P1: 'bg-orange-100 text-orange-800',
  P2: 'bg-blue-100 text-blue-700',
  P3: 'bg-gray-100 text-gray-600',
}

interface TaskCardProps {
  task: TaskItem
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onToggleComplete: (id: string, done: boolean) => void
  onUpdate: (id: string, data: Partial<TaskItem>) => void
  onDelete: (id: string) => void
}

export default function TaskCard({
  task,
  selected,
  onToggleSelect,
  onToggleComplete,
  onUpdate,
  onDelete,
}: TaskCardProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const isDone = task.status === 'done'
  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && !isDone && !isToday(new Date(task.dueDate))
  const dueToday = task.dueDate && isToday(new Date(task.dueDate))

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() })
    }
    setEditing(false)
  }

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        isDone ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-gray-300'
      } ${selected ? 'ring-2 ring-[#0033A0]/30' : ''}`}
    >
      {/* Selection checkbox (for bulk) */}
      {onToggleSelect && (
        <button
          onClick={() => onToggleSelect(task.id)}
          className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500"
        >
          {selected ? (
            <CheckSquare className="size-4 text-[#0033A0]" />
          ) : (
            <Square className="size-4" />
          )}
        </button>
      )}

      {/* Completion toggle */}
      <button
        onClick={() => onToggleComplete(task.id, !isDone)}
        className="mt-0.5 shrink-0"
      >
        {isDone ? (
          <CheckSquare className="size-5 text-green-500" />
        ) : (
          <Square className="size-5 text-gray-300 hover:text-[#0033A0]" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle()
              if (e.key === 'Escape') { setEditing(false); setEditTitle(task.title) }
            }}
            className="w-full text-sm font-medium border-b border-[#0033A0] bg-transparent outline-none py-0.5"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setEditing(true); setEditTitle(task.title) }}
            className={`text-sm font-medium text-left w-full truncate ${
              isDone ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {task.title}
          </button>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {/* Priority badge */}
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.P2}`}>
            {task.priority}
          </span>

          {/* Due date */}
          {task.dueDate && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] ${
              overdue ? 'text-red-600 font-semibold' : dueToday ? 'text-amber-600 font-semibold' : 'text-gray-500'
            }`}>
              <Calendar className="size-3" />
              {overdue ? 'Overdue · ' : dueToday ? 'Today · ' : ''}
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}

          {/* Tags */}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5"
            >
              <Tag className="size-2.5" />
              {tag}
            </span>
          ))}

          {/* Source badge */}
          {task.source !== 'manual' && (
            <span className="text-[10px] font-medium text-purple-600 bg-purple-50 rounded-full px-1.5 py-0.5">
              {task.source}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 mt-0.5"
        title="Delete task"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
