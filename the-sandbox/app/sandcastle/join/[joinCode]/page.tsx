'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users, Loader2, Zap } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'

export default function SandcastleJoinPage() {
  const params = useParams<{ joinCode: string }>()
  const router = useRouter()
  const { currentUser } = useAuth()
  const joinCode = (params.joinCode ?? '').toUpperCase()

  const [displayName, setDisplayName] = useState(currentUser.name ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Please enter your display name')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // 1. Resolve join code → roomId
      const resolveRes = await fetch(`/api/sandcastle/rooms/join/${joinCode}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      const resolveData = (await resolveRes.json()) as { roomId?: string; error?: string }
      if (!resolveRes.ok) {
        setError(
          resolveRes.status === 404
            ? 'Join code not found. Check the code and try again.'
            : resolveRes.status === 410
              ? 'This room has ended.'
              : resolveData.error ?? 'Failed to find room',
        )
        setLoading(false)
        return
      }

      const roomId = resolveData.roomId!

      // 2. Create participant record
      const joinRes = await fetch(`/api/sandcastle/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      })
      const joinData = (await joinRes.json()) as { participantId?: string; error?: string }
      if (!joinRes.ok) {
        setError(joinData.error ?? 'Failed to join room')
        setLoading(false)
        return
      }

      // 3. Redirect to participant view
      router.push(
        `/sandcastle/${roomId}/participate?participantId=${joinData.participantId}`,
      )
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Zap className="size-8 text-[#0033A0]" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Join Room</h1>
          <p className="text-gray-500 mt-1">
            Joining room <span className="font-bold text-[#0033A0]">{joinCode}</span>
          </p>
        </div>

        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should classmates see you?"
                maxLength={60}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0033A0] text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
              {loading ? 'Joining…' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
