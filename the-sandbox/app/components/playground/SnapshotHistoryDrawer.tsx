'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, X, RotateCcw, Plus, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Snapshot {
  id: string
  title: string
  reason: string
  createdAt: string
}

interface SnapshotHistoryDrawerProps {
  appId: string
  userEmail: string
  open: boolean
  onClose: () => void
  onRestored: (htmlContent: string, title: string) => void
}

function ReasonBadge({ reason }: { reason: string }) {
  const styles: Record<string, string> = {
    auto: 'bg-gray-100 text-gray-600',
    manual: 'bg-emerald-100 text-emerald-700',
    restore: 'bg-violet-100 text-violet-700',
  }
  const labels: Record<string, string> = {
    auto: 'auto-save',
    manual: 'manual',
    restore: 'pre-restore',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[reason] ?? styles.auto}`}
    >
      {labels[reason] ?? reason}
    </span>
  )
}

export default function SnapshotHistoryDrawer({
  appId,
  userEmail,
  open,
  onClose,
  onRestored,
}: SnapshotHistoryDrawerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingSnapshot, setCreatingSnapshot] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSnapshots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/playground/apps/${appId}/snapshots`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) throw new Error('Failed to load snapshots')
      const data = (await res.json()) as { snapshots: Snapshot[] }
      setSnapshots(data.snapshots)
    } catch {
      setError('Could not load snapshot history.')
    } finally {
      setLoading(false)
    }
  }, [appId, userEmail])

  useEffect(() => {
    if (open) {
      void fetchSnapshots()
    }
  }, [open, fetchSnapshots])

  const handleCreateSnapshot = useCallback(async () => {
    setCreatingSnapshot(true)
    setError(null)
    try {
      const res = await fetch(`/api/playground/apps/${appId}/snapshots`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) throw new Error('Failed to create snapshot')
      await fetchSnapshots()
    } catch {
      setError('Could not create snapshot.')
    } finally {
      setCreatingSnapshot(false)
    }
  }, [appId, userEmail, fetchSnapshots])

  const handleRestore = useCallback(
    async (snapshotId: string) => {
      setRestoringId(snapshotId)
      setError(null)
      try {
        const res = await fetch(
          `/api/playground/apps/${appId}/snapshots/${snapshotId}/restore`,
          {
            method: 'POST',
            headers: { 'x-demo-user-email': userEmail },
          }
        )
        if (!res.ok) throw new Error('Failed to restore snapshot')
        const data = (await res.json()) as {
          restoredHtmlContent: string
          restoredTitle: string
        }
        onRestored(data.restoredHtmlContent, data.restoredTitle)
        setConfirmRestoreId(null)
        onClose()
      } catch {
        setError('Could not restore snapshot.')
        setRestoringId(null)
      }
    },
    [appId, userEmail, onRestored, onClose]
  )

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="size-5 text-[#0033A0]" />
            <h2 className="text-sm font-semibold text-gray-900">Version History</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close history panel"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Create snapshot button */}
        <div className="border-b border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={() => void handleCreateSnapshot()}
            disabled={creatingSnapshot}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#0033A0]/20 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingSnapshot ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {creatingSnapshot ? 'Saving snapshot…' : 'Create snapshot'}
          </button>
        </div>

        {/* Error banner */}
        {error ? (
          <div className="mx-5 mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-gray-100 p-4 h-16" />
              ))}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <History className="size-10 text-gray-300" />
              <p className="text-sm text-gray-500">No snapshots yet.</p>
              <p className="text-xs text-gray-400">
                Snapshots are created automatically when you save, or manually with the button above.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-gray-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ReasonBadge reason={snap.reason} />
                        <span className="text-[11px] text-gray-400">
                          {formatDistanceToNow(new Date(snap.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p
                        className="mt-1 truncate text-sm font-medium text-gray-800"
                        title={snap.title}
                      >
                        {snap.title}
                      </p>
                    </div>

                    {confirmRestoreId === snap.id ? null : (
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreId(snap.id)}
                        disabled={restoringId !== null}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-[#0033A0]/30 hover:bg-blue-50 hover:text-[#0033A0] disabled:opacity-40"
                      >
                        <RotateCcw className="size-3" />
                        Restore
                      </button>
                    )}
                  </div>

                  {/* Inline restore confirm */}
                  {confirmRestoreId === snap.id ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <p className="mb-2 text-xs font-medium text-amber-900">
                        Restoring will replace current code. Continue?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(null)}
                          disabled={restoringId === snap.id}
                          className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRestore(snap.id)}
                          disabled={restoringId === snap.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                        >
                          {restoringId === snap.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          {restoringId === snap.id ? 'Restoring…' : 'Restore'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
