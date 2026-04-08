'use client'

import React, { useState } from 'react'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface Task {
  id: string
  title: string
  dueAt?: string
  status: string
}

interface Props {
  tasks: Task[]
  onComplete: (taskId: string) => void
}

export default function AssistantTaskList({ tasks, onComplete }: Props) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  const handleComplete = (id: string) => {
    setCompletedIds(prev => new Set(prev).add(id))
    onComplete(id)
  }

  const isOverdue = (dueAt?: string) => {
    if (!dueAt) return false
    return new Date(dueAt) < new Date()
  }

  const formatDue = (dueAt?: string) => {
    if (!dueAt) return 'No due date'
    const d = new Date(dueAt)
    const now = new Date()
    const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
    if (diff < 0) return `Overdue by ${Math.abs(diff)}d`
    if (diff === 0) return 'Due today'
    if (diff === 1) return 'Due tomorrow'
    return `Due in ${diff}d`
  }

  return (
    <div className="rounded-2xl border-2 border-[#0033A0]/20 bg-white p-3 my-2">
      <p className="text-xs font-bold text-[#0033A0] uppercase tracking-wide mb-2">Tasks</p>
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const done = completedIds.has(task.id) || task.status === 'completed'
          const overdue = !done && isOverdue(task.dueAt)
          return (
            <div key={task.id} className={`flex items-start gap-2 ${done ? 'opacity-50' : ''}`}>
              <button
                onClick={() => !done && handleComplete(task.id)}
                disabled={done}
                className="mt-0.5 shrink-0"
              >
                {done ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : (
                  <Circle className="size-4 text-gray-300 hover:text-[#0033A0] transition-colors" />
                )}
              </button>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {task.title}
                </p>
                {task.dueAt && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className={`size-3 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={`text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      {formatDue(task.dueAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
