'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'

export default function NewQuizPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !topic.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/quiz-bowl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ title: title.trim(), topic: topic.trim(), questionCount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create quiz')
        return
      }
      router.push(`/quiz-bowl/${data.quiz.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Create a Quiz"
        subtitle="Pick a topic — AI generates the questions, you host the game."
        action={
          <Link href="/quiz-bowl" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        }
      />

      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} className="border-2 border-gray-200 rounded-2xl bg-white p-8 space-y-6">

          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-yellow-400 flex items-center justify-center">
              <Zap className="size-5 text-yellow-900" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Quiz Bowl Blitz</p>
              <p className="text-xs text-gray-500">AI-generated • Live competition</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Quiz Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Midterm Review — CHEM 105"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <p className="text-xs text-gray-400">A name to identify this quiz session</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Topic for AI to generate questions about</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Organic chemistry reaction mechanisms"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <p className="text-xs text-gray-400">Be specific — the more detail, the better the questions</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Number of questions: <span className="text-[#0033A0]">{questionCount}</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1 (quick)</span>
              <span>10 (full session)</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim() || !topic.trim()}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating quiz…
              </>
            ) : (
              <>
                <Zap className="size-4" />
                Generate Quiz
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
