'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { StudentJourney } from '../../lib/journey/types'
import type { JourneyLayer } from '../../lib/journey/types'
import JourneyNarrative from './JourneyNarrative'
import EngagementSparkline from './EngagementSparkline'
import MilestoneList from './MilestoneList'
import LayerFilterTabs from './LayerFilterTabs'
import WeeklyBreakdown from './WeeklyBreakdown'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

interface JourneyTimelineProps {
  studentId?: string // If provided, renders advisor view for this student
}

export default function JourneyTimeline({ studentId }: JourneyTimelineProps) {
  const { currentUser } = useAuth()
  const [journey, setJourney] = useState<StudentJourney | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeLayer, setActiveLayer] = useState<JourneyLayer | 'all'>('all')

  const fetchJourney = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(null)
    try {
      const path = studentId
        ? `/api/journey/student/${studentId}`
        : '/api/journey/me'
      const params = activeLayer !== 'all' ? `?layer=${activeLayer}` : ''
      const data = await apiFetch<StudentJourney>(currentUser.email, `${path}${params}`)
      setJourney(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journey')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, studentId, activeLayer])

  useEffect(() => {
    const controller = new AbortController()
    fetchJourney()
    return () => controller.abort()
  }, [fetchJourney])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} retry={fetchJourney} />
  if (!journey) return null

  const filteredMilestones = activeLayer === 'all'
    ? journey.milestones
    : journey.milestones.filter(m => m.layer === activeLayer)

  const sparklineData = journey.snapshots.map(s => ({
    weekOf: String(s.weekOf),
    engagementScore: s.engagementScore,
  }))

  return (
    <div className="space-y-6">
      <JourneyNarrative narrative={journey.narrative} trajectory={journey.currentTrajectory} />
      <EngagementSparkline data={sparklineData} />
      <LayerFilterTabs active={activeLayer} onChange={setActiveLayer} />
      <MilestoneList milestones={filteredMilestones} />
      <WeeklyBreakdown snapshots={journey.snapshots} />
    </div>
  )
}
