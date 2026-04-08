'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import SessionReport from '../../../components/audio/voice/SessionReport'
import LiveTranscript from '../../../components/audio/voice/LiveTranscript'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorBanner from '../../../components/ErrorBanner'
import type { TranscriptEntry, ScoreDimension } from '../../../lib/audio/types'

export default function SessionReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUser } = useAuth()
  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!currentUser?.email) return
    apiFetch(currentUser.email, `/api/audio/voice-session/${id}`, { signal: controller.signal })
      .then((data: unknown) => setSession(data as Record<string, unknown>))
      .catch((err: Error) => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser?.email, id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><LoadingSpinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-4 py-12"><ErrorBanner message={error} /></div>
  if (!session) return null

  const transcript = (session.transcript as TranscriptEntry[]) ?? []
  const scores: ScoreDimension[] = ((session.scores as Record<string, unknown>[]) ?? []).map((s) => ({
    dimension: s.dimension as string,
    score: s.score as number,
    weight: s.weight as number,
    evidence: s.evidence as string,
    feedback: s.feedback as string,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Link href="/audio" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="size-4" /> Back to Audio Hub
      </Link>

      <div className="flex items-center gap-2">
        <FileText className="size-5 text-[#0033A0]" />
        <h1 className="font-extrabold text-xl text-gray-900 capitalize">{session.type as string} Session</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" style={{ maxHeight: '500px' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-700">Transcript</h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '450px' }}>
            <LiveTranscript entries={transcript} isListening={false} />
          </div>
        </div>

        <SessionReport
          summary={session.summary as string | null}
          scores={scores}
          durationSecs={session.durationSecs as number | null}
        />
      </div>
    </div>
  )
}
