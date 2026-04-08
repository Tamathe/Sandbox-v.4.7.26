'use client'

import { format } from 'date-fns'
import { ArrowRight, CalendarRange, ClipboardList, ShieldAlert, Users } from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'

interface AdviseeSnapshotProps {
  advisees: FacultyHomepageV2Data['advisees']
}

function formatRegistrationWindow(
  registrationWindow: FacultyHomepageV2Data['advisees']['registrationWindow'],
) {
  if (!registrationWindow) return 'Not scheduled yet'

  const start = new Date(registrationWindow.start)
  const end = new Date(registrationWindow.end)
  const startLabel = format(start, 'MMM d')
  const endLabel = format(end, start.getMonth() === end.getMonth() ? 'd' : 'MMM d')
  return `${startLabel}-${endLabel}`
}

function openAdviseeList() {
  const message = 'Show me my advisees, especially anyone with registration holds or a degree-audit review coming up.'

  window.dispatchEvent(
    new CustomEvent('sandy-prefill', {
      detail: {
        message,
        autoSend: true,
      },
    }),
  )
}

export default function AdviseeSnapshot({ advisees }: AdviseeSnapshotProps) {
  const registrationLabel = formatRegistrationWindow(advisees.registrationWindow)
  const holdsClass = advisees.withHolds > 0 ? 'text-red-700' : 'text-emerald-700'
  const auditsClass = advisees.needsDegreeAudit > 0 ? 'text-amber-700' : 'text-emerald-700'

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0]">
            <Users className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">My Advisees</h3>
            <p className="text-sm text-gray-500">Everything Katie is carrying into registration season.</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700">
          {advisees.total} total
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            <CalendarRange className="size-3.5" />
            <span>Registration window</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">{registrationLabel}</p>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-500">
            <ShieldAlert className="size-3.5" />
            <span>Hold alerts</span>
          </div>
          <p className={`mt-1 text-sm font-semibold ${holdsClass}`}>
            {advisees.withHolds} advisee{advisees.withHolds === 1 ? '' : 's'} have active holds
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            <ClipboardList className="size-3.5" />
            <span>Degree audit review</span>
          </div>
          <p className={`mt-1 text-sm font-semibold ${auditsClass}`}>
            {advisees.needsDegreeAudit} advisee{advisees.needsDegreeAudit === 1 ? '' : 's'} need a degree audit review
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={openAdviseeList}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#00277A]"
      >
        View all advisees
        <ArrowRight className="size-4" />
      </button>
    </section>
  )
}
