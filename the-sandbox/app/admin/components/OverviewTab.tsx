'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Star, StarOff, ShieldX, Trash2 } from 'lucide-react'
import { AdminStats, ToolWithDetails } from '../../lib/types'
import StatusBadge from './StatusBadge'
import PolicyCoverageCard from './PolicyCoverageCard'
import Button from '../../components/Button'

interface OverviewTabProps {
  stats: AdminStats
  currentUserEmail: string
  actionLoading: string | null
  deleteConfirm: string | null
  setDeleteConfirm: (id: string | null) => void
  suspendingToolId: string | null
  setSuspendingToolId: (id: string | null) => void
  suspendReasonText: string
  setSuspendReasonText: (text: string) => void
  handleToolAction: (tool: ToolWithDetails, kind: 'feature' | 'delete' | 'APPROVED' | 'REJECTED' | 'SUSPENDED', reason?: string) => void
}

export default function OverviewTab({
  stats,
  currentUserEmail,
  actionLoading,
  deleteConfirm,
  setDeleteConfirm,
  suspendingToolId,
  setSuspendingToolId,
  suspendReasonText,
  setSuspendReasonText,
  handleToolAction,
}: OverviewTabProps) {
  const [showAllPending, setShowAllPending] = useState(false)
  const [showAllTools, setShowAllTools] = useState(false)
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">Pending Approval Queue</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{stats.pendingTools.length} waiting</span>
        </div>
        <div className="space-y-3">
          {stats.pendingTools.length === 0 ? <p className="text-sm text-slate-500">No tools awaiting approval.</p> : (showAllPending ? stats.pendingTools : stats.pendingTools.slice(0, 4)).map((tool) => (
            <div key={tool.id} className="flex flex-col gap-4 rounded-2xl border-2 border-gray-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-900">{tool.name}</h3>
                  <StatusBadge status={tool.approvalStatus} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{tool.shortDescription}</p>
                <p className="mt-1 text-xs text-slate-400">By {tool.creator.name} · {tool.category}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleToolAction(tool, 'APPROVED')} disabled={actionLoading === `${tool.id}-APPROVED`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
                <button type="button" onClick={() => void handleToolAction(tool, 'REJECTED')} disabled={actionLoading === `${tool.id}-REJECTED`} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">Reject</button>
              </div>
            </div>
          ))}
          {stats.pendingTools.length > 4 && (
            <button
              onClick={() => setShowAllPending(v => !v)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllPending ? 'Show less' : `Show all ${stats.pendingTools.length} pending tools`}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-extrabold text-gray-900">All Tools</h2>
          <span className="text-xs text-slate-400">{stats.allTools.length} total</span>
        </div>
        <div className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto">
          {(showAllTools ? stats.allTools : stats.allTools.slice(0, 4)).map((tool) => (
            <div key={tool.id} className="flex items-start gap-3 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/tools/${tool.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-[#0033A0]">{tool.name}</Link>
                  <StatusBadge status={tool.approvalStatus} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{tool.creator.name}</span>
                  <span>·</span>
                  <span>{tool.category}</span>
                  <span>·</span>
                  <span>{format(new Date(tool.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" onClick={() => void handleToolAction(tool, 'feature')} disabled={actionLoading === `${tool.id}-feature`} className={`rounded-lg p-2 ${tool.featured ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}>
                  {tool.featured ? <StarOff className="size-4" /> : <Star className="size-4" />}
                </button>
                {suspendingToolId === tool.id ? (
                  <div className="flex flex-col gap-1">
                    <textarea
                      value={suspendReasonText}
                      onChange={(e) => setSuspendReasonText(e.target.value)}
                      placeholder="Suspension reason…"
                      rows={2}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#0033A0]"
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          void handleToolAction(tool, 'SUSPENDED', suspendReasonText || undefined)
                          setSuspendingToolId(null)
                          setSuspendReasonText('')
                        }}
                        disabled={actionLoading === `${tool.id}-SUSPENDED`}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setSuspendingToolId(null); setSuspendReasonText('') }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setSuspendingToolId(tool.id); setSuspendReasonText('') }} disabled={actionLoading === `${tool.id}-SUSPENDED`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <ShieldX className="size-4" />
                  </button>
                )}
                {deleteConfirm === tool.id ? (
                  <div className="flex items-center gap-1">
                    <Button variant="danger" size="sm" onClick={() => void handleToolAction(tool, 'delete')}>Confirm</Button>
                    <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setDeleteConfirm(tool.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {stats.allTools.length > 4 && (
            <div className="px-6 py-2">
              <button
                onClick={() => setShowAllTools(v => !v)}
                className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showAllTools ? 'Show less' : `Show all ${stats.allTools.length} tools`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Policy Coverage (Task 28) */}
      <PolicyCoverageCard userEmail={currentUserEmail} />
    </div>
  )
}
