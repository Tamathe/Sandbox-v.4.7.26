'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

interface StudyGuideCardProps {
  courseId?: string
  title?: string
}

export default function StudyGuideCard({
  courseId,
  title = 'AI Study Guide',
}: StudyGuideCardProps) {
  const { currentUser } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setContent('')

    try {
      const response = await fetch('/api/study/guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ ...(courseId ? { courseId } : {}) }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to generate study guide')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value)
        setContent(text)
      }
    } catch {
      setContent('## Strengths\n- Your study guide could not be generated right now.\n\n## Areas for Review\n- Try again in a moment.\n\n## Suggested Next Steps\n- Keep using your course tools and library to build a stronger data trail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Sparkles className="h-4 w-4 text-[#0033A0]" />
        <span className="text-sm font-bold text-gray-900">{title}</span>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Generating...' : 'Generate Study Guide'}
        </button>

        {content ? (
          <div className="prose prose-sm mt-4 max-w-none text-gray-700">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Get a quick AI summary of your strengths, review areas, and next best tool moves.
          </p>
        )}

        <div className="mt-4 text-[11px] font-medium text-gray-400">
          Powered by Claude AI
        </div>
      </div>
    </div>
  )
}
