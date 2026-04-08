'use client'

import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'

interface CollabJoinModalProps {
  open: boolean
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (joinCode: string) => Promise<void> | void
}

export default function CollabJoinModal({
  open,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: CollabJoinModalProps) {
  const [joinCode, setJoinCode] = useState('')

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    await onSubmit(normalized)
  }

  return (
    <ModalShell title="Join collaborative session" onClose={onClose} maxWidth="md" zIndex={50}>
        <p className="px-5 pt-3 text-sm text-gray-500">Enter the 6-character code your partner shared.</p>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Join code</span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                }
                className="w-full rounded-xl border border-gray-300 px-10 py-3 text-center font-mono text-lg tracking-[0.35em] text-gray-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15"
                placeholder="HX7K2M"
                maxLength={6}
                autoFocus
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joinCode.length !== 6 || isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Join session
            </button>
          </div>
        </form>
    </ModalShell>
  )
}
