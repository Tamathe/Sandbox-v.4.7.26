'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, Users } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { ModalShell } from '../ui/ModalShell'

interface DelegateRecord {
  id: string
  userId: string
  name: string
  email: string
  grantedAt?: string
}

interface DelegatesModalProps {
  appId: string | null
  open: boolean
  onClose: () => void
}

export default function DelegatesModal({ appId, open, onClose }: DelegatesModalProps) {
  const { currentUser } = useAuth()
  const [email, setEmail] = useState('')
  const [delegates, setDelegates] = useState<DelegateRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !appId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/playground/apps/${appId}/delegates`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Failed to load delegates')
        }
        return response.json()
      })
      .then((payload) => {
        if (!cancelled) {
          setDelegates(payload.delegates ?? [])
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load delegates')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [appId, currentUser.email, open])

  if (!open) return null

  const handleAddDelegate = async () => {
    if (!appId || !email.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/playground/apps/${appId}/delegates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ email }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to add delegate')
      }

      setDelegates((previous) => {
        const next = previous.filter((delegate) => delegate.userId !== payload.userId)
        return [...next, payload]
      })
      setEmail('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to add delegate')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDelegate = async (delegateId: string) => {
    if (!appId) return

    setError(null)

    try {
      const response = await fetch(`/api/playground/apps/${appId}/delegates/${delegateId}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to remove delegate')
      }

      setDelegates((previous) => previous.filter((delegate) => delegate.id !== delegateId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to remove delegate')
    }
  }

  return (
    <ModalShell title="Share Access" icon={Users} onClose={onClose} zIndex={70} maxWidth="xl">
        <div className="px-5 py-3 text-sm text-gray-500 border-b border-gray-100">
          Give trusted teammates permission to read and write to this app&apos;s shared storage.
        </div>

        <div className="space-y-5 px-6 py-6">
          {!appId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Save the app first before sharing access.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddDelegate()
                }
              }}
              placeholder="Teammate's email"
              disabled={!appId || isSaving}
              className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/15 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={() => void handleAddDelegate()}
              disabled={!appId || isSaving || !email.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add delegate
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-3xl border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" />
                Loading delegates...
              </div>
            ) : delegates.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No delegates yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {delegates.map((delegate) => (
                  <div key={delegate.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{delegate.name}</div>
                      <div className="text-sm text-gray-500">{delegate.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteDelegate(delegate.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </ModalShell>
  )
}
