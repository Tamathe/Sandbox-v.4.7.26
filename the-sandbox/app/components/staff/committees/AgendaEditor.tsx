'use client'

import { ChevronUp, ChevronDown, Trash2, Plus, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export interface AgendaItem {
  title: string
  description?: string
  timeMinutes?: number
}

interface AgendaEditorProps {
  items: AgendaItem[]
  onChange: (items: AgendaItem[]) => void
  disabled?: boolean
}

export default function AgendaEditor({ items, onChange, disabled }: AgendaEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  function updateItem(index: number, updates: Partial<AgendaItem>) {
    const next = items.map((item, i) => (i === index ? { ...item, ...updates } : item))
    onChange(next)
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    setExpandedIndex(target)
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
    setExpandedIndex(null)
  }

  function addItem() {
    onChange([...items, { title: '' }])
    setExpandedIndex(items.length)
  }

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {items.map((item, index) => {
        const isExpanded = expandedIndex === index
        return (
          <div key={index} className="border rounded-xl p-3 bg-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="text-gray-400 hover:text-gray-600 shrink-0"
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                <ChevronRight className={`size-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
              <span className="text-xs font-semibold text-gray-400 shrink-0 w-5">{index + 1}.</span>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                placeholder="Agenda item title"
                className="flex-1 text-sm font-medium text-gray-900 border-0 bg-transparent focus:outline-none focus:ring-0 placeholder:text-gray-300"
              />
              {item.timeMinutes !== undefined && item.timeMinutes > 0 && !isExpanded && (
                <span className="text-xs text-gray-400 shrink-0">{item.timeMinutes} min</span>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  aria-label="Remove item"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-2 pl-9 space-y-2">
                <textarea
                  value={item.description ?? ''}
                  onChange={(e) => updateItem(index, { description: e.target.value || undefined })}
                  placeholder="Optional description or notes..."
                  rows={2}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0033A0]/30 placeholder:text-gray-300 resize-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Time allocation:</label>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={item.timeMinutes ?? ''}
                    onChange={(e) => updateItem(index, { timeMinutes: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="—"
                    className="w-16 text-sm text-gray-700 border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-[#0033A0]/30"
                  />
                  <span className="text-xs text-gray-400">min</span>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] hover:text-[#0033A0]/80 px-3 py-2"
      >
        <Plus className="size-4" />
        Add item
      </button>
    </div>
  )
}
