'use client'

import { useState } from 'react'
import { LogIn } from 'lucide-react'

export function LeagueJoinCard({
  onJoin,
  busy,
}: {
  onJoin: (payload: { joinCode: string; emailForDigest?: string }) => Promise<void>
  busy: boolean
}) {
  const [joinCode, setJoinCode] = useState('')
  const [emailForDigest, setEmailForDigest] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      await onJoin({
        joinCode: joinCode.toUpperCase().trim(),
        emailForDigest: emailForDigest.trim() || undefined,
      })
      setJoinCode('')
      setEmailForDigest('')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not join league')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <LogIn className="h-4 w-4 text-[#0033A0]" />
        <h3 className="text-sm font-bold text-gray-900">Join With Code</h3>
      </div>
      <div className="space-y-3">
        <input
          value={joinCode}
          onChange={(event) =>
            setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
          }
          placeholder="ABC123"
          maxLength={6}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono uppercase outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
        />
        <input
          value={emailForDigest}
          onChange={(event) => setEmailForDigest(event.target.value)}
          type="email"
          placeholder="Digest email (optional)"
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || joinCode.length < 6}
          className="w-full rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Joining...' : 'Join League'}
        </button>
      </div>
    </form>
  )
}
