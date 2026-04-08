'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Users, Bell } from 'lucide-react'
import CourseRiskHeatmap from './CourseRiskHeatmap'
import StudentRiskTable from './StudentRiskTable'
import AlertCard from './AlertCard'
import AlertPanel from './AlertPanel'
import BulkOutreachModal from './BulkOutreachModal'
import AlertPreferences from './AlertPreferences'

interface Course {
  id: string
  title: string
  courseCode: string
}

export default function FacultyRiskDashboard({ courses }: { courses: Course[] }) {
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id ?? '')
  const [heatmap, setHeatmap] = useState<{
    distribution: { healthy: number; watch: number; concern: number; urgent: number; critical: number }
    totalStudents: number
    avgScore: number
    avgDelta7d: number
    topRiskStudents: { userId: string; userName: string; score: number }[]
  } | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [showBulk, setShowBulk] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [tab, setTab] = useState<'overview' | 'students' | 'alerts'>('overview')

  const loadData = useCallback(async () => {
    if (!selectedCourse) return
    const [hRes, sRes, aRes] = await Promise.all([
      fetch(`/api/success/course/${selectedCourse}/heatmap`),
      fetch(`/api/success/course/${selectedCourse}/students`),
      fetch(`/api/success/course/${selectedCourse}/alerts`),
    ])
    if (hRes.ok) setHeatmap(await hRes.json())
    if (sRes.ok) setStudents(await sRes.json())
    if (aRes.ok) setAlerts(await aRes.json())
  }, [selectedCourse])

  useEffect(() => { loadData() }, [loadData])

  async function handleAcknowledge(alertId: string) {
    await fetch(`/api/success/alert/${alertId}/acknowledge`, { method: 'POST' })
    loadData()
  }

  async function handleDismiss(alertId: string) {
    await fetch(`/api/success/alert/${alertId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Dismissed from dashboard' }),
    })
    loadData()
  }

  const selectedAlert = alerts.find((a: any) => a.id === activePanel)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Shield className="size-6 text-[#0033A0]" />
          <h1 className="font-extrabold text-2xl">Student Success</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
            ))}
          </select>
          <button
            onClick={() => setShowPrefs(!showPrefs)}
            className="p-2 text-gray-400 hover:text-[#0033A0] hover:bg-blue-50 rounded-lg"
          >
            <Bell className="size-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['overview', 'students', 'alerts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'students' ? 'Students' : `Alerts (${alerts.length})`}
          </button>
        ))}
      </div>

      {/* Preferences panel */}
      {showPrefs && <AlertPreferences />}

      {/* Overview tab */}
      {tab === 'overview' && heatmap && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CourseRiskHeatmap
            distribution={heatmap.distribution}
            totalStudents={heatmap.totalStudents}
            avgScore={heatmap.avgScore}
            avgDelta7d={heatmap.avgDelta7d}
          />
          <div className="border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">Active Alerts</h3>
              <span className="text-sm text-gray-400">{alerts.length} alerts</span>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {alerts.slice(0, 5).map((a: any) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onAcknowledge={handleAcknowledge}
                  onAct={id => setActivePanel(id)}
                  onDismiss={handleDismiss}
                />
              ))}
              {alerts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No active alerts. All students look healthy.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Students tab */}
      {tab === 'students' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">{students.length} students</span>
            {students.some((s: any) => s.score < 50) && (
              <button
                onClick={() => setShowBulk(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[#0033A0] hover:bg-blue-50 rounded-lg"
              >
                <Users className="size-4" />
                Bulk Outreach
              </button>
            )}
          </div>
          <StudentRiskTable
            students={students}
            onViewStudent={userId => {
              window.location.href = `/analytics/success/${selectedCourse}/${userId}`
            }}
          />
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.map((a: any) => (
            <AlertCard
              key={a.id}
              alert={a}
              onAcknowledge={handleAcknowledge}
              onAct={id => setActivePanel(id)}
              onDismiss={handleDismiss}
            />
          ))}
          {alerts.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">No active alerts.</p>
          )}
        </div>
      )}

      {/* Slide-out alert panel */}
      {selectedAlert && (
        <AlertPanel
          alert={selectedAlert}
          onClose={() => setActivePanel(null)}
          onRefresh={loadData}
        />
      )}

      {/* Bulk outreach modal */}
      {showBulk && (
        <BulkOutreachModal
          students={students.filter((s: any) => s.score < 50).map((s: any) => ({
            userId: s.userId,
            userName: s.user.name,
            score: s.score,
          }))}
          onClose={() => setShowBulk(false)}
          onSend={async () => { setShowBulk(false) }}
        />
      )}
    </div>
  )
}
