'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gavel, ArrowLeft } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

export default function NewDebatePage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [proposition, setProposition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !proposition.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/debate/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ title: title.trim(), proposition: proposition.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create debate')
        return
      }
      router.push(`/debate/${data.room.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Create a Debate"
        subtitle="Post a proposition and invite others to argue both sides."
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-[#0033A0] flex items-center justify-center">
              <Gavel className="size-5 text-white" />
            </div>
            <h2 className="font-extrabold text-gray-900 text-lg">New Debate Room</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Debate Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AI in Education: Benefit or Risk?"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
                maxLength={120}
              />
              <p className="text-xs text-gray-400 mt-1">A short name for this debate</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Proposition
              </label>
              <textarea
                value={proposition}
                onChange={(e) => setProposition(e.target.value)}
                placeholder="e.g. Artificial intelligence will do more harm than good in higher education."
                rows={4}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                A clear, arguable claim. Participants will argue PRO (for) or CON (against) this statement.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!title.trim() || !proposition.trim() || loading}
                className="flex-1 py-3 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create Debate Room'}
              </button>
              <Link
                href="/debate"
                className="px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
