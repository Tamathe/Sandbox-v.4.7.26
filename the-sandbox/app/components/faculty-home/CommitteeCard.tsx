'use client'

import { format } from 'date-fns'
import { AlertTriangle, ArrowRight, FileText, Gavel } from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'

interface CommitteeCardProps {
  committees: FacultyHomepageV2Data['committees']
}

function openCommittees() {
  const message = 'Show me my committees, upcoming meetings, and any action items due soon.'

  window.dispatchEvent(
    new CustomEvent('sandy-prefill', {
      detail: {
        message,
        autoSend: true,
      },
    }),
  )
}

function formatMeeting(dateIso: string | null) {
  if (!dateIso) return 'No meeting scheduled'
  return format(new Date(dateIso), 'MMM d, h:mm a')
}

export default function CommitteeCard({ committees }: CommitteeCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0]">
            <Gavel className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">My Committees</h3>
            <p className="text-sm text-gray-500">The meetings and action items still attached to your day.</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
          {committees.length} active
        </span>
      </div>

      {committees.length > 0 ? (
        <div className="mt-5 space-y-3">
          {committees.map((committee) => (
            <button
              key={committee.id}
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('sandy-prefill', {
                    detail: {
                      message: `Tell me about ${committee.name} — upcoming meetings, action items, and minutes.`,
                      autoSend: true,
                    },
                  }),
                )
              }}
              className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{committee.name}</p>
                  <p className="mt-1 text-sm text-gray-600">Next: {formatMeeting(committee.nextMeeting)}</p>
                </div>
                {committee.unreadMinutes ? (
                  <span className="mt-1 size-2 rounded-full bg-blue-500" aria-label="Unread minutes available" />
                ) : null}
              </div>

              {/* Feature 7: Action item title inline */}
              {committee.nextActionTitle && committee.actionItemsDue > 0 && (
                <div className="mt-2 flex items-start gap-1.5 text-xs">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
                  <span className="text-gray-700">
                    <span className="font-semibold">&ldquo;{committee.nextActionTitle}&rdquo;</span>
                    {committee.nextMeeting && (
                      <span className="text-gray-400"> — due {format(new Date(committee.nextMeeting), 'MMM d')}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Feature 7: Unread minutes date inline */}
              {committee.unreadMinutes && committee.unreadMinutesDate && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600">
                  <FileText className="size-3 shrink-0" />
                  Minutes from {format(new Date(committee.unreadMinutesDate), 'MMM d')} — unread
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {committee.actionItemsDue > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {committee.actionItemsDue} action item{committee.actionItemsDue === 1 ? '' : 's'} due
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    No actions due
                  </span>
                )}

                {committee.unreadMinutes && !committee.unreadMinutesDate ? (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                    Unread minutes
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          No active committees right now.
        </p>
      )}

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={openCommittees}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#00277A]"
        >
          View committees
          <ArrowRight className="size-4" />
        </button>
        {committees.length > 0 && committees.some(c => c.nextMeeting) && (
          <a
            href={`/meeting-machine?committeeId=${committees.find(c => c.nextMeeting)?.id ?? ''}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-[#0033A0]"
          >
            Prep for meeting
            <FileText className="size-3.5" />
          </a>
        )}
      </div>
    </section>
  )
}
