'use client'

import { Mail, Trash2, Eye, Loader2, CalendarClock } from 'lucide-react'

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'campus-wide':    { bg: 'bg-blue-50',    text: 'text-blue-700' },
  'department':     { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'student-facing': { bg: 'bg-amber-50',   text: 'text-amber-700' },
  'executive-brief':{ bg: 'bg-purple-50',  text: 'text-purple-700' },
  'crisis':         { bg: 'bg-red-50',     text: 'text-red-700' },
  'social-media':   { bg: 'bg-pink-50',    text: 'text-pink-700' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'draft':          { bg: 'bg-gray-100',    text: 'text-gray-600' },
  'pending-review': { bg: 'bg-amber-50',    text: 'text-amber-700' },
  'approved':       { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  'sent':           { bg: 'bg-blue-50',     text: 'text-blue-700' },
  'archived':       { bg: 'bg-gray-50',     text: 'text-gray-500' },
}

export interface DraftItem {
  id: string
  subject: string | null
  type: string
  status: string
  audienceDesc: string
  createdAt: string
  sentAt: string | null
  scheduledFor: string | null
}

interface DraftListProps {
  drafts: DraftItem[]
  loading: boolean
  onView: (id: string) => void
  onDelete: (id: string) => void
  emptyLabel?: string
}

export default function DraftList({ drafts, loading, onView, onDelete, emptyLabel = 'No drafts yet.' }: DraftListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 text-gray-300 animate-spin" />
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="size-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-600">{emptyLabel}</p>
        <p className="text-xs text-gray-400 mt-0.5">Communications you create will appear here.</p>
      </div>
    )
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="text-left px-4 py-3">Subject</th>
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {drafts.map((d) => {
            const typeColors = TYPE_COLORS[d.type] ?? { bg: 'bg-gray-50', text: 'text-gray-700' }
            const statusColors = STATUS_COLORS[d.status] ?? { bg: 'bg-gray-50', text: 'text-gray-600' }
            const typeLabel = d.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            const statusLabel = d.status.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            const dateStr = new Date(d.sentAt ?? d.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            return (
              <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 line-clamp-1">
                    {d.subject || '(No subject)'}
                  </span>
                  <span className="block text-xs text-gray-400 mt-0.5 line-clamp-1">{d.audienceDesc}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColors.bg} ${typeColors.text}`}>
                    {typeLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors.bg} ${statusColors.text}`}>
                    {statusLabel}
                  </span>
                  {d.scheduledFor && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      <CalendarClock className="size-3" />
                      {new Date(d.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(d.scheduledFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{dateStr}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(d.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#0033A0] hover:bg-[#0033A0]/5 transition-colors"
                      title="View"
                    >
                      <Eye className="size-4" />
                    </button>
                    {d.status !== 'sent' && (
                      <button
                        onClick={() => onDelete(d.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
