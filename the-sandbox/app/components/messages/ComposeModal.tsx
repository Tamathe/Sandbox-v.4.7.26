'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, X } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'
import { useAuth } from '../../lib/auth-context'

interface UserResult {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
}

interface ComposeModalProps {
  open: boolean
  onClose: () => void
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'SB'
  )
}

export default function ComposeModal({ open, onClose }: ComposeModalProps) {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<UserResult[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected([])
      setError(null)
      setCreating(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced user search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/messages/users/search?q=${encodeURIComponent(trimmed)}&limit=10`,
          { headers: { 'x-demo-user-email': currentUser.email } },
        )
        if (!res.ok) return
        const data: { users: UserResult[] } = await res.json()
        // Filter out already-selected users
        const selectedIds = new Set(selected.map((u) => u.id))
        setResults(data.users.filter((u) => !selectedIds.has(u.id)))
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentUser.email])

  const handleSelectUser = useCallback((user: UserResult) => {
    setSelected((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev
      return [...prev, user]
    })
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }, [])

  const handleRemoveUser = useCallback((userId: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== userId))
  }, [])

  const handleCreate = useCallback(async () => {
    if (selected.length === 0 || creating) return
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/messages/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ recipientIds: selected.map((u) => u.id) }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create conversation')
        return
      }

      const data: { groupId: string } = await res.json()
      onClose()
      router.push(`/messages/${data.groupId}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }, [selected, creating, currentUser.email, onClose, router])

  if (!open) return null

  return (
    <ModalShell title="New Message" onClose={onClose} maxWidth="md" zIndex={50}>
        {/* Search */}
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0]">
            <Search className="size-4 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="min-w-0 flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {searching && <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" />}
          </div>
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
            {selected.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-[#0033A0]"
              >
                {user.name}
                <button
                  type="button"
                  onClick={() => handleRemoveUser(user.id)}
                  className="rounded-full p-0.5 transition-colors hover:bg-blue-100"
                  aria-label={`Remove ${user.name}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search results */}
        <div className="max-h-60 overflow-y-auto">
          {results.length > 0 ? (
            <ul className="py-1">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-xs font-semibold text-white">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name || 'User avatar'}
                          className="size-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="truncate text-xs text-gray-500">{user.email}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 && !searching ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No users found</div>
          ) : query.trim().length < 2 && selected.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Type at least 2 characters to search
            </div>
          ) : null}
        </div>

        {/* Error */}
        {error && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={handleCreate}
            disabled={selected.length === 0 || creating}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {creating && <Loader2 className="size-4 animate-spin" />}
            {selected.length <= 1 ? 'Start Conversation' : `Create Group (${selected.length})`}
          </button>
        </div>
    </ModalShell>
  )
}
