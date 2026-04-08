'use client'

import { ShieldAlert } from 'lucide-react'

export default function SuspendedAccountScreen({ reason }: { reason: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Your account is under review</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The Sandbox is currently limiting access for this account while an administrator
          reviews recent activity.
        </p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Reason:</span>{' '}
          {reason || 'No additional context has been provided yet.'}
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-400">
          Please contact a platform administrator if this seems incorrect.
        </p>
      </div>
    </div>
  )
}
