'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import PageHeader from '../../../components/PageHeader'
import { useAuth } from '../../../lib/auth-context'

type DebateSide = 'PRO' | 'CON'

export default function ArgueDebatePage() {
  const { currentUser } = useAuth()
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [side, setSide] = useState<DebateSide | null>(null)
  const [claim, setClaim] = useState('')
  const [evidence, setEvidence] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!side || !claim.trim() || !evidence.trim() || !reasoning.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/debate/rooms/${roomId}/arguments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ side, claim: claim.trim(), evidence: evidence.trim(), reasoning: reasoning.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit argument')
        return
      }
      router.push(`/debate/${roomId}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Submit Your Argument"
        subtitle="Make your case with a clear claim, evidence, and reasoning."
        action={
          <Link
            href={`/debate/${roomId}`}
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
              <MessageSquare className="size-5 text-white" />
            </div>
            <h2 className="font-extrabold text-gray-900 text-lg">Your Argument</h2>
          </div>

          {/* Side selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Choose your side</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSide('PRO')}
                className={`rounded-xl py-4 px-4 text-center font-extrabold text-sm border-2 transition-all ${
                  side === 'PRO'
                    ? 'border-[#0033A0] bg-[#0033A0] text-white'
                    : 'border-gray-200 text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0]'
                }`}
              >
                <div className="text-lg mb-0.5">✓</div>
                PRO
                <div className="text-xs font-normal mt-0.5 opacity-75">Agree with the proposition</div>
              </button>
              <button
                type="button"
                onClick={() => setSide('CON')}
                className={`rounded-xl py-4 px-4 text-center font-extrabold text-sm border-2 transition-all ${
                  side === 'CON'
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-amber-600 hover:text-amber-600'
                }`}
              >
                <div className="text-lg mb-0.5">✗</div>
                CON
                <div className="text-xs font-normal mt-0.5 opacity-75">Disagree with the proposition</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Your Claim
              </label>
              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="State your main point in 1–2 sentences."
                rows={2}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
                maxLength={300}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Evidence
              </label>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="What facts, data, or examples support your claim?"
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
                maxLength={600}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Reasoning
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain how your evidence connects to your claim and why it matters."
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
                maxLength={600}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!side || !claim.trim() || !evidence.trim() || !reasoning.trim() || loading}
                className="flex-1 py-3 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting…' : 'Submit Argument'}
              </button>
              <Link
                href={`/debate/${roomId}`}
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
