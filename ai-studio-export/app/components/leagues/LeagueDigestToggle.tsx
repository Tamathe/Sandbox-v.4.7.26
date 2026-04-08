'use client'

import { Bell, BellOff } from 'lucide-react'

export function LeagueDigestToggle({
  subscribed,
  onToggle,
  busy,
}: {
  subscribed: boolean
  onToggle: (nextValue: boolean) => Promise<void>
  busy: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!subscribed)}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#0033A0] hover:text-[#0033A0] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {subscribed ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {subscribed ? 'Digest On' : 'Digest Off'}
    </button>
  )
}
