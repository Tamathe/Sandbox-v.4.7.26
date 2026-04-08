'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import UnifiedActionList from '../../components/staff/UnifiedActionList'
import type { UnifiedActionItem } from '../../components/staff/UnifiedActionList'
import { ClipboardList, Filter, Inbox, Users, CheckCircle, ListTodo, AlertTriangle, RefreshCw } from 'lucide-react'

interface ActionCounts {
  action_queue: number
  committee: number
  approval: number
  task: number
  total: number
  overdue: number
}

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources', Icon: ClipboardList },
  { value: 'action_queue', label: 'Action Queue', Icon: Inbox },
  { value: 'committee', label: 'Committee', Icon: Users },
  { value: 'approval', label: 'Approvals', Icon: CheckCircle },
  { value: 'task', label: 'Tasks', Icon: ListTodo },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'P0', label: 'P0 — Critical' },
  { value: 'P1', label: 'P1 — High' },
  { value: 'P2', label: 'P2 — Medium' },
  { value: 'P3', label: 'P3 — Low' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
]

export default function ActionCenterPage() {
  const { currentUser } = useAuth()
  const [actions, setActions] = useState<UnifiedActionItem[]>([])
  const [counts, setCounts] = useState<ActionCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  // Filters
  const [sourceFilter, setSourceFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (sourceFilter) params.set('source', sourceFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/staff/action-center?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })

      if (!res.ok) throw new Error('Failed to load actions')
      const data = await res.json()
      setActions(data.actions ?? [])
      setCounts(data.counts ?? null)
    } catch {
      // silently fail — empty state will show
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, sourceFilter, priorityFilter, statusFilter])

  useEffect(() => {
    void fetchActions()
  }, [fetchActions])

  const handleResolve = async (source: string, sourceId: string, resolution: string) => {
    const actionId = actions.find((a) => a.source === source && a.sourceId === sourceId)?.id
    if (actionId) setResolving(actionId)

    try {
      const res = await fetch('/api/staff/action-center/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ source, sourceId, resolution }),
      })

      if (!res.ok) throw new Error('Failed to resolve')

      // Remove the resolved action from the list
      setActions((prev) => prev.filter((a) => !(a.source === source && a.sourceId === sourceId)))

      // Decrement counts
      if (counts) {
        const sourceKey = source as keyof Omit<ActionCounts, 'total' | 'overdue'>
        setCounts({
          ...counts,
          [sourceKey]: Math.max(0, (counts[sourceKey] ?? 0) - 1),
          total: Math.max(0, counts.total - 1),
        })
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setResolving(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Action Center"
        subtitle="All your pending actions from every source, in one place"
        action={
          <button
            onClick={() => void fetchActions()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Strip */}
        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            <SummaryTile label="Total" value={counts.total} />
            <SummaryTile label="Overdue" value={counts.overdue} urgent={counts.overdue > 0} />
            <SummaryTile label="Action Queue" value={counts.action_queue} />
            <SummaryTile label="Committee" value={counts.committee} />
            <SummaryTile label="Approvals" value={counts.approval} />
            <SummaryTile label="Tasks" value={counts.task} />
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Filter className="size-4 text-gray-400" />

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {(sourceFilter || priorityFilter || statusFilter) && (
            <button
              onClick={() => { setSourceFilter(''); setPriorityFilter(''); setStatusFilter('') }}
              className="text-xs font-medium text-[#0033A0] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Action List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-2xl shadow-sm bg-white p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="space-y-3">
                  <div className="h-12 bg-gray-100 rounded-lg" />
                  <div className="h-12 bg-gray-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <UnifiedActionList
            actions={actions}
            onResolve={handleResolve}
            resolving={resolving}
          />
        )}
      </div>
    </>
  )
}

function SummaryTile({ label, value, urgent }: { label: string; value: number; urgent?: boolean }) {
  return (
    <div className={`border rounded-xl px-3 py-2 ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`text-lg font-extrabold ${urgent ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}
