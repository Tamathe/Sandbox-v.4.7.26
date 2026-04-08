'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Clock, CalendarDays, CalendarClock, CheckCircle2, Inbox } from 'lucide-react'
import { isPast, isToday, addDays, startOfDay, endOfDay } from 'date-fns'
import TaskCard, { type TaskItem } from './TaskCard'

interface TaskListProps {
  tasks: TaskItem[]
  onToggleComplete: (id: string, done: boolean) => void
  onUpdate: (id: string, data: Partial<TaskItem>) => void
  onDelete: (id: string) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

interface TaskGroup {
  key: string
  label: string
  icon: typeof AlertTriangle
  tasks: TaskItem[]
  defaultOpen: boolean
  accent?: string
}

function groupTasks(tasks: TaskItem[]): TaskGroup[] {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekEnd = endOfDay(addDays(now, 7))

  const overdue: TaskItem[] = []
  const today: TaskItem[] = []
  const thisWeek: TaskItem[] = []
  const later: TaskItem[] = []
  const done: TaskItem[] = []

  for (const task of tasks) {
    if (task.status === 'done') {
      done.push(task)
      continue
    }
    if (!task.dueDate) {
      later.push(task)
      continue
    }
    const due = new Date(task.dueDate)
    if (isPast(due) && !isToday(due)) {
      overdue.push(task)
    } else if (due >= todayStart && due <= todayEnd) {
      today.push(task)
    } else if (due > todayEnd && due <= weekEnd) {
      thisWeek.push(task)
    } else if (due > weekEnd) {
      later.push(task)
    } else {
      overdue.push(task)
    }
  }

  const groups: TaskGroup[] = []
  if (overdue.length > 0)
    groups.push({ key: 'overdue', label: 'Overdue', icon: AlertTriangle, tasks: overdue, defaultOpen: true, accent: 'text-red-600' })
  if (today.length > 0)
    groups.push({ key: 'today', label: 'Today', icon: Clock, tasks: today, defaultOpen: true, accent: 'text-amber-600' })
  if (thisWeek.length > 0)
    groups.push({ key: 'week', label: 'This Week', icon: CalendarDays, tasks: thisWeek, defaultOpen: true })
  if (later.length > 0)
    groups.push({ key: 'later', label: 'Later', icon: CalendarClock, tasks: later, defaultOpen: true })
  if (done.length > 0)
    groups.push({ key: 'done', label: 'Done', icon: CheckCircle2, tasks: done, defaultOpen: false, accent: 'text-green-600' })

  return groups
}

export default function TaskList({
  tasks,
  onToggleComplete,
  onUpdate,
  onDelete,
  selectedIds,
  onToggleSelect,
}: TaskListProps) {
  const groups = groupTasks(tasks)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const g of groups) {
      if (!g.defaultOpen) s.add(g.key)
    }
    return s
  })

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <Inbox className="size-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-extrabold text-gray-900 mb-1">Nothing on your plate</h3>
        <p className="text-sm text-gray-500">Sandy can suggest tasks based on your briefing.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isOpen = !collapsed.has(group.key)
        const Icon = group.icon
        return (
          <div key={group.key}>
            <button
              onClick={() => toggleGroup(group.key)}
              className="flex items-center gap-2 mb-2 w-full text-left"
            >
              {isOpen ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
              <Icon className={`size-4 ${group.accent ?? 'text-gray-500'}`} />
              <span className={`text-sm font-extrabold ${group.accent ?? 'text-gray-700'}`}>
                {group.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">{group.tasks.length}</span>
            </button>
            {isOpen && (
              <div className="space-y-1.5 pl-2">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={selectedIds?.has(task.id)}
                    onToggleSelect={onToggleSelect}
                    onToggleComplete={onToggleComplete}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
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
