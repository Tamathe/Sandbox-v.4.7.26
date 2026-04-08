'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react'
import PageHeader from '../../../components/PageHeader'
import { useAuth } from '../../../lib/auth-context'

interface PitchRoomBrief {
  id: string
  title: string
  casePrompt: string
  status: string
  myPitch: unknown
}

export default function SubmitPitchPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const { currentUser } = useAuth()
  const router = useRouter()

  const [room, setRoom] = useState<PitchRoomBrief | null>(null)
  const [loadingRoom, setLoadingRoom] = useState(true)

  const [teamName, setTeamName] = useState('')
  const [summary, setSummary] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/pitch/rooms/${roomId}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { room?: PitchRoomBrief }) => setRoom(data.room ?? null))
      .catch(() => setRoom(null))
      .finally(() => setLoadingRoom(false))
  }, [roomId, currentUser.email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamName.trim() || !summary.trim() || !recommendation.trim() || !rationale.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/pitch/rooms/${roomId}/pitches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          teamName: teamName.trim(),
          summary: summary.trim(),
          recommendation: recommendation.trim(),
          rationale: rationale.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit pitch')
        return
      }
      router.push(`/pitch/${roomId}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!room || room.status !== 'OPEN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            {!room ? 'Competition not found.' : 'Submissions are closed for this competition.'}
          </p>
          <Link href={`/pitch/${roomId}`} className="text-[#0033A0] font-semibold hover:underline">
            View Competition
          </Link>
        </div>
      </div>
    )
  }

  if (room.myPitch) {
    router.replace(`/pitch/${roomId}`)
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Submit Your Pitch"
        subtitle={room.title}
        action={
          <Link
            href={`/pitch/${roomId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Competition
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        {/* The case */}
        <div className="border-2 border-blue-200 rounded-2xl bg-white p-5">
          <p className="text-xs font-semibold text-[#0033A0] uppercase tracking-wide mb-2">
            The Case
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{room.casePrompt}</p>
        </div>

        {/* Pitch form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="border-2 border-gray-200 rounded-2xl bg-white p-6 space-y-5">

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Blue Group or Team Alpha"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
                maxLength={60}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Recommendation
              </label>
              <p className="text-xs text-gray-500 mb-2">
                State your recommendation in one clear sentence. Be specific and decisive.
              </p>
              <input
                type="text"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="e.g. Acquire the regional competitor to gain market share immediately."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
                maxLength={200}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Executive Summary
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Summarize the problem and your approach in 3–4 sentences.
              </p>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summarize the situation and your proposed direction…"
                rows={4}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Strategic Rationale
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Explain your reasoning in depth — evidence, frameworks, risks, and why this is the best path.
              </p>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Walk through your analysis and the reasoning behind your recommendation…"
                rows={7}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={
                !teamName.trim() ||
                !summary.trim() ||
                !recommendation.trim() ||
                !rationale.trim() ||
                submitting
              }
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Briefcase className="size-4" />
                  Submit Pitch
                </>
              )}
            </button>
            <Link
              href={`/pitch/${roomId}`}
              className="px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
