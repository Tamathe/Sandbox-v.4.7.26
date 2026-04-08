'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

interface TaskQuickAddProps {
  onAdd: (title: string, dueDate?: string) => void
}

export default function TaskQuickAdd({ onAdd }: TaskQuickAddProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showDate, setShowDate] = useState(false)

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd(title.trim(), dueDate || undefined)
    setTitle('')
    setDueDate('')
    setShowDate(false)
  }

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-3">
      <div className="flex items-center gap-2">
        <Plus className="size-5 text-[#0033A0] shrink-0" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          placeholder="Add a task... (press Enter)"
          className="flex-1 text-sm outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={() => setShowDate(!showDate)}
          className="text-[11px] font-medium text-gray-400 hover:text-[#0033A0] transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
        >
          {dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '+ Date'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="px-3 py-1.5 bg-[#0033A0] text-white text-xs font-semibold rounded-lg hover:bg-[#002580] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
      {showDate && (
        <div className="mt-2 pl-7">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#0033A0]"
          />
        </div>
      )}
    </div>
  )
}
