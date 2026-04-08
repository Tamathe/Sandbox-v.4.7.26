'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, ArrowLeft } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

function JoinContent() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')

    const normalized = code.trim().toUpperCase()

    try {
      // Look up rooms to find the one with this access code
      const res = await fetch('/api/debate/rooms', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      const data = await res.json()
      const rooms: Array<{ id: string; accessCode: string }> = data.rooms ?? []
      const match = rooms.find((r) => r.accessCode === normalized)

      if (match) {
        router.push(`/debate/${match.id}`)
        return
      }

      // Not in their list — we can't look up by code without a search endpoint
      // Try to navigate directly if they happen to know the room ID
      setError('Room not found. Check the code and try again, or ask the host to share the direct link.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Join a Debate"
        subtitle="Enter the access code shared by your debate host."
        action={
          <Link
            href="/debate"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        }
      />

      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-[#0033A0] flex items-center justify-center">
              <KeyRound className="size-5 text-white" />
            </div>
            <h2 className="font-extrabold text-gray-900 text-lg">Enter Access Code</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. LOGIC-247"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center focus:outline-none focus:border-[#0033A0] uppercase transition-colors"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!code.trim() || loading}
              className="w-full py-3 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Looking up…' : 'Join Debate'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Codes look like <span className="font-mono font-semibold">LOGIC-247</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <JoinContent />
    </Suspense>
  )
}
