'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Eye } from 'lucide-react'
import { AdminStats } from '../../lib/types'

interface ModerationTabProps {
  stats: AdminStats
  handleViewTranscript: (sessionId: string) => void
}

export default function ModerationTab({ stats, handleViewTranscript }: ModerationTabProps) {
  const [showAllFlagged, setShowAllFlagged] = useState(false)
  const [showAllAudit, setShowAllAudit] = useState(false)
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">Flagged Sessions</h2>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{stats.flaggedSessions.length} flagged</span>
        </div>
        <div className="space-y-3">
          {stats.flaggedSessions.length === 0 ? <p className="text-sm text-slate-500">No flagged sessions right now.</p> : (showAllFlagged ? stats.flaggedSessions : stats.flaggedSessions.slice(0, 4)).map((session) => (
            <div key={session.id} className="rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3">
              <div className="font-semibold text-slate-900">{session.tool.name}</div>
              <p className="mt-1 text-sm text-slate-600">{session.chatMessages[0]?.flagReason ?? 'Flagged for moderation review.'}</p>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{session.chatMessages[0]?.content}</p>
              <button type="button" onClick={() => void handleViewTranscript(session.id)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Eye className="size-4" />
                View Transcript
              </button>
            </div>
          ))}
          {stats.flaggedSessions.length > 4 && (
            <button
              onClick={() => setShowAllFlagged(v => !v)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllFlagged ? 'Show less' : `Show all ${stats.flaggedSessions.length} flagged sessions`}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-base font-extrabold text-gray-900">Recent Admin Audit Log</h2>
        <div className="space-y-3">
          {(showAllAudit ? stats.auditLog : stats.auditLog.slice(0, 4)).map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{entry.action}</div>
                <div className="text-xs text-slate-400">{format(new Date(entry.createdAt), 'MMM d, h:mm a')}</div>
              </div>
              <div className="mt-1 text-sm text-slate-500">{entry.admin.name} · {entry.targetType}{entry.targetLabel ? ` · ${entry.targetLabel}` : ''}</div>
            </div>
          ))}
          {stats.auditLog.length > 4 && (
            <button
              onClick={() => setShowAllAudit(v => !v)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllAudit ? 'Show less' : `Show all ${stats.auditLog.length} audit entries`}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
