'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import { Play, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorBanner from '../../../components/ErrorBanner'
import VoiceSessionPanel from '../../../components/audio/voice/VoiceSessionPanel'

export default function ScenarioLauncherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUser } = useAuth()
  const [scenario, setScenario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    if (!currentUser?.email) return
    apiFetch(currentUser.email, `/api/audio/scenarios/${id}`, { signal: controller.signal })
      .then(setScenario)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser?.email, id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><LoadingSpinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-4 py-12"><ErrorBanner message={error} /></div>
  if (!scenario) return null

  if (started) {
    return <VoiceSessionPanel />
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link href="/audio/scenarios" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="size-4" /> Back to scenarios
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h1 className="font-extrabold text-xl text-gray-900">{scenario.title}</h1>
        <p className="text-sm text-gray-600">{scenario.description}</p>

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Character:</span> {(scenario.persona as any)?.name} — {(scenario.persona as any)?.role}
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Phases:</span> {(scenario.phases as any[])?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Played:</span> {scenario.timesPlayed} times
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors"
        >
          <Play className="size-4" /> Launch Scenario
        </button>
      </div>
    </div>
  )
}
