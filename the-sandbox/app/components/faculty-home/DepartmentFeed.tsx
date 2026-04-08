'use client'

import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, ClipboardList } from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'

interface DepartmentFeedProps {
  departmentFeed: FacultyHomepageV2Data['departmentFeed']
}

function openDepartmentUpdates() {
  const message = 'Summarize my latest department updates and tell me what needs action from me.'

  window.dispatchEvent(
    new CustomEvent('sandy-prefill', {
      detail: {
        message,
        autoSend: true,
      },
    }),
  )
}

export default function DepartmentFeed({ departmentFeed }: DepartmentFeedProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0]">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Department Updates</h3>
            <p className="text-sm text-gray-500">What the chair, dean, and department are signaling this week.</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
          {departmentFeed.length} new
        </span>
      </div>

      {departmentFeed.length > 0 ? (
        <div className="mt-5 space-y-3">
          {departmentFeed.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <span>{item.sender}</span>
                <span className="text-gray-300">·</span>
                <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          No department updates right now.
        </p>
      )}

      <button
        type="button"
        onClick={openDepartmentUpdates}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#00277A]"
      >
        View all
        <ArrowRight className="size-4" />
      </button>
    </section>
  )
}
