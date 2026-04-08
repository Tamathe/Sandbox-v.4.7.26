'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Loader2, ListChecks, SkipForward } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'

/* ── Types ──────────────────────────────────────────────────────── */

export interface ExtractedActionItem {
  action: string
  ownerName: string
  due: string | null
  priority: 'critical' | 'high' | 'medium' | 'low'
}

interface ActionItemConfirmationProps {
  items: ExtractedActionItem[]
  committeeMembers: { name: string; role: string; userId?: string }[]
  meetingId: string
  committeeId: string
  onConfirmed: () => void
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

/* ── Component ──────────────────────────────────────────────────── */

export default function ActionItemConfirmation({
  items: initialItems,
  committeeMembers,
  meetingId,
  committeeId,
  onConfirmed,
}: ActionItemConfirmationProps) {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<ExtractedActionItem[]>(() =>
    initialItems.map((i) => ({ ...i }))
  )
  const [submitting, setSubmitting] = useState(false)

  const updateItem = useCallback((index: number, field: keyof ExtractedActionItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === 'due' && !value ? null : value } : item
      )
    )
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { action: '', ownerName: '', due: null, priority: 'medium' as const },
    ])
  }, [])

  const handleConfirm = useCallback(async () => {
    const validItems = items.filter((i) => i.action.trim())
    if (validItems.length === 0) {
      onConfirmed()
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ meetingId, items: validItems }),
      })
      if (res.ok) {
        onConfirmed()
      }
    } catch { /* ignore */ }
    setSubmitting(false)
  }, [items, committeeId, meetingId, onConfirmed, currentUser.email])

  return (
    <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-[#0033A0]" />
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Confirm Action Items</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and edit the extracted action items before creating records. You can change owners, dates, and priorities.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-bold text-gray-500 w-[40%]">Action</th>
                <th className="text-left py-2 px-2 font-bold text-gray-500 w-[20%]">Owner</th>
                <th className="text-left py-2 px-2 font-bold text-gray-500 w-[15%]">Due Date</th>
                <th className="text-left py-2 px-2 font-bold text-gray-500 w-[12%]">Priority</th>
                <th className="text-left py-2 px-2 font-bold text-gray-500 w-[5%]" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="py-2 px-2">
                    <textarea
                      value={item.action}
                      onChange={(e) => updateItem(i, 'action', e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0] resize-none"
                      placeholder="Action item description..."
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      list={`members-${i}`}
                      value={item.ownerName}
                      onChange={(e) => updateItem(i, 'ownerName', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
                      placeholder="Select or type name..."
                    />
                    <datalist id={`members-${i}`}>
                      {committeeMembers.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </datalist>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="date"
                      value={item.due ?? ''}
                      onChange={(e) => updateItem(i, 'due', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={item.priority}
                      onChange={(e) => updateItem(i, 'priority', e.target.value)}
                      className={`w-full px-2 py-1.5 text-[10px] font-bold uppercase border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 ${PRIORITY_BADGE[item.priority] ?? ''}`}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => removeItem(i)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add button */}
        <button
          onClick={addItem}
          className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0033A0] hover:bg-[#0033A0]/5 border border-dashed border-[#0033A0]/30 rounded-lg transition-colors"
        >
          <Plus className="size-3.5" />
          Add Item
        </button>
      </div>

      {/* Footer buttons */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          onClick={onConfirmed}
          className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors"
        >
          <SkipForward className="size-3.5" />
          Skip
        </button>
        <button
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-[#0033A0] rounded-lg hover:bg-[#002580] disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <ListChecks className="size-3.5" />}
          {submitting ? 'Creating...' : 'Confirm & Create'}
        </button>
      </div>
    </div>
  )
}
