'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Filter } from 'lucide-react'
import PageHeader from '../../../components/PageHeader'
import AlertCard from '../../../components/success/AlertCard'
import AlertPanel from '../../../components/success/AlertPanel'

export default function AlertManagementPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [courses, setCourses] = useState<{ id: string; courseCode: string; title: string }[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/courses/mine')
      .then(r => r.json())
      .then(data => {
        const c = Array.isArray(data) ? data : data.courses ?? []
        setCourses(c)
        if (c.length > 0) setSelectedCourse(c[0].id)
      })
  }, [])

  const loadAlerts = useCallback(async () => {
    if (!selectedCourse) return
    setLoading(true)
    const res = await fetch(`/api/success/course/${selectedCourse}/alerts`)
    if (res.ok) setAlerts(await res.json())
    setLoading(false)
  }, [selectedCourse])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  async function handleAcknowledge(alertId: string) {
    await fetch(`/api/success/alert/${alertId}/acknowledge`, { method: 'POST' })
    loadAlerts()
  }

  async function handleDismiss(alertId: string) {
    await fetch(`/api/success/alert/${alertId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Dismissed from alert inbox' }),
    })
    loadAlerts()
  }

  const filtered = severityFilter === 'all'
    ? alerts
    : alerts.filter((a: any) => a.severity === severityFilter)

  const selectedAlert = alerts.find((a: any) => a.id === activePanel)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="Alert Inbox"
        subtitle="Cross-course student success alerts"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedCourse}
          onChange={e => setSelectedCourse(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 border rounded-lg px-1">
          {['all', 'CRITICAL', 'URGENT', 'CONCERN', 'WATCH'].map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                severityFilter === s ? 'bg-[#0033A0] text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any) => (
            <AlertCard
              key={a.id}
              alert={a}
              onAcknowledge={handleAcknowledge}
              onAct={id => setActivePanel(id)}
              onDismiss={handleDismiss}
            />
          ))}
          {filtered.length === 0 && (
            <div className="border rounded-2xl p-12 text-center">
              <Bell className="size-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No alerts match your filters.</p>
            </div>
          )}
        </div>
      )}

      {selectedAlert && (
        <AlertPanel
          alert={selectedAlert}
          onClose={() => setActivePanel(null)}
          onRefresh={loadAlerts}
        />
      )}
    </div>
  )
}
