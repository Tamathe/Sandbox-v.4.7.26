'use client'

// ─── Task Brief ──────────────────────────────────────────────
// Pending and overdue tasks with source badges and acceptance flow
// for auto-generated (suggested) tasks.

import { useState, useRef } from 'react'
import { Check, CheckCircle, Clock, AlertTriangle, X, XCircle, Sparkles, User, Plus } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { CappedList } from '../CappedList'
import type { TaskSource } from '../../lib/faculty/homepage-types'

interface Task {
  id: string
  title: string
  dueAt: string | Date | null
  status: string
  isOverdue: boolean
  source?: TaskSource
  assignedBy?: string
  accepted?: boolean
  /** Optional link to source context (committee page, gradebook, etc.) */
  sourceLink?: string
}

interface TaskBriefProps {
  tasks: Task[]
}

export default function TaskBrief({ tasks: initialTasks }: TaskBriefProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showAddInput, setShowAddInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)
  const { currentUser } = useAuth()

  async function handleComplete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await fetch(`/api/assistant/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ status: 'completed' }),
      })
    } catch { /* optimistic update */ }
  }

  async function handleDismiss(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await fetch(`/api/assistant/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ status: 'dismissed' }),
      })
    } catch { /* optimistic update */ }
  }

  function handleAccept(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, accepted: true, source: 'self' as TaskSource } : t))
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title) return
    const tempId = `manual-${Date.now()}`
    const newTask: Task = { id: tempId, title, dueAt: null, status: 'pending', isOverdue: false, source: 'self' }
    setTasks(prev => [...prev, newTask])
    setNewTaskTitle('')
    setShowAddInput(false)
    try {
      await fetch('/api/assistant/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ title, source: 'self' }),
      })
    } catch { /* optimistic — task already in local state */ }
  }

  const isEmpty = tasks.length === 0 && !showAddInput
  if (isEmpty) {
    return (
      <div className="border-2 rounded-2xl p-6 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-gray-900">Tasks</h2>
          <button type="button" onClick={() => { setShowAddInput(true); setTimeout(() => addInputRef.current?.focus(), 50) }} className="p-1 rounded-lg text-gray-400 hover:text-[#0033A0] hover:bg-blue-50 transition-colors" title="Add task">
            <Plus className="size-4" />
          </button>
        </div>
        <p className="text-gray-500 text-sm">All clear. No pending tasks.</p>
      </div>
    )
  }

  // Separate suggested (unaccepted auto) from regular tasks
  const suggested = tasks.filter(t => t.source === 'auto' && !t.accepted)
  const regular = tasks.filter(t => t.source !== 'auto' || t.accepted)
  const overdue = regular.filter(t => t.isOverdue)
  const upcoming = regular.filter(t => !t.isOverdue)

  return (
    <div className="border-2 rounded-2xl p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900">Tasks</h2>
        <button type="button" onClick={() => { setShowAddInput(true); setTimeout(() => addInputRef.current?.focus(), 50) }} className="p-1 rounded-lg text-gray-400 hover:text-[#0033A0] hover:bg-blue-50 transition-colors" title="Add task">
          <Plus className="size-4" />
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold mb-2">
            <AlertTriangle className="size-3.5" /> OVERDUE
          </div>
          <CappedList
            items={overdue}
            cap={4}
            noun="overdue tasks"
            className="space-y-2"
            renderItem={(task) => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} onDismiss={handleDismiss} />
            )}
          />
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={overdue.length > 0 ? 'mb-4' : ''}>
          {overdue.length > 0 && (
            <div className="text-xs font-bold text-gray-500 mb-2">UPCOMING</div>
          )}
          <CappedList
            items={upcoming}
            cap={4}
            noun="upcoming tasks"
            className="space-y-2"
            renderItem={(task) => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} onDismiss={handleDismiss} />
            )}
          />
        </div>
      )}

      {suggested.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-2">
            <Sparkles className="size-3.5" /> SUGGESTED
          </div>
          <CappedList
            items={suggested}
            cap={3}
            noun="suggested tasks"
            className="space-y-2"
            renderItem={(task) => (
              <SuggestedTaskRow key={task.id} task={task} onAccept={handleAccept} onDismiss={handleDismiss} />
            )}
          />
        </div>
      )}

      {/* Add task input */}
      {showAddInput && (
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={addInputRef}
            type="text"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setShowAddInput(false); setNewTaskTitle('') } }}
            placeholder="Add a task..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
          <button type="button" onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-[#002880] transition-colors">
            Add
          </button>
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, onComplete, onDismiss }: {
  task: Task
  onComplete: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const dueDate = task.dueAt ? new Date(task.dueAt) : null
  const dueStr = dueDate
    ? dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${
      task.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{task.title}</p>
          {task.source === 'assigned' && task.assignedBy && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <User className="size-2.5" />
              {task.sourceLink ? (
                <a href={task.sourceLink} className="hover:underline" onClick={e => e.stopPropagation()}>From {task.assignedBy}</a>
              ) : (
                <>From {task.assignedBy}</>
              )}
            </span>
          )}
        </div>
        {dueStr && (
          <p className={`text-xs mt-0.5 flex items-center gap-1 ${
            task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
          }`}>
            <Clock className="size-3" /> Due {dueStr}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onComplete(task.id)}
          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
          title="Complete"
        >
          <CheckCircle className="size-4" />
        </button>
        <button
          onClick={() => onDismiss(task.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors"
          title="Dismiss"
        >
          <XCircle className="size-4" />
        </button>
      </div>
    </div>
  )
}

function SuggestedTaskRow({ task, onAccept, onDismiss }: {
  task: Task
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const dueDate = task.dueAt ? new Date(task.dueAt) : null
  const dueStr = dueDate
    ? dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{task.title}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            <Sparkles className="size-2.5" />
            Suggested
          </span>
        </div>
        {dueStr && (
          <p className="text-xs mt-0.5 flex items-center gap-1 text-gray-500">
            <Clock className="size-3" /> Due {dueStr}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onAccept(task.id)}
          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
          title="Accept task"
        >
          <Check className="size-4" />
        </button>
        <button
          onClick={() => onDismiss(task.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors"
          title="Dismiss suggestion"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
