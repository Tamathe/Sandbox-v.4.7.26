'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import { useRouter } from 'next/navigation'

const MAX_CHARS = 10_000

interface Props {
  onClose: () => void
}

export default function PodcastifyModal({ onClose }: Props) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [sourceText, setSourceText] = useState('')
  const [title, setTitle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const autoTitle = sourceText.trim().split('\n')[0]?.slice(0, 80) || ''

  const handleGenerate = async () => {
    if (!currentUser?.email || !sourceText.trim()) return
    setGenerating(true)
    setError(null)
    setStatus('Generating your podcast...')
    try {
      const result = await apiFetch(currentUser.email, '/api/audio/podcastify', {
        method: 'POST',
        body: JSON.stringify({
          sourceText: sourceText.trim(),
          sourceName: title || autoTitle || 'My Podcast',
          sourceType: 'text',
          voiceAId: 'alex-sam-default',
          voiceBId: 'alex-sam-default',
        }),
      }) as { status: string; episodeId?: string }

      if (result.status === 'CACHED' && result.episodeId) {
        router.push(`/audio/episode/${result.episodeId}`)
        onClose()
      }
      // PENDING — show spinner message (stays visible)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      if (message.includes('429') || message.includes('rate')) {
        setError("You've used your 3 podcasts for today. Try again tomorrow.")
      } else {
        setError(message)
      }
      setStatus(null)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg text-gray-900">Turn notes into a podcast</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        <div>
          <label htmlFor="podcast-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            id="podcast-title"
            type="text"
            value={title || autoTitle}
            onChange={e => setTitle(e.target.value)}
            placeholder="Auto-generated from first line"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="podcast-source" className="text-sm font-medium text-gray-700">Source text</label>
            <span className={`text-xs ${sourceText.length > MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
              {sourceText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
          <textarea
            id="podcast-source"
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            maxLength={MAX_CHARS}
            rows={8}
            placeholder="Paste or type your notes, lecture content, or study material..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {status && (
          <div className="flex items-center gap-2 text-sm text-[#0033A0]">
            <Loader2 className="size-4 animate-spin" />
            {status}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!sourceText.trim() || sourceText.length > MAX_CHARS || generating}
          className="w-full py-3 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
