'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ListChecks, ChevronDown, Clock } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import ActionItemRow, { type ActionItem } from './ActionItemRow'
import ActionItemDetail from './ActionItemDetail'
import DelegateModal from './DelegateModal'
import FloatingBatchBar from './FloatingBatchBar'
import BatchConfirmModal from './BatchConfirmModal'
import ExportButton from '../ExportButton'
import { showToast } from '../sandy/Toast'

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'P0', label: 'P0 — Critical' },
  { value: 'P1', label: 'P1 — High' },
  { value: 'P2', label: 'P2 — Medium' },
  { value: 'P3', label: 'P3 — Low' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'purchase-approval', label: 'Purchase Approvals' },
  { value: 'room-request', label: 'Room Requests' },
  { value: 'budget-review', label: 'Budget Reviews' },
  { value: 'document-review', label: 'Document Reviews' },
  { value: 'hr-action', label: 'HR Actions' },
  { value: 'escalation', label: 'Escalations' },
]

export default function ActionQueueCard() {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)
  const [delegateItemId, setDelegateItemId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [batchBusy, setBatchBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'snooze' | 'delegate' | null>(null)
  const [batchDelegateMode, setBatchDelegateMode] = useState(false)
  const [viewMode, setViewMode] = useState<'pending' | 'snoozed'>('pending')
  const [snoozedCount, setSnoozedCount] = useState(0)

  const fetchSnoozedCount = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/staff/actions?status=pending&includeSnoozed=true', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { items: ActionItem[] }
        const now = Date.now()
        const count = (data.items ?? []).filter(i => i.snoozedUntil && new Date(i.snoozedUntil).getTime() > now).length
        setSnoozedCount(count)
      }
    } catch { /* ignore */ }
  }, [currentUser?.email])

  const fetchItems = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ status: 'pending' })
      if (filterPriority) params.set('priority', filterPriority)
      if (filterType) params.set('type', filterType)
      if (viewMode === 'snoozed') params.set('includeSnoozed', 'true')

      const res = await fetch(`/api/staff/actions?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) throw new Error('Failed to load actions')
      const data = await res.json() as { items: ActionItem[] }
      let resultItems = data.items ?? []

      // When in snoozed mode, only show items that are actually snoozed
      if (viewMode === 'snoozed') {
        const now = Date.now()
        resultItems = resultItems.filter(i => i.snoozedUntil && new Date(i.snoozedUntil).getTime() > now)
      }

      setItems(resultItems)
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load actions')
    }
    setLoading(false)
  }, [currentUser?.email, filterPriority, filterType, viewMode])

  useEffect(() => { void fetchItems() }, [fetchItems])
  useEffect(() => { void fetchSnoozedCount() }, [fetchSnoozedCount])

  // Re-fetch when page becomes visible
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') void fetchItems()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchItems])

  // ── Selection ────────────────────────────────────────────
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }, [selectedIds.size, items])

  // Set indeterminate state on select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < items.length
    }
  }, [selectedIds.size, items.length])

  const auditSensitiveIds = useMemo(() => {
    const sensitive = new Set<string>()
    for (const item of items) {
      if (selectedIds.has(item.id) && (item.type === 'purchase-approval' || item.type === 'hr-action')) {
        sensitive.add(item.id)
      }
    }
    return sensitive
  }, [items, selectedIds])

  // ── Batch operations ─────────────────────────────────────
  const handleBatchApprove = useCallback(async () => {
    if (!currentUser || selectedIds.size === 0) return
    setBatchBusy(true)
    setConfirmAction(null)
    try {
      const res = await fetch('/api/staff/actions/batch-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ itemIds: [...selectedIds], status: 'approved' }),
      })
      if (res.ok) {
        const data = await res.json() as { resolved: number; failed: string[] }
        setItems(prev => prev.filter(i => !selectedIds.has(i.id) || data.failed.includes(i.id)))
        const remaining = items.length - data.resolved
        showToast(
          data.failed.length > 0
            ? `${data.resolved} of ${selectedIds.size} approved. ${data.failed.length} failed.`
            : `${data.resolved} items approved. ${remaining} remaining.`
        )
        setSelectedIds(new Set(data.failed))
      }
    } catch { /* ignore */ }
    setBatchBusy(false)
  }, [currentUser, selectedIds, items.length])

  const handleBatchSnooze = useCallback(async () => {
    if (!currentUser || selectedIds.size === 0) return
    setBatchBusy(true)
    setConfirmAction(null)
    try {
      const res = await fetch('/api/staff/actions/batch-snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ itemIds: [...selectedIds], hours: 24 }),
      })
      if (res.ok) {
        const data = await res.json() as { snoozed: number; failed: string[] }
        setItems(prev => prev.filter(i => !selectedIds.has(i.id) || data.failed.includes(i.id)))
        setSnoozedCount(prev => prev + data.snoozed)
        showToast(`${data.snoozed} items snoozed for 24h`)
        setSelectedIds(new Set(data.failed))
      }
    } catch { /* ignore */ }
    setBatchBusy(false)
  }, [currentUser, selectedIds])

  const handleBatchDelegateConfirm = useCallback(async (targetEmail: string, note?: string) => {
    if (!currentUser) return
    setBatchBusy(true)
    let delegated = 0
    const failed: string[] = []
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/staff/actions/${id}/delegate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify({ targetEmail, note }),
        })
        if (res.ok) delegated++
        else failed.push(id)
      } catch {
        failed.push(id)
      }
    }
    setItems(prev => prev.filter(i => !selectedIds.has(i.id) || failed.includes(i.id)))
    showToast(delegated > 0 ? `${delegated} items delegated` : 'Delegation failed')
    setSelectedIds(new Set(failed))
    setBatchDelegateMode(false)
    setBatchBusy(false)
  }, [currentUser, selectedIds])

  const requestBatchAction = useCallback((action: 'approve' | 'snooze' | 'delegate') => {
    if (action === 'delegate') {
      if (auditSensitiveIds.size > 0) {
        setConfirmAction('delegate')
      } else {
        setBatchDelegateMode(true)
      }
      return
    }
    if (auditSensitiveIds.size > 0) {
      setConfirmAction(action)
    } else if (action === 'approve') {
      void handleBatchApprove()
    } else {
      void handleBatchSnooze()
    }
  }, [auditSensitiveIds.size, handleBatchApprove, handleBatchSnooze])

  const handleConfirmAction = useCallback(() => {
    if (confirmAction === 'approve') void handleBatchApprove()
    else if (confirmAction === 'snooze') void handleBatchSnooze()
    else if (confirmAction === 'delegate') {
      setConfirmAction(null)
      setBatchDelegateMode(true)
    }
  }, [confirmAction, handleBatchApprove, handleBatchSnooze])

  const handleResolve = useCallback(async (id: string, action: string) => {
    if (!currentUser) return
    setResolvingId(id)
    try {
      const res = await fetch(`/api/staff/actions/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ status: action }),
      })
      if (res.ok) {
        setItems((prev) => {
          const remaining = prev.filter((item) => item.id !== id)
          // Auto-advance detail panel to next item
          if (selectedItem?.id === id) {
            if (remaining.length > 0) {
              setSelectedItem(remaining[0])
            } else {
              setSelectedItem(null)
            }
          }
          if (remaining.length === 0) {
            showToast('All clear!')
          } else {
            showToast(`Item ${action}. ${remaining.length} remaining.`)
          }
          return remaining
        })
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
      }
    } catch { /* ignore */ }
    setResolvingId(null)
  }, [currentUser?.email, selectedItem?.id])

  const handleSnooze = useCallback(async (id: string) => {
    if (!currentUser) return
    setResolvingId(id)
    try {
      const res = await fetch(`/api/staff/actions/${id}/snooze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ hours: 24 }),
      })
      if (res.ok) {
        setItems((prev) => {
          const remaining = prev.filter((item) => item.id !== id)
          if (selectedItem?.id === id) {
            if (remaining.length > 0) {
              setSelectedItem(remaining[0])
            } else {
              setSelectedItem(null)
            }
          }
          return remaining
        })
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
        setSnoozedCount(prev => prev + 1)
        showToast('Snoozed for 24h')
      }
    } catch { /* ignore */ }
    setResolvingId(null)
  }, [currentUser?.email, selectedItem?.id])

  const handleUnsnooze = useCallback(async (id: string) => {
    if (!currentUser) return
    setResolvingId(id)
    try {
      const res = await fetch(`/api/staff/actions/${id}/unsnooze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
      })
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id))
        setSnoozedCount(prev => Math.max(0, prev - 1))
        showToast('Item restored to queue')
      }
    } catch { /* ignore */ }
    setResolvingId(null)
  }, [currentUser?.email])

  const handleDelegateConfirm = useCallback(async (targetEmail: string, note?: string) => {
    if (!currentUser || !delegateItemId) return
    setResolvingId(delegateItemId)
    try {
      const res = await fetch(`/api/staff/actions/${delegateItemId}/delegate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ targetEmail, note }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== delegateItemId))
        setSelectedIds(prev => { const next = new Set(prev); next.delete(delegateItemId); return next })
        if (selectedItem?.id === delegateItemId) setSelectedItem(null)
      }
    } catch { /* ignore */ }
    setDelegateItemId(null)
    setResolvingId(null)
  }, [currentUser?.email, delegateItemId, selectedItem?.id])

  const isSnoozedView = viewMode === 'snoozed'
  const pendingCount = items.length

  return (
    <>
      <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
          <div className="flex items-center gap-2.5">
            {!loading && items.length > 0 && !isSnoozedView && (
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={selectedIds.size === items.length && items.length > 0}
                onChange={handleSelectAll}
                className="size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0] cursor-pointer"
                title="Select all"
              />
            )}
            <ListChecks className="size-5 text-[#0033A0]" />
            <h2 className="text-lg font-extrabold text-gray-900">Action Queue</h2>

            {/* View mode pills */}
            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 ml-1">
              <button
                onClick={() => setViewMode('pending')}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  !isSnoozedView ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pending
                {!isSnoozedView && pendingCount > 0 && (
                  <span className="ml-1.5 bg-white/20 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] inline-block text-center">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode('snoozed')}
                className={`px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1 ${
                  isSnoozedView ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Clock className="size-3" />
                Snoozed
                {snoozedCount > 0 && (
                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] inline-block text-center ${
                    isSnoozedView ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {snoozedCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="appearance-none text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gray-400 pointer-events-none" />
            </div>
            <ExportButton href="/api/export/actions" label="Export action queue to CSV" />
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start gap-3">
                    <div className="size-6 bg-gray-200 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                onClick={() => void fetchItems()}
                className="mt-2 text-xs text-[#0033A0] font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              {isSnoozedView ? (
                <>
                  <Clock className="size-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">No snoozed items</p>
                  <p className="text-xs text-gray-400 mt-0.5">Snoozed items will appear here with a countdown.</p>
                </>
              ) : (
                <>
                  <ListChecks className="size-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">All clear</p>
                  <p className="text-xs text-gray-400 mt-0.5">No pending actions right now.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  onSelect={setSelectedItem}
                  onResolve={handleResolve}
                  onDelegate={(id) => setDelegateItemId(id)}
                  resolving={resolvingId}
                  showCheckbox={!isSnoozedView}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  snoozedMode={isSnoozedView}
                  onUnsnooze={handleUnsnooze}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating batch bar — hidden in snoozed view */}
        {selectedIds.size > 0 && !isSnoozedView && (
          <FloatingBatchBar
            selectedCount={selectedIds.size}
            hasAuditSensitive={auditSensitiveIds.size > 0}
            onApproveAll={() => requestBatchAction('approve')}
            onSnooze={() => requestBatchAction('snooze')}
            onDelegate={() => requestBatchAction('delegate')}
            onClear={() => setSelectedIds(new Set())}
            disabled={batchBusy}
          />
        )}
      </div>

      {/* Batch confirm modal */}
      {confirmAction && (
        <BatchConfirmModal
          action={confirmAction}
          count={selectedIds.size}
          sensitiveCount={auditSensitiveIds.size}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Detail slide-out */}
      {selectedItem && (
        <ActionItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onResolve={handleResolve}
          onDelegate={(id) => { setSelectedItem(null); setDelegateItemId(id) }}
          onSnooze={handleSnooze}
          resolving={resolvingId}
        />
      )}

      {/* Delegate modal — single item */}
      {delegateItemId && (
        <DelegateModal
          onConfirm={handleDelegateConfirm}
          onCancel={() => setDelegateItemId(null)}
        />
      )}

      {/* Delegate modal — batch mode */}
      {batchDelegateMode && (
        <DelegateModal
          onConfirm={handleBatchDelegateConfirm}
          onCancel={() => setBatchDelegateMode(false)}
        />
      )}
    </>
  )
}
