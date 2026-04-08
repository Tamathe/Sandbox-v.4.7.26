'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft, Coins } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

const CATEGORIES = ['Law', 'History', 'STEM', 'Medicine', 'Business', 'Arts', 'University', 'General']
const DIFFICULTIES = ['Introductory', 'Intermediate', 'Advanced']

export default function NewBountyPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sandBalance, setSandBalance] = useState(0)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    difficulty: '',
    estimatedHours: '',
    rewardSand: '250',
  })

  useEffect(() => {
    fetch(`/api/xp?email=${encodeURIComponent(currentUser.email)}`)
      .then((r) => r.json())
      .then((data) => setSandBalance(data.sandBalance ?? 0))
      .catch(() => {})
  }, [currentUser.email])

  if (currentUser.role === 'STUDENT') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Educators only</h2>
        <p className="text-gray-500 mb-6">Only educators and admins can post bounties.</p>
        <Link href="/bounties" className="text-[#0033A0] font-medium hover:underline">
          Back to bounties
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/bounties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to post bounty')
        return
      }
      router.push(`/bounties/${data.bounty.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/bounties" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#0033A0] mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to bounties
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#0033A0] rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Post a Bounty</h1>
          <p className="text-sm text-gray-500">Describe the tool you need and someone can build it.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          Strong bounty briefs work best when they describe the learner, the classroom moment, and the one thing reviewers should pressure-test before the tool ships.
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
          <div className="flex items-center gap-2 mb-1 text-amber-900">
            <Coins className="w-4 h-4" />
            <span className="text-sm font-semibold">Available Sand: {sandBalance.toLocaleString()}</span>
          </div>
          <p className="text-xs text-amber-800">
            Posting a bounty reserves the reward amount immediately. If the bounty closes without fulfillment, the reserved Sand is refunded.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            What do you need? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Interactive Dante's Inferno where Virgil guides the learner"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Full Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            placeholder="Describe the tool in detail. What should it do? Who is it for? What course or context does it support? What would make it successful?"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] text-sm resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 text-sm"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 text-sm"
            >
              <option value="">Any</option>
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Est. Hours to Build</label>
            <input
              type="number"
              min="1"
              max="200"
              value={form.estimatedHours}
              onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
              placeholder="e.g. 8"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reward Sand</label>
            <input
              type="number"
              min="25"
              step="25"
              value={form.rewardSand}
              onChange={(e) => setForm({ ...form, rewardSand: e.target.value })}
              placeholder="250"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 text-sm"
            />
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-[#0033A0] text-white py-3 rounded-xl font-semibold hover:bg-[#002580] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Posting...' : 'Post Bounty'}
          </button>
          <Link
            href="/bounties"
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
