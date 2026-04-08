'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  AlertOctagon,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  Filter,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import PulseEventCard from './PulseEventCard'
import PulseTimeline from './PulseTimeline'

interface PulseSignal {
  id: string
  stream: string
  evidence: string
  dataPoints: number
  strength: number
  firstSeen: string
  lastSeen: string
}

interface PulseEvent {
  id: string
  theme: string
  severity: string
  status: string
  summary: string
  suggestedActions: string[]
  signals: PulseSignal[]
  detectedAt: string
  acknowledgedBy?: string | null
  resolvedAt?: string | null
  resolvedNote?: string | null
}

interface PulseKpis {
  active: number
  critical: number
  high: number
  resolvedThisWeek: number
}

type StatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved'
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'

export default function PulseDashboard() {
  const { currentUser } = useAuth()
  const [events, setEvents] = useState<PulseEvent[]>([])
  const [kpis, setKpis] = useState<PulseKpis>({ active: 0, critical: 0, high: 0, resolvedThisWeek: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  const isAdmin = currentUser?.role === 'ADMIN'

  const loadEvents = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (severityFilter !== 'all') params.set('severity', severityFilter)
      const qs = params.toString()
      const data = await apiFetch<{ events: PulseEvent[]; kpis: PulseKpis }>(
        currentUser.email,
        `/api/campus-pulse/events${qs ? `?${qs}` : ''}`,
      )
      setEvents(data.events)
      setKpis(data.kpis)
    } catch (err) {
      console.error('Failed to load pulse events:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, statusFilter, severityFilter])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleAcknowledge = async (eventId: string) => {
    if (!currentUser?.email) return
    try {
      await apiFetch(currentUser.email, `/api/campus-pulse/events/${eventId}/acknowledge`, {
        method: 'POST',
      })
      loadEvents()
    } catch (err) {
      console.error('Failed to acknowledge event:', err)
    }
  }

  const handleResolve = async (eventId: string, note: string) => {
    if (!currentUser?.email) return
    try {
      await apiFetch(currentUser.email, `/api/campus-pulse/events/${eventId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      })
      loadEvents()
    } catch (err) {
      console.error('Failed to resolve event:', err)
    }
  }

  const activeEvents = events.filter(e => e.status === 'active' || e.status === 'acknowledged')
  const resolvedEvents = events.filter(e => e.status === 'resolved' || e.status === 'false-alarm')

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={Activity}
          label="Active Events"
          value={kpis.active}
          color="text-[#0033A0]"
          bg="bg-blue-50"
        />
        <KpiCard
          icon={AlertOctagon}
          label="Critical"
          value={kpis.critical}
          color="text-red-600"
          bg="bg-red-50"
        />
        <KpiCard
          icon={ShieldAlert}
          label="High"
          value={kpis.high}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <KpiCard
          icon={CheckCircle}
          label="Resolved (7d)"
          value={kpis.resolvedThisWeek}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* Filters + Refresh */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="size-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
            className="text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button
          onClick={loadEvents}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0033A0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-[#0033A0]" />
        </div>
      )}

      {/* Empty State */}
      {!loading && events.length === 0 && (
        <div className="text-center py-16 border rounded-2xl bg-gray-50">
          <Activity className="size-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-gray-600">All Clear</h3>
          <p className="text-sm text-gray-400 mt-1">
            No campus pulse events detected. All signal streams are within normal ranges.
          </p>
        </div>
      )}

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold text-gray-900">
            Active Events ({activeEvents.length})
          </h2>
          {activeEvents.map(event => (
            <PulseEventCard
              key={event.id}
              event={event}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Timeline */}
      {resolvedEvents.length > 0 && (
        <div className="border rounded-2xl shadow-sm bg-white p-5">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">
            Resolved This Week ({resolvedEvents.length})
          </h2>
          <PulseTimeline events={resolvedEvents} />
        </div>
      )}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Activity
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className="border rounded-2xl shadow-sm bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${bg}`}>
          <Icon className={`size-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
