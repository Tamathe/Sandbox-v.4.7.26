'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, Copy, Check, Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

export default function NewContestPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; accessCode: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bracket/contests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create contest')
        return
      }
      setCreated({ id: data.contest.id, accessCode: data.contest.accessCode, name: data.contest.name })
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!created) return
    navigator.clipboard.writeText(created.accessCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleContinue() {
    if (!created) return
    router.push(`/bracket/${created.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Create a Contest"
        subtitle="Set up a new bracket challenge and invite friends"
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
          {created ? (
            <div className="border-2 border-green-300 rounded-2xl bg-green-50 p-8 text-center">
              <Trophy className="size-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-extrabold text-gray-900 mb-1">Contest Created!</h2>
              <p className="text-gray-600 mb-6">{created.name}</p>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-6">
                <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Access Code</p>
                <p className="text-3xl font-extrabold font-mono text-[#0033A0] tracking-widest mb-3">{created.accessCode}</p>
                <p className="text-xs text-gray-500 mb-3">Share this code with friends so they can join</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 mx-auto px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <button
                onClick={handleContinue}
                className="w-full px-6 py-3 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
              >
                Go to Contest
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="border-2 border-gray-200 rounded-2xl bg-white p-8">
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contest Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Office Bracket Challenge 2026"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0033A0] transition-colors"
                  maxLength={80}
                  required
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Contest'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
