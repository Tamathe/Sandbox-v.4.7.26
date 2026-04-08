'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

export default function JoinContestPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bracket/contests/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ accessCode: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not join contest')
        return
      }
      router.push(`/bracket/${data.contestId}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.toUpperCase())
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Join a Contest"
        subtitle="Enter an access code to join a bracket challenge"
        action={
          <Link
            href="/bracket"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to contests
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="border-2 border-gray-200 rounded-2xl bg-white p-8">
            <div className="flex justify-center mb-6">
              <div className="size-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <KeyRound className="size-7 text-[#0033A0]" />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
                Access Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="WORD-000"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-lg font-mono font-extrabold text-gray-900 placeholder-gray-300 tracking-widest focus:outline-none focus:border-[#0033A0] transition-colors uppercase"
                maxLength={8}
                required
              />
              <p className="text-xs text-gray-400 mt-2 text-center">Format: WORD-000 (e.g. WILD-421)</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Joining…
                </>
              ) : (
                'Join Contest'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
