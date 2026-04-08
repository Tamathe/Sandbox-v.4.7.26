'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RotateCcw, Copy } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

interface NextStepsData {
  suggestion: string
  retryMode: VoiceTutoringMode
}

interface Props {
  sessionId: string
  summary: string | null
  onRetry: (mode: VoiceTutoringMode) => void
}

export default function SessionNextSteps({ sessionId, summary, onRetry }: Props) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<NextStepsData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!currentUser?.email || !sessionId) return
    const controller = new AbortController()
    apiFetch(currentUser.email, `/api/audio/voice-session/${sessionId}/next-steps`, {
      method: 'POST',
      signal: controller.signal,
    })
      .then(result => setData(result as NextStepsData))
      .catch(() => {}) // Degrade silently
    return () => controller.abort()
  }, [currentUser?.email, sessionId])

  const handleCopy = () => {
    if (!summary) return
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-3">
      {data?.suggestion && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Sparkles className="size-4 text-[#0033A0] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-800">{data.suggestion}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onRetry(data?.retryMode ?? 'socratic')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors text-sm"
        >
          <RotateCcw className="size-4" />
          Try Again
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!summary}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors text-sm disabled:opacity-50"
        >
          <Copy className="size-4" />
          {copied ? 'Copied!' : 'Copy Summary'}
        </button>
      </div>
    </div>
  )
}
