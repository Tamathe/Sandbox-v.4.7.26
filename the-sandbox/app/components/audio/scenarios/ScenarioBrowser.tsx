'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import ScenarioCard from './ScenarioCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'
import type { ScenarioTemplateType } from '../../../lib/audio/types'

const FILTERS: { id: ScenarioTemplateType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'interview', label: 'Interview' },
  { id: 'debate', label: 'Debate' },
  { id: 'roleplay', label: 'Role-Play' },
]

interface Props {
  onSelect: (id: string) => void
}

export default function ScenarioBrowser({ onSelect }: Props) {
  const { currentUser } = useAuth()
  const [scenarios, setScenarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const controller = new AbortController()
    if (!currentUser?.email) return
    const params = filter !== 'all' ? `?type=${filter}` : ''
    apiFetch(currentUser.email, `/api/audio/scenarios${params}`, { signal: controller.signal })
      .then((data: any) => setScenarios(data.scenarios))
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currentUser?.email, filter])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setFilter(f.id); setLoading(true) }}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f.id ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorBanner message={error} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((s: any) => (
            <ScenarioCard key={s.id} scenario={s} onClick={onSelect} />
          ))}
          {!scenarios.length && <p className="text-gray-500 text-sm col-span-full text-center py-8">No scenarios yet.</p>}
        </div>
      )}
    </div>
  )
}
