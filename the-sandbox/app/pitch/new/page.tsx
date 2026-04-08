'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

const EXAMPLE_CASES = [
  'A regional grocery chain with 120 stores is losing 3% market share per year to national competitors. The CEO has $10M to invest. Should the company double down on private-label products, launch a loyalty app, or pursue an acquisition?',
  'A SaaS company with $8M ARR has been approached by two acquirers — a strategic buyer offering $50M all-cash and a PE firm offering $40M with a 2-year earn-out. The founders want liquidity but also care about team culture. What should they do?',
  'An urban hospital system is considering whether to open a telehealth-only urgent care service to compete with retail clinics. Margins are thin, nursing staff is stretched, and patient satisfaction scores have been declining. Recommend a path forward.',
]

export default function NewPitchRoomPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [casePrompt, setCasePrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !casePrompt.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/pitch/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ title: title.trim(), casePrompt: casePrompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create competition')
        return
      }
      router.push(`/pitch/${data.room.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Host a Competition"
        subtitle="Write a business case brief and distribute the access code to participants."
        action={
          <Link
            href="/pitch"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Case Pitch
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Title */}
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Competition Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring Strategy Case Challenge 2026"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
              maxLength={120}
              required
            />
          </div>

          {/* Case Prompt */}
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Business Case Brief
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Describe the situation, the decision to be made, and any relevant constraints. The AI judge will use this to evaluate all pitches.
            </p>
            <textarea
              value={casePrompt}
              onChange={(e) => setCasePrompt(e.target.value)}
              placeholder="Describe the business scenario participants must pitch a solution to…"
              rows={8}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{casePrompt.length} characters</p>
          </div>

          {/* Example cases */}
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
            <p className="text-sm font-bold text-gray-900 mb-3">Example cases to adapt</p>
            <div className="space-y-2">
              {EXAMPLE_CASES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCasePrompt(ex)}
                  className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-[#0033A0] border border-gray-200 hover:border-blue-200 rounded-xl px-4 py-3 transition-colors line-clamp-2"
                >
                  {ex}
                </button>
              ))}
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
              disabled={!title.trim() || !casePrompt.trim() || submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Briefcase className="size-4" />
                  Create Competition
                </>
              )}
            </button>
            <Link
              href="/pitch"
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
