'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, CheckSquare, ChevronDown } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import TaskQuickAdd from '../components/tasks/TaskQuickAdd'
import TaskList from '../components/tasks/TaskList'
import type { TaskItem } from '../components/tasks/TaskCard'

type FilterStatus = 'open' | 'done' | 'all'
type FilterPriority = '' | 'P0' | 'P1' | 'P2' | 'P3'

export default function TasksPage() {
  const { currentUser } = useAuth()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('open')
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false)

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email }),
    [currentUser.email],
  )

  // ── Fetch tasks ────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)

      const res = await fetch(`/api/tasks?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, statusFilter, priorityFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // ── Quick add ──────────────────────────────────────────────────
  const handleAdd = async (title: string, dueDate?: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ title, dueDate }),
      })
      if (res.ok) {
        const data = await res.json()
        setTasks((prev) => [data.task, ...prev])
      }
    } catch {
      /* ignore */
    }
  }

  // ── Toggle complete ────────────────────────────────────────────
  const handleToggleComplete = async (id: string, done: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: done ? 'done' : 'open', completedAt: done ? new Date().toISOString() : null } : t,
      ),
    )
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status: done ? 'done' : 'open' }),
      })
    } catch {
      void fetchTasks()
    }
  }

  // ── Update ─────────────────────────────────────────────────────
  const handleUpdate = async (id: string, data: Partial<TaskItem>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(data),
      })
    } catch {
      void fetchTasks()
    }
  }

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: headers(),
      })
    } catch {
      void fetchTasks()
    }
  }

  // ── Selection ──────────────────────────────────────────────────
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Bulk actions ───────────────────────────────────────────────
  const handleBulkAction = async (action: 'done' | 'P0' | 'P1' | 'P2' | 'P3' | 'delete') => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkMenuOpen(false)

    if (action === 'delete') {
      setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
      for (const id of ids) {
        try {
          await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: headers() })
        } catch { /* ignore */ }
      }
      return
    }

    if (action === 'done') {
      setTasks((prev) =>
        prev.map((t) =>
          selectedIds.has(t.id) ? { ...t, status: 'done', completedAt: new Date().toISOString() } : t,
        ),
      )
      setSelectedIds(new Set())
      try {
        await fetch('/api/tasks/bulk', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ ids, status: 'done' }),
        })
      } catch {
        void fetchTasks()
      }
      return
    }

    // Priority change
    setTasks((prev) =>
      prev.map((t) => (selectedIds.has(t.id) ? { ...t, priority: action } : t)),
    )
    setSelectedIds(new Set())
    for (const id of ids) {
      try {
        await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ priority: action }),
        })
      } catch { /* ignore */ }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="My Tasks" subtitle="Track what needs to get done" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Quick add */}
        <TaskQuickAdd onAdd={handleAdd} />

        {/* Filters + bulk bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {(['open', 'done', 'all'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  statusFilter === s ? 'bg-[#0033A0] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
            className="text-xs font-medium border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 outline-none focus:ring-1 focus:ring-[#0033A0]"
          >
            <option value="">All Priorities</option>
            <option value="P0">P0 — Critical</option>
            <option value="P1">P1 — High</option>
            <option value="P2">P2 — Medium</option>
            <option value="P3">P3 — Low</option>
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="relative flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">{selectedIds.size} selected</span>
              <button
                onClick={() => void handleBulkAction('done')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckSquare className="size-3.5" />
                Mark Done
              </button>
              <div className="relative">
                <button
                  onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  More
                  <ChevronDown className="size-3.5" />
                </button>
                {bulkMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                    {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => void handleBulkAction(p)}
                        className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Set {p}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => void handleBulkAction('delete')}
                      className="flex items-center gap-1.5 w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-100 p-3">
                <div className="flex items-start gap-3">
                  <div className="size-5 bg-gray-200 rounded mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        )}
      </div>
    </div>
  )
}
